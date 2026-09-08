/* eslint-disable react-hooks/set-state-in-effect */
"use client";

/**
 * ReviewSection — একটা খাবারের আসল রিভিউ
 * --------------------------------------------------------------------------
 * ডেটা আসে `GET /api/v1/reviews?food_id=…` থেকে, আর প্রতি ১৫ সেকেন্ডে নিজে
 * থেকেই আবার আসে — তাই অন্য কেউ রিভিউ দিলে পেজ রিলোড না করেই কার্ডগুলোতে
 * সেটা ফুটে ওঠে। ট্যাব আড়ালে গেলে পোলিং থেমে থাকে।
 *
 * কে কী পারে:
 *   কাস্টমার — নিজের ডেলিভার হওয়া খাবারে রিভিউ দিতে/বদলাতে/মুছতে পারে
 *   মালিক    — যেকোনো রিভিউ মুছতে পারে (আসল পাহারা সার্ভারে)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Star,
  X,
  ImagePlus,
  Send,
  AlertCircle,
  Trash2,
  ShieldCheck,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import {
  apiDelete,
  apiGet,
  apiPost,
  getApiErrorMessage,
} from "@/src/lib/apiClient";
import { uploadImage, validateImage } from "@/src/lib/upload";
import { ADMIN_COOKIE, STAFF_COOKIE } from "@/src/lib/tokens";
import { useUser } from "@/src/app/components/Clients/Auth/UserProvider";

/* ---------------- Types ---------------- */

export interface ReviewImage {
  url: string;
  public_id?: string;
}

export interface Review {
  _id: string;
  user_id: string;
  user_name: string;
  user_image: string;
  food_id: string;
  order_id: string;
  order_number: string;
  rating: number;
  message: string;
  images: ReviewImage[];
  createdAt: string;
}

interface ReviewsPayload {
  reviews: Review[];
  average: number;
  breakdown: Record<string, number>;
  total: number;
}

export interface ReviewStats {
  average: number;
  total: number;
}

/** একবারে কয়টা কার্ড, আর কত পরপর নতুন খবর নেওয়া হয় */
const PAGE_SIZE = 6;
const REFRESH_MS = 15_000;
const MAX_REVIEW_IMAGES = 3;
const EMPTY_BREAKDOWN: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/* ---------------- Helpers ---------------- */

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getInitial = (name: string) =>
  (name || "C").trim().charAt(0).toUpperCase() || "C";

/**
 * ড্যাশবোর্ডের টোকেন httpOnly নয় (js-cookie দিয়েই বসানো হয়), তাই সাইটের
 * পাতাতেও পড়া যায়। এটা শুধু বোতামটা দেখানোর জন্য — সত্যিই মুছতে পারবে কিনা
 * সেটা সার্ভার নিজে আবার যাচাই করে।
 */
const useIsModerator = () => {
  const [isModerator, setIsModerator] = useState(false);

  useEffect(() => {
    try {
      const token = Cookies.get(ADMIN_COOKIE) || Cookies.get(STAFF_COOKIE);
      if (!token) return;

      const decoded = jwtDecode<{ role?: string; exp?: number }>(token);
      if (decoded?.exp && decoded.exp * 1000 < Date.now()) return;

      setIsModerator(
        decoded?.role === "superadmin" || decoded?.role === "admin",
      );
    } catch {
      // ভাঙা টোকেন — বোতামটা না দেখালেই হলো
    }
  }, []);

  return isModerator;
};

/* ---------------- Main exported section ---------------- */

interface ReviewSectionProps {
  foodId: string;
  foodName: string;
  /** গড় আর সংখ্যা বদলালে উপরের হেডারটাও যেন সাথে সাথে মিলে যায় */
  onStatsChange?: (stats: ReviewStats) => void;
}

