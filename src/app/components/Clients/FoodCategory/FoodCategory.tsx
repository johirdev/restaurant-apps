"use client";

/**
 * FoodCategory
 * -------------------------------
 * Public storefront slider that shows active categories coming from
 * your existing Categories admin API:
 *
 *   GET /api/v1/categories -> { success, data: Category[] }
 *
 * Restyled to match the reference design: cream card, red circular arrow
 * buttons, pale-blue category circles, bold uppercase labels, and a thin
 * decorative orange squiggle running behind the row. Sized small on
 * mobile and scaling up to the large desktop proportions shown in the
 * screenshot (the previous version had this backwards).
 *
 * Adjust the import path / base URL / response shape to match your backend.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";

type SubTitle = "" | "New" | "Hot" | "Popular";

interface Category {
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
}

const AUTO_PLAY_DEFAULT = 3000;

const badgeClasses = (sub?: SubTitle) => {
  if (sub === "New") return "bg-green-100 text-green-600";
  if (sub === "Hot") return "bg-red-100 text-red-600";
  if (sub === "Popular") return "bg-violet-100 text-violet-600";
  return null;
};

const FoodCategory = ({
  onSelect,
  activeSlug,
  autoPlayInterval = AUTO_PLAY_DEFAULT,
}: FoodCategoryProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

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
  }, []);

  // ------------------------------------------------------------
  // AUTOPLAY
  // ------------------------------------------------------------
  const scrollByAmount = useCallback((amount: number) => {
    const track = trackRef.current;
    if (!track) return;

    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    const atStart = track.scrollLeft <= 4;

    if (amount > 0 && atEnd) {
      track.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (amount < 0 && atStart) {
      track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
      return;
    }
    track.scrollBy({ left: amount, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!autoPlayInterval || categories.length === 0) return;

    autoPlayTimer.current = setInterval(() => {
      if (isPaused.current) return;
      const track = trackRef.current;
      if (!track) return;
      const step = Math.min(track.clientWidth * 0.6, 320);
      scrollByAmount(step);
    }, autoPlayInterval);

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [autoPlayInterval, categories.length, scrollByAmount]);

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
  // RENDER
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="relative  flex items-center gap-2.5 rounded-[20px] bg-[#fbf1e4] px-2 py-6 sm:rounded-[24px] sm:py-8 md:rounded-[28px] md:py-9 lg:py-10">
        <div className="flex w-full max-width gap-4 overflow-hidden px-9 py-1 sm:gap-5 sm:px-10 md:gap-8 md:px-14 lg:gap-10 lg:px-16">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex w-[92px] flex-shrink-0 flex-col items-center gap-2.5 sm:w-[104px] md:w-[140px] lg:w-[170px]"
            >
              <div className="h-[84px] w-[84px] animate-pulse rounded-full bg-neutral-200 sm:h-[96px] sm:w-[96px] md:h-[130px] md:w-[130px] lg:h-[160px] lg:w-[160px]" />
              <div className="h-2.5 w-14 animate-pulse rounded-full bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[20px] bg-[#fbf1e4] px-6 py-8 text-center text-[13px] text-neutral-500">
        Couldn&apos;t load categories right now.
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="rounded-[20px] bg-[#fbf1e4] px-6 py-8 text-center text-[13px] text-neutral-500">
        No categories to show yet.
      </div>
    );
  }

  return (
    <div
      className="relative w-full flex items-center gap-2 overflow-hidden  md:py-9 lg:py-10"
      onMouseEnter={() => (isPaused.current = true)}
      onMouseLeave={() => {
        isPaused.current = false;
        endDrag();
      }}
    >
      <div className="max-w-[1846px] mx-auto  w-full flex items-center gap-2  rounded-[20px]">
        {/* decorative squiggle line running behind the row */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-70"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,55 C 90,15 160,90 260,55 C 360,20 430,88 530,52 C 630,18 700,85 800,50 C 870,25 930,70 1000,45"
            fill="none"
            stroke="#f2843d"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>

        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-260)}
          className="relative cursor-pointer z-10 hidden md:flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e5484d] text-white shadow-[0_4px_10px_rgba(229,72,77,0.35)] transition hover:scale-[1.06] hover:bg-[#cf3d42] active:scale-95 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-[52px] lg:w-[52px]"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            className="sm:h-5 sm:w-5 lg:h-6 lg:w-6"
          >
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

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
              <>
                <Link href={`/foods?category_id=${category._id}`}>
                  <button
                    type="button"
                    key={category._id}
                    onClick={() => handleCategoryClick(category)}
                    className="flex w-[104px] flex-shrink-0 scroll-ml-9 flex-col items-center gap-2 text-center [scroll-snap-align:start] sm:w-[104px] sm:scroll-ml-10 sm:gap-2.5 md:w-[140px] md:scroll-ml-14 lg:w-[300px] lg:scroll-ml-16"
                  >
                    <span
                      className={`group relative flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-50 to-sky-100 shadow-[0_6px_16px_rgba(0,0,0,0.08)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)] sm:h-[96px] sm:w-[96px] md:h-[130px] md:w-[130px] lg:h-[300px] lg:w-[300px] ${
                        active
                          ? "outline outline-[3px] outline-offset-[3px] outline-[#e5484d]"
                          : ""
                      }`}
                    >
                      {category.image ? (
                        <img
                          src={category.image}
                          alt={category.name}
                          draggable={false}
                          className="h-full w-full object-cover pointer-events-none"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-slate-400 sm:text-3xl lg:text-4xl">
                          {category.name.charAt(0)}
                        </span>
                      )}
                      {badge && category.sub_title && (
                        <span
                          className={`absolute left-1 top-1 rounded-full px-[7px] py-[2px] text-[9px] font-bold tracking-wide sm:text-[10px] ${badge}`}
                        >
                          {category.sub_title}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-800 sm:text-[11px] md:text-[13px] lg:text-[14px]">
                      {category.name}
                    </span>
                  </button>
                </Link>
              </>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount(260)}
          className="relative cursor-pointer z-10 hidden md:flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#e5484d] text-white shadow-[0_4px_10px_rgba(229,72,77,0.35)] transition hover:scale-[1.06] hover:bg-[#cf3d42] active:scale-95 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-[52px] lg:w-[52px]"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            className="sm:h-5 sm:w-5 lg:h-6 lg:w-6"
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FoodCategory;
