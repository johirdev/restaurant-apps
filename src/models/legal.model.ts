import mongoose, { Schema, Model } from "mongoose";
import {
  LEGAL_SLUGS,
  LEGAL_LANGS,
  LEGAL_STATUSES,
  SECTION_STATUSES,
  SECTION_ICONS,
  TEXT_ALIGNS,
  type ILegalPageDocument,
} from "../interfaces/legal.interface";

/* ==========================================================================
   LEGAL PAGES — `legal_pages` কালেকশন
   --------------------------------------------------------------------------
   তিনটে ডকুমেন্ট, তিনটে `slug`। ইউনিক ইনডেক্স বসানো আছে, তাই ভুল করেও
   দুটো "privacy" তৈরি হতে পারে না।

   সব লেখাই { en, bn } জোড়ায়। _id ছাড়া সাব-ডকুমেন্ট রাখা হয়েছে
   (`_id: false`) — সেকশনের নিজের `key` ই যথেষ্ট, আর প্রতিবার সেভ করলে
   মঙ্গুস নতুন ObjectId বসিয়ে ডকুমেন্টটা অকারণে বড় করে না।
   ========================================================================== */

const localizedSchema = new Schema(
  {
    en: { type: String, default: "" },
    bn: { type: String, default: "" },
  },
  { _id: false },
);

/** এক সেকশনের সাজ — সবই ঐচ্ছিক, ফাঁকা থাকলে পাতার থিম থেকে মান আসে */
const blockStyleSchema = new Schema(
  {
    heading_size: { type: String, trim: true, default: "" },
    heading_color: { type: String, trim: true, default: "" },
    heading_weight: { type: String, trim: true, default: "" },

    body_size: { type: String, trim: true, default: "" },
    body_color: { type: String, trim: true, default: "" },
    line_height: { type: String, trim: true, default: "" },
    letter_spacing: { type: String, trim: true, default: "" },
    align: { type: String, enum: [...TEXT_ALIGNS, ""], default: "" },

    space_above: { type: String, trim: true, default: "" },
    space_below: { type: String, trim: true, default: "" },

    background: { type: String, trim: true, default: "" },
    accent: { type: String, trim: true, default: "" },
    card: { type: Boolean, default: false },
    divider: { type: Boolean, default: false },
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    icon: { type: String, enum: [...SECTION_ICONS, ""], default: "file" },

    heading: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },
    /** রিচ-টেক্সট HTML — সার্ভিস লেয়ারে ছেঁকে তবেই এখানে বসে */
    body: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },

    style: { type: blockStyleSchema, default: () => ({}) },
    status: { type: String, enum: SECTION_STATUSES, default: "active" },
  },
  { _id: false },
);

const themeSchema = new Schema(
  {
    accent: { type: String, trim: true, default: "" },
    hero_background: { type: String, trim: true, default: "" },
    hero_ink: { type: String, trim: true, default: "" },
    body_size: { type: String, trim: true, default: "16px" },
    line_height: { type: String, trim: true, default: "1.85" },
    content_width: { type: String, trim: true, default: "760px" },
    font: { type: String, enum: ["sans", "bengali", "serif"], default: "sans" },
    show_toc: { type: Boolean, default: true },
    show_contact: { type: Boolean, default: true },
    show_print: { type: Boolean, default: true },
    show_lang_switch: { type: Boolean, default: true },
  },
  { _id: false },
);

const contactSchema = new Schema(
  {
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    address: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },
  },
  { _id: false },
);

const seoSchema = new Schema(
  {
    meta_title: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },
    meta_description: {
      type: localizedSchema,
      default: () => ({ en: "", bn: "" }),
    },
  },
  { _id: false },
);

const legalPageSchema = new Schema<ILegalPageDocument>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      enum: LEGAL_SLUGS,
      trim: true,
      lowercase: true,
    },

    title: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },
    subtitle: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },
    intro: { type: localizedSchema, default: () => ({ en: "", bn: "" }) },

    sections: { type: [sectionSchema], default: [] },

    effective_date: { type: Date, default: Date.now },

    contact: { type: contactSchema, default: () => ({}) },
    seo: { type: seoSchema, default: () => ({}) },
    theme: { type: themeSchema, default: () => ({}) },

    default_lang: { type: String, enum: LEGAL_LANGS, default: "en" },
    status: { type: String, enum: LEGAL_STATUSES, default: "published" },
  },
  { timestamps: true },
);

/**
 * কালেকশনের নাম হাতে বসানো — `legal_pages`।
 * ভিডিও ব্লগের মতোই: মডেলের নাম থেকে মঙ্গুস নিজে নাম বানালে ভবিষ্যতে
 * অন্য কোনো কালেকশনের সাথে মিশে যাওয়ার ঝুঁকি থাকে।
 */
const LegalPageModel: Model<ILegalPageDocument> =
  (mongoose.models.LegalPage as Model<ILegalPageDocument>) ||
  mongoose.model<ILegalPageDocument>("LegalPage", legalPageSchema, "legal_pages");

export default LegalPageModel;
