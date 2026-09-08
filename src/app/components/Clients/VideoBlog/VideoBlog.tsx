"use client";

/**
 * VideoBlog — হোম পেজের ভিডিও সেকশন
 * --------------------------------------------------------------------------
 * রেস্টুরেন্ট নিয়ে বানানো YouTube / Facebook / TikTok ভিডিওগুলো একটানা
 * বাঁ দিকে ভেসে যায় (infinite marquee), মাউস নিলে থেমে যায়, আর কার্ডে
 * ক্লিক করলে পেজ ছেড়ে কোথাও না গিয়ে ঠিক ওখানেই ভিডিওটা চলতে শুরু করে।
 *
 *   GET /api/v1/videos?status=active  →  { success, data: VideoBlogItem[] }
 *
 * চালু কোনো ভিডিও না থাকলে সেকশনটা রেন্ডারই হয় না।
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { FaFacebookF, FaPlay, FaTiktok, FaYoutube } from "react-icons/fa";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";

import {
  PROVIDER_LABEL,
  parseVideoUrl,
  videoThumbnail,
  type VideoProvider,
} from "@/src/lib/videoUrl";

import "swiper/css";
import "swiper/css/free-mode";

/** মার্কি মসৃণভাবে চলতে হলে ট্র্যাকে অন্তত এতগুলো কার্ড লাগে */
const MIN_TRACK_LENGTH = 8;

/** কার্ডগুলো কত ধীরে ভাসবে — বড় সংখ্যা মানে ধীর */
const MARQUEE_SPEED = 6500;

export interface VideoBlogItem {
  _id: string;
  title: string;
  description?: string;
  video_url: string;
  provider?: VideoProvider;
  video_id?: string;
  embed_url?: string;
  thumbnail?: string;
  duration?: string;
  sort_order?: number;
  status?: "active" | "inactive";
}

/** প্ল্যাটফর্মের আইকন — ব্যাজে আর ছবিহীন কার্ডের মাঝখানে বসে */
export const ProviderIcon = ({
  provider,
  className,
}: {
  provider?: VideoProvider;
  className?: string;
}) => {
  if (provider === "facebook") return <FaFacebookF className={className} />;
  if (provider === "tiktok") return <FaTiktok className={className} />;
  return <FaYoutube className={className} />;
};

/* ==========================================================================
   একটা কার্ড — ড্যাশবোর্ডের প্রিভিউও এটাই ব্যবহার করে
   ========================================================================== */
export const VideoCard = ({
  video,
  onPlay,
}: {
  video: VideoBlogItem;
  onPlay?: (video: VideoBlogItem) => void;
}) => {
  const thumb = videoThumbnail(video);
  const provider = video.provider || "youtube";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play video: ${video.title}`}
      onClick={() => onPlay?.(video)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay?.(video);
        }
      }}
      className="video-card aspect-[16/10] h-[400px]"
    >
      {thumb ? (
        <img
          src={thumb}
          alt={video.title}
          loading="lazy"
          decoding="async"
          className="video-card__thumb"
        />
      ) : (
        // Facebook / TikTok নিজে থেকে ছবি দেয় না — অ্যাডমিন না দিলে এটাই বসে
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background:
              "linear-gradient(140deg, var(--color-ink) 0%, var(--color-brand-darker) 100%)",
          }}
        >
          <ProviderIcon
            provider={provider}
            className="h-12 w-12 text-white/25"
          />
        </div>
      )}

      <span className="video-card__shade" />

      {/* ---- প্ল্যাটফর্ম ব্যাজ + সময় ---- */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
        <span className={`video-chip video-chip-${provider}`}>
          <ProviderIcon provider={provider} className="h-3 w-3" />
          {PROVIDER_LABEL[provider]}
        </span>
        {video.duration ? (
          <span className="video-chip">{video.duration}</span>
        ) : null}
      </div>

      {/* ---- মাঝের প্লে বোতাম ---- */}
      <div className="absolute inset-0 grid place-items-center">
        <span className="video-card__play relative">
          <FaPlay className="ml-0.5 h-4 w-4" />
        </span>
      </div>

      {/* ---- নিচের লেখা ---- */}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <h3 className="clamp-2 text-[15px] leading-snug font-bold text-white">
          {video.title}
        </h3>
        {video.description ? (
          <p className="clamp-1 mt-1 text-[12.5px] text-white/70">
            {video.description}
          </p>
        ) : null}
      </div>
    </div>
  );
};

/* ==========================================================================
   ভিডিও চালানোর পর্দা
   ========================================================================== */
const VideoLightbox = ({
  video,
  onClose,
}: {
  video: VideoBlogItem;
  onClose: () => void;
}) => {
  // TikTok আর YouTube Shorts খাড়া ভিডিও — বাক্সটাও লম্বা হওয়া দরকার
  const vertical =
    parseVideoUrl(video.video_url)?.vertical ?? video.provider === "tiktok";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // পর্দা খোলা থাকলে পেছনের পেজ যেন স্ক্রল না হয়
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="video-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close video"
        className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-2xl leading-none text-white transition hover:bg-white/20"
      >
        ×
      </button>

      {/* ভেতরে ক্লিক করলে যেন বন্ধ না হয় */}
      <div
        className={`video-lightbox__frame ${vertical ? "is-vertical" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={video.embed_url}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <p className="absolute right-0 bottom-5 left-0 px-6 text-center text-[13px] text-white/70">
        {video.title}
      </p>
    </div>
  );
};

