import { Document, Types } from "mongoose";

export interface IHeroDiscountBanner {
  line1: string; // e.g. "We Have {Excellent}"
  line2: string; // e.g. "Of {Quality} Pizza"
  buttonText: string;
  buttonLink: string;
  discountPercent: number;
  discountLabel: string; // "off"
  image: string; 
  image_public_id?: string;
  sort_order?: number;
}

export interface IHeroDiscountBannerDocument
  extends IHeroDiscountBanner, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type IHeroDiscountBannerUpdate = Partial<IHeroDiscountBanner>;
