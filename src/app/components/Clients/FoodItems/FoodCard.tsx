"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
  review_rating?: number; // average, e.g. 4.6
  total_review?: number; // count of reviews behind that average
  view?: number; // page/card view count
  variations: VariationApi[];
  createdAt?: string;
  updatedAt?: string;
}

interface FoodCardProps {
  food: FoodItem;
  onAddToCart?: (food: FoodItem, variation: VariationApi, qty: number) => void;
  onBuyNow?: (food: FoodItem, variation: VariationApi, qty: number) => void;
}

const StarRating = ({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) => {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));
  return (
    <span
      className="relative inline-block leading-none tracking-[1.5px]"
      style={{ fontSize: size }}
    >
      <span className="text-gray-200">★★★★★</span>
      <span
        className="absolute inset-0 overflow-hidden text-amber-400"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  );
};

const EyeIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/** Rating + review count + view count — used in both the card and the modal. */
const FoodMeta = ({
  rating,
  totalReview,
  view,
  starSize = 12,
  textSize = "text-[10.5px]",
}: {
  rating: number;
  totalReview: number;
  view?: number;
  starSize?: number;
  textSize?: string;
}) => (
  <div className="flex items-center flex-wrap justify-start gap-x-3 gap-y-1">
    {totalReview > 0 ? (
      <>
        <div className="flex items-center gap-1.5">
          <StarRating rating={rating} size={starSize} />
          <span className={`${textSize} text-gray-500 font-medium`}>
            {rating.toFixed(1)} ({totalReview})
          </span>
        </div>
      </>
    ) : (
      <span className={`${textSize} text-gray-400 font-medium`}>
        No reviews yet
      </span>
    )}
    {typeof view === "number" && (
      <span className={`flex items-center gap-1 ${textSize} text-gray-400`}>
        <EyeIcon />
        {view}
      </span>
    )}
  </div>
);

