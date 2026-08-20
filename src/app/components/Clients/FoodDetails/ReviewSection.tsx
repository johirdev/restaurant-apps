// src/app/(site)/foods/[id]/ReviewSection.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star,
  X,
  ImagePlus,
  Send,
  AlertCircle,
  User as UserIcon,
  Camera,
} from "lucide-react";

/* ---------------- Types (static / dummy for now) ---------------- */

export interface ReviewImage {
  url: string;
  public_id: string;
}

export interface Review {
  _id: string;
  user_name: string;
  user_avatar: string;
  order_id: string;
  food_id: string;
  message: string;
  rating: number; // 1 - 5
  images: ReviewImage[];
  createdAt: string;
}

/* ---------------- Static dummy reviews (replace with API data later) ---------------- */

const STATIC_REVIEWS: Review[] = [
  {
    _id: "rev_1",
    user_name: "Tanvir Ahmed",
    user_avatar: "https://i.pravatar.cc/150?img=12",
    order_id: "ORD-10293",
    food_id: "food_1",
    message:
      "Test যেভাবে খেতে বলা হয়েছিল ঠিক সেভাবেই পেয়েছি — গরম, ফ্রেশ আর টেস্ট দারুণ ছিল। আবার অর্ডার করবো।",
    rating: 5,
    images: [
      { url: "https://picsum.photos/seed/rev1a/300/300", public_id: "rev1a" },
      { url: "https://picsum.photos/seed/rev1b/300/300", public_id: "rev1b" },
    ],
    createdAt: "2025-06-01T10:00:00.000Z",
  },
  {
    _id: "rev_2",
    user_name: "Sadia Islam",
    user_avatar: "https://i.pravatar.cc/150?img=32",
    order_id: "ORD-10310",
    food_id: "food_1",
    message: "খুবই ভালো লেগেছে, তবে ডেলিভারি একটু দেরি হয়েছিল।",
    rating: 4,
    images: [],
    createdAt: "2025-06-03T14:30:00.000Z",
  },
  {
    _id: "rev_3",
    user_name: "Rakibul Hasan",
    user_avatar: "https://i.pravatar.cc/150?img=51",
    order_id: "ORD-10355",
    food_id: "food_1",
    message: "Portion size টা আরেকটু বড় হলে ভালো হতো, বাকি সব ঠিক আছে।",
    rating: 3,
    images: [
      { url: "https://picsum.photos/seed/rev3a/300/300", public_id: "rev3a" },
    ],
    createdAt: "2025-06-05T09:15:00.000Z",
  },
];

/* ---------------- Helpers ---------------- */

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const getInitial = (name: string) => name.trim().charAt(0).toUpperCase();

/* ---------------- Main exported section ---------------- */

interface ReviewSectionProps {
  foodId: string;
  foodName: string;
}