/* ==========================================================================
   সেকশন
   ========================================================================== */
const VideoBlog = () => {
  const [videos, setVideos] = useState<VideoBlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<VideoBlogItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await axios.get("/api/v1/videos", {
          params: { status: "active" },
        });
        if (!cancelled) setVideos(res.data?.data ?? []);
      } catch {
        // ভিডিও না এলে হোম পেজ থামানোর মানে নেই — সেকশনটা চুপচাপ লুকিয়ে থাকে
        if (!cancelled) setVideos([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * মার্কিতে ফাঁকা জায়গা যেন না থাকে — ভিডিও কম হলে তালিকাটা কয়েকবার
   * পুনরাবৃত্তি করে ট্র্যাক বানাই। তিনটে ভিডিও দিয়েও তখন অনন্ত স্ক্রল চলে।
   */
  const track = useMemo(() => {
    if (videos.length === 0) return [];
    const out: VideoBlogItem[] = [];
    while (out.length < MIN_TRACK_LENGTH) out.push(...videos);
    return out;
  }, [videos]);

  const closePlayer = useCallback(() => setPlaying(null), []);

  if (loading || videos.length === 0) return null;

  return (
    <section
      className="py-16 sm:py-20"
      style={{ background: "var(--color-canvas)" }}
    >
      {/* ---------- হেডিং ---------- */}
      <div className="max-width mb-10 px-5 text-center sm:px-8">
        <p className="site-eyebrow">Watch &amp; taste</p>
        <h2 className="mt-2 text-[clamp(1.7rem,4vw,2.6rem)] font-bold">
          Our kitchen, on camera
        </h2>
        <p className="mx-auto mt-3 max-w-[560px] text-[14.5px] leading-relaxed text-[var(--color-ink-soft)]">
          Recipes, behind-the-scenes and the stories our guests tell — straight
          from YouTube, Facebook and TikTok.
        </p>
      </div>

      {/* ---------- অনন্ত স্লাইডার ---------- */}
      <div className="video-marquee-mask">
        <Swiper
          className="video-marquee !px-5 !pb-4 sm:!px-8"
          modules={[Autoplay, FreeMode]}
          slidesPerView={4}
          spaceBetween={20}
          loop
          speed={MARQUEE_SPEED}
          allowTouchMove
          autoplay={{
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          freeMode={{ enabled: true, momentum: false }}
          breakpoints={{
            0: { slidesPerView: 1.5, spaceBetween: 12 },
            480: { slidesPerView: 2, spaceBetween: 16 },
            768: { slidesPerView: 3, spaceBetween: 20 },
            1024: { slidesPerView: 4, spaceBetween: 20 },
          }}
        >
          {track.map((video, i) => (
            <SwiperSlide key={`${video._id}-${i}`}>
              <VideoCard video={video} onPlay={setPlaying} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {playing ? <VideoLightbox video={playing} onClose={closePlayer} /> : null}
    </section>
  );
};

export default VideoBlog;
