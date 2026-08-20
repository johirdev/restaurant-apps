/* eslint-disable react-hooks/set-state-in-effect */
 
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
  Star,
  Eye,
  MapPin,
} from "lucide-react";
import {
  Food,
  FoodVariation,
  FoodApiResponse,
} from "@/src/app/(site)/foods/[id]/FoodDetails.types";
import FoodsSlider from "../FoodsSlider/FoodsSlider";
import ReviewSection from "./ReviewSection";

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

const formatRelativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hr ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
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
  const [activeTab, setActiveTab] = useState<"description" | "nutrition" | "chef">("description");
 

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
      return activeVariation.images.map((img) => img.url);
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

  const hasRating = !!food && (food.total_review ?? 0) > 0;

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
    // 🛒 cart integration goes here (context / zustand store call)
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
          This item isn&apos;t on the menu
        </h1>
        <p className="max-w-sm text-sm text-[#8A7F72]">
          It may have been removed, or the link is incorrect. Head back to the
          menu to keep browsing.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#E21B70] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#E21B70]/25 transition hover:bg-[#C92C42]"
        >
          Back to Menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#FFFBF7] pb-28 lg:pb-16">
        {/* Breadcrumb */}
        <div className="mx-auto flex max-width items-center gap-1.5 overflow-x-auto whitespace-nowrap px-4 pt-5 text-xs text-[#8A7F72] lg:px-10">
          <Link
            href="/"
            className="flex-shrink-0 transition hover:text-[#E21B70] text-[13px] sm:text-[14px] cursor-pointer"
          >
            Home
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="flex-shrink-0 transition hover:text-[#E21B70] text-[13px] sm:text-[14px] cursor-pointer">
            {food.category_name}
          </span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="truncate font-medium text-[#161B33] text-[13px] sm:text-[14px] cursor-pointer">
            {food.name}
          </span>
        </div>

        <div className="mx-auto pb-10 grid max-width gap-8 px-4 pt-6 sm:gap-10 lg:grid-cols-2 lg:gap-16 lg:px-10">
          {/* ---------------- Circular plate gallery ---------------- */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#161B33] shadow-md transition hover:bg-[#F5EFE6] lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-4 mx-auto h-56 w-56 bg-gradient-to-br from-[#FFE9D6] via-[#FFF3EA] to-transparent blur-2xl sm:h-72 sm:w-72 lg:h-96 lg:w-96" />

            <div className="relative z-[1] aspect-square w-full max-h-[600px] bg-[#eef3f9]">
              <div className="relative h-full w-full overflow-hidden p-2 ring-1 ring-black/5">
                <div className="relative h-full w-full overflow-hidden  ">
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
                        sizes="(min-width: 1024px) 700px, 90vw"
                        className="object-contain"
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

              <div className="absolute left-2 top-2 flex flex-col items-start gap-2">
                {isSpicy && (
                  <span className="rounded-full bg-[#1F9D55] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                    Spicy
                  </span>
                )}
                {discountPercent > 0 && inStock && (
                  <span className="rounded-full bg-[#E21B70] px-3 py-1 text-[11px] font-bold text-white shadow-md">
                    -{discountPercent}%
                  </span>
                )}
              </div>
            </div>

            {galleryImages.length > 1 && (
              <div className="relative z-[1] mt-6 flex w-full max-w-[600px] flex-wrap justify-center gap-3">
                {galleryImages.map((img, idx) => (
                  <button
                    key={img + idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative h-[80px] w-[80px] shrink-0 overflow-hidden bg-white p-0.5 shadow-md ring-2 transition sm:h-[100px] sm:w-[100px] lg:h-[120px] lg:w-[120px] ${
                      idx === activeImageIdx
                        ? "ring-[#E21B70]"
                        : "ring-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <div className="relative h-full w-full overflow-hidden">
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
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] md:text-[14px] font-bold uppercase tracking-widest text-[#1F9D55]">
                  {food.category_name}
                </span>
                {food.branch_name && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8A7F72]">
                    <MapPin className="h-3 w-3" />
                    {food.branch_name}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-[18px] md:text-[24px] font-extrabold leading-tight text-[#161B33]">
                {food.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#8A7F72]">
                {hasRating && (
                  <span className="flex items-center gap-1 font-semibold text-[#161B33]">
                    <Star className="h-3.5 w-3.5 fill-[#F5B93D] text-[#F5B93D]" />
                    {food.review_rating}
                    <span className="font-normal text-[#8A7F72]">
                      ({food.total_review} review
                      {food.total_review > 1 ? "s" : ""})
                    </span>
                  </span>
                )}
                {typeof food.view === "number" && (
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {food.view} views
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatRelativeTime(food.createdAt)}
                </span>
              </div>
            </div>

            {/* info chips */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[13px] md:text-[16px] font-medium text-[#161B33] shadow-sm ring-1 ring-[#F0E9E1]">
                <Clock className="h-3.5 w-3.5 text-[#E21B70]" />
                {activeVariation.preparationTime} min
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[13px] md:text-[16px] font-medium text-[#161B33] shadow-sm ring-1 ring-[#F0E9E1]">
                <ChefHat className="h-3.5 w-3.5 text-[#E21B70]" />
                {activeVariation.kitchen_chef}
              </span>
              {getSpiceCount(activeVariation.spice_level) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#EAF7EF] px-3 py-1.5 text-[13px] md:text-[16px] font-medium text-[#1F9D55] shadow-sm ring-1 ring-[#D3EEDD]">
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
                  Only {activeVariation.stock_quantity} left
                </span>
              )}
            </div>

            {/* price */}
            <div className="flex items-end gap-3">
              <span className="text-[24px] md:text-[36px] font-extrabold text-[#E21B70]">
                ৳{activeVariation.salePrice}
              </span>
              {savings > 0 && (
                <span className="pb-1 text-[18px] md:text-[28px] text-[#B7AB9C] line-through">
                  ৳{activeVariation.regularPrice}
                </span>
              )}
            </div>

            {/* variation selector */}
            {food.variations.length > 1 && (
              <div>
                <p className="mb-2 text-[13px] md:text-[16px] font-bold uppercase tracking-wider text-[#8A7F72]">
                  Choose a size
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
                          className={`relative rounded-md border-2 px-4 py-2.5 text-left transition ${
                            isActive
                              ? "border-[#E21B70] bg-[#FFF1F3]"
                              : "border-[#F0E9E1] bg-white hover:border-[#E6DACB]"
                          }`}
                        >
                          <span
                            className={`block text-sm font-bold ${isActive ? "text-[#E21B70]" : "text-[#161B33]"}`}
                          >
                            {v.name}
                          </span>
                          <span className="block text-[13px] md:text-[16px] text-[#8A7F72]">
                            ৳{v.salePrice}
                          </span>
                          {isActive && (
                            <motion.span
                              layoutId="variation-dot"
                              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E21B70] shadow-sm"
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

            {/* trust row under gallery — desktop only, fills the empty space nicely */}
            <div className="relative z-[1] mt-8 hidden w-full grid-cols-3 gap-3 lg:grid">
              <TrustBadge label="Freshly made" />
              <TrustBadge label="Hygienic kitchen" />
              <TrustBadge label="Fast delivery" />
            </div>
          </div>
        </div>

        {/* ---------------- Tabbed details section ---------------- */}
        <div className="mx-auto mt-10 max-width px-4 lg:mt-14 lg:px-10">
          <div className="flex gap-1 overflow-x-auto border-b border-[#F0E9E1] sm:gap-2">
            {(["description", "nutrition", "chef"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex-shrink-0 px-3 py-3 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  activeTab === tab
                    ? "text-[#E21B70]"
                    : "text-[#8A7F72] hover:text-[#161B33]"
                }`}
              >
                {tab === "description"
                  ? "Description"
                  : tab === "nutrition"
                    ? "Nutrition Info"
                    : "Chef's Note"}
                {activeTab === tab && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#E21B70]"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="py-6 text-sm leading-relaxed text-[#4A4238]">
            <AnimatePresence mode="wait">
              {activeTab === "description" && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="whitespace-pre-line">
                    {food.description ||
                      `${food.name} is prepared fresh to order in the ${food.category_name} section of our kitchen, using quality ingredients and traditional techniques for a consistently great taste every time.`}
                  </p>
                </motion.div>
              )}
              {activeTab === "nutrition" && (
                <motion.div
                  key="nutrition"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4"
                >
                  <NutritionStat
                    label="Serving"
                    value={activeVariation.quantityLabel || "1 plate"}
                  />
                  <NutritionStat
                    label="Prep time"
                    value={`${activeVariation.preparationTime} min`}
                  />
                  <NutritionStat
                    label="Spice level"
                    value={activeVariation.spice_level || "Regular"}
                  />
                  <NutritionStat
                    label="Availability"
                    value={inStock ? "In stock" : "Out of stock"}
                  />
                </motion.div>
              )}
              {activeTab === "chef" && (
                <motion.div
                  key="chef"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-4"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F3] text-[#E21B70]">
                    <ChefHat className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-bold text-[#161B33]">
                      {activeVariation.kitchen_chef}
                    </p>
                    <p className="text-[#8A7F72]">
                      Handles the {food.category_name.toLowerCase()} station in
                      our kitchen.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ReviewSection foodId={food._id} foodName={food.name} />
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
      <FoodsSlider />
    </>
  );
};

// ---------------- Sub-components ----------------

const TrustBadge = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center gap-1.5 rounded-md bg-white px-3 py-3 text-center shadow-sm ring-1 ring-[#F0E9E1]">
    <Check className="text-[14px] h-4 w-4 text-[#1F9D55]" strokeWidth={3} />
    <span className="text-[13px] font-medium text-[#8A7F72]">{label}</span>
  </div>
);

const NutritionStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-white p-4 text-center shadow-sm ring-1 ring-[#F0E9E1]">
    <p className="text-[13px] font-bold capitalize text-[#161B33]">{value}</p>
    <p className="mt-1 text-[11px] uppercase tracking-wide text-[#8A7F72]">
      {label}
    </p>
  </div>
);

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
    className={`flex h-12 items-center cursor-pointer justify-center gap-2 rounded-full px-6 text-[12px] md:text-[14px] font-bold transition ${full ? "w-full" : ""} ${
      !inStock
        ? "cursor-not-allowed bg-[#F0E9E1] text-[#B7AB9C]"
        : justAdded
          ? "bg-[#1F9D55] text-white"
          : "bg-[#E21B70] text-white shadow-lg shadow-[#E21B70]/25 hover:bg-[#C92C42]"
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
          Added to Cart
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