const FoodCard = ({ food, onAddToCart, onBuyNow }: FoodCardProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVariationId, setSelectedVariationId] = useState<string>("");
  const [qty, setQty] = useState(1);

  const defaultVariation =
    food.variations.find((v) => v.is_default) || food.variations[0];

  const activeVariation =
    food.variations.find((v) => v._id === selectedVariationId) ||
    defaultVariation;

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
  const hasDescription =
    !!food.description && food.description.trim().length > 0;

  const openModal = () => {
    setSelectedVariationId(defaultVariation?._id || "");
    setQty(1);
    setModalOpen(true);
  };
  const closeModal = () => setModalOpen(false);

  const handleAddToCart = () => {
    if (!activeVariation) return;
    onAddToCart?.(food, activeVariation, qty);
  };

  const handleBuyNow = () => {
    if (!activeVariation) return;
    onBuyNow?.(food, activeVariation, qty);
  };

  if (!defaultVariation) return null;

  return (
    <>
      {/* ---------------- CARD ---------------- */}
      <div className="group rounded-[26px] transition-shadow duration-300 px-4 sm:px-5 pt-3 pb-5 flex flex-col items-center text-center">
        <div
          className="relative overflow-hidden w-full aspect-square bg-[#eef3f9] max-h-[288px] cursor-pointer"
          onClick={openModal}
        >
          {cardImage ? (
            <img
              src={cardImage}
              alt={food.name}
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              No Image
            </div>
          )}

          {/* badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {defaultVariation.spice_level === "Hot" && (
              <span className="w-8 h-8 rounded-full bg-green-600 text-white text-[10px] font-semibold flex items-center justify-center">
                Hot
              </span>
            )}
            {cardDiscount > 0 && (
              <span className="w-8 h-8 rounded-full bg-red-600 text-white text-[10px] font-semibold flex items-center justify-center">
                -{cardDiscount}%
              </span>
            )}
          </div>

          {/* view count */}
          {typeof food.view === "number" && (
            <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-white">
              <EyeIcon />
              {food.view}
            </span>
          )}
        </div>

        <Link href={`/foods/${food?._id}`} className="w-full">
          <h3 className="mt-4 text-[13px] font-bold tracking-wide text-gray-800 uppercase leading-snug line-clamp-2">
            {food.name}
          </h3>

          <p className="mt-1 text-[13px]">
            {cardDiscount > 0 && (
              <span className="line-through text-gray-400 mr-2">
                {defaultVariation.regularPrice.toFixed(2)}৳
              </span>
            )}
            <span className="text-red-600 font-bold">
              {defaultVariation.salePrice.toFixed(2)}৳
            </span>
          </p>
        </Link>

        {/* rating + review count (real data) */}
        <div className="mt-2">
          <FoodMeta rating={rating} totalReview={totalReview} />
        </div>

        {/* action buttons */}
        <div className="w-full flex flex-col mt-4">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full cursor-pointer border border-[#E21B70] text-[#E21B70] rounded-sm text-[12px] font-bold tracking-wide py-2.5 hover:bg-[#E21B70] hover:text-white transition-colors duration-300"
          >
            ADD TO CART
          </button>
        </div>
      </div>

      {/* ---------------- QUICK VIEW MODAL ---------------- */}
      {modalOpen && activeVariation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden relative shadow-xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-600 hover:text-gray-900"
              aria-label="Close"
            >
              ✕
            </button>

            {/* image */}
            <div className="relative max-h-[460px] bg-[#eef3f9] aspect-square md:aspect-auto flex items-center justify-center p-4 sm:p-6">
              {modalImage ? (
                <img
                  src={modalImage}
                  alt={food.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-300 text-sm">No Image</div>
              )}
              {modalDiscount > 0 && (
                <span className="absolute top-4 left-4 w-9 h-9 rounded-full bg-red-600 text-white text-[11px] font-semibold flex items-center justify-center">
                  -{modalDiscount}%
                </span>
              )}
            </div>

            {/* details */}
            <div className="p-5 sm:p-6 md:p-7 flex flex-col gap-4">
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  {food.category_name && (
                    <span className="text-[11px] font-semibold tracking-wide text-red-600 uppercase">
                      {food.category_name}
                    </span>
                  )}
                  {food.branch_name && (
                    <span className="text-[11px] font-medium text-gray-400">
                      📍 {food.branch_name}
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5 leading-snug">
                  {food.name}
                </h2>
              </div>

              {/* rating + review count + view (real data) */}
              <FoodMeta
                rating={rating}
                totalReview={totalReview}
                view={food.view}
                starSize={15}
                textSize="text-[12px]"
              />

              <p className="text-lg leading-none">
                {modalDiscount > 0 && (
                  <span className="line-through text-gray-400 mr-2 text-base align-middle">
                    {activeVariation.regularPrice.toFixed(2)}৳
                  </span>
                )}
                <span className="text-red-600 font-bold align-middle">
                  {activeVariation.salePrice.toFixed(2)}৳
                </span>
                {activeVariation.quantityLabel && (
                  <span className="text-gray-400 text-[12px] font-normal ml-2 align-middle">
                    / {activeVariation.quantityLabel}
                  </span>
                )}
              </p>

              {/* short description */}
              {hasDescription && (
                <p className="text-[13px] leading-relaxed text-gray-500 line-clamp-3">
                  {food.description}
                </p>
              )}

              <hr className="border-gray-100" />

              {/* variation selector */}
              {food.variations.length > 1 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
                    Choose Size
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {food.variations.map((v) => {
                      const isActive = v._id === activeVariation._id;
                      return (
                        <button
                          key={v._id}
                          type="button"
                          onClick={() => setSelectedVariationId(v._id)}
                          className={`px-4 py-2 rounded-full text-[12px] font-semibold border transition-colors ${
                            isActive
                              ? "bg-gray-900 border-gray-900 text-white"
                              : "border-gray-200 text-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {v.name}
                          <span
                            className={`ml-1.5 ${isActive ? "text-gray-300" : "text-gray-400"}`}
                          >
                            {v.salePrice.toFixed(0)}৳
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeVariation.spice_level &&
                activeVariation.spice_level !== "" && (
                  <span className="w-fit text-[11px] font-medium px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
                    🌶 {activeVariation.spice_level}
                  </span>
                )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1">
                <div className="flex items-center justify-center border border-gray-200 rounded-full w-fit mx-auto sm:mx-0">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 text-base"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center text-gray-600 text-base"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 h-10 rounded-full bg-gray-200 text-gray-800 text-[12px] font-semibold tracking-wide hover:bg-gray-300 transition-colors"
                >
                  ADD TO CART
                </button>
              </div>

              <button
                type="button"
                onClick={handleBuyNow}
                className="h-10 rounded-full cursor-pointer border border-gray-800 text-gray-800 text-[12px] font-semibold tracking-wide hover:bg-gray-800 hover:text-white transition-colors"
              >
                BUY IT NOW
              </button>
              <Link
                className="h-10 rounded-full cursor-pointer flex items-center justify-center text-center border border-green-800 text-green-800 text-[12px] font-semibold tracking-wide hover:bg-green-800 hover:text-white transition-colors"
                href={`/foods/${food?._id}`}
              >
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={handleBuyNow}
                >
                  VIEW FULL DETAILS
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FoodCard;
