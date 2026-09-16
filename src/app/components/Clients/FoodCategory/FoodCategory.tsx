/* eslint-disable react-hooks/static-components */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import Image from "next/image";

type SubTitle = "" | "New" | "Hot" | "Popular";

export interface Category {
  _id: string;
  image?: string;
  name: string;
  sub_title?: SubTitle;
  slug?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

interface FoodCategoryProps {
  /** Called when a category circle is clicked. Defaults to no-op. */
  onSelect?: (category: Category) => void;
  /** Currently selected slug, if you want to highlight one (e.g. from a filter). */
  activeSlug?: string;
  /** Auto-slide interval in ms. Set to 0 to disable autoplay. */
  autoPlayInterval?: number;
  /**
   * সার্ভার থেকে আসা ক্যাটাগরি — থাকলে প্রথম HTML এই চাকাটা ভরা
   * অবস্থায় যায়, তাই ক্রলার আর ভিজিটর দুজনেই সাথে সাথে দেখে।
   */
  initialCategories?: Category[];
}

const AUTO_PLAY_DEFAULT = 3000;

const badgeClasses = (sub?: SubTitle) => {
  if (sub === "New") return "bg-green-100 text-green-600";
  if (sub === "Hot") return "bg-red-100 text-red-600";
  if (sub === "Popular") return "bg-violet-100 text-violet-600";
  return null;
};

// same circle/skeleton sizing string reused in both the skeleton and the
// real render so the two can never drift apart again
const CIRCLE_SIZE =
  "h-[120px] w-[120px] sm:h-[130px] sm:w-[130px] md:h-[130px] md:w-[130px] lg:h-[300px] lg:w-[300px]";
const CARD_WIDTH = "w-[130px] sm:w-[140px] md:w-[140px] lg:w-[300px] mt-10 md:mt-0";

function CategoryImage({ src, alt }: { src?: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!src) {
    return (
      <span className="text-2xl font-bold text-slate-400 sm:text-3xl lg:text-4xl">
        {alt.charAt(0)}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      draggable={false}
      width={600}
      height={600}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={`h-full w-full object-cover object-center pointer-events-none transition-opacity duration-300 ${
        loaded ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

const FoodCategory = ({
  onSelect,
  activeSlug,
  autoPlayInterval = AUTO_PLAY_DEFAULT,
  initialCategories,
}: FoodCategoryProps) => {
  const [categories, setCategories] = useState<Category[]>(
    initialCategories ?? [],
  );
  // সার্ভার আগেই ডেটা দিয়ে দিলে স্কেলেটন দেখানোর দরকার নেই
  const [loading, setLoading] = useState(!initialCategories?.length);
  const [error, setError] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  // prev/next button enabled state, kept in sync with real scroll position
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // drag state
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const [isDraggingClass, setIsDraggingClass] = useState(false);

  // autoplay
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPaused = useRef(false);

  // ------------------------------------------------------------
  // FETCH
  // ------------------------------------------------------------
  useEffect(() => {
    // সার্ভার থেকেই এসে গেছে — আবার ডাকার কিছু নেই
    if (initialCategories?.length) return;

    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const res = await axios.get(`/api/v1/categories`);
        const data: Category[] = res.data?.data || [];
        if (cancelled) return;
        setCategories(
          data
            .filter((c) => c.status !== "inactive")
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        );
      } catch (err) {
        console.error("Failed to load categories:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, [initialCategories]);

  // ------------------------------------------------------------
  // SCROLL STATE (drives prev/next disabled + faded look)
  // ------------------------------------------------------------
  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollPrev(scrollLeft > 4);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();

    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories, updateScrollState]);

  // ------------------------------------------------------------
  // PREV / NEXT (clamped — no more silent jump-to-start/end)
  // ------------------------------------------------------------
  const scrollByAmount = useCallback((amount: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  const stepSize = useCallback(() => {
    const track = trackRef.current;
    if (!track) return 260;
    return Math.min(track.clientWidth * 0.8, 340);
  }, []);

  const handlePrev = () => {
    if (!canScrollPrev) return;
    isPaused.current = true;
    scrollByAmount(-stepSize());
  };

  const handleNext = () => {
    if (!canScrollNext) return;
    isPaused.current = true;
    scrollByAmount(stepSize());
  };

  // ------------------------------------------------------------
  // AUTOPLAY — loops smoothly, pauses on any user interaction
  // ------------------------------------------------------------
  useEffect(() => {
    if (!autoPlayInterval || categories.length === 0) return;

    autoPlayTimer.current = setInterval(() => {
      if (isPaused.current) return;
      const track = trackRef.current;
      if (!track) return;

      const atEnd =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        track.scrollBy({ left: stepSize(), behavior: "smooth" });
      }
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [autoPlayInterval, categories.length, stepSize]);

  // ------------------------------------------------------------
  // MOUSE DRAG TO SCROLL
  // ------------------------------------------------------------
  const onMouseDown = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = true;
    dragMoved.current = false;
    isPaused.current = true;
    startX.current = e.pageX - track.offsetLeft;
    startScroll.current = track.scrollLeft;
    setIsDraggingClass(true);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track || !isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = x - startX.current;
    if (Math.abs(walk) > 4) dragMoved.current = true;
    track.scrollLeft = startScroll.current - walk;
  };

  const endDrag = () => {
    isDragging.current = false;
    setIsDraggingClass(false);
    // small delay so autoplay doesn't yank the view right after a drag
    setTimeout(() => {
      isPaused.current = false;
    }, 600);
  };

  // ------------------------------------------------------------
  // CLICK HANDLING (avoid firing onSelect after a drag)
  // ------------------------------------------------------------
  const handleCategoryClick = (category: Category) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    onSelect?.(category);
  };

  // ------------------------------------------------------------
  // NAV BUTTON (shared prev/next markup)
  // ------------------------------------------------------------
  const NavButton = ({
    direction,
    onClick,
    disabled,
  }: {
    direction: "left" | "right";
    onClick: () => void;
    disabled: boolean;
  }) => (
    <button
      type="button"
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      disabled={disabled}
      className={`relative z-10 hidden md:flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white transition-all duration-200 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-[52px] lg:w-[52px] ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : "cursor-pointer hover:scale-[1.06] hover:brightness-110 active:scale-95"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        className="sm:h-[18px] sm:w-[18px] lg:h-6 lg:w-6"
      >
        <path
          d={direction === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="relative flex items-center gap-2.5 rounded-[20px] bg-[var(--color-canvas)] px-2 py-6 sm:rounded-[24px] sm:py-8 md:rounded-[28px] md:py-9 lg:py-10">
        <div className="flex w-full max-width gap-4 overflow-hidden px-9 py-1 sm:gap-5 sm:px-10 md:gap-8 md:px-14 lg:gap-10 lg:px-16">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${CARD_WIDTH} flex-shrink-0 flex-col items-center gap-2.5`}
            >
              <div
                className={`${CIRCLE_SIZE} animate-pulse rounded-full bg-neutral-200`}
              />
              <div className="h-2.5 w-14 animate-pulse rounded-full bg-neutral-200 lg:h-3 lg:w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[20px] bg-[var(--color-canvas)] px-6 py-8 text-center text-[13px] text-neutral-500">
        Couldn&apos;t load categories right now.
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-[20px] bg-[var(--color-canvas)] px-6 py-8 text-center text-[13px] text-neutral-500">
        No categories to show yet.
      </div>
    );
  }

  return (
    <div
      className="relative w-full flex items-center gap-2 overflow-hidden md:py-9 lg:py-10"
      onMouseEnter={() => (isPaused.current = true)}
      onMouseLeave={() => {
        isPaused.current = false;
        endDrag();
      }}
    >
      <div className="max-w-[1846px] mx-auto w-full flex items-center gap-2 rounded-[20px]">
        {/* decorative squiggle line running behind the row */}
        <svg
          className=" pointer-events-none absolute inset-0 h-full w-full opacity-70"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,55 C 90,15 160,90 260,55 C 360,20 430,88 530,52 C 630,18 700,85 800,50 C 870,25 930,70 1000,45"
            fill="none"
            stroke="var(--color-saffron)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <NavButton
          direction="left"
          onClick={handlePrev}
          disabled={!canScrollPrev}
        />

        <div
          ref={trackRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onTouchStart={() => (isPaused.current = true)}
          onTouchEnd={() =>
            setTimeout(() => {
              isPaused.current = false;
            }, 600)
          }
          className={`relative z-10 flex w-full select-none gap-4 overflow-x-auto px-9 py-1 [scroll-snap-type:x_proximity] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 sm:px-10 md:gap-8 md:px-14 lg:gap-10 lg:px-16 ${
            isDraggingClass
              ? "cursor-grabbing [scroll-behavior:auto]"
              : "cursor-grab [scroll-behavior:smooth]"
          }`}
        >
          {categories.map((category) => {
            const badge = badgeClasses(category.sub_title);
            const active = activeSlug && category.slug === activeSlug;
            return (
              <Link
                key={category._id}
                href={`/foods?category_id=${category._id}`}
                className={`group flex ${CARD_WIDTH} flex-shrink-0 scroll-ml-9 flex-col items-center gap-2 text-center [scroll-snap-align:start] sm:scroll-ml-10 sm:gap-2.5 md:scroll-ml-14 lg:scroll-ml-16`}
                onClick={() => handleCategoryClick(category)}
              >
                <span
                  className={`relative flex ${CIRCLE_SIZE} aspect-square shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-50 to-sky-100 shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] ${
                    active
                      ? "outline outline-[3px] outline-offset-[3px] outline-[var(--color-brand)]"
                      : ""
                  }`}
                >
                  <CategoryImage src={category.image} alt={category.name} />
                  {badge && category.sub_title && (
                    <span
                      className={`absolute left-1 top-1 rounded-full px-[7px] py-[2px] text-[9px] font-bold tracking-wide sm:text-[10px] ${badge}`}
                    >
                      {category.sub_title}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold uppercase leading-tight tracking-wide group-hover:text-[var(--color-brand)] sm:text-[11px] md:text-[13px] lg:text-[14px]">
                  {category.name}
                </span>
              </Link>
            );
          })}
        </div>

        <NavButton
          direction="right"
          onClick={handleNext}
          disabled={!canScrollNext}
        />
      </div>
    </div>
  );
};

export default FoodCategory;
