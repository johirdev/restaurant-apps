"use client";

/**
 * HeroBanner — হোম পেজের সবচেয়ে উপরের ব্যানার
 * --------------------------------------------------------------------------
 * বাঁয়ে লেখা (টাইটেল, বর্ণনা, বোতাম), ডানে ছবি — ছবির বাঁ কিনারা বড় একটা
 * বাঁকে কাটা। লেআউট আর রঙের নিয়মগুলো globals.css এর `.hero-banner*` ক্লাসে।
 *
 * ব্যানারগুলো ড্যাশবোর্ড থেকে আসে:
 *   GET /api/v1/banners?status=active  →  { success, data: Banner[] }
 *
 * একাধিক ব্যানার থাকলে Swiper ৫ সেকেন্ড পর পর নিজে থেকেই পরেরটায় যায়;
 * একটাই থাকলে স্লাইডার বন্ধ থাকে (ডট বা অটোপ্লে কিছুই দেখানো হয় না)।
 *
 * কোনো চালু ব্যানার না থাকলে কম্পোনেন্টটা কিছুই রেন্ডার করে না — তখন
 * হোম পেজ আগের মতোই সোজা ক্যাটাগরি দিয়ে শুরু হয়।
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, A11y, Keyboard, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";

/** পরের স্লাইডে যেতে কত সময় — ৫ সেকেন্ড */
const AUTOPLAY_DELAY = 5000;

export interface Banner {
  _id: string;
  eyebrow?: string;
  title: string;
  highlight?: string;
  subtitle?: string;
  button_label?: string;
  button_link?: string;
  image?: string;
  bg_color?: string;
  accent_color?: string;
  text_color?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

/**
 * ব্যানারের নিজের রঙ থাকলে সেটা, নাহলে থিমের টোকেন।
 * এভাবে globals.css এ ব্র্যান্ড কালার বদলালে ব্যানারও নিজে থেকেই বদলায়।
 */
export const bannerColors = (banner: Pick<Banner, "bg_color" | "accent_color" | "text_color">) =>
  ({
    "--hero-bg": banner.bg_color || "var(--color-ink)",
    "--hero-accent": banner.accent_color || "var(--color-brand)",
    "--hero-ink": banner.text_color || "var(--color-ink-invert)",
  }) as React.CSSProperties;

/* ==========================================================================
   একটা স্লাইড
   --------------------------------------------------------------------------
   ড্যাশবোর্ডের লাইভ প্রিভিউও ঠিক এই কম্পোনেন্টটাই ব্যবহার করে, তাই
   অ্যাডমিন যা দেখেন সাইটে হুবহু সেটাই যায়।
   ========================================================================== */
export const HeroBannerSlide = ({
  banner,
  priority = false,
}: {
  banner: Banner;
  priority?: boolean;
}) => {
  const link = banner.button_link?.trim() || "/foods";
  const label = banner.button_label?.trim();

  // টাইটেল না থাকলেও যেন পুরো হোম পেজ ভেঙে না পড়ে
  const titleLines = String(banner.title ?? "").split("\n");

  return (
    <div
      className="hero-banner min-h-[520px] sm:min-h-[560px] lg:min-h-[600px] xl:min-h-[660px] flex items-center"
      style={bannerColors(banner)}
    >
      {/* ---------- ছবি ---------- */}
      {banner.image ? (
        <div className="hero-banner__media">
          {/* সাধারণ <img> — অ্যাডমিন বাইরের যেকোনো URL বসাতে পারেন,
              next/image এর remotePatterns এ আটকে যেত */}
          <img
            src={banner.image}
            alt={banner.title || ""}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            decoding="async"
          />
          <span className="hero-banner__veil" />
        </div>
      ) : null}

      {/* ছবির বাইরের সরু বাঁকা রেখা + কোণের সাজ */}
      {banner.image ? <span className="hero-banner__arc" /> : null}
      <span className="hero-banner__ring" />
      <span className="hero-banner__dot" />

      {/* ---------- লেখা ---------- */}
      <div className="hero-banner__content max-width w-full px-5 sm:px-8 lg:px-10 py-16 sm:py-20 lg:py-24">
        <div className="max-w-[560px] lg:max-w-[46%]">
          {banner.eyebrow ? (
            <p
              className="mb-4 text-[12px] sm:text-[13px] font-bold uppercase tracking-[0.22em]"
              style={{ color: "var(--hero-accent)" }}
            >
              {banner.eyebrow}
            </p>
          ) : null}

          <h1 className="font-display font-bold leading-[1.06] text-[clamp(2.1rem,7vw,4.2rem)]">
            {/* Enter চাপলে যেভাবে লেখা হয়েছে, ঠিক সেভাবেই লাইন ভাঙে */}
            {titleLines.map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
            {banner.highlight ? (
              <span className="block" style={{ color: "var(--hero-accent)" }}>
                {banner.highlight}
              </span>
            ) : null}
          </h1>

          {banner.subtitle ? (
            <p className="mt-5 max-w-[520px] text-[15px] sm:text-[16px] leading-[1.75] opacity-80">
              {banner.subtitle}
            </p>
          ) : null}

          {label ? (
            <Link
              href={link}
              className="hero-banner__cta mt-8 inline-flex items-center justify-center px-8 sm:px-10 h-12 sm:h-14 text-[13px] sm:text-[14px] font-extrabold uppercase"
            >
              {label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   স্লাইডার
   ========================================================================== */
const HeroBanner = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/api/v1/banners", {
          params: { status: "active" },
        });
        if (!cancelled) setBanners(res.data?.data ?? []);
      } catch {
        // ব্যানার না এলে হোম পেজ থামানোর মানে নেই — চুপচাপ কিছুই দেখাই না
        if (!cancelled) setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // লোড হওয়ার সময় একই উচ্চতার একটা ফাঁকা ব্লক — পেজ লাফায় না
  if (loading) {
    return (
      <div
        className="min-h-[520px] sm:min-h-[560px] lg:min-h-[600px] xl:min-h-[660px]"
        style={{ background: "var(--color-ink)" }}
      />
    );
  }

  if (banners.length === 0) return null;

  // একটাই ব্যানার — স্লাইডারের দরকার নেই
  if (banners.length === 1) {
    return <HeroBannerSlide banner={banners[0]} priority />;
  }

  return (
    <Swiper
      className="hero-swiper"
      modules={[Autoplay, Pagination, Keyboard, A11y]}
      slidesPerView={1}
      loop
      speed={700}
      autoplay={{
        delay: AUTOPLAY_DELAY,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
      }}
      pagination={{ clickable: true }}
      keyboard={{ enabled: true }}
      /* পেজিনেশনের ডট প্রথম ব্যানারের রঙ ধরে */
      style={bannerColors(banners[0])}
    >
      {banners.map((banner, i) => (
        <SwiperSlide key={banner._id}>
          <HeroBannerSlide banner={banner} priority={i === 0} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
};

export default HeroBanner;
