import { Document, Types } from "mongoose";

/* ==========================================================================
   LEGAL PAGES — Privacy policy / Terms of service / Refund policy
   --------------------------------------------------------------------------
   তিনটে পাতা, তিনটে ডকুমেন্ট — `slug` দিয়ে আলাদা করা।

   প্রতিটা লেখা দুই ভাষায় থাকে ({ en, bn })। সাইটে পাঠক নিজেই ভাষা বদলায়,
   ড্যাশবোর্ডেও ম্যানেজার দুই ভাষার ট্যাব ধরে আলাদা করে লেখেন — একটা ভাষা
   ফাঁকা থাকলে পাঠক অন্যটাই দেখেন, পাতা কখনো খালি যায় না।

   `body` ফিল্ডগুলো HTML — ড্যাশবোর্ডের রিচ-টেক্সট এডিটর থেকে আসে, তাই
   ম্যানেজার লেখার সময়ই ফন্ট সাইজ, রঙ, ফাঁক, অ্যালাইনমেন্ট বসিয়ে দিতে
   পারেন। সেভ করার আগে সার্ভার HTML টা ছেঁকে নেয় (lib/sanitizeHtml.ts) —
   তাই <script> বা onclick কখনো ডাটাবেসে ঢোকে না।
   ========================================================================== */

export const LEGAL_SLUGS = ["privacy", "terms", "refund"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export const LEGAL_LANGS = ["en", "bn"] as const;
export type LegalLang = (typeof LEGAL_LANGS)[number];

export const LEGAL_STATUSES = ["published", "draft"] as const;
export type LegalStatus = (typeof LEGAL_STATUSES)[number];

export const SECTION_STATUSES = ["active", "hidden"] as const;
export type SectionStatus = (typeof SECTION_STATUSES)[number];

export const TEXT_ALIGNS = ["left", "center", "right", "justify"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

/** এডিটরে যে আইকনগুলো বেছে নেওয়া যায় — ক্লায়েন্ট এগুলোকেই ম্যাপ করে */
export const SECTION_ICONS = [
  "shield",
  "lock",
  "database",
  "share",
  "cookie",
  "user",
  "clock",
  "mail",
  "file",
  "scale",
  "card",
  "truck",
  "utensils",
  "alert",
  "refresh",
  "ban",
  "check",
  "help",
] as const;
export type SectionIcon = (typeof SECTION_ICONS)[number];

/** এক টুকরো লেখা, দুই ভাষায় */
export interface ILocalizedText {
  en: string;
  bn: string;
}

/**
 * একটা সেকশনের সাজ।
 * সবগুলোই ঐচ্ছিক — ফাঁকা রাখলে পাতার নিজের থিম (ILegalTheme) থেকে মান আসে,
 * সেটাও না থাকলে CSS এর ডিফল্ট। ফলে ম্যানেজার শুধু যেটুকু বদলাতে চান
 * সেটুকুই বদলান, বাকিটা নিজে থেকেই মিলে যায়।
 */
export interface ILegalBlockStyle {
  /* ---- শিরোনাম ---- */
  heading_size?: string;
  heading_color?: string;
  heading_weight?: string;

  /* ---- লেখা ---- */
  body_size?: string;
  body_color?: string;
  line_height?: string;
  letter_spacing?: string;
  align?: TextAlign;

  /* ---- ফাঁক ---- */
  space_above?: string;
  space_below?: string;

  /* ---- মোড়ক ---- */
  background?: string;
  /** বাঁ পাশের রঙিন দাগ */
  accent?: string;
  /** সেকশনটা কার্ডের মতো বাক্সে বসবে কিনা */
  card?: boolean;
  /** নিচে একটা হালকা বিভাজক রেখা */
  divider?: boolean;
}

export interface ILegalSection {
  /** anchor + React key — একবার বসলে আর বদলায় না */
  key: string;
  icon?: SectionIcon;
  heading: ILocalizedText;
  /** রিচ-টেক্সট HTML */
  body: ILocalizedText;
  style?: ILegalBlockStyle;
  /** না দিলে মডেলের ডিফল্ট — "active" */
  status?: SectionStatus;
}

/** পুরো পাতার সাজ — প্রতিটা সেকশন এখান থেকেই মান পায় */
export interface ILegalTheme {
  /** হেডার, TOC আর accent দাগের রঙ */
  accent?: string;
  hero_background?: string;
  hero_ink?: string;
  body_size?: string;
  line_height?: string;
  /** লেখার কলাম কত চওড়া — "760px" */
  content_width?: string;
  /** বাংলা লেখার জন্য Hind Siliguri বেছে নেওয়া যায় */
  font?: "sans" | "bengali" | "serif";
  show_toc?: boolean;
  show_contact?: boolean;
  show_print?: boolean;
  show_lang_switch?: boolean;
}

export interface ILegalContact {
  email?: string;
  phone?: string;
  address?: ILocalizedText;
}

export interface ILegalPage {
  slug: LegalSlug;

  title: ILocalizedText;
  /** হিরোর নিচে এক লাইনের ভূমিকা */
  subtitle: ILocalizedText;
  /** প্রথম অনুচ্ছেদ — HTML */
  intro: ILocalizedText;

  sections: ILegalSection[];

  /** "এই নীতি কার্যকর হয়েছে" তারিখ */
  effective_date?: Date;

  contact?: ILegalContact;

  seo?: {
    meta_title?: ILocalizedText;
    meta_description?: ILocalizedText;
  };

  theme?: ILegalTheme;

  /** পাঠক আগে কোনো ভাষা বেছে না নিলে যেটা দেখবেন */
  default_lang: LegalLang;
  status: LegalStatus;
}

export interface ILegalPageDocument extends ILegalPage, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type ILegalPageUpdate = Partial<Omit<ILegalPage, "slug">>;

/* ==========================================================================
   পাতার নাম — ড্যাশবোর্ডের ট্যাব আর ব্রেডক্রাম্ব এখান থেকেই লেখা নেয়
   ========================================================================== */
export const LEGAL_PAGE_LABEL: Record<LegalSlug, { en: string; bn: string }> = {
  privacy: { en: "Privacy policy", bn: "গোপনীয়তা নীতি" },
  terms: { en: "Terms of service", bn: "সেবার শর্তাবলি" },
  refund: { en: "Refund policy", bn: "রিফান্ড নীতি" },
};

/** সাইটের কোন ঠিকানায় পাতাটা বসে */
export const LEGAL_PAGE_PATH: Record<LegalSlug, string> = {
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
};
