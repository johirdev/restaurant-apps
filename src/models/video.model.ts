import mongoose, { Schema, Model } from "mongoose";
import { VIDEO_STATUSES, type IVideoDocument } from "../interfaces/video.interface";
import { VIDEO_PROVIDERS } from "../lib/videoUrl";

const videoSchema = new Schema<IVideoDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },

    video_url: { type: String, required: true, trim: true },

    // এই তিনটে সার্ভিস লেয়ার লিংক পড়ে বসায় — ফর্ম থেকে আসে না
    provider: { type: String, enum: VIDEO_PROVIDERS, default: "youtube" },
    video_id: { type: String, trim: true, default: "" },
    embed_url: { type: String, trim: true, default: "" },

    thumbnail: { type: String, default: "" },
    thumbnail_public_id: { type: String, default: "" },

    duration: { type: String, trim: true, default: "" },

    sort_order: { type: Number, default: 0 },

    status: { type: String, enum: VIDEO_STATUSES, default: "active" },
  },
  { timestamps: true },
);

// হোম পেজের স্লাইডার ঠিক এই কোয়েরিটাই করে
videoSchema.index({ status: 1, sort_order: 1 });

/**
 * কালেকশনের নাম হাতে বসানো — `video_blogs`।
 * ব্যানারের মতোই: মডেলের নাম থেকে মঙ্গুস নিজে নাম বানালে ভবিষ্যতে অন্য
 * কোনো "videos" কালেকশনের সাথে মিশে যাওয়ার ঝুঁকি থাকে।
 */
const VideoModel: Model<IVideoDocument> =
  (mongoose.models.VideoBlog as Model<IVideoDocument>) ||
  mongoose.model<IVideoDocument>("VideoBlog", videoSchema, "video_blogs");

export default VideoModel;
