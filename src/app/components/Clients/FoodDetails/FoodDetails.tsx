/* eslint-disable react-hooks/set-state-in-effect */

// src/app/(site)/foods/[id]/FoodDetails.tsx
"use client";

/**
 * FoodDetails — একটা খাবারের বিস্তারিত পেজ
 * --------------------------------------------------------------------------
 * লেআউটটা ফরমাল: বাঁ পাশে ছবির কার্ড (ডেস্কটপে sticky), ডান পাশে সব লেখা
 * উপর-নিচে সাজানো — শিরোনাম → অর্ডার কার্ড → বিবরণ → এক নজরে → শেফের নোট।
 * আগে এগুলো ট্যাবের ভিতরে লুকানো ছিল, এখন সব একসাথেই পড়া যায়।
 *
 * নিচে রিভিউ সেকশন — এই পেজে রিভিউ শুধু দেখা যায়, লেখা যায় না।
 * রিভিউ লেখার জায়গা একটাই: /account/dishes ("Dishes I ordered"), কারণ
 * শুধু ডেলিভার হওয়া অর্ডারের খাবারেই রিভিউ দেওয়া যায়।
 *
 * ডেটা সার্ভার থেকে `initialFood` হিসেবে আসে (SEO এর জন্য)। কোনো কারণে না
 * এলে ক্লায়েন্ট থেকে একবার নিজে ফেচ করে নেয়।
 *
 * স্টাইল foodDetails.css এ — এখানে শুধু আচরণ।
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ShieldCheck,
  Sparkles,
  Bike,
  TicketPercent,
} from "lucide-react";
import {
  Food,
  FoodVariation,
  FoodApiResponse,
} from "@/src/app/(site)/foods/[id]/FoodDetails.types";
import toast from "react-hot-toast";
import { useCartStore } from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";
import FoodsSlider from "../FoodsSlider/FoodsSlider";
import ReviewSection, { type ReviewStats } from "./ReviewSection";

import "./foodDetails.css";

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

/** একই ট্যাবে বারবার রিফ্রেশ করলে ভিউ যেন না ফোলে — ৩০ মিনিটের ঠান্ডা সময় */
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

