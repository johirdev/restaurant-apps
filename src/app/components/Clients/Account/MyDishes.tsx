/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, Star, UtensilsCrossed } from "lucide-react";
import { apiGet, apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";

/* ==========================================================================
   যেসব খাবার আগে অর্ডার করা হয়েছে — GET /api/v1/users/me/dishes
   --------------------------------------------------------------------------
   ডেলিভার হয়ে যাওয়া খাবারেই কেবল রিভিউ দেওয়া যায় (`can_review`), তাই
   রিভিউ বক্সটা এখানেই — আলাদা পেজে যেতে হয় না।
   ========================================================================== */

interface Dish {
  food_id: string;
  name: string;
  image?: string;
  times: number;
  last_ordered: string;
  last_order_id: string;
  can_review: boolean;
}

interface MyReview {
  _id: string;
  food_id: string;
  rating: number;
  message?: string;
}

export default function MyDishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [reviewed, setReviewed] = useState<Record<string, MyReview>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // কোন খাবারের রিভিউ বক্স খোলা আছে
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // দুটো কল একসাথে — কোনটা খেয়েছি, আর কোনটায় রিভিউ দিয়ে ফেলেছি
      const [dishRes, reviewRes] = await Promise.all([
        apiGet<Dish[]>("/api/v1/users/me/dishes"),
        apiGet<MyReview[]>("/api/v1/reviews/mine"),
      ]);
      setDishes(dishRes.data ?? []);
      setReviewed(
        Object.fromEntries(
          (reviewRes.data ?? []).map((r) => [String(r.food_id), r]),
        ),
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (dish: Dish) => {
    setOpenFor(dish.food_id);
    setRating(0);
    setHovered(0);
    setMessage("");
  };

  const submitReview = async (dish: Dish) => {
    if (rating < 1) {
      toast.error("Please pick a star rating");
      return;
    }
    setPosting(true);
    try {
      const res = await apiPost<MyReview>("/api/v1/reviews", {
        food_id: dish.food_id,
        order_id: dish.last_order_id,
        rating,
        message: message.trim(),
      });
      toast.success(res.message);
      if (res.data) {
        setReviewed((prev) => ({ ...prev, [dish.food_id]: res.data }));
      }
      setOpenFor(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[118px] rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="site-card px-6 py-12 text-center">
        <p className="text-[14px] font-semibold text-chili">{error}</p>
        <button
          type="button"
          onClick={load}
          className="site-btn site-btn-outline mt-4 h-10 px-5 text-[13px]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!dishes.length) {
    return (
      <div className="site-card px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <UtensilsCrossed size={26} />
        </div>
        <h2 className="mt-4 text-[18px] font-bold text-ink">
          Nothing on your plate yet
        </h2>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
          Every dish you order shows up here, so you can reorder it or leave a
          review once it has been delivered.
        </p>
        <Link
          href="/foods"
          className="site-btn site-btn-primary mt-6 h-11 px-6 text-[14px]"
        >
          Find something to eat
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {dishes.map((dish) => {
        const myReview = reviewed[dish.food_id];
        const isOpen = openFor === dish.food_id;

        return (
          <article key={dish.food_id} className="site-card overflow-hidden">
            <div className="flex gap-4 p-4">
              <Link
                href={`/foods/${dish.food_id}`}
                className="h-[74px] w-[74px] flex-shrink-0 overflow-hidden rounded-sm bg-surface-soft"
              >
                {dish.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-ink-faint">
                    <UtensilsCrossed size={22} />
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/foods/${dish.food_id}`}
                  className="clamp-1 text-[14.5px] font-bold text-ink transition-colors hover:text-brand"
                >
                  {dish.name}
                </Link>
                <p className="mt-1 text-[12px] text-ink-soft">
                  Ordered {dish.times} time{dish.times === 1 ? "" : "s"} · last
                  on {DateTimeBd(dish.last_ordered)}
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {myReview ? (
                    <span className="site-badge site-badge-herb gap-1">
                      <Star size={11} fill="currentColor" />
                      You rated {myReview.rating}/5
                    </span>
                  ) : dish.can_review ? (
                    <button
                      type="button"
                      onClick={() => (isOpen ? setOpenFor(null) : openReview(dish))}
                      className="site-btn site-btn-secondary h-8 px-3 text-[12.5px]"
                    >
                      <Star size={13} /> {isOpen ? "Cancel" : "Write a review"}
                    </button>
                  ) : (
                    <span className="site-badge site-badge-muted">
                      Review opens after delivery
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ---------- রিভিউ বক্স ---------- */}
            {isOpen && !myReview && (
              <div className="border-t border-border bg-canvas px-4 py-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={22}
                        className={
                          star <= (hovered || rating)
                            ? "text-saffron"
                            : "text-ink-faint"
                        }
                        fill={
                          star <= (hovered || rating) ? "currentColor" : "none"
                        }
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="How was it? (optional)"
                  className="site-input mt-3 resize-none px-3 py-2.5 text-[13.5px]"
                />

                <button
                  type="button"
                  onClick={() => submitReview(dish)}
                  disabled={posting || rating < 1}
                  className="site-btn site-btn-primary mt-3 h-10 w-full text-[13.5px]"
                >
                  {posting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Posting…
                    </>
                  ) : (
                    "Post review"
                  )}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
