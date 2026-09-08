"use client";

/**
 * FoodCard — মেনুর একটা খাবারের কার্ড + কুইক-ভিউ মোডাল
 * --------------------------------------------------------------------------
 * কার্ডটা মাউসের দিকে হেলে পড়ে (pointer → --rx/--ry), ভেতরের লেখা আর
 * "+" বাটনটা translateZ দিয়ে সামনে ভেসে থাকে, আর মাউসের নিচে নরম আলো ঘোরে।
 * পুরো স্টাইলটা foodCard.css এ — এখানে শুধু আচরণ।
 *
 * একাধিক সাইজ (variation) থাকলে "+" সরাসরি কার্টে না দিয়ে কুইক-ভিউ খোলে,
 * কারণ কোন সাইজটা চাই সেটা কাস্টমারেরই ঠিক করার কথা।
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { toast } from "react-hot-toast";
import { Eye, Minus, Plus, ShoppingBag, Star, X, Flame } from "lucide-react";
import { useCartStore } from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";

import "./foodCard.css";

interface VariationImage {
  url: string;
  public_id?: string;
}

interface VariationApi {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  regularPrice: number;
  salePrice: number;
  discountType?: "none" | "percentage" | "flat";
  discountValue?: number;
  is_default?: boolean;
  quantityLabel?: string;
  spice_level?: string;
  status?: string;
  stock_quantity?: number;
  images?: VariationImage[];
}

export interface FoodItem {
  _id: string;
  branch_id?: string;
  branch_name?: string;
  category_id?: string;
  category_name?: string;
  name: string;
  description?: string;
  image?: string;
  image_public_id?: string;
  status?: "active" | "inactive";
  review_rating?: number;
  total_review?: number;
  view?: number;
  variations: VariationApi[];
  createdAt?: string;
  updatedAt?: string;
}

interface FoodCardProps {
  food: FoodItem;
}

/* ==========================================================================
   ছোট ছোট শেয়ার্ড পিস
   ========================================================================== */

