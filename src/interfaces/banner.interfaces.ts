import { Document, Types } from "mongoose";

export type TextColor = "light" | "dark";
export type BannerStatus = "active" | "inactive";

/**
 * Plain shape of a Banner — used for create/update payloads.
 * Every field is optional on purpose (per the "sob field optional" requirement).
 */
export interface IBanner {
  main_bg_image?: string;
  main_bg_image_public_id?: string;
  food_image?: string;
  food_image_public_id?: string;
  text_title?: string;
  subtitle?: string;
  price_offer?: string;
  badge_text?: string;
  button_text?: string;
  button_link?: string;
  text_color?: TextColor;
  sort_order?: number;
  status?: BannerStatus;
}

/** Mongoose document shape (adds _id, timestamps). */
export interface IBannerDocument extends IBanner, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload accepted by PATCH /api/v1/banners/:id — partial update. */
export type IBannerUpdate = Partial<IBanner>;
