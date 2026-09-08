/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-toastify";
import { Star, Trash2, Search, RotateCcw, MessageSquareOff } from "lucide-react";

import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import DeleteModal from "@/src/app/Layout/DeleteModal/DeleteModal";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";

/* ==========================================================================
   রিভিউ মডারেশন — GET /api/v1/reviews/all
   --------------------------------------------------------------------------
   কাস্টমারের লেখা রিভিউ এখানে এক তালিকায় আসে। মালিক (superadmin/admin)
   যেকোনোটা মুছে ফেলতে পারে — মুছলে ঐ খাবারের গড় রেটিং সার্ভারেই আবার
   হিসাব হয়ে যায়, তাই মেনু পেজেও সাথে সাথে ঠিকটা দেখায়।
   ========================================================================== */

interface ReviewFood {
  _id: string;
  name?: string;
  image?: string;
}

interface AdminReview {
  _id: string;
  user_id: string;
  user_name: string;
  user_image: string;
  /** populate করা হয় — তাই স্ট্রিং নয়, ছোট একটা অবজেক্ট */
  food_id: ReviewFood | string;
  order_number: string;
  rating: number;
  message: string;
  images: { url: string; public_id?: string }[];
  createdAt: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

const PAGE_SIZE = 12;
const RATINGS = [5, 4, 3, 2, 1];

const foodOf = (review: AdminReview): ReviewFood =>
  typeof review.food_id === "string"
    ? { _id: review.food_id }
    : (review.food_id ?? { _id: "" });

const Stars = ({ value }: { value: number }) => (
  <span className="flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        size={13}
        className={
          i < value ? "fill-amber-400 text-amber-400" : "text-muted opacity-40"
        }
      />
    ))}
  </span>
);

export default function ReviewsManager() {
  const { token, adminData } = useContext(AuthContext);
  // পাতাটাই মালিকদের, তবু বোতামটা রোল দেখে বসাই — ভুল করে কেউ যেন না চাপে
  const canDelete =
    adminData?.role === "superadmin" || adminData?.role === "admin";

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchDraft, setSearchDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [rating, setRating] = useState<string>("");
  const [page, setPage] = useState(1);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  /* ---------------- তালিকা ---------------- */
  const fetchReviews = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      };
      // খালি ফিল্টার পাঠালে সার্ভারে `field: ""` হয়ে সব ফলাফল হারিয়ে যায়
      if (searchTerm) params.searchTerm = searchTerm;
      if (rating) params.rating = rating;

      const res = await axios.get("/api/v1/reviews/all", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setReviews(res.data.data || []);
      setMeta(res.data.meta || null);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [token, page, searchTerm, rating]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* ---------------- সার্চ ডিবাউন্স ---------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm((prev) =>
        prev === searchDraft.trim() ? prev : searchDraft.trim(),
      );
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  const resetFilters = () => {
    setSearchDraft("");
    setSearchTerm("");
    setRating("");
    setPage(1);
  };

  const handleDeleted = () => {
    if (deleteId) setReviews((prev) => prev.filter((r) => r._id !== deleteId));
    setDeleteId(null);
    // মুছে ফেলার পর পাতাটা ফাঁকা হয়ে গেলে আগের পাতায় ফিরে যাই
    if (reviews.length === 1 && page > 1) setPage((p) => p - 1);
    else fetchReviews();
  };

  const totalPage = meta?.totalPage ?? 1;
  const hasFilters = !!searchTerm || !!rating;

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {deleteId && (
        <DeleteModal
          deleteUrl={`/api/v1/reviews/${deleteId}`}
          title="Review"
          onDeleted={handleDeleted}
          closeModal={() => setDeleteId(null)}
        />
      )}

      {/* ================= হেডার ================= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-primary text-[20px] font-semibold">Reviews</h1>
          <p className="text-secondary mt-0.5 text-[13px]">
            {meta
              ? `${meta.total} review${meta.total === 1 ? "" : "s"} from customers`
              : "What customers wrote about the dishes"}
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="btn btn-outline flex items-center gap-2 px-4 py-2 text-[13px]"
          >
            <RotateCcw size={14} />
            Clear filters
          </button>
        )}
      </div>

      {/* ================= ফিল্টার ================= */}
      <div className="admin-card mb-5 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by customer, message or order number"
            className="input-field w-full py-2 pl-9 pr-3 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setRating("");
              setPage(1);
            }}
            className={`btn px-3 py-1.5 text-[12px] ${
              rating === "" ? "btn-primary" : "btn-outline"
            }`}
          >
            All
          </button>
          {RATINGS.map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setRating(String(star));
                setPage(1);
              }}
              className={`btn flex items-center gap-1 px-3 py-1.5 text-[12px] ${
                rating === String(star) ? "btn-primary" : "btn-outline"
              }`}
            >
              {star}
              <Star size={12} className="fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* ================= তালিকা ================= */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-40 rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="admin-card flex flex-col items-center gap-2 p-10 text-center">
          <MessageSquareOff size={28} className="text-muted" />
          <p className="text-primary text-[15px] font-medium">
            {hasFilters ? "No review matches these filters" : "No reviews yet"}
          </p>
          <p className="text-secondary text-[13px]">
            Customers can review a dish once their order with it is delivered.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((review) => {
            const food = foodOf(review);
            return (
              <div key={review._id} className="admin-card p-4">
                {/* খাবার */}
                <div className="border-default-b flex items-center gap-3 pb-3">
                  <div className="bg-elevated relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg">
                    {food.image && (
                      <Image
                        src={food.image}
                        alt={food.name || "dish"}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/foods/${food._id}`}
                      target="_blank"
                      className="text-primary hover:text-accent block truncate text-[14px] font-semibold"
                    >
                      {food.name || "Deleted dish"}
                    </Link>
                    {review.order_number && (
                      <p className="text-muted text-[11px]">
                        Order #{review.order_number}
                      </p>
                    )}
                  </div>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteId(review._id)}
                      title="Remove this review"
                      className="btn btn-danger flex h-8 w-8 items-center justify-center p-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* কাস্টমার + রেটিং */}
                <div className="mt-3 flex items-start gap-3">
                  <div className="bg-elevated text-secondary relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
                    {review.user_image ? (
                      <Image
                        src={review.user_image}
                        alt={review.user_name || "customer"}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[13px] font-semibold">
                        {(review.user_name || "C").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-primary truncate text-[13px] font-semibold">
                        {review.user_name || "Customer"}
                      </p>
                      <span className="text-muted text-[11px]">
                        {DateTimeBd(review.createdAt)}
                      </span>
                    </div>

                    <div className="mt-1">
                      <Stars value={review.rating} />
                    </div>

                    {review.message && (
                      <p className="text-secondary mt-2 whitespace-pre-line text-[13px] leading-relaxed">
                        {review.message}
                      </p>
                    )}

                    {review.images?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {review.images.map((img, idx) => (
                          <a
                            key={img.public_id || idx}
                            href={img.url}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-elevated relative h-14 w-14 overflow-hidden rounded-md"
                          >
                            <Image
                              src={img.url}
                              alt={`review photo ${idx + 1}`}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= পেজিনেশন ================= */}
      {totalPage > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="btn btn-outline px-4 py-2 text-[13px]"
          >
            Previous
          </button>
          <span className="text-secondary text-[13px]">
            Page {page} of {totalPage}
          </span>
          <button
            type="button"
            disabled={page >= totalPage}
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            className="btn btn-outline px-4 py-2 text-[13px]"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
