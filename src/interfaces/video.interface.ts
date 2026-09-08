import { Document, Types } from "mongoose";
import type { VideoProvider } from "../lib/videoUrl";

/* ==========================================================================
   ভিডিও ব্লগ — রেস্টুরেন্ট নিয়ে বানানো ভিডিও কনটেন্ট
   --------------------------------------------------------------------------
   অ্যাডমিন শুধু YouTube / Facebook / TikTok এর লিংকটা পেস্ট করেন।
   `provider`, `video_id`, `embed_url` — এই তিনটে সার্ভার নিজেই লিংক দেখে
   বসিয়ে দেয় (lib/videoUrl.ts), হাতে লিখতে হয় না।
   ========================================================================== */

export const VIDEO_STATUSES = ["active", "inactive"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

export interface IVideo {
  title: string;
  description?: string;

  /** অ্যাডমিন যেটা পেস্ট করেন */
  video_url: string;

  /* ---- নিচের তিনটে লিংক থেকে নিজে থেকেই বসে ---- */
  provider?: VideoProvider;
  video_id?: string;
  embed_url?: string;

  /**
   * কার্ডের ছবি। YouTube এর ক্ষেত্রে ফাঁকা রাখলেও চলে — তখন YouTube এর
   * নিজের থাম্বনেইল ব্যবহার হয়। Facebook/TikTok এ ছবিটা দিতেই হয়।
   */
  thumbnail?: string;
  thumbnail_public_id?: string;

  /** "2:45" এর মতো — শুধু দেখানোর জন্য, হিসাবের কিছু নয় */
  duration?: string;

  sort_order?: number;
  status?: VideoStatus;
}

export interface IVideoDocument extends IVideo, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IVideoUpdate = Partial<IVideo>;
