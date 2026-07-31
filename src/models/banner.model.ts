import mongoose, { Schema, Model } from "mongoose";
import { IBannerDocument } from "../interfaces/banner.interfaces";


const bannerSchema = new Schema<IBannerDocument>(
  {
    main_bg_image: { type: String, default: "" },
    main_bg_image_public_id: { type: String, default: "" },

    food_image: { type: String, default: "" },
    food_image_public_id: { type: String, default: "" },

    text_title: { type: String, default: "", trim: true },
    subtitle: { type: String, default: "", trim: true },
    price_offer: { type: String, default: "", trim: true },
    badge_text: { type: String, default: "", trim: true },

    button_text: { type: String, default: "", trim: true },
    button_link: { type: String, default: "", trim: true },

    text_color: {
      type: String,
      enum: ["light", "dark"],
      default: "light",
    },

    sort_order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Useful for the public storefront query: active banners, in display order.
bannerSchema.index({ status: 1, sort_order: 1 });

// Prevent model overwrite errors in Next.js dev (hot reload).
const BannerModel: Model<IBannerDocument> =
  (mongoose.models.Banner as Model<IBannerDocument>) ||
  mongoose.model<IBannerDocument>("Banner", bannerSchema);

export default BannerModel;
