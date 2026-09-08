"use client";

/**
 * FoodsSlider
 * -------------------------------
 * Fetches foods and renders them using your existing <FoodCard />,
 * inside a slider that auto-advances one card every 5s (smooth scroll,
 * loops back at the end), plus drag-to-scroll, touch swipe, and arrow
 * buttons. No swiper package required.
 *
 *   GET /api/v1/foods?category_id=... -> { success, data: FoodItem[] }
 *   (category_id "all" or omitted -> no filter, all foods)
 *
 * Adjust the FoodCard import path below to match your project.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import FoodCard, { FoodItem } from "../FoodItems/FoodCard";

interface FoodsSliderProps {
  title?: string;
  subtitle?: string;
  /** Overrides the ?category_id= query param when provided. */
  categoryId?: string;
}

const AUTO_SLIDE_INTERVAL = 5000; // ms
const CARD_GAP = 16; // px — matches the track's gap-4 (kept constant across breakpoints so the JS step calc stays accurate)

const FoodsSlider = ({ title, subtitle, categoryId }: FoodsSliderProps) => {
  const searchParams = useSearchParams();
  const activeCategoryId =
    categoryId ?? searchParams.get("category_id") ?? "all";

  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);

  // drag state
  const isDragging = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const [isDraggingClass, setIsDraggingClass] = useState(false);

  // ------------------------------------------------------------
  // FETCH
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const fetchFoods = async () => {
      setLoading(true);
      setError(false);
      try {
        const params: Record<string, string> = {};
        if (activeCategoryId && activeCategoryId !== "all") {
          params.category_id = activeCategoryId;
        }
        const res = await axios.get(`/api/v1/foods`, { params });
        const data: FoodItem[] = res.data?.data || [];
        if (!cancelled) {
          setFoods(data.filter((f) => (f.status || "active") === "active"));
        }
      } catch (err) {
        console.error("Failed to load foods:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFoods();
    return () => {
      cancelled = true;
    };
  }, [activeCategoryId]);

  // ------------------------------------------------------------
  // STEP HELPERS (shared by autoplay + arrow buttons)
  // ------------------------------------------------------------
  const stepAmount = (track: HTMLDivElement) => {
    const firstCard = track.children[0] as HTMLElement | undefined;
    return firstCard
      ? firstCard.offsetWidth + CARD_GAP
      : track.clientWidth * 0.8;
  };

  const advance = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = stepAmount(track);

    if (direction === 1) {
      const atEnd =
        track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }
      track.scrollBy({ left: amount, behavior: "smooth" });
    } else {
      const atStart = track.scrollLeft <= 4;
      if (atStart) {
        track.scrollTo({ left: track.scrollWidth, behavior: "smooth" });
        return;
      }
      track.scrollBy({ left: -amount, behavior: "smooth" });
    }
  }, []);

  // ------------------------------------------------------------
  // AUTOPLAY — advance one card every 5s
  // ------------------------------------------------------------
  useEffect(() => {
    if (foods.length === 0) return;

    const id = window.setInterval(() => {
      if (isPaused.current) return;
      advance(1);
    }, AUTO_SLIDE_INTERVAL);

    return () => window.clearInterval(id);
  }, [foods.length, advance]);

  // ------------------------------------------------------------
  // ARROW NAV
  // ------------------------------------------------------------
  const nudge = useCallback(
    (dir: 1 | -1) => {
      isPaused.current = true;
      advance(dir);
      window.setTimeout(() => {
        isPaused.current = false;
      }, AUTO_SLIDE_INTERVAL - 200);
    },
    [advance],
  );

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
    window.setTimeout(() => {
      isPaused.current = false;
    }, 500);
  };

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex gap-5 overflow-hidden px-4 py-2 sm:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-[220px] sm:w-[240px] flex-shrink-0 rounded-[26px] bg-neutral-100 animate-pulse"
            style={{ height: 340 }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 text-center text-[13px] text-neutral-500">
        Couldn&apos;t load foods right now.
      </div>
    );
  }

  if (foods.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-[13px] text-neutral-500">
        No items found in this category.
      </div>
    );
  }

  return (
    <div className="max-width w-full pb-20">
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {title}
            </h2>
          )}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      {/* header row: heading left, arrows grouped neatly on the right */}
      <div className="flex items-center justify-between gap-3 mb-4 pt-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900">
          More Food Items
        </h3>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => nudge(-1)}
            className="flex cursor-pointer h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full  ring-1 ring-white bg-[#D70F64] text-neutral-700 transition hover:scale-105 hover:bg-[#D70F64] active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.4}
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => nudge(1)}
            className=" cursor-pointer flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#D70F64] shadow-md ring-1 ring-white text-neutral-700 transition hover:scale-105 hover:bg-[#D70F64] active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth={2.4}
            >
              <path
                d="M9 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className="relative -mx-4 sm:-mx-6"
        onMouseEnter={() => (isPaused.current = true)}
        onMouseLeave={() => {
          isPaused.current = false;
          endDrag();
        }}
      >
        {/* track */}
        <div
          ref={trackRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={endDrag}
          onTouchStart={() => (isPaused.current = true)}
          onTouchEnd={() =>
            window.setTimeout(() => (isPaused.current = false), 700)
          }
          className={`flex select-none gap-4 overflow-x-auto px-4 sm:px-6 py-2 [scroll-behavior:smooth] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDraggingClass ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {foods.map((food) => (
            <div
              key={food._id}
              className="w-[calc(50%-8px)] md:w-[calc(25%-12px)] flex-shrink-0"
            >
              {/* কার্ট এখন গ্লোবাল Zustand স্টোরে — কার্ড নিজেই যোগ করে */}
              <FoodCard food={food} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FoodsSlider;
