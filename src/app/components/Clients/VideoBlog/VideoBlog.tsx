"use client";

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

import "./videoblog.css";
import StatsSection from "../StatsSection/StatsSection";

/** মার্কি মসৃণভাবে চলতে হলে ট্র্যাকে অন্তত এতগুলো কার্ড লাগে — md তে
    ৫টা কার্ড দেখা যায়, তাই তার দ্বিগুণের বেশি রাখা হয় */
const MIN_TRACK_LENGTH = 12;

const REEL_SPEED_A = 9000;
const REEL_SPEED_B = 11000;

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

/** প্ল্যাটফর্মের আইকন — চিপ আর ছবিহীন কার্ডের মাঝখানে বসে */
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
  tall = false,
}: {
  video: VideoBlogItem;
  onPlay?: (video: VideoBlogItem) => void;

  tall?: boolean;
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
      className={`video-card group ${tall ? "video-card--tall" : "video-card--short"}`}
    >
      <span
        className="video-card__sprocket video-card__sprocket--top"
        aria-hidden="true"
      />
      <span
        className="video-card__sprocket video-card__sprocket--bottom"
        aria-hidden="true"
      />

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
        <div className="video-card__fallback">
          <ProviderIcon
            provider={provider}
            className="h-10 w-10 text-white/20"
          />
        </div>
      )}

      <span className="video-card__shade" />

      {/* ---- প্ল্যাটফর্ম চিপ + সময় ---- */}
      <div className="video-card__top-row">
        <span className={`video-chip video-chip--${provider}`}>
          <ProviderIcon provider={provider} className="h-3 w-3" />
          {PROVIDER_LABEL[provider]}
        </span>
        {video.duration ? (
          <span className="video-chip video-chip--duration">
            {video.duration}
          </span>
        ) : null}
      </div>

      {/* ---- মাঝের প্লে রিং (ক্লিক করলে ভিডিও প্লে হবে) ---- */}
      <div className="video-card__play-wrap ">
        <span className="video-card__play">
          <FaPlay className="ml-0.5 h-4 w-4 " />
        </span>
      </div>

      {/* ---- নিচের লেখা ---- */}
      <div className="video-card__caption">
        <h3 className="clamp-2 text-[14.5px] leading-snug font-bold text-white">
          {video.title}
        </h3>
        {video.description ? (
          <p className="clamp-1 mt-1 text-[12px] text-white/65">
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
        className="video-lightbox__close"
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

      <p className="video-lightbox__caption">{video.title}</p>
    </div>
  );
};

/* ==========================================================================
   একটা রিল — নিজের গতি ও দিকে চলা এক সারি
   ========================================================================== */
const Reel = ({
  videos,
  direction,
  speed,
  tall,
  onPlay,
}: {
  videos: VideoBlogItem[];
  direction: "normal" | "reverse";
  speed: number;
  tall: boolean;
  onPlay: (video: VideoBlogItem) => void;
}) => {
  const track = useMemo(() => {
    if (videos.length === 0) return [];
    const out: VideoBlogItem[] = [];
    while (out.length < MIN_TRACK_LENGTH) out.push(...videos);
    return out;
  }, [videos]);

  if (track.length === 0) return null;

  return (
    <Swiper
      className="video-reel"
      modules={[Autoplay, FreeMode]}
      slidesPerView={2}
      spaceBetween={12}
      loop
      speed={speed}
      allowTouchMove
      autoplay={{
        delay: 0,
        disableOnInteraction: false,
        pauseOnMouseEnter: true,
        reverseDirection: direction === "reverse",
      }}
      freeMode={{ enabled: true, momentum: false }}
      breakpoints={{
        // মোবাইল — একদম শুরু থেকেই ২টা কার্ড
        0: { slidesPerView: 2, spaceBetween: 12 },
        // md এবং তার বড় — ৫টা কার্ড
        768: { slidesPerView: 4, spaceBetween: 18 },
      }}
    >
      {track.map((video, i) => (
        <SwiperSlide key={`${video._id}-${i}`}>
          <VideoCard video={video} onPlay={onPlay} tall={tall} />
        </SwiperSlide>
      ))}
    </Swiper>
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

  // দুই রিলের মধ্যে ভিডিওগুলো ভাগ করি (জোড়-বিজোড়) — দুই সারিতেই বৈচিত্র্য থাকে
  const { rowA, rowB } = useMemo(() => {
    const a: VideoBlogItem[] = [];
    const b: VideoBlogItem[] = [];
    videos.forEach((v, i) => (i % 2 === 0 ? a : b).push(v));
    // একটামাত্র সারি দেখা যাবে না — খুব কম ভিডিও থাকলে দুই সারিতেই সব দেখাই
    return {
      rowA: a.length ? a : videos,
      rowB: b.length ? b : videos,
    };
  }, [videos]);

  const closePlayer = useCallback(() => setPlaying(null), []);

  if (loading || videos.length === 0) return null;

  return (
    <section className="video-blog">
      {/* ---------- হেডিং ---------- */}
      <div className="max-width video-blog__head px-5 sm:px-8">
        <p className="site-eyebrow">Watch &amp; taste</p>
        <h2 className="video-blog__title">Review Blog, on camera</h2>
        <p className="video-blog__lede">
          Recipes, behind-the-scenes and the stories our guests tell — straight
          from YouTube, Facebook and TikTok.
        </p>
      </div>
  
      {/* ---------- দুই রিলের ভিডিও ওয়াল ---------- */}
      <div className="video-blog__wall">
        <Reel
          videos={rowA}
          direction="normal"
          speed={REEL_SPEED_A}
          tall
          onPlay={setPlaying}
        />
       
      </div>

      {playing ? <VideoLightbox video={playing} onClose={closePlayer} /> : null}
    </section>
  );
};

export default VideoBlog;