const StarRating = ({ rating, size = 13 }: { rating: number; size?: number }) => {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span
      className="relative inline-flex leading-none"
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <span className="flex text-border-strong">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
      <span
        className="absolute inset-0 flex overflow-hidden text-saffron"
        style={{ width: `${pct}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} size={size} fill="currentColor" strokeWidth={0} />
        ))}
      </span>
    </span>
  );
};

const FoodMeta = ({
  rating,
  totalReview,
  view,
  starSize = 12,
  textSize = "text-[11px]",
}: {
  rating: number;
  totalReview: number;
  view?: number;
  starSize?: number;
  textSize?: string;
}) => (
  <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1">
    {totalReview > 0 ? (
      <span className="flex items-center gap-1.5">
        <StarRating rating={rating} size={starSize} />
        <span className={`${textSize} font-semibold text-ink-soft`}>
          {rating.toFixed(1)} ({totalReview})
        </span>
      </span>
    ) : (
      <span className={`${textSize} font-medium text-ink-faint`}>No reviews yet</span>
    )}
    {typeof view === "number" && (
      <span className={`flex items-center gap-1 ${textSize} text-ink-faint`}>
        <Eye size={12} />
        {view}
      </span>
    )}
  </div>
);

/* ==========================================================================
   FOOD CARD
   ========================================================================== */
const FoodCard = ({ food }: FoodCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [qty, setQty] = useState(1);

  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  /* মোডাল খোলা থাকলে পেছনের পেজ স্ক্রল করবে না */
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  const defaultVariation =
    food.variations.find((v) => v.is_default) || food.variations[0];

  const activeVariation =
    food.variations.find((v) => v._id === selectedVariationId) || defaultVariation;

  const cardImage = food.image || defaultVariation?.images?.[0]?.url;
  const modalImage = activeVariation?.images?.[0]?.url || food.image;

  const discountPercent = (v?: VariationApi) =>
    v && v.regularPrice > v.salePrice
      ? Math.round((1 - v.salePrice / v.regularPrice) * 100)
      : 0;

  const cardDiscount = useMemo(
    () => discountPercent(defaultVariation),
    [defaultVariation],
  );
  const modalDiscount = useMemo(
    () => discountPercent(activeVariation),
    [activeVariation],
  );

  const rating = food.review_rating ?? 0;
  const totalReview = food.total_review ?? 0;
  const hasDescription = !!food.description?.trim();
  const isSoldOut =
    typeof defaultVariation?.stock_quantity === "number" &&
    defaultVariation.stock_quantity <= 0;

  const openModal = () => {
    setSelectedVariationId(defaultVariation?._id || "");
    setQty(1);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  /* মাউস কার্ডের কোথায় আছে সেটা CSS ভ্যারিয়েবলে পাঠাই — বাকিটা CSS বোঝে */
  const handleMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;

    card.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
    card.style.setProperty("--mx", `${((px + 0.5) * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const handleLeave = (event: ReactPointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  };

  /** কার্টে যোগ করে — একাধিক ভ্যারিয়েশন থাকলে আগে সাইজ বাছতে বলে */
  const addToCart = (variation: VariationApi, quantity: number, thenOpenCart = true) => {
    addItem({
      food_id: food._id,
      variation_id: variation._id,
      name: food.name,
      variation_name: variation.name,
      image: variation.images?.[0]?.url || food.image,
      regular_price: variation.regularPrice,
      unit_price: variation.salePrice ?? variation.regularPrice,
      spice_level: variation.spice_level,
      max_quantity: variation.stock_quantity,
      quantity,
    });

    toast.success(`${food.name} added to cart`);
    if (thenOpenCart) openCart();
  };

  const handleQuickAdd = () => {
    if (!defaultVariation) return;
    // একাধিক সাইজ থাকলে সরাসরি যোগ না করে মোডাল খুলি — কাস্টমার নিজে বেছে নেবে
    if (food.variations.length > 1) {
      openModal();
      return;
    }
    addToCart(defaultVariation, 1);
  };

  if (!defaultVariation) return null;

  return (
    <>
      {/* ---------------- CARD ---------------- */}
      <article
        className="food3d"
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        {/* ছবি */}
        <div
          className="food3d__media"
          onClick={openModal}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && openModal()}
          aria-label={`Quick view ${food.name}`}
        >
          {cardImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardImage}
              alt={food.name}
              className="food3d__img"
              loading="lazy"
            />
          ) : (
            <div className="food3d__empty">No Image</div>
          )}

          <span className="food3d__shine" aria-hidden="true" />

          {/* ব্যাজ */}
          <div className="food3d__badges">
            {cardDiscount > 0 && (
              <span className="food3d__badge food3d__badge--off">
                -{cardDiscount}% OFF
              </span>
            )}
            {defaultVariation.spice_level === "Hot" && (
              <span className="food3d__badge food3d__badge--spicy">
                <Flame size={11} /> Spicy
              </span>
            )}
          </div>

          {isSoldOut && (
            <div className="food3d__soldout">
              <span>Sold out</span>
            </div>
          )}

          {/* কুইক ভিউ ইঙ্গিত */}
          <span className="food3d__quick">
            <Eye size={12} /> Quick view
          </span>
        </div>

        {/* বিবরণ */}
        <div className="food3d__body">
          {food.category_name && (
            <span className="food3d__cat">{food.category_name}</span>
          )}

          <Link href={`/foods/${food._id}`}>
            <h3 className="food3d__title clamp-2">{food.name}</h3>
          </Link>

          <FoodMeta rating={rating} totalReview={totalReview} />

          {hasDescription && (
            <p className="food3d__desc clamp-2">{food.description}</p>
          )}

          {/* দাম + যোগ করার বাটন */}
          <div className="food3d__foot">
            <div>
              {cardDiscount > 0 && (
                <span className="food3d__was">
                  {formatMoney(defaultVariation.regularPrice)}
                </span>
              )}
              <span className="food3d__price">
                {formatMoney(defaultVariation.salePrice)}
              </span>
              {defaultVariation.quantityLabel && (
                <span className="food3d__unit">
                  / {defaultVariation.quantityLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              aria-label={`Add ${food.name} to cart`}
              className="food3d__add"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </article>

      {/* ---------------- QUICK VIEW MODAL ---------------- */}
      {modalOpen && activeVariation && (
        <div
          className="qv-backdrop"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div className="qv-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={closeModal}
              className="qv-close"
              aria-label="Close"
            >
              <X size={17} />
            </button>

            {/* ছবি */}
            <div className="qv-media">
              <span className="qv-media__ring" aria-hidden="true" />
              {modalImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modalImage} alt={food.name} />
              ) : (
                <div className="text-sm text-ink-faint">No Image</div>
              )}
              {modalDiscount > 0 && (
                <span className="food3d__badge food3d__badge--off absolute left-4 top-4">
                  -{modalDiscount}% OFF
                </span>
              )}
            </div>

            {/* বিস্তারিত */}
            <div className="qv-body">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {food.category_name && (
                    <span className="food3d__cat">{food.category_name}</span>
                  )}
                  {food.branch_name && (
                    <span className="text-[11px] font-medium text-ink-faint">
                      📍 {food.branch_name}
                    </span>
                  )}
                </div>
                <h2 className="qv-title">{food.name}</h2>
              </div>

              <FoodMeta
                rating={rating}
                totalReview={totalReview}
                view={food.view}
                starSize={15}
                textSize="text-[12px]"
              />

              <p className="qv-price">
                <span className="qv-price__now">
                  {formatMoney(activeVariation.salePrice)}
                </span>
                {modalDiscount > 0 && (
                  <span className="qv-price__was">
                    {formatMoney(activeVariation.regularPrice)}
                  </span>
                )}
                {activeVariation.quantityLabel && (
                  <span className="text-[12px] text-ink-faint">
                    / {activeVariation.quantityLabel}
                  </span>
                )}
              </p>

              {hasDescription && (
                <p className="clamp-3 text-[13px] leading-relaxed text-ink-soft">
                  {food.description}
                </p>
              )}

              <hr className="border-border" />

              {/* সাইজ / ভ্যারিয়েশন */}
              {food.variations.length > 1 && (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink">
                    Choose size
                  </span>
                  <div className="qv-sizes">
                    {food.variations.map((v) => {
                      const isActive = v._id === activeVariation._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => setSelectedVariationId(v._id)}
                          className={`qv-size${isActive ? " is-active" : ""}`}
                        >
                          {v.name}
                          <span>{formatMoney(v.salePrice)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeVariation.spice_level && (
                <span className="site-badge site-badge-saffron w-fit">
                  <Flame size={11} /> {activeVariation.spice_level}
                </span>
              )}

              {/* কোয়ান্টিটি + কার্ট */}
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="qv-qty mx-auto sm:mx-0">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>
                  <span>{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(50, q + 1))}
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(activeVariation, qty, false);
                    closeModal();
                  }}
                  className="site-btn site-btn-outline h-11 flex-1 text-[12.5px] uppercase tracking-wide"
                >
                  <ShoppingBag size={15} /> Add to cart
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  addToCart(activeVariation, qty);
                  closeModal();
                }}
                className="site-btn site-btn-primary h-11 text-[12.5px] uppercase tracking-wide"
              >
                Order now
              </button>

              <Link
                href={`/foods/${food._id}`}
                onClick={closeModal}
                className="site-btn site-btn-ghost h-10 text-[12.5px] uppercase tracking-wide"
              >
                View full details
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FoodCard;