const ReviewSection = ({
  foodId,
  foodName,
  onStatsChange,
}: ReviewSectionProps) => {
  const { user, isLoggedIn } = useUser();
  const isModerator = useIsModerator();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [average, setAverage] = useState(0);
  const [breakdown, setBreakdown] =
    useState<Record<string, number>>(EMPTY_BREAKDOWN);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ---------------- লোড (পোলিং হলে চুপচাপ) ---------------- */
  const fetchReviews = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiGet<ReviewsPayload>("/api/v1/reviews", {
          food_id: foodId,
          page: 1,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        setReviews(res.data?.reviews ?? []);
        setAverage(res.data?.average ?? 0);
        setBreakdown(res.data?.breakdown ?? EMPTY_BREAKDOWN);
        setTotal(res.data?.total ?? 0);
      } catch (err) {
        // পোলিং ব্যর্থ হলে চুপ থাকি — পর্দায় আগের কার্ডগুলো তো আছেই
        if (!silent) {
          toast.error(getApiErrorMessage(err, "Could not load reviews"));
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [foodId, limit],
  );

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ---------------- রিয়েল-টাইম — ট্যাব সামনে থাকলেই ---------------- */
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") fetchReviews(true);
    };

    const timer = window.setInterval(tick, REFRESH_MS);
    // ট্যাবে ফিরলে পরের টিকের অপেক্ষা না করে সাথে সাথেই নতুনটা দেখাই
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fetchReviews]);

  /* ---------------- হেডারের তারা/সংখ্যা মিলিয়ে রাখা ---------------- */
  // কলব্যাকটা ref এ রাখি — প্যারেন্ট প্রতি রেন্ডারে নতুন ফাংশন দিলেও
  // নিচের ইফেক্টটা বারবার চালু হয় না
  const statsRef = useRef(onStatsChange);
  useEffect(() => {
    statsRef.current = onStatsChange;
  }, [onStatsChange]);

  useEffect(() => {
    if (!loading) statsRef.current?.({ average, total });
  }, [average, total, loading]);

  const myReview = useMemo(
    () => (user ? reviews.find((r) => r.user_id === user._id) : undefined),
    [reviews, user],
  );

  const canDelete = (review: Review) =>
    isModerator || (!!user && review.user_id === user._id);

  /* ---------------- মুছে ফেলা ---------------- */
  const handleDelete = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;

    setDeletingId(target._id);
    try {
      const res = await apiDelete(`/api/v1/reviews/${target._id}`);
      toast.success(res.message || "Review removed");
      setConfirmTarget(null);
      await fetchReviews(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not remove this review"));
    } finally {
      setDeletingId(null);
    }
  };

  const hasMore = reviews.length < total;

  return (
    <div className="mx-auto mt-4 max-width border-t border-[var(--color-surface-soft)] px-4 pt-8 lg:px-10">
      {/* ================= হেডার ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] md:text-[20px] font-extrabold text-[var(--color-ink)]">
          Customer Reviews{" "}
          <span className="text-[var(--color-ink-soft)] font-medium text-sm">
            ({total})
          </span>
        </h2>

        {isLoggedIn ? (
          <button
            onClick={() => setShowForm(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-[12px] md:text-[13px] font-bold text-white shadow-md shadow-[var(--color-brand)]/25 transition hover:bg-[var(--color-chili)] cursor-pointer"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {myReview ? "Edit your review" : "Write a Review"}
          </button>
        ) : (
          <Link
            href={`/login?next=/foods/${foodId}`}
            className="flex flex-shrink-0 items-center gap-2 rounded-full bg-[var(--color-brand)] px-4 py-2.5 text-[12px] md:text-[13px] font-bold text-white shadow-md shadow-[var(--color-brand)]/25 transition hover:bg-[var(--color-chili)]"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Log in to review
          </Link>
        )}
      </div>

      {/* ================= গড় + তারার ভাগ ================= */}
      {total > 0 && (
        <RatingSummary average={average} breakdown={breakdown} total={total} />
      )}

      {/* ================= কার্ড ================= */}
      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-[var(--color-surface-soft)]"
            />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-ink-soft)]">
          No reviews yet. Be the first to review {foodName}.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <ReviewCard
                key={review._id}
                review={review}
                isMine={!!user && review.user_id === user._id}
                showDelete={canDelete(review)}
                isModerator={isModerator}
                deleting={deletingId === review._id}
                onDelete={() => setConfirmTarget(review)}
              />
            ))}
          </div>

          {hasMore && (
            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
                className="rounded-full border border-[var(--color-border)] px-5 py-2.5 text-[13px] font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] cursor-pointer"
              >
                Load more reviews ({total - reviews.length})
              </button>
            </div>
          )}
        </>
      )}

      {/* ================= রিভিউ লেখার ফর্ম ================= */}
      <AnimatePresence>
        {showForm && (
          <ReviewFormModal
            foodId={foodId}
            foodName={foodName}
            existing={myReview}
            onClose={() => setShowForm(false)}
            onSaved={() => {
              setShowForm(false);
              fetchReviews(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* ================= মোছার নিশ্চিতকরণ ================= */}
      <AnimatePresence>
        {confirmTarget && (
          <ConfirmDelete
            review={confirmTarget}
            asModerator={isModerator && confirmTarget.user_id !== user?._id}
            busy={deletingId === confirmTarget._id}
            onCancel={() => setConfirmTarget(null)}
            onConfirm={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewSection;

/* ---------------- গড় রেটিং + তারার ভাগ ---------------- */

const RatingSummary = ({
  average,
  breakdown,
  total,
}: {
  average: number;
  breakdown: Record<string, number>;
  total: number;
}) => (
  <div className="mt-5 flex flex-col gap-5 rounded-2xl bg-[var(--color-canvas)] p-4 ring-1 ring-[var(--color-surface-soft)] sm:flex-row sm:items-center sm:gap-8 sm:p-5">
    <div className="flex flex-shrink-0 flex-col items-center gap-1">
      <p className="text-[32px] font-extrabold leading-none text-[var(--color-ink)]">
        {average.toFixed(1)}
      </p>
      <Stars value={Math.round(average)} />
      <p className="text-[12px] text-[var(--color-ink-soft)]">
        {total} review{total === 1 ? "" : "s"}
      </p>
    </div>

    <div className="flex-1 space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[String(star)] ?? 0;
        const percent = total ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-6 text-right text-[11px] font-semibold text-[var(--color-ink-soft)]">
              {star}★
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-soft)]">
              <div
                className="h-full rounded-full bg-[var(--color-saffron)] transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="w-6 text-[11px] text-[var(--color-ink-soft)]">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  </div>
);

const Stars = ({
  value,
  size = "h-3.5 w-3.5",
}: {
  value: number;
  size?: string;
}) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`${size} ${
          i < value
            ? "fill-[var(--color-saffron)] text-[var(--color-saffron)]"
            : "text-[var(--color-border)]"
        }`}
      />
    ))}
  </div>
);

