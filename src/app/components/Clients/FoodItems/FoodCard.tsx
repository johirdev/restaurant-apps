"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Eye, Minus, Plus, ShoppingBag, Star, X, Flame } from "lucide-react";
import { useCartStore } from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";

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
      <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[var(--shadow-float)]">
        {/* ছবি */}
        <div
          className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-surface-soft"
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
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-ink-faint">
              No Image
            </div>
          )}

          {/* ব্যাজ */}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {cardDiscount > 0 && (
              <span className="site-badge bg-brand text-ink-invert shadow-[var(--shadow-raised)]">
                -{cardDiscount}% OFF
              </span>
            )}
            {defaultVariation.spice_level === "Hot" && (
              <span className="site-badge site-badge-chili">
                <Flame size={11} /> Spicy
              </span>
            )}
          </div>

          {isSoldOut && (
            <div className="absolute inset-0 grid place-items-center bg-ink/55">
              <span className="site-badge bg-surface text-ink">Sold out</span>
            </div>
          )}

          {/* কুইক ভিউ ইঙ্গিত */}
          <span className="pointer-events-none absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-ink/60 px-2.5 py-1 text-[10.5px] font-semibold text-ink-invert opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <Eye size={11} /> Quick view
          </span>
        </div>

        {/* বিবরণ */}
        <div className="flex flex-1 flex-col gap-2 p-3.5">
          {food.category_name && (
            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-brand">
              {food.category_name}
            </span>
          )}

          <Link href={`/foods/${food._id}`} className="group/link">
            <h3 className="clamp-2 font-display text-[15px] font-bold leading-snug text-ink transition-colors group-hover/link:text-brand">
              {food.name}
            </h3>
          </Link>

          <FoodMeta rating={rating} totalReview={totalReview} />

          {hasDescription && (
            <p className="clamp-2 text-[12px] leading-relaxed text-ink-faint">
              {food.description}
            </p>
          )}

          {/* দাম + যোগ করার বাটন */}
          <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
            <div>
              {cardDiscount > 0 && (
                <span className="block text-[11.5px] text-ink-faint line-through">
                  {formatMoney(defaultVariation.regularPrice)}
                </span>
              )}
              <span className="font-display text-[18px] font-extrabold leading-none text-ink">
                {formatMoney(defaultVariation.salePrice)}
              </span>
              {defaultVariation.quantityLabel && (
                <span className="ml-1 text-[11px] text-ink-faint">
                  / {defaultVariation.quantityLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={isSoldOut}
              aria-label={`Add ${food.name} to cart`}
              className="site-btn site-btn-primary h-10 w-10 shrink-0 !p-0"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
        </div>
      </article>

      {/* ---------------- QUICK VIEW MODAL ---------------- */}
      {modalOpen && activeVariation && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/55 p-3 backdrop-blur-[2px] sm:p-4"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="pop-in relative grid max-h-[92vh] w-full max-w-3xl grid-cols-1 overflow-y-auto rounded-lg bg-surface shadow-[var(--shadow-lifted)] md:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-surface/90 text-ink-soft shadow-[var(--shadow-raised)] transition-colors hover:text-ink"
              aria-label="Close"
            >
              <X size={17} />
            </button>

            {/* ছবি */}
            <div className="relative flex aspect-square items-center justify-center bg-surface-soft p-5 md:aspect-auto">
              {modalImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={modalImage}
                  alt={food.name}
                  className="h-full max-h-[430px] w-full object-contain"
                />
              ) : (
                <div className="text-sm text-ink-faint">No Image</div>
              )}
              {modalDiscount > 0 && (
                <span className="site-badge absolute left-4 top-4 bg-brand text-ink-invert">
                  -{modalDiscount}% OFF
                </span>
              )}
            </div>

            {/* বিস্তারিত */}
            <div className="flex flex-col gap-4 p-5 sm:p-6 md:p-7">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {food.category_name && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand">
                      {food.category_name}
                    </span>
                  )}
                  {food.branch_name && (
                    <span className="text-[11px] font-medium text-ink-faint">
                      📍 {food.branch_name}
                    </span>
                  )}
                </div>
                <h2 className="mt-1 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                  {food.name}
                </h2>
              </div>

              <FoodMeta
                rating={rating}
                totalReview={totalReview}
                view={food.view}
                starSize={15}
                textSize="text-[12px]"
              />

              <p className="flex items-baseline gap-2">
                {modalDiscount > 0 && (
                  <span className="text-base text-ink-faint line-through">
                    {formatMoney(activeVariation.regularPrice)}
                  </span>
                )}
                <span className="font-display text-2xl font-extrabold text-brand">
                  {formatMoney(activeVariation.salePrice)}
                </span>
                {activeVariation.quantityLabel && (
                  <span className="text-[12px] font-normal text-ink-faint">
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
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-bold uppercase tracking-wide text-ink">
                    Choose size
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {food.variations.map((v) => {
                      const isActive = v._id === activeVariation._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => setSelectedVariationId(v._id)}
                          className={`rounded-pill border px-4 py-2 text-[12px] font-bold transition-colors ${
                            isActive
                              ? "border-brand bg-brand text-ink-invert"
                              : "border-border text-ink-soft hover:border-brand hover:text-brand"
                          }`}
                        >
                          {v.name}
                          <span className={`ml-1.5 ${isActive ? "opacity-80" : "text-ink-faint"}`}>
                            {formatMoney(v.salePrice)}
                          </span>
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
                <div className="mx-auto flex w-fit items-center rounded-pill border border-border sm:mx-0">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="grid h-10 w-10 place-items-center rounded-pill text-ink-soft transition-colors hover:bg-surface-soft"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(50, q + 1))}
                    aria-label="Increase quantity"
                    className="grid h-10 w-10 place-items-center rounded-pill text-brand transition-colors hover:bg-brand-soft"
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
