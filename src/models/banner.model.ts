import mongoose, { Schema, Model } from "mongoose";
import {
  BANNER_STATUSES,
  type IBannerDocument,
} from "../interfaces/banner.interface";

const bannerSchema = new Schema<IBannerDocument>(
  {
    eyebrow: { type: String, trim: true, default: "" },

    title: { type: String, required: true, trim: true },
    highlight: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },

    button_label: { type: String, trim: true, default: "" },
    button_link: { type: String, trim: true, default: "" },

    image: { type: String, default: "" },
    image_public_id: { type: String, default: "" },

    // ফাঁকা = থিমের রঙ ব্যবহার করো
    bg_color: { type: String, trim: true, default: "" },
    accent_color: { type: String, trim: true, default: "" },
    text_color: { type: String, trim: true, default: "" },

    sort_order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: BANNER_STATUSES,
      default: "active",
    },
  },
  { timestamps: true },
);

// হোম পেজ ঠিক এই কোয়েরিটাই করে: active ব্যানার, সাজানো ক্রমে
bannerSchema.index({ status: 1, sort_order: 1 });

/**
 * কালেকশনের নামটা হাতে বসানো — `hero_banners`।
 *
 * পুরোনো ডিসকাউন্ট-ব্যানারের ডেটা ডাটাবেসের `banners` কালেকশনে এখনো পড়ে
 * আছে (base64 ছবি, text_title, price_offer …)। মডেলের নাম থেকে মঙ্গুস নিজে
 * কালেকশনের নাম বানালে সেটাও `banners` ই হতো, আর দুই ফিচারের ডেটা মিশে
 * গিয়ে হোম পেজে ভাঙা ব্যানার দেখাত। তাই আলাদা কালেকশন।
 *
 * মডেলের নামও HeroBanner — Next.js dev এ hot reload হলে পুরোনো কোনো
 * "Banner" মডেলের সাথে সংঘর্ষ লাগে না।
 */
const BannerModel: Model<IBannerDocument> =
  (mongoose.models.HeroBanner as Model<IBannerDocument>) ||
  mongoose.model<IBannerDocument>("HeroBanner", bannerSchema, "hero_banners");

export default BannerModel;
