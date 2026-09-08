/* ==========================================================================
   ভিডিও লিংক পড়ার একটাই জায়গা
   --------------------------------------------------------------------------
   অ্যাডমিন শুধু YouTube / Facebook / TikTok এর লিংকটা পেস্ট করেন — বাকি
   সবকিছু (কোন প্ল্যাটফর্ম, ভিডিও আইডি, embed লিংক, থাম্বনেইল) এই ফাইলটা
   বের করে দেয়।

   সার্ভার (zod ভ্যালিডেশন + সেভ করার আগে) আর ক্লায়েন্ট (কার্ড আঁকা)
   দুজনেই ঠিক এই ফাংশনগুলোই ব্যবহার করে, তাই ড্যাশবোর্ডে যে প্রিভিউ
   দেখা যায় সাইটেও হুবহু সেটাই চলে।
   ========================================================================== */

export const VIDEO_PROVIDERS = ["youtube", "facebook", "tiktok"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

export const PROVIDER_LABEL: Record<VideoProvider, string> = {
  youtube: "YouTube",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export interface ParsedVideo {
  provider: VideoProvider;
  /** প্ল্যাটফর্মের নিজস্ব আইডি — Facebook এ না-ও থাকতে পারে */
  video_id: string;
  /** iframe এর src */
  embed_url: string;
  /** স্বয়ংক্রিয় থাম্বনেইল — শুধু YouTube দেয়, বাকিরা দেয় না */
  thumbnail: string;
  /** TikTok খাড়া (9:16), বাকিরা শোয়ানো (16:9) */
  vertical: boolean;
}

/** লিংকটা আদৌ URL কিনা — না হলে null */
const toUrl = (raw: string): URL | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    // কেউ "youtube.com/watch?v=..." লিখলেও যেন চলে
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
};

const hostOf = (url: URL) => url.hostname.replace(/^www\./i, "").toLowerCase();

/** কোন প্ল্যাটফর্মের লিংক — চিনতে না পারলে null */
export const detectProvider = (raw: string): VideoProvider | null => {
  const url = toUrl(raw);
  if (!url) return null;

  const host = hostOf(url);

  if (
    host === "youtu.be" ||
    host.endsWith("youtube.com") ||
    host.endsWith("youtube-nocookie.com")
  ) {
    return "youtube";
  }

  if (host === "fb.watch" || host.endsWith("facebook.com") || host.endsWith("fb.com")) {
    return "facebook";
  }

  if (host.endsWith("tiktok.com")) return "tiktok";

  return null;
};

/**
 * YouTube এর যত রকম লিংক মানুষ কপি করে — সবগুলো থেকেই আইডি বের করে:
 *   youtu.be/ID · /watch?v=ID · /shorts/ID · /embed/ID · /live/ID
 */
const youtubeId = (url: URL): string => {
  const host = hostOf(url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") return parts[0] || "";

  const v = url.searchParams.get("v");
  if (v) return v;

  const keyed = ["shorts", "embed", "live", "v"];
  const at = parts.findIndex((p) => keyed.includes(p));
  if (at !== -1 && parts[at + 1]) return parts[at + 1];

  return "";
};

/** TikTok: .../video/1234567890123456789 */
const tiktokId = (url: URL): string => {
  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.indexOf("video");
  if (at !== -1 && parts[at + 1]) return parts[at + 1].split("?")[0];

  // /embed/v2/ID বা /embed/ID
  const embedAt = parts.indexOf("embed");
  if (embedAt !== -1) {
    const rest = parts.slice(embedAt + 1).filter((p) => p !== "v2");
    if (rest[0]) return rest[0];
  }

  return "";
};

/** Facebook: /videos/1234, /watch?v=1234, /reel/1234 */
const facebookId = (url: URL): string => {
  const v = url.searchParams.get("v");
  if (v) return v;

  const parts = url.pathname.split("/").filter(Boolean);
  const at = parts.findIndex((p) => p === "videos" || p === "reel" || p === "reels");
  if (at !== -1 && parts[at + 1]) return parts[at + 1];

  return "";
};

/**
 * লিংক থেকে সব কিছু বের করে। চিনতে না পারলে null —
 * তখন zod "এই লিংকটা সাপোর্ট করি না" বলে ফিরিয়ে দেয়।
 */
export const parseVideoUrl = (raw: string): ParsedVideo | null => {
  const url = toUrl(raw);
  const provider = detectProvider(raw);
  if (!url || !provider) return null;

  if (provider === "youtube") {
    const id = youtubeId(url);
    if (!id) return null;
    return {
      provider,
      video_id: id,
      // rel=0 → শেষে অন্য চ্যানেলের ভিডিও সাজেস্ট করে না
      embed_url: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      // Shorts খাড়া ভিডিও — TikTok এর মতোই লম্বা বাক্সে চালাতে হয়
      vertical: url.pathname.includes("/shorts/"),
    };
  }

  if (provider === "tiktok") {
    const id = tiktokId(url);
    // vm.tiktok.com/xxxx এর মতো ছোট লিংকে আইডি থাকে না — পুরো লিংকটা লাগবে
    if (!id) return null;
    return {
      provider,
      video_id: id,
      embed_url: `https://www.tiktok.com/embed/v2/${id}`,
      thumbnail: "",
      vertical: true,
    };
  }

  // Facebook এর embed প্লাগইন পুরো লিংকটাই চায়, আইডি নয়
  return {
    provider,
    video_id: facebookId(url),
    embed_url: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url.toString(),
    )}&show_text=false&autoplay=true`,
    thumbnail: "",
    vertical: false,
  };
};

/** ফর্মে টাইপ করার সময় "এটা কি চলবে?" — দ্রুত উত্তর */
export const isSupportedVideoUrl = (raw: string) => parseVideoUrl(raw) !== null;

/**
 * কার্ডে কোন ছবিটা বসবে।
 * অ্যাডমিনের দেওয়া থাম্বনেইল সবার আগে, তারপর YouTube এর নিজেরটা।
 * Facebook/TikTok নিজে থেকে ছবি দেয় না — তাই ওখানে থাম্বনেইল আপলোড
 * করাটা কার্যত বাধ্যতামূলক, নাহলে ফাঁকা কার্ড দেখাবে।
 */
export const videoThumbnail = (video: {
  thumbnail?: string;
  video_url?: string;
}): string => {
  if (video.thumbnail) return video.thumbnail;
  if (!video.video_url) return "";
  return parseVideoUrl(video.video_url)?.thumbnail || "";
};
