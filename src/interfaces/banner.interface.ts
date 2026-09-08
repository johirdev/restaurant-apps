import { Document, Types } from "mongoose";

/* ==========================================================================
   হোম পেজের হিরো ব্যানার
   --------------------------------------------------------------------------
   বাঁ পাশে লেখা (টাইটেল, বর্ণনা, বোতাম), ডান পাশে ছবি। একাধিক ব্যানার
   থাকলে হোম পেজে ৫ সেকেন্ড পর পর স্লাইড হয়ে ঘুরতে থাকে।

   রঙ তিনটে (bg / accent / text) ফাঁকা রাখাই স্বাভাবিক — তখন ব্যানার
   রেস্টুরেন্টের থিম টোকেনই ব্যবহার করে (globals.css এর --color-brand
   ইত্যাদি), তাই থিম বদলালে ব্যানারও নিজে থেকেই বদলে যায়।
   ========================================================================== */

export const BANNER_STATUSES = ["active", "inactive"] as const;
export type BannerStatus = (typeof BANNER_STATUSES)[number];

/** সাধারণ শেপ — create / update পেলোডে এটাই যায় */
export interface IBanner {
  /** টাইটেলের উপরের ছোট লাইন — "Welcome to", "New this week" */
  eyebrow?: string;

  /** বড় শিরোনাম। একাধিক লাইন চাইলে Enter দিলেই হবে */
  title: string;

  /** শিরোনামের শেষে অ্যাকসেন্ট রঙে বসা অংশ — ঐচ্ছিক */
  highlight?: string;

  /** ছোট বর্ণনা */
  subtitle?: string;

  button_label?: string;
  button_link?: string;

  image?: string;
  image_public_id?: string;

  /** থিম ওভাররাইড — ফাঁকা থাকলে থিমের টোকেনই ব্যবহার হয় */
  bg_color?: string;
  accent_color?: string;
  text_color?: string;

  sort_order?: number;
  status?: BannerStatus;
}

/** Mongoose ডকুমেন্ট — _id আর timestamps যোগ হয় */
export interface IBannerDocument extends IBanner, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** PATCH /api/v1/banners/:id — সব ফিল্ডই ঐচ্ছিক */
export type IBannerUpdate = Partial<IBanner>;
