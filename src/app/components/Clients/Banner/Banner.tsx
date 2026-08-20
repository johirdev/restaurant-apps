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
const BRAND_RED = "#E21B70";
const BRAND_RED_DARK = "#C22620";
const GOLD = "#F5B93D";
const GREEN = "#189B4C";

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
          .sort(
            (a: Banner, b: Banner) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
          );
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

  const onTouchStart = (e: React.TouchEvent) =>
    (touchStartX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)();
    touchStartX.current = null;
  };

  const heightClass = "h-[360px] sm:h-[420px] md:h-[520px] lg:h-[86vh]";

  if (loading) {
    return (
      <div className="w-full mx-auto ">
        <div
          className={`w-full ${heightClass} animate-pulse rounded-md`}
          style={{ background: BRAND_RED }}
        />
      </div>
    );
  }
  if (banners.length === 0) return null;

  return (
    <div className="relative w-full">
      <div
        className={`relative w-full ${heightClass} flex items-center overflow-hidden select-none shadow-sm`}
        style={{ background: BRAND_RED }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* repeating Bangla watermark, sits behind everything */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.09]">
          <div
            className="whitespace-nowrap font-extrabold text-white"
            style={{
              fontSize: "clamp(48px, 9vw, 130px)",
              lineHeight: 1.05,
              transform: "translateX(-4%)",
            }}
          >
            সেবা ও উৎপাদনে · সেবা ও উৎপাদনে ·
          </div>
          <div
            className="whitespace-nowrap font-extrabold text-white"
            style={{
              fontSize: "clamp(48px, 9vw, 130px)",
              lineHeight: 1.05,
              transform: "translateX(6%)",
            }}
          >
            মানসম্মত খাবার · মানসম্মত খাবার ·
          </div>
        </div>

        {banners.map((banner, i) => {
          const isActive = i === index;
          const textClass =
            banner.text_color === "dark" ? "text-neutral-900" : "text-white";
          const words = (banner.text_title || "").split(" ").filter(Boolean);
          const animKey = isActive ? `content-${progressKey}` : `idle-${i}`;

          return (
            <div
              key={banner._id}
              className="absolute h-full inset-0 transition-opacity duration-700 ease-out"
              style={{
                opacity: isActive ? 1 : 0,
                pointerEvents: isActive ? "auto" : "none",
                zIndex: isActive ? 1 : 0,
              }}
              aria-hidden={!isActive}
            >
              {/* optional photo backdrop behind the flat brand color, subtle */}
              {banner.main_bg_image && (
                <>
                  <img
                    src={banner.main_bg_image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-25"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: BRAND_RED, opacity: 0.72 }}
                  />
                </>
              )}

              {/* ===== LEFT: text content ===== */}
              <div className=" relative max-width z-20 h-full flex flex-col justify-center px-5 sm:px-10 md:px-14 lg:px-16 max-w-[88%] sm:max-w-[70%] md:max-w-[52%]">
                <div
                  key={animKey}
                  style={{
                    animation: isActive
                      ? "bannerSlideIn 550ms cubic-bezier(.2,.7,.3,1) both"
                      : "none",
                  }}
                >
                  {banner.badge_text && (
                    <span
                      className="inline-flex items-center w-fit px-4 sm:px-5 py-1.5 sm:py-2 mb-2 sm:mb-3 font-extrabold text-sm sm:text-base md:text-lg"
                      style={{
                        background: GOLD,
                        color: "#1a1208",
                        clipPath: "polygon(8% 0%, 100% 0%, 92% 100%, 0% 100%)",
                        opacity: 0,
                        animation: isActive
                          ? "bannerWordPop 500ms ease-out 60ms both"
                          : "none",
                      }}
                    >
                      {banner.badge_text}
                    </span>
                  )}

                  {words.length > 0 && (
                    <h2
                      className={`font-body max-w-[600px] font-extrabold uppercase leading-[0.95] tracking-tight ${textClass}`}
                      style={{ fontSize: "clamp(28px, 6vw, 56px)" }}
                    >
                      {words.map((word, wi) => (
                        <span
                          key={wi}
                          className="inline-block mr-[0.28em]"
                          style={{
                            opacity: 0,
                            animation: isActive
                              ? `bannerWordPop 500ms ease-out ${150 + wi * 110}ms both`
                              : "none",
                          }}
                        >
                          {word}
                        </span>
                      ))}
                    </h2>
                  )}

                  {(banner.subtitle || banner.price_offer) && (
                    <p
                      className={`font-body font-medium text-sm sm:text-base md:text-lg mt-2 sm:mt-3 ${textClass}`}
                      style={{
                        opacity: 0,
                        animation: isActive
                          ? `bannerWordPop 500ms ease-out ${150 + words.length * 110 + 80}ms both`
                          : "none",
                      }}
                    >
                      {banner.subtitle}
                      {banner.subtitle && banner.price_offer ? " · " : ""}
                      {banner.price_offer}
                    </p>
                  )}

                  {banner.button_text && (
                    <a
                      href={banner.button_link || "#"}
                      className={`inline-flex items-center justify-center rounded-full border-2 font-bold uppercase tracking-wide text-xs sm:text-sm px-6 sm:px-8 py-2.5 sm:py-3.5 mt-4 sm:mt-6 transition-colors duration-300 hover:bg-white hover:text-[#E21B70] w-fit ${
                        banner.text_color === "dark"
                          ? "border-neutral-900 text-neutral-900"
                          : "border-white text-white"
                      }`}
                      style={{
                        opacity: 0,
                        animation: isActive
                          ? `bannerWordPop 500ms ease-out ${150 + words.length * 110 + 220}ms both`
                          : "none",
                      }}
                    >
                      {banner.button_text}
                    </a>
                  )}
                </div>
              </div>

              {/* ===== RIGHT: circular plate photo ===== */}
              <div
                className="hidden z-20 md:flex absolute  -translate-y-[420px] right-[-8%] sm:right-[2%] md:right-[6%] lg:right-[8%]"
                style={{
                  opacity: isActive ? 1 : 0,
                  transform: `translateY(-50%) scale(${isActive ? 1 : 0.92})`,
                  transition:
                    "opacity 600ms ease-out, transform 600ms ease-out",
                  transitionDelay: isActive ? "120ms" : "0ms",
                }}
              >
                <div
                  className="relative rounded-full overflow-hidden"
                  style={{
                    width: "clamp(200px, 34vw, 420px)",
                    height: "clamp(200px, 34vw, 420px)",
                    background: "#fff",
                    boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
                  }}
                >
                  {/* decorative skeleton chevron shown behind/through the photo */}
                  <svg
                    viewBox="0 0 200 200"
                    className="absolute inset-0 w-full h-full"
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id={`chevron-${banner._id}`}>
                        <path d="M14,14 L186,14 L186,88 L100,192 L14,88 Z" />
                      </clipPath>
                    </defs>
                    <g clipPath={`url(#chevron-${banner._id})`}>
                      <rect width="200" height="200" fill="#ffffff" />
                      {Array.from({ length: 9 }).map((_, si) => (
                        <rect
                          key={si}
                          x="0"
                          y={si * 24}
                          width="200"
                          height="11"
                          fill={BRAND_RED}
                          opacity="0.28"
                        />
                      ))}
                    </g>
                  </svg>

                  {banner.food_image && (
                    <img
                      src={banner.food_image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                      style={{ opacity: isActive ? 1 : 0.15 }}
                    />
                  )}

                  {/* left edge quality/check badge */}
                  <div
                    className="absolute left-[-6px] top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-md bg-white/90 flex items-center justify-center shadow-md"
                    aria-hidden="true"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={GREEN}
                      strokeWidth={3}
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* bottom notch pointer */}
                  <div
                    className="absolute left-1/2 -bottom-[9px] -translate-x-1/2 w-0 h-0"
                    style={{
                      borderLeft: "9px solid transparent",
                      borderRight: "9px solid transparent",
                      borderTop: "10px solid #ffffff",
                      filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.25))",
                    }}
                    aria-hidden="true"
                  />
                </div>

                {/* price bubble + dashed line, anchored to the circle's top-right */}
                {banner.price_offer && (
                  <div
                    className="absolute top-[6%] left-[78%] sm:left-[80%] flex items-center"
                    style={{
                      opacity: isActive ? 1 : 0,
                      transition: "opacity 500ms ease-out",
                      transitionDelay: isActive ? "320ms" : "0ms",
                    }}
                  >
                    <div
                      className="flex flex-col items-center justify-center rounded-full text-white text-center shadow-lg flex-shrink-0"
                      style={{
                        width: "clamp(56px, 8vw, 78px)",
                        height: "clamp(56px, 8vw, 78px)",
                        background: GREEN,
                        border: "3px solid rgba(255,255,255,0.5)",
                      }}
                    >
                      <span className="text-[9px] sm:text-[10px] font-medium opacity-90 leading-none">
                        Only
                      </span>
                      <span className="text-[13px] sm:text-base font-extrabold leading-none mt-0.5">
                        {banner.price_offer}
                      </span>
                    </div>
                    <span
                      className="hidden sm:block h-px flex-shrink-0"
                      style={{
                        width: "clamp(60px, 8vw, 160px)",
                        background:
                          "repeating-linear-gradient(90deg, rgba(255,255,255,0.7) 0 8px, transparent 8px 14px)",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* edge-pinned PREV / NEXT tabs */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous banner"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center bg-white/90 hover:bg-white text-neutral-800 rounded-r-full transition-colors"
              style={{ width: 22, height: 64 }}
            >
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                }}
              >
                Prev
              </span>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next banner"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center bg-white/90 hover:bg-white text-neutral-800 rounded-l-full transition-colors"
              style={{ width: 22, height: 64 }}
            >
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ writingMode: "vertical-rl" }}
              >
                Next
              </span>
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
                style={{
                  width: i === index ? 22 : 6,
                  background: "rgba(255,255,255,0.4)",
                }}
              >
                {i === index && (
                  <span
                    key={progressKey}
                    className="absolute inset-0 rounded-full bg-white"
                    style={{
                      transformOrigin: "left",
                      animation: paused
                        ? "none"
                        : `bannerProgress ${SLIDE_DURATION}ms linear forwards`,
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
          @keyframes bannerSlideIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          @keyframes bannerWordPop {
            from {
              opacity: 0;
              transform: translateY(16px) scale(0.92);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default BannerClient;
