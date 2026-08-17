/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/(site)/foods/[id]/FoodDetails.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Flame,
  Clock,
  ChefHat,
  Minus,
  Plus,
  ShoppingCart,
  Check,
  PackageX,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import {
  Food,
  FoodVariation,
  FoodApiResponse,
} from "@/src/app/(site)/foods/[id]/FoodDetails.types";

const SPICE_LEVELS: Record<string, number> = {
  mild: 1,
  medium: 2,
  hot: 3,
  "extra hot": 4,
};

const getSpiceCount = (level?: string) => {
  if (!level) return 0;
  return SPICE_LEVELS[level.toLowerCase()] ?? 1;
};

// BD time অনুযায়ী relative label
const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "এইমাত্র যোগ হয়েছে";
  if (diffMin < 60) return `${diffMin} মিনিট আগে`;
  if (diffHour < 24) return `${diffHour} ঘণ্টা আগে`;
  if (diffDay < 7) return `${diffDay} দিন আগে`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
};

interface FoodDetailsProps {
  id: string;
  initialFood: Food | null;
}

const FoodDetails = ({ id, initialFood }: FoodDetailsProps) => {
  const router = useRouter();
  const [food, setFood] = useState<Food | null>(initialFood);
  const [loading, setLoading] = useState(!initialFood);
  const [notFound, setNotFound] = useState(false);

  const [activeVariationId, setActiveVariationId] = useState<string | null>(
    initialFood
      ? ((
          initialFood.variations.find((v) => v.is_default) ||
          initialFood.variations[0]
        )?._id ?? null)
      : null,
  );
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (food) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/foods/${id}`);
        const json: FoodApiResponse = await res.json();
        if (cancelled) return;

        if (!res.ok || !json?.data) {
          setNotFound(true);
        } else {
          setFood(json.data);
          const def =
            json.data.variations.find((v) => v.is_default) ||
            json.data.variations[0];
          setActiveVariationId(def?._id ?? null);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, food]);

  const activeVariation: FoodVariation | null = useMemo(() => {
    if (!food) return null;
    return (
      food.variations.find((v) => v._id === activeVariationId) ||
      food.variations[0] ||
      null
    );
  }, [food, activeVariationId]);

  useEffect(() => {
    setActiveImageIdx(0);
    setQuantity(1);
  }, [activeVariationId]);

  const galleryImages = useMemo(() => {
    if (activeVariation && activeVariation.images.length > 0) {
      return activeVariation.images.map((img: { url: any }) => img.url);
    }
    return food?.image ? [food.image] : [];
  }, [activeVariation, food]);

  const inStock = (activeVariation?.stock_quantity ?? 0) > 0;
  const lowStock = inStock && (activeVariation?.stock_quantity ?? 0) <= 3;

  const savings = activeVariation
    ? Math.max(activeVariation.regularPrice - activeVariation.salePrice, 0)
    : 0;
  const discountPercent =
    activeVariation && activeVariation.regularPrice > 0
      ? Math.round((savings / activeVariation.regularPrice) * 100)
      : 0;

  const total = activeVariation ? activeVariation.salePrice * quantity : 0;
  const isSpicy = getSpiceCount(activeVariation?.spice_level) >= 2;

  const handleQuantity = (delta: number) => {
    if (!activeVariation) return;
    setQuantity((q) => {
      const next = q + delta;
      if (next < 1) return 1;
      if (next > activeVariation.stock_quantity)
        return activeVariation.stock_quantity;
      return next;
    });
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    setJustAdded(true);
    // 🛒 cart integration এখানে বসবে (context / zustand store call)
    setTimeout(() => setJustAdded(false), 1600);
  };

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF7] px-4 py-10 lg:px-10">
        <div className="mx-auto grid max-w-6xl animate-pulse gap-10 lg:grid-cols-2">
          <div className="mx-auto aspect-square w-full max-w-md rounded-full bg-[#F1E9DE]" />
          <div className="space-y-4 pt-4">
            <div className="h-4 w-24 rounded bg-[#F1E9DE]" />
            <div className="h-10 w-3/4 rounded bg-[#F1E9DE]" />
            <div className="h-6 w-1/2 rounded bg-[#F1E9DE]" />
            <div className="h-32 rounded-2xl bg-[#F1E9DE]" />
            <div className="h-14 rounded-full bg-[#F1E9DE]" />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Not found ----------
  if (notFound || !food || !activeVariation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FFFBF7] px-6 text-center">
        <PackageX className="h-14 w-14 text-[#C9BCAE]" strokeWidth={1.5} />
        <h1 className="text-2xl font-extrabold text-[#161B33]">
          এই আইটেমটা মেনুতে নেই
        </h1>
        <p className="max-w-sm text-sm text-[#8A7F72]">
          হয়তো আইটেমটা সরিয়ে ফেলা হয়েছে বা লিংকটা ভুল। মেনুতে ফিরে যান।
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#E63950] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E63950]/25 transition hover:bg-[#C92C42]"
        >
          মেনুতে ফিরুন
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7] pb-28 lg:pb-16">
      {/* Breadcrumb */}
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 pt-5 text-xs text-[#8A7F72] lg:px-10">
        <Link href="/" className="transition hover:text-[#E63950]">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="transition hover:text-[#E63950]">
          {food.category_name}
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate font-medium text-[#161B33]">{food.name}</span>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
        {/* ---------------- Circular plate gallery (signature) ---------------- */}
        <div className="relative flex flex-col items-center">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#161B33] shadow-md transition hover:bg-[#F5EFE6] lg:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* soft radial backdrop, like homepage plate glow */}
          <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto h-72 w-72 rounded-full bg-gradient-to-br from-[#FFE9D6] via-[#FFF3EA] to-transparent blur-2xl lg:h-96 lg:w-96" />

          <div className="relative z-[1] aspect-square w-full max-w-md">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-white p-2 shadow-[0_20px_50px_rgba(22,27,51,0.12)] ring-1 ring-black/5">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={galleryImages[activeImageIdx]}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={galleryImages[activeImageIdx]}
                      alt={food.name}
                      fill
                      priority
                      sizes="(min-width: 1024px) 420px, 90vw"
                      className="object-cover"
                    />
                  </motion.div>
                </AnimatePresence>

                {!inStock && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <span className="rounded-full bg-[#161B33] px-4 py-2 text-xs font-bold text-white">
                      Out of Stock
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* badges — matches homepage green "Hot" + red discount pill */}
            <div className="absolute left-2 top-2 flex flex-col items-start gap-2">
              {isSpicy && (
                <span className="rounded-full bg-[#1F9D55] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                  Hot
                </span>
              )}
              {discountPercent > 0 && inStock && (
                <span className="rounded-full bg-[#E63950] px-3 py-1 text-[11px] font-bold text-white shadow-md">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div className="relative z-[1] mt-6 flex gap-3">
              {galleryImages.map((img, idx) => (
                <button
                  key={img + idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-md ring-2 transition ${
                    idx === activeImageIdx
                      ? "ring-[#E63950]"
                      : "ring-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-full">
                    <Image
                      src={img}
                      alt={`${food.name} ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- Details ---------------- */}
        <div className="space-y-6 lg:pt-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#1F9D55]">
              {food.category_name}
            </span>
            <h1 className="mt-1 text-3xl font-extrabold leading-tight text-[#161B33] lg:text-4xl">
              {food.name}
            </h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[#8A7F72]">
              <CalendarClock className="h-3.5 w-3.5" />
              {formatRelativeTime(food.createdAt)}
            </p>
          </div>

          {/* info chips */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#161B33] shadow-sm ring-1 ring-[#F0E9E1]">
              <Clock className="h-3.5 w-3.5 text-[#E63950]" />
              {activeVariation.preparationTime} min
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#161B33] shadow-sm ring-1 ring-[#F0E9E1]">
              <ChefHat className="h-3.5 w-3.5 text-[#E63950]" />
              {activeVariation.kitchen_chef}
            </span>
            {getSpiceCount(activeVariation.spice_level) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] px-3 py-1.5 text-xs font-medium text-[#1F9D55] shadow-sm ring-1 ring-[#D3EEDD]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Flame
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < getSpiceCount(activeVariation.spice_level)
                        ? "fill-[#1F9D55] text-[#1F9D55]"
                        : "text-[#BFE3CC]"
                    }`}
                  />
                ))}
                <span className="ml-1 capitalize">
                  {activeVariation.spice_level}
                </span>
              </span>
            )}
            {lowStock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF1E9] px-3 py-1.5 text-xs font-medium text-[#C2540C] shadow-sm ring-1 ring-[#FBDCC4]">
                <AlertTriangle className="h-3.5 w-3.5" />
                মাত্র {activeVariation.stock_quantity}টা বাকি
              </span>
            )}
          </div>

          {/* price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-extrabold text-[#E63950]">
              ৳{activeVariation.salePrice}
            </span>
            {savings > 0 && (
              <span className="pb-1 text-base text-[#B7AB9C] line-through">
                ৳{activeVariation.regularPrice}
              </span>
            )}
          </div>

          {/* variation selector */}
          {food.variations.length > 1 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#8A7F72]">
                Size বেছে নিন
              </p>
              <div className="flex flex-wrap gap-3">
                {food.variations
                  .filter((v) => v.status === "active")
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((v) => {
                    const isActive = v._id === activeVariation._id;
                    return (
                      <button
                        key={v._id}
                        onClick={() => setActiveVariationId(v._id)}
                        className={`relative rounded-2xl border-2 px-4 py-2.5 text-left transition ${
                          isActive
                            ? "border-[#E63950] bg-[#FFF1F3]"
                            : "border-[#F0E9E1] bg-white hover:border-[#E6DACB]"
                        }`}
                      >
                        <span
                          className={`block text-sm font-bold ${
                            isActive ? "text-[#E63950]" : "text-[#161B33]"
                          }`}
                        >
                          {v.name}
                        </span>
                        <span className="block text-xs text-[#8A7F72]">
                          ৳{v.salePrice}
                        </span>
                        {isActive && (
                          <motion.span
                            layoutId="variation-dot"
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E63950] shadow-sm"
                          >
                            <Check
                              className="h-3 w-3 text-white"
                              strokeWidth={3}
                            />
                          </motion.span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* quantity + add to cart — desktop inline */}
          <div className="hidden items-center gap-4 lg:flex">
            <QuantityStepper
              quantity={quantity}
              max={activeVariation.stock_quantity}
              disabled={!inStock}
              onChange={handleQuantity}
            />
            <AddToCartButton
              inStock={inStock}
              justAdded={justAdded}
              total={total}
              onClick={handleAddToCart}
            />
          </div>
        </div>
      </div>

      {/* ---------------- Sticky mobile CTA ---------------- */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#F0E9E1] bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <QuantityStepper
            quantity={quantity}
            max={activeVariation.stock_quantity}
            disabled={!inStock}
            onChange={handleQuantity}
          />
          <div className="flex-1">
            <AddToCartButton
              inStock={inStock}
              justAdded={justAdded}
              total={total}
              onClick={handleAddToCart}
              full
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- Sub-components ----------------

const QuantityStepper = ({
  quantity,
  max,
  disabled,
  onChange,
}: {
  quantity: number;
  max: number;
  disabled: boolean;
  onChange: (delta: number) => void;
}) => (
  <div className="flex shrink-0 items-center rounded-full bg-white shadow-sm ring-1 ring-[#F0E9E1]">
    <button
      onClick={() => onChange(-1)}
      disabled={disabled || quantity <= 1}
      className="flex h-11 w-11 items-center justify-center text-[#161B33] transition disabled:opacity-30"
    >
      <Minus className="h-4 w-4" />
    </button>
    <span className="w-6 text-center text-sm font-bold text-[#161B33]">
      {quantity}
    </span>
    <button
      onClick={() => onChange(1)}
      disabled={disabled || quantity >= max}
      className="flex h-11 w-11 items-center justify-center text-[#161B33] transition disabled:opacity-30"
    >
      <Plus className="h-4 w-4" />
    </button>
  </div>
);

const AddToCartButton = ({
  inStock,
  justAdded,
  total,
  onClick,
  full,
}: {
  inStock: boolean;
  justAdded: boolean;
  total: number;
  onClick: () => void;
  full?: boolean;
}) => (
  <motion.button
    whileTap={inStock ? { scale: 0.97 } : undefined}
    onClick={onClick}
    disabled={!inStock}
    className={`flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition ${
      full ? "w-full" : ""
    } ${
      !inStock
        ? "cursor-not-allowed bg-[#F0E9E1] text-[#B7AB9C]"
        : justAdded
          ? "bg-[#1F9D55] text-white"
          : "bg-[#E63950] text-white shadow-lg shadow-[#E63950]/25 hover:bg-[#C92C42]"
    }`}
  >
    <AnimatePresence mode="wait" initial={false}>
      {justAdded ? (
        <motion.span
          key="added"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          কার্টে যোগ হয়েছে
        </motion.span>
      ) : (
        <motion.span
          key="add"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {inStock ? `Add to Cart · ৳${total}` : "Out of Stock"}
        </motion.span>
      )}
    </AnimatePresence>
  </motion.button>
);

export default FoodDetails;