const FoodDetails = ({ id, initialFood }: FoodDetailsProps) => {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
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

  // রিভিউ সেকশন থেকে আসা তাজা গড়/সংখ্যা — উপরের হেডারটাও সাথে সাথে মেলে
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const handleReviewStats = useCallback(
    (stats: ReviewStats) => setReviewStats(stats),
    [],
  );

  // ভিউ গোনার পর সার্ভার নতুন সংখ্যাটা ফেরত দেয় — রিলোড ছাড়াই সেটাই দেখাই
  const [liveView, setLiveView] = useState<number | null>(null);
  const viewCounted = useRef(false);

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

  /* ---------------- ভিজিট গোনা — এক ভিজিটে একবার ---------------- */
  useEffect(() => {
    if (!food || viewCounted.current) return;
    viewCounted.current = true;

    const key = `food-view:${id}`;
    try {
      const last = Number(window.sessionStorage.getItem(key) || 0);
      if (last && Date.now() - last < VIEW_COOLDOWN_MS) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // প্রাইভেট মোডে sessionStorage বন্ধ থাকতে পারে — তখন গুনেই ফেলি
    }

    fetch(`/api/v1/foods/${id}/view`, { method: "POST" })
      .then((res) => res.json())
      .then((json) => {
        if (typeof json?.data?.view === "number") setLiveView(json.data.view);
      })
      .catch(() => {
        // ভিউ গোনা না গেলে পেজের কিছু আটকায় না
      });
  }, [food, id]);

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

  // সব খাবারে স্টক গোনা হয় না — stock_quantity না থাকলে সেটা "সীমাহীন" ধরা হয়,
  // নইলে স্টক না লেখা আইটেমও ভুল করে "Out of Stock" দেখাত।
  const tracksStock = typeof activeVariation?.stock_quantity === "number";
  const stockLeft = tracksStock ? Number(activeVariation?.stock_quantity) : Infinity;
  const maxQuantity = tracksStock ? Math.min(stockLeft, 50) : 50;

  const inStock =
    !!activeVariation &&
    activeVariation.status !== "inactive" &&
    activeVariation.isOpen !== false &&
    stockLeft > 0;
  const lowStock = inStock && tracksStock && stockLeft <= 3;

  const savings = activeVariation
    ? Math.max(activeVariation.regularPrice - activeVariation.salePrice, 0)
    : 0;
  const discountPercent =
    activeVariation && activeVariation.regularPrice > 0
      ? Math.round((savings / activeVariation.regularPrice) * 100)
      : 0;

  const total = activeVariation ? activeVariation.salePrice * quantity : 0;
  const spiceCount = getSpiceCount(activeVariation?.spice_level);
  const isSpicy = spiceCount >= 2;

  // রিভিউ সেকশন যা বলছে সেটাই সত্য — না এলে সার্ভার-রেন্ডার করা সংখ্যাই থাক
  const reviewCount = reviewStats?.total ?? food?.total_review ?? 0;
  const ratingValue = reviewStats?.average ?? food?.review_rating ?? 0;
  const viewCount = liveView ?? food?.view;
  const hasRating = reviewCount > 0;

  const handleQuantity = (delta: number) => {
    if (!activeVariation) return;
    setQuantity((q) => Math.max(1, Math.min(q + delta, maxQuantity)));
  };

  const handleAddToCart = () => {
    if (!inStock || !food || !activeVariation) return;

    addItem({
      food_id: food._id,
      variation_id: activeVariation._id,
      name: food.name,
      variation_name: activeVariation.name,
      image: activeVariation.images?.[0]?.url || food.image,
      regular_price: activeVariation.regularPrice,
      unit_price: activeVariation.salePrice ?? activeVariation.regularPrice,
      spice_level: activeVariation.spice_level,
      max_quantity: tracksStock ? stockLeft : undefined,
      quantity,
    });

    toast.success(`${food.name} added to cart`);
    setJustAdded(true);
    openCart();
    setTimeout(() => setJustAdded(false), 1600);
  };

  // ---------- Loading skeleton ----------
  if (loading) {
    return (
      <div className="fd">
        <div className="fd-skel">
          <div className="skeleton aspect-square w-full rounded-md" />
          <div className="flex flex-col gap-4 pt-4">
            <div className="skeleton h-4 w-28 rounded-xs" />
            <div className="skeleton h-10 w-3/4 rounded-xs" />
            <div className="skeleton h-5 w-1/2 rounded-xs" />
            <div className="skeleton mt-4 h-48 w-full rounded-md" />
            <div className="skeleton h-12 w-full rounded-xs" />
          </div>
        </div>
      </div>
    );
  }

  // ---------- Not found ----------
  if (notFound || !food || !activeVariation) {
    return (
      <div className="fd">
        <div className="fd-404">
          <PackageX strokeWidth={1.5} aria-hidden="true" />
          <h1>This item isn&apos;t on the menu</h1>
          <p>
            It may have been removed, or the link is incorrect. Head back to the
            menu to keep browsing.
          </p>
          <Link
            href="/foods"
            className="site-btn site-btn-primary mt-2 h-12 px-7 text-[12.5px] uppercase tracking-wide"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  const activeSizes = food.variations.filter((v) => v.status === "active");

  return (
    <>
      <div className="fd">
        {/* ---------------- Breadcrumb ---------------- */}
        <nav className="fd__crumbs no-scrollbar" aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <ChevronRight aria-hidden="true" />
          <Link href={`/foods?category_id=${food.category_id}`}>
            {food.category_name}
          </Link>
          <ChevronRight aria-hidden="true" />
          <strong>{food.name}</strong>
        </nav>

        <div className="fd__top">
          {/* ================= বাঁ পাশ — ছবি ================= */}
          <div className="fd-gallery">
            <div className="fd-gallery__frame">
              <button
                onClick={() => router.back()}
                aria-label="Go back"
                className="fd-gallery__back"
              >
                <ArrowLeft size={18} />
              </button>

              <AnimatePresence mode="wait">
                <motion.div
                  key={galleryImages[activeImageIdx] ?? "empty"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="relative h-full w-full"
                >
                  {galleryImages[activeImageIdx] ? (
                    <Image
                      src={galleryImages[activeImageIdx]}
                      alt={food.name}
                      fill
                      priority
                      sizes="(min-width: 1024px) 620px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="fd-gallery__empty">No image</span>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ব্যাজ */}
              <div className="fd-gallery__badges">
                {discountPercent > 0 && inStock && (
                  <span className="fd-badge fd-badge--off">
                    <TicketPercent size={12} />-{discountPercent}%
                  </span>
                )}
                {isSpicy && (
                  <span className="fd-badge fd-badge--spicy">
                    <Flame size={12} /> Spicy
                  </span>
                )}
              </div>

              {!inStock && (
                <div className="fd-gallery__out">
                  <span>Out of stock</span>
                </div>
              )}
            </div>

            {/* থাম্বনেইল */}
            {galleryImages.length > 1 && (
              <div className="fd-thumbs">
                {galleryImages.map((img, idx) => (
                  <button
                    key={img + idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`fd-thumb${idx === activeImageIdx ? " is-active" : ""}`}
                    aria-label={`Show image ${idx + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${food.name} ${idx + 1}`}
                      fill
                      sizes="78px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ================= ডান পাশ — তথ্য ================= */}
          <div className="fd-info">
            <div>
              <div className="fd-info__eyebrow">
                <span className="fd-info__cat">{food.category_name}</span>
                {food.branch_name && (
                  <span className="fd-info__branch">
                    <MapPin aria-hidden="true" />
                    {food.branch_name}
                  </span>
                )}
              </div>

              <h1 className="fd-info__title">{food.name}</h1>

              <div className="fd-info__meta">
                {hasRating && (
                  <span className="fd-info__rating">
                    <Star aria-hidden="true" />
                    {ratingValue.toFixed(1)}
                    <span className="font-normal text-ink-soft">
                      ({reviewCount} review
                      {reviewCount > 1 ? "s" : ""})
                    </span>
                  </span>
                )}
                {typeof viewCount === "number" && (
                  <span>
                    <Eye aria-hidden="true" />
                    {viewCount.toLocaleString()} view
                    {viewCount === 1 ? "" : "s"}
                  </span>
                )}
                <span>
                  <CalendarClock aria-hidden="true" />
                  {formatRelativeTime(food.createdAt)}
                </span>
              </div>
            </div>

            {/* তথ্য-চিপ */}
            <div className="fd-chips">
              {activeVariation.preparationTime ? (
                <span className="fd-chip">
                  <Clock aria-hidden="true" />
                  {activeVariation.preparationTime} min
                </span>
              ) : null}

              {activeVariation.kitchen_chef && (
                <span className="fd-chip">
                  <ChefHat aria-hidden="true" />
                  {activeVariation.kitchen_chef}
                </span>
              )}

              {spiceCount > 0 && (
                <span className="fd-chip fd-chip--spice">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Flame
                      key={i}
                      className={i < spiceCount ? undefined : "is-off"}
                      fill={i < spiceCount ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  ))}
                  <span className="ml-1 capitalize">
                    {activeVariation.spice_level}
                  </span>
                </span>
              )}

              {lowStock && (
                <span className="fd-chip fd-chip--warn">
                  <AlertTriangle aria-hidden="true" />
                  Only {activeVariation.stock_quantity} left
                </span>
              )}
            </div>

            {/* ---------------- অর্ডার কার্ড ---------------- */}
            <div className="fd-order">
              <div className="fd-order__price">
                <span className="fd-order__now">
                  {formatMoney(activeVariation.salePrice)}
                </span>
                {savings > 0 && (
                  <>
                    <span className="fd-order__was">
                      {formatMoney(activeVariation.regularPrice)}
                    </span>
                    <span className="fd-order__save">
                      <Sparkles size={12} />
                      Save {formatMoney(savings)}
                    </span>
                  </>
                )}
              </div>

              {/* সাইজ বাছাই */}
              {activeSizes.length > 1 && (
                <>
                  <span className="fd-order__label">Choose a size</span>
                  <div className="fd-sizes">
                    {activeSizes
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((v) => {
                        const isActive = v._id === activeVariation._id;
                        return (
                          <button
                            key={v._id}
                            onClick={() => setActiveVariationId(v._id)}
                            className={`fd-size${isActive ? " is-active" : ""}`}
                          >
                            <b>{v.name}</b>
                            <i>{formatMoney(v.salePrice)}</i>
                            {isActive && (
                              <span className="fd-size__tick">
                                <Check strokeWidth={3} aria-hidden="true" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </>
              )}

              {/* পরিমাণ + কার্ট (ডেস্কটপ) */}
              <div className="fd-order__actions">
                <QuantityStepper
                  quantity={quantity}
                  max={maxQuantity}
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

            {/* ভরসার সারি */}
            <div className="fd-trust">
              <TrustBadge icon={Sparkles} label="Freshly made" />
              <TrustBadge icon={ShieldCheck} label="Hygienic kitchen" />
              <TrustBadge icon={Bike} label="Fast delivery" />
            </div>

            {/* ---------------- বিবরণ ---------------- */}
            <section className="fd-panel">
              <h2 className="fd-panel__title">Description</h2>
              <p className="whitespace-pre-line">
                {food.description ||
                  `${food.name} is prepared fresh to order in the ${food.category_name} section of our kitchen, using quality ingredients and traditional techniques for a consistently great taste every time.`}
              </p>
            </section>

            {/* ---------------- এক নজরে ---------------- */}
            <section className="fd-panel">
              <h2 className="fd-panel__title">At a glance</h2>
              <dl className="fd-specs">
                <Spec
                  label="Serving"
                  value={activeVariation.quantityLabel || "1 plate"}
                />
                <Spec
                  label="Prep time"
                  value={
                    activeVariation.preparationTime
                      ? `${activeVariation.preparationTime} min`
                      : "—"
                  }
                />
                <Spec
                  label="Spice level"
                  value={activeVariation.spice_level || "Regular"}
                />
                <Spec
                  label="Availability"
                  value={inStock ? "In stock" : "Out of stock"}
                />
              </dl>
            </section>

            {/* ---------------- শেফের নোট ---------------- */}
            <section className="fd-panel">
              <h2 className="fd-panel__title">Chef&apos;s note</h2>
              <div className="fd-chef">
                <span className="fd-chef__avatar">
                  <ChefHat aria-hidden="true" />
                </span>
                <div>
                  <b>{activeVariation.kitchen_chef || "Our head chef"}</b>
                  <p>
                    Handles the {food.category_name.toLowerCase()} station in
                    our kitchen.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* রিভিউ — এই পেজে শুধু পড়ার জন্য */}
        <ReviewSection
          foodId={food._id}
          foodName={food.name}
          onStatsChange={handleReviewStats}
        />

        {/* ---------------- মোবাইলের নিচের বার ---------------- */}
        <div className="fd-sticky">
          <QuantityStepper
            quantity={quantity}
            max={maxQuantity}
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

      <FoodsSlider />
    </>
  );
};

// ---------------- Sub-components ----------------

const TrustBadge = ({
  icon: Icon,
  label,
}: {
  icon: typeof ShieldCheck;
  label: string;
}) => (
  <div className="fd-trust__item">
    <Icon aria-hidden="true" />
    <span>{label}</span>
  </div>
);

const Spec = ({ label, value }: { label: string; value: string }) => (
  <div className="fd-spec">
    <dt>{label}</dt>
    <dd>{value}</dd>
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
  <div className="fd-qty">
    <button
      onClick={() => onChange(-1)}
      disabled={disabled || quantity <= 1}
      aria-label="Decrease quantity"
    >
      <Minus size={16} />
    </button>
    <span>{quantity}</span>
    <button
      onClick={() => onChange(1)}
      disabled={disabled || quantity >= max}
      aria-label="Increase quantity"
    >
      <Plus size={16} />
    </button>
  </div>
);

const AddToCartButton = ({
  inStock,
  justAdded,
  total,
  onClick,
}: {
  inStock: boolean;
  justAdded: boolean;
  total: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    disabled={!inStock}
    className={`fd-cart${justAdded ? " is-added" : ""}`}
  >
    <AnimatePresence mode="wait" initial={false}>
      {justAdded ? (
        <motion.span
          key="added"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2"
        >
          <Check aria-hidden="true" />
          Added to cart
        </motion.span>
      ) : (
        <motion.span
          key="add"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2"
        >
          <ShoppingCart aria-hidden="true" />
          {inStock ? `Add to cart · ${formatMoney(total)}` : "Out of stock"}
        </motion.span>
      )}
    </AnimatePresence>
  </button>
);

export default FoodDetails;