const ReviewSection = ({ foodId, foodName }: ReviewSectionProps) => {
  const [showForm, setShowForm] = useState(false);
  const reviews = STATIC_REVIEWS; // TODO: replace with API fetch by foodId

  return (
    <div className="mx-auto mt-4 max-width border-t border-[#F0E9E1] px-4 pt-8 lg:px-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] md:text-[20px] font-extrabold text-[#161B33]">
          Customer Reviews{" "}
          <span className="text-[#8A7F72] font-medium text-sm">
            ({reviews.length})
          </span>
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex-shrink-0 rounded-full bg-[#E21B70] px-4 py-2.5 text-[12px] md:text-[13px] font-bold text-white shadow-md shadow-[#E21B70]/25 transition hover:bg-[#C92C42] cursor-pointer"
        >
          Write a Review
        </button>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-6 text-sm text-[#8A7F72]">
          No reviews yet. Be the first to review {foodName}.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review._id} review={review} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <ReviewFormModal foodId={foodId} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewSection;

/* ---------------- Review card ---------------- */

const ReviewCard = ({ review }: { review: Review }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#F0E9E1] sm:p-5">
    <div className="flex items-start gap-3">
      <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-[#F0E9E1]">
        {review?.user_avatar ? (
          <Image
            // src={review?.user_avatar}
            src={"/site-page.png"}
            alt={review.user_name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#FFF1F3] text-sm font-bold text-[#E21B70]">
            {getInitial(review.user_name)}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-1">
          <p className="truncate text-[13px] md:text-[14px] font-bold text-[#161B33]">
            {review.user_name}
          </p>
          <span className="text-[11px] text-[#8A7F72]">
            {formatDate(review.createdAt)}
          </span>
        </div>

        <div className="mt-0.5 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3.5 w-3.5 ${
                i < review.rating
                  ? "fill-[#F5B93D] text-[#F5B93D]"
                  : "text-[#E6DACB]"
              }`}
            />
          ))}
          <span className="ml-1 text-[11px] text-[#8A7F72]">
            Order #{review.order_id}
          </span>
        </div>

        <p className="mt-2 text-[13px] leading-relaxed text-[#4A4238]">
          {review.message}
        </p>

        {review?.images?.length > 0 && (
          <div className="mt-3 flex gap-2">
            {review?.images?.map((img) => (
              <div
                key={img.public_id}
                className="relative h-16 w-16 overflow-hidden rounded-md ring-1 ring-[#F0E9E1]"
              >
                <Image
                  src={img?.url}
                  alt="review attachment"
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
);

/* ---------------- Write a review — modal form (static, non-functional submit) ---------------- */

interface ReviewFormModalProps {
  foodId: string;
  onClose: () => void;
}

const MAX_REVIEW_IMAGES = 2;

const ReviewFormModal = ({ foodId, onClose }: ReviewFormModalProps) => {
  const [name, setName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setImagePreviews((prev) => {
      const merged = [...prev, ...files.map((f) => URL.createObjectURL(f))];
      return merged.slice(0, MAX_REVIEW_IMAGES);
    });
  };

  const removeImage = (idx: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    // 🔌 Static for now — backend/API wiring hobe pore.
    setErrorMsg(
      "Review submit করা যাচ্ছে না। এই ফিচারটি এখনো active করা হয়নি, শীঘ্রই চালু হবে।",
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
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
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] md:text-[18px] font-extrabold text-[#161B33]">
            Write a Review
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F5EFE6] text-[#161B33] transition hover:bg-[#F0E9E1] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* profile picture + name */}
          <div className="flex items-center gap-4">
            <label className="relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-[#F5EFE6] ring-1 ring-[#F0E9E1]">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Profile preview"
                  fill
                  className="object-cover"
                />
              ) : (
                <UserIcon className="h-6 w-6 text-[#B7AB9C]" />
              )}
              <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#E21B70] text-white ring-2 ring-white">
                <Camera className="h-2.5 w-2.5" />
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>

            <div className="flex-1">
              <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tanvir Ahmed"
                className="w-full rounded-md border border-[#F0E9E1] bg-[#FFFBF7] px-3 py-2.5 text-sm text-[#161B33] outline-none transition focus:border-[#E21B70]"
              />
            </div>
          </div>

          {/* order id + food id */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
                Order ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="ORD-10293"
                className="w-full rounded-md border border-[#F0E9E1] bg-[#FFFBF7] px-3 py-2.5 text-sm text-[#161B33] outline-none transition focus:border-[#E21B70]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
                Food ID
              </label>
              <input
                type="text"
                value={foodId}
                disabled
                readOnly
                className="w-full cursor-not-allowed rounded-md border border-[#F0E9E1] bg-[#F5EFE6] px-3 py-2.5 text-sm text-[#8A7F72] outline-none"
              />
            </div>
          </div>

          {/* rating */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
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
                    className="cursor-pointer p-0.5"
                  >
                    <Star
                      className={`h-7 w-7 transition ${
                        filled
                          ? "fill-[#F5B93D] text-[#F5B93D]"
                          : "text-[#E6DACB]"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* message */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="খাবারটি কেমন লেগেছে লিখুন..."
              className="w-full resize-none rounded-md border border-[#F0E9E1] bg-[#FFFBF7] px-3 py-2.5 text-sm text-[#161B33] outline-none transition focus:border-[#E21B70]"
            />
          </div>

          {/* image uploads (max 2) */}
          <div>
            <label className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-[#8A7F72]">
              Photos ({imagePreviews.length}/{MAX_REVIEW_IMAGES})
            </label>
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((src, idx) => (
                <div
                  key={idx}
                  className="relative h-20 w-20 overflow-hidden rounded-md ring-1 ring-[#F0E9E1]"
                >
                  <Image
                    src={src}
                    alt={`upload-${idx}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {imagePreviews.length < MAX_REVIEW_IMAGES && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-[#E6DACB] bg-[#FFFBF7] text-[#B7AB9C] transition hover:border-[#E21B70] hover:text-[#E21B70]">
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImagesChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* error message (static submit) */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-md bg-[#FFF1F3] px-3 py-2.5 text-[13px] font-medium text-[#E21B70] ring-1 ring-[#FBD3DD]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* submit */}
          <button
            onClick={handleSubmit}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#E21B70] py-3 text-sm font-bold text-white shadow-lg shadow-[#E21B70]/25 transition hover:bg-[#C92C42] cursor-pointer"
          >
            <Send className="h-4 w-4" />
            Submit Review
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