/* ---------------- Review card ---------------- */

const ReviewCard = ({
  review,
  isMine,
  showDelete,
  isModerator,
  deleting,
  onDelete,
}: {
  review: Review;
  isMine: boolean;
  showDelete: boolean;
  isModerator: boolean;
  deleting: boolean;
  onDelete: () => void;
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl bg-white p-4 shadow-sm ring-1 sm:p-5 ${
      isMine ? "ring-[var(--color-brand)]/40" : "ring-[var(--color-surface-soft)]"
    }`}
  >
    <div className="flex items-start gap-3">
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-[var(--color-surface-soft)]">
        {review.user_image ? (
          <Image
            src={review.user_image}
            alt={review.user_name || "Customer"}
            fill
            sizes="44px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-brand-soft)] text-sm font-bold text-[var(--color-brand)]">
            {getInitial(review.user_name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="truncate text-[13px] md:text-[14px] font-bold text-[var(--color-ink)]">
            {review.user_name || "Customer"}
            {isMine && (
              <span className="ml-2 rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand)]">
                You
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-ink-soft)]">
              {formatDate(review.createdAt)}
            </span>
            {showDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                title={
                  isMine ? "Delete your review" : "Remove this review (owner)"
                }
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-ink-faint)] transition hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand)] disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <Stars value={review.rating} />
          {review.order_number && (
            <span className="text-[11px] text-[var(--color-ink-soft)]">
              Order #{review.order_number}
            </span>
          )}
          {!isMine && isModerator && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-ink-faint)]">
              <ShieldCheck className="h-3 w-3" />
              owner view
            </span>
          )}
        </div>

        {review.message && (
          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-[var(--color-ink)]">
            {review.message}
          </p>
        )}

        {review.images?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {review.images.map((img, idx) => (
              <a
                key={img.public_id || `${review._id}-${idx}`}
                href={img.url}
                target="_blank"
                rel="noreferrer"
                className="relative h-16 w-16 overflow-hidden rounded-md ring-1 ring-[var(--color-surface-soft)]"
              >
                <Image
                  src={img.url}
                  alt="review attachment"
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  </motion.div>
);

/* ---------------- মোছার নিশ্চিতকরণ ---------------- */

const ConfirmDelete = ({
  review,
  asModerator,
  busy,
  onCancel,
  onConfirm,
}: {
  review: Review;
  asModerator: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    onClick={busy ? undefined : onCancel}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
    >
      <h3 className="text-[17px] font-extrabold text-[var(--color-ink)]">
        {asModerator ? "Remove this review?" : "Delete your review?"}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
        {asModerator ? (
          <>
            <b>{review.user_name || "This customer"}</b>&apos;s {review.rating}★
            review will disappear from the menu page. This cannot be undone.
          </>
        ) : (
          <>
            Your {review.rating}★ review will be removed and the dish rating
            will be recalculated.
          </>
        )}
      </p>

      <div className="mt-5 flex gap-2">
        <button
          onClick={onCancel}
          disabled={busy}
          className="flex-1 rounded-full border border-[var(--color-border)] py-2.5 text-[13px] font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-canvas)] disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--color-chili)] py-2.5 text-[13px] font-bold text-white transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? "Removing…" : "Remove"}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

/* ---------------- রিভিউ লেখার ফর্ম ---------------- */

interface ReviewFormModalProps {
  foodId: string;
  foodName: string;
  /** আগেই রিভিউ দেওয়া থাকলে ফর্মটা সেটা দিয়েই খোলে — সার্ভার এটাকে আপডেট করে */
  existing?: Review;
  onClose: () => void;
  onSaved: () => void;
}

const ReviewFormModal = ({
  foodId,
  foodName,
  existing,
  onClose,
  onSaved,
}: ReviewFormModalProps) => {
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState(existing?.message ?? "");
  const [images, setImages] = useState<ReviewImage[]>(existing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ছবি সাথে সাথেই Cloudinary তে যায় — সাবমিটে শুধু URL গুলো পাঠাই */
  const handleImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // একই ছবি আবার বাছলেও যেন onChange চলে
    if (files.length === 0) return;

    const room = MAX_REVIEW_IMAGES - images.length;
    if (room <= 0) {
      setErrorMsg(`At most ${MAX_REVIEW_IMAGES} photos`);
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      for (const file of files.slice(0, room)) {
        const invalid = validateImage(file);
        if (invalid) {
          setErrorMsg(invalid);
          continue;
        }
        const uploaded = await uploadImage(file, "reviews");
        setImages((prev) => [...prev, uploaded].slice(0, MAX_REVIEW_IMAGES));
      }
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err, "Could not upload the photo"));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) =>
    setImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (rating < 1) {
      setErrorMsg("Please pick a star rating first");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await apiPost("/api/v1/reviews", {
        food_id: foodId,
        rating,
        message: message.trim(),
        images,
      });
      toast.success(res.message || "Thanks for your review!");
      onSaved();
    } catch (err) {
      // "শুধু ডেলিভার হওয়া অর্ডারের খাবারে রিভিউ" — সার্ভারের এই বার্তাটাই
      // ব্যবহারকারীর জানা দরকার, তাই ফর্মের ভেতরেই দেখাই
      setErrorMsg(getApiErrorMessage(err, "Could not save your review"));
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={busy ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[16px] md:text-[18px] font-extrabold text-[var(--color-ink)]">
              {existing ? "Edit your review" : "Write a Review"}
            </h3>
            <p className="mt-0.5 text-[12px] text-[var(--color-ink-soft)]">
              {foodName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-ink)] transition disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* rating */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const value = i + 1;
                const filled = value <= (hoverRating || rating);
                return (
                  <button
                    key={value}
                    type="button"
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(value)}
                    aria-label={`${value} star`}
                    className="cursor-pointer p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 transition ${
                        filled
                          ? "fill-[var(--color-saffron)] text-[var(--color-saffron)]"
                          : "text-[var(--color-border)]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* message */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
              rows={4}
              placeholder="খাবারটি কেমন লেগেছে লিখুন..."
              className="w-full resize-none rounded-md border border-[var(--color-surface-soft)] bg-[var(--color-canvas)] px-3 py-2.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)]"
            />
            <p className="mt-1 text-right text-[11px] text-[var(--color-ink-faint)]">
              {message.length}/1000
            </p>
          </div>

          {/* photos */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
              Photos ({images.length}/{MAX_REVIEW_IMAGES})
            </label>
            <div className="flex flex-wrap gap-3">
              {images.map((img, idx) => (
                <div
                  key={img.public_id || idx}
                  className="relative h-20 w-20 overflow-hidden rounded-md ring-1 ring-[var(--color-surface-soft)]"
                >
                  <Image
                    src={img.url}
                    alt={`photo-${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {images.length < MAX_REVIEW_IMAGES && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[var(--color-border)] bg-[var(--color-canvas)] text-[var(--color-ink-faint)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand)]">
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                  <span className="text-[10px] font-medium">
                    {uploading ? "Uploading" : "Add"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploading}
                    className="hidden"
                    onChange={handleImagesChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* error */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-md bg-[var(--color-brand-soft)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-brand)] ring-1 ring-[var(--color-brand-soft)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* submit */}
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand)] py-3 text-sm font-bold text-white shadow-lg shadow-[var(--color-brand)]/25 transition hover:bg-[var(--color-chili)] disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {saving ? "Sending…" : existing ? "Update Review" : "Submit Review"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
