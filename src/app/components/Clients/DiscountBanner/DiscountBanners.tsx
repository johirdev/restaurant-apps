"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import "./discountbanner.css";

interface BannerApi {
  _id: string;
  line1: string;
  line2: string;
  buttonText: string;
  buttonLink: string;
  discountPercent: number;
  discountLabel: string;
  image: string;
  sort_order?: number;
}

const AUTO_ROTATE_MS = 5000;

/** Renders a heading string, turning {word} segments into the orange highlight. */
const renderHighlighted = (text: string) => {
  const parts = text.split(/(\{[^}]+\})/g);
  return parts.map((part, i) => {
    const match = part.match(/^\{([^}]+)\}$/);
    if (match) {
      return (
        <span key={i} className="text-[#f5a623]">
          {match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

const DiscountBanners = () => {
  const [banners, setBanners] = useState<BannerApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await axios.get(`/api/v1/hero-discount-banner`);
        const data: BannerApi[] = res.data.data || [];
        const sorted = [...data].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
        setBanners(sorted);
      } catch (err) {
        console.error("Failed to load banners", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  // auto-rotate every 5s, infinitely
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
      setAnimKey((k) => k + 1);
    }, AUTO_ROTATE_MS);
    return () => clearInterval(t);
  }, [banners.length]);

  const goTo = (index: number) => {
    setActiveIndex(index);
    setAnimKey((k) => k + 1);
  };

  if (loading) {
    return (
      <section className="bg-[#171716] w-full min-h-[320px] sm:min-h-[380px] md:min-h-[420px] flex items-center justify-center px-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
      </section>
    );
  }

  if (banners.length === 0) return null;

  const banner = banners[activeIndex];

  return (
    <section className="relative section-bg w-full overflow-hidden min-h-[560px] sm:min-h-[520px] md:h-[60vh] md:min-h-[480px] flex items-center">
      <div className="max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-10 py-12 sm:py-16 md:py-24 pb-20 sm:pb-24 md:pb-16">
        <div
          key={animKey}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 items-center w-full"
        >
          {/* ---- text side ---- */}
          <div className="banner-text-enter text-center md:text-left order-2 md:order-1">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight">
              {renderHighlighted(banner.line1 || "")}
            </h1>
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mt-1">
              {renderHighlighted(banner.line2 || "")}
            </h1>

            <Link
              href={banner.buttonLink || "/menu"}
              className="mt-6 sm:mt-8 inline-flex items-center gap-2 bg-red-600 text-white rounded-full px-5 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-[13px] font-bold tracking-wide hover:bg-red-700 transition-colors"
            >
              {(banner.buttonText || "SEE ALL MENU").toUpperCase()}
              <span aria-hidden>→</span>
            </Link>
          </div>

          {/* ---- image side ---- */}
          <div className="relative flex items-center justify-center md:justify-end order-1 md:order-2">
            <div className="banner-image-enter relative w-[260px] xs:w-[300px] sm:w-[380px] md:w-[440px] lg:w-[500px] mx-auto md:mx-0">
              <svg
                viewBox="0 0 620 640"
                className="w-full h-auto overflow-visible"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <clipPath id={`pizzaClip-${banner._id}`}>
                    <circle cx="380" cy="430" r="250" />
                  </clipPath>
                  <filter
                    id={`cloudShadow-${banner._id}`}
                    x="-50%"
                    y="-50%"
                    width="200%"
                    height="200%"
                  >
                    <feDropShadow
                      dx="0"
                      dy="4"
                      stdDeviation="6"
                      floodColor="#000000"
                      floodOpacity="0.25"
                    />
                  </filter>
                </defs>

                {/* pizza image, clipped to a circle, bottom intentionally bleeds past the viewBox */}
                {banner.image ? (
                  <image
                    href={banner.image}
                    x="130"
                    y="180"
                    width="500"
                    height="500"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#pizzaClip-${banner._id})`}
                  />
                ) : (
                  <>
                    <circle
                      cx="380"
                      cy="430"
                      r="250"
                      fill="#2a2a28"
                      stroke="#ffffff22"
                      strokeWidth="2"
                    />
                    <text
                      x="380"
                      y="435"
                      textAnchor="middle"
                      fill="#ffffff55"
                      fontSize="20"
                      fontFamily="inherit"
                    >
                      No image
                    </text>
                  </>
                )}

                {/* hand-drawn squiggle sketch line */}
                {banner.discountPercent > 0 && (
                  <path
                    d="M90,15 C160,-15 300,-15 370,20 C410,40 395,65 365,58 C340,52 348,25 380,35 C460,60 540,110 555,165 C565,200 545,225 515,205"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.9"
                  />
                )}

                {/* trailing thought-bubble bumps */}
                {banner.discountPercent > 0 && (
                  <>
                    <circle cx="270" cy="195" r="16" fill="#ffffff" />
                    <circle cx="298" cy="223" r="9" fill="#ffffff" />
                  </>
                )}

                {/* cloud / thought-bubble badge */}
                {banner.discountPercent > 0 && (
                  <g
                    transform="translate(40,10)"
                    filter={`url(#cloudShadow-${banner._id})`}
                  >
                    <path
                      d="M40,90 C10,80 5,45 35,30 C30,5 70,-5 95,10 C110,-8 145,-5 155,20 C185,15 200,45 180,65 C200,85 190,115 165,120 C170,145 140,160 115,150 C100,170 65,170 50,150 C25,155 5,135 10,115 C-5,105 5,90 25,90 Z"
                      fill="#ffffff"
                    />
                    <text
                      x="100"
                      y="82"
                      textAnchor="middle"
                      fill="#ef4444"
                      fontSize="46"
                      fontWeight="800"
                      fontFamily="inherit"
                    >
                      {banner.discountPercent}%
                    </text>
                    <text
                      x="100"
                      y="128"
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="34"
                      fontWeight="800"
                      fontFamily="inherit"
                    >
                      {banner.discountLabel || "off"}
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* ---- dots ---- */}
        {banners.length > 1 && (
          <div className="flex items-center justify-center gap-2 absolute bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2">
            {banners.map((b, i) => (
              <button
                key={b._id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to banner ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? "w-6 sm:w-7 bg-red-600"
                    : "w-2 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default DiscountBanners;
