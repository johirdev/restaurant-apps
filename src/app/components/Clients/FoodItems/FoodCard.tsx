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
  name: string;
  category_id?: string;
  category_name?: string;
  image?: string;
  image_public_id?: string;
  status?: "active" | "inactive";
  variations: VariationApi[];
  createdAt?: string;
}

interface FoodCardProps {
  food: FoodItem;
  onAddToCart?: (food: FoodItem, variation: VariationApi, qty: number) => void;
  onBuyNow?: (food: FoodItem, variation: VariationApi, qty: number) => void;
}

const SteamIcon = () => (
  <svg
    width="34"
    height="16"
    viewBox="0 0 34 16"
    fill="none"
    className="text-red-500"
  >
    <path
      d="M4 14c2-3-2-5 0-8s-2-5 0-8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M17 14c2-3-2-5 0-8s-2-5 0-8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M30 14c2-3-2-5 0-8s-2-5 0-8"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
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
      <div className="group bg-white rounded-[26px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.10)] transition-shadow duration-300 px-5 pt-3 pb-5 flex flex-col items-center text-center">
        {/* steam icon — hidden until hover, fades + slides down in */}
        <div className="h-4 mb-1 flex items-center justify-center opacity-0 -translate-y-1.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
          <SteamIcon />
        </div>

        <div
          className="relative w-full aspect-square cursor-pointer"
          onClick={openModal}
        >
          {cardImage ? (
            <img
              src={cardImage}
              alt={food.name}
              className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
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
        </div>

        <h3 className="mt-4 text-[13px] font-bold tracking-wide text-gray-800 uppercase leading-snug">
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

        {/* action buttons */}
        <div className="w-full flex flex-col mt-4">
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full cursor-pointer border border-gray-800 text-gray-800 rounded-full text-[11px] font-semibold tracking-wide py-2.5 hover:bg-gray-800 hover:text-white transition-colors duration-300"
          >
            ADD TO CART
          </button>

          {/* View Details — collapsed by default, expands smoothly on hover */}
          {/* <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-out">
            <div className="overflow-hidden">
              <button
                type="button"
                onClick={openModal}
                className="w-full text-gray-500 rounded-full text-[11px] font-semibold tracking-wide pt-2.5 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 hover:text-gray-800"
              >
                VIEW DETAILS
              </button>
            </div>
          </div> */}
        </div>
      </div>

      {/* ---------------- QUICK VIEW MODAL ---------------- */}
      {modalOpen && activeVariation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden relative shadow-xl"
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
            <div className="relative bg-gray-50 aspect-square md:aspect-auto flex items-center justify-center p-6">
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
            <div className="p-6 md:p-7 flex flex-col gap-4">
              <div>
                {food.category_name && (
                  <span className="text-[11px] font-semibold tracking-wide text-red-600 uppercase">
                    {food.category_name}
                  </span>
                )}
                <h2 className="text-xl font-bold text-gray-900 mt-0.5 leading-snug">
                  {food.name}
                </h2>
              </div>

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
                            className={`ml-1.5 ${
                              isActive ? "text-gray-300" : "text-gray-400"
                            }`}
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

              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center border border-gray-200 rounded-full">
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
                  BUY IT NOW
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
