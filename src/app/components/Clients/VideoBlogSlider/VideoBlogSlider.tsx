"use client";

/**
 * VideoBlogSlider
 * -------------------------------
 * Public storefront slider for your video blog:
 *
 *   GET /api/v1/video-blogs?status=active -> { success, data: VideoBlog[] }
 *
 * Auto-advances one card every 5s with a smooth scroll (loops back to
 * the start once it hits the end), pauses on hover/touch/drag and
 * resumes after, and supports manual drag-to-scroll + arrow buttons.
 * Clicking a card opens a lightbox modal that plays the video via its
 * embed_url.
 *
 * No external swiper package required — pure React + Tailwind.
 * Adjust the import path / response shape to match your backend.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

type VideoPlatform =
  | "youtube"
  | "facebook"
  | "vimeo"
  | "tiktok"
  | "instagram"
  | "dailymotion"
  | "other";

interface VideoBlog {
  _id: string;
  video_url: string;
  embed_url: string;
  platform: VideoPlatform;
  thumbnail?: string;
  title?: string;
  description?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

const PLATFORM_COLOR: Record<VideoPlatform, string> = {
  youtube: "#FF0000",
  facebook: "#1877F2",
  vimeo: "#1AB7EA",
  tiktok: "#111827",
  instagram: "#C13584",
  dailymotion: "#00AAFF",
  other: "#64748B",
};

const AUTO_SLIDE_INTERVAL = 5000; // ms — advance one card every 5s
const CARD_GAP = 20; // px — matches the track's gap-5 at sm+ (gap-4 = 16px on mobile, close enough)

const VideoBlogSlider = () => {
  const [videos, setVideos] = useState<VideoBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<VideoBlog | null>(null);

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

    const fetchVideos = async () => {
      try {
        const res = await axios.get(`/api/v1/video-blogs`, {
          params: { status: "active" },
        });
        const data: VideoBlog[] = res.data?.data || [];
        if (cancelled) return;
        setVideos(
          data
            .slice()
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
        );
      } catch (err) {
        console.error("Failed to load video blogs:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchVideos();
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (videos.length === 0) return;

    const id = window.setInterval(() => {
      if (isPaused.current) return;
      advance(1);
    }, AUTO_SLIDE_INTERVAL);

    return () => window.clearInterval(id);
  }, [videos.length, advance]);

  // ------------------------------------------------------------
  // ARROW NAV (manual nudge — pauses autoplay briefly)
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

  const handleCardClick = (video: VideoBlog) => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    setActiveVideo(video);
    isPaused.current = true;
  };

  const closeModal = useCallback(() => {
    setActiveVideo(null);
    isPaused.current = false;
  }, []);

  useEffect(() => {
    if (!activeVideo) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [activeVideo, closeModal]);

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex gap-4 overflow-hidden px-4 py-2  sm:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="w-[240px] sm:w-[280px] md:w-[320px] flex-shrink-0 aspect-video animate-pulse rounded-xl bg-neutral-200"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8 text-center text-[13px] text-neutral-500">
        Couldn&apos;t load videos right now.
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-[13px] text-neutral-500">
        No videos to show yet.
      </div>
    );
  }

  return (
    <>
      {/* ---------------- HEADER ---------------- */}
      <div className="flex max-width flex-col md:flex-row items-center md:justify-between gap-5 mb-8 md:pt-10">
        <div>
          <span className="inline-block bg-red-600 text-white text-[11px] font-semibold px-3 py-1 rounded-sm mb-3 -skew-x-6">
            Tasty &amp; Crunchy
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Our Restaurant Blog
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Inspired by recipes and creations of world&apos;s best chefs
          </p>
        </div>
        <div className="relative w-full flex items-center md:w-[100px]">
          {/* arrows */}
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => nudge(-1)}
            className="absolute cursor-pointer left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-neutral-700 transition hover:scale-105 active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
            className="absolute cursor-pointer right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md text-neutral-700 transition hover:scale-105 active:scale-95"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
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
        className="relative max-w-[1800px] mx-auto"
        onMouseEnter={() => (isPaused.current = true)}
        onMouseLeave={() => {
          isPaused.current = false;
          endDrag();
        }}
      >
        {/* edge fade masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-16 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-16 bg-gradient-to-l from-white to-transparent" />

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
          className={`flex select-none gap-4 overflow-x-auto px-10 py-2 sm:gap-5 sm:px-14 [scroll-behavior:smooth] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            isDraggingClass ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {videos.map((video) => (
            <button
              type="button"
              key={video._id}
              onClick={() => handleCardClick(video)}
              className="group relative flex-shrink-0 w-[240px] max-h-[340px] sm:w-[340px] md:w-[600px] text-left"
            >
              <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-neutral-100 shadow-sm transition-shadow duration-300 group-hover:shadow-xl">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title || ""}
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-300">
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path
                        d="M10 9.5v5l4.5-2.5-4.5-2.5Z"
                        fill="currentColor"
                        stroke="none"
                      />
                    </svg>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/25" />

                <span
                  className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                  style={{ background: PLATFORM_COLOR[video.platform] }}
                >
                  {video.platform}
                </span>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="#E21B70"
                    >
                      <path d="M8 5v14l11-7L8 5Z" />
                    </svg>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* lightbox modal */}
        {activeVideo && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <div
              className="relative w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.4}
                >
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
              <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-black shadow-2xl">
                <iframe
                  src={activeVideo.embed_url}
                  className="absolute inset-0 h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  title={activeVideo.title || "Video"}
                />
              </div>
              {activeVideo.title && (
                <p className="mt-3 text-center text-[14px] font-medium text-white">
                  {activeVideo.title}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VideoBlogSlider;
