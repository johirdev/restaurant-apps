import mongoose, { Schema, Model } from "mongoose";
import { IHeroDiscountBannerDocument } from "@/src/interfaces/heroDiscountBanner.interfaces";

const heroDiscountBannerSchema = new Schema<IHeroDiscountBannerDocument>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, required: true, trim: true },
    buttonText: {
      type: String,
      required: true,
      trim: true,
      default: "See All Menu",
    },
    buttonLink: { type: String, trim: true, default: "/menu" },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountLabel: { type: String, trim: true, default: "off" },
    // URL only — validated in the controller so base64 never reaches the DB
    image: { type: String, required: true, trim: true },
    image_public_id: { type: String, default: "" },
    sort_order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

heroDiscountBannerSchema.index({ sort_order: 1, createdAt: -1 });

const HeroDiscountBannerModel: Model<IHeroDiscountBannerDocument> =
  (mongoose.models.HeroDiscountBanner as Model<IHeroDiscountBannerDocument>) ||
  mongoose.model<IHeroDiscountBannerDocument>(
    "HeroDiscountBanner",
    heroDiscountBannerSchema,
  );

export default HeroDiscountBannerModel;
