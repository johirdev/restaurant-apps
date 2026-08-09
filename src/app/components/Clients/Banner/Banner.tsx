// src/app/(public)/components/BannerClient.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

type TextColor = "light" | "dark";
type Status = "active" | "inactive";

interface Banner {
  _id: string;
  main_bg_image?: string;
  food_image?: string;
  text_title?: string;
  subtitle?: string;
  price_offer?: string;
  badge_text?: string;
  button_text?: string;
  button_link?: string;
  text_color?: TextColor;
  sort_order?: number;
  status?: Status;
}

const SLIDE_DURATION = 5000;

const BannerClient = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`/api/v1/banners`);
        const active: Banner[] = (res.data.data || [])
          .filter((b: Banner) => (b.status || "active") === "active")
          .sort((a: Banner, b: Banner) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setBanners(active);
      } catch (err) {
        console.error("Failed to load banners", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (!banners.length) return;
      setIndex(((i % banners.length) + banners.length) % banners.length);
      setProgressKey((k) => k + 1);
    },
    [banners.length],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    const t = setTimeout(next, SLIDE_DURATION);
    return () => clearTimeout(t);
  }, [index, paused, banners.length, next]);

  const onTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)();
    touchStartX.current = null;
  };

  // ---- fixed height scale, same across every slide/state ----
  const heightClass =
    "h-[200px] sm:h-[260px] md:h-[300px] lg:h-[70vh] ";

  if (loading) {
    return (
      <div className="w-full w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`w-full ${heightClass}  animate-pulse`} style={{ background: "var(--color-surface-soft)" }} />
      </div>
    );
  }
  if (banners.length === 0) return null;

  return (
    <div className="w-full  mx-auto ">
      <div
        className={`relative  w-full ${heightClass}  overflow-hidden select-none shadow-sm`}
        style={{ background: "var(--color-spice)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {banners.map((banner, i) => {
          const isActive = i === index;
          const textClass = banner.text_color === "dark" ? "text-neutral-900" : "text-white";
          return (
            <div
              key={banner._id}
              className="absolute inset-0 transition-opacity duration-700 ease-out"
              style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? "auto" : "none", zIndex: isActive ? 1 : 0 }}
              aria-hidden={!isActive}
            >
              {/* full-cover photo background */}
              {banner.main_bg_image ? (
                <img
                  src={banner.main_bg_image}
                  alt=""
                  className="absolute inset-0 w-full h-full aspect-auto object-cover transition-transform duration-[6000ms] ease-out"
                  style={{ transform: isActive ? "scale(1.06)" : "scale(1)" }}
                />
              ) : (
                <div className="absolute inset-0" style={{ background: "var(--color-spice)" }} />
              )}

              {/* left-side dark gradient for text contrast, like reference */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 38%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0) 100%)" }}
              />

              {/* optional extra food cutout, layered on the right if provided */}
              {banner.food_image && (
                <img
                  src={banner.food_image}
                  alt=""
                  className="hidden lg:block absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 max-h-[85%] object-contain transition-all duration-700 ease-out"
                  style={{
                    filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.4))",
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(-50%) scale(1)" : "translateY(-50%) scale(0.94)",
                    transitionDelay: isActive ? "150ms" : "0ms",
                  }}
                />
              )}

           {/* content — top-left aligned, big & bold like reference */}
<div className="relative max-width z-20 h-full flex flex-col justify-center px-5 sm:px-10 md:px-14 lg:px-16 max-w-[85%] sm:max-w-[70%] md:max-w-[55%]">
  {banner.badge_text && (
    <span
      className="inline-flex items-center w-fit px-4 sm:px-5 py-1.5 sm:py-2 mb-2 sm:mb-3 font-extrabold text-sm sm:text-base md:text-lg transition-all duration-500"
      style={{
        background: "var(--color-saffron)",
        color: "#1a1208",
        clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0)" : "translateY(8px)",
        transitionDelay: isActive ? "100ms" : "0ms",
      }}
    >
      {banner.badge_text}
    </span>
  )}

  {banner.text_title && (
    <h2
      className={`font-body max-w-[600px] font-extrabold uppercase leading-[0.95] tracking-tight ${textClass} transition-all duration-500`}
      style={{
        fontSize: "clamp(28px, 6vw, 56px)",
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0)" : "translateY(14px)",
        transitionDelay: isActive ? "180ms" : "0ms",
      }}
    >
      {banner.text_title}
    </h2>
  )}

  {(banner.subtitle || banner.price_offer) && (
    <p
      className={`font-body font-medium text-sm sm:text-base md:text-lg mt-2 sm:mt-3 ${textClass} opacity-90 transition-all duration-500`}
      style={{
        opacity: isActive ? 0.92 : 0,
        transform: isActive ? "translateY(0)" : "translateY(10px)",
        transitionDelay: isActive ? "280ms" : "0ms",
      }}
    >
      {banner.subtitle}
      {banner.subtitle && banner.price_offer ? " · " : ""}
      {banner.price_offer}
    </p>
  )}

  {banner.button_text && (
    
     <a href={banner.button_link || "#"}
      className={`inline-flex items-center justify-center rounded-full border-2 font-bold uppercase tracking-wide text-xs sm:text-sm px-6 sm:px-8 py-2.5 sm:py-3.5 mt-4 sm:mt-6 transition-all duration-500 hover:bg-white hover:text-[var(--color-spice)] w-fit ${
        banner.text_color === "dark" ? "border-neutral-900 text-neutral-900" : "border-white text-white"
      }`}
      style={{
        opacity: isActive ? 1 : 0,
        transform: isActive ? "translateY(0)" : "translateY(10px)",
        transitionDelay: isActive ? "380ms" : "0ms",
      }}
    >
      {banner.button_text}
    </a>
  )}
</div>
            </div>
          );
        })}

        {/* prev/next small round arrows, shown on hover (desktop) or always (mobile) */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous banner"
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/85 hover:bg-white text-neutral-800 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next banner"
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-white/85 hover:bg-white text-neutral-800 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}

        {/* dots with progress */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b._id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                className="relative h-1.5 rounded-full overflow-hidden transition-all duration-300"
                style={{ width: i === index ? 22 : 6, background: "rgba(255,255,255,0.4)" }}
              >
                {i === index && (
                  <span
                    key={progressKey}
                    className="absolute inset-0 rounded-full bg-white"
                    style={{
                      transformOrigin: "left",
                      animation: paused ? "none" : `bannerProgress ${SLIDE_DURATION}ms linear forwards`,
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        <style jsx global>{`
          @keyframes bannerProgress {
            from {
              transform: scaleX(0);
            }
            to {
              transform: scaleX(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BannerClient;