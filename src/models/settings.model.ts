import mongoose, { Schema, Model } from "mongoose";
import {
  DEFAULT_SETTINGS,
  IRestaurantSettingsDocument,
} from "../interfaces/settings.interface";

/* ==========================================================================
   ছোট সাব-স্কিমা — About/Contact এর তালিকাগুলো
   --------------------------------------------------------------------------
   সবগুলোতেই `_id: false`, কারণ এগুলো নিজে থেকে কোনো সত্তা নয় — পুরো
   তালিকাটা ম্যানেজার একসাথে সাজিয়ে সেভ করে, আলাদা করে একটা সারি ধরে
   কখনো টানা হয় না। অপ্রয়োজনীয় ObjectId না বসালে API র উত্তরও পরিষ্কার থাকে।
   ========================================================================== */

const socialsSchema = new Schema(
  {
    facebook: { type: String, trim: true, default: "" },
    instagram: { type: String, trim: true, default: "" },
    youtube: { type: String, trim: true, default: "" },
    x: { type: String, trim: true, default: "" },
    tiktok: { type: String, trim: true, default: "" },
    linkedin: { type: String, trim: true, default: "" },
    whatsapp: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const openingHourSchema = new Schema(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    open: { type: String, trim: true, default: "10:00" },
    close: { type: String, trim: true, default: "23:00" },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const highlightSchema = new Schema(
  {
    icon: { type: String, trim: true, default: "utensils" },
    title: { type: String, trim: true, maxlength: 80, default: "" },
    text: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { _id: false },
);

const statSchema = new Schema(
  {
    value: { type: String, trim: true, maxlength: 16, default: "" },
    label: { type: String, trim: true, maxlength: 60, default: "" },
  },
  { _id: false },
);

const milestoneSchema = new Schema(
  {
    year: { type: String, trim: true, maxlength: 12, default: "" },
    title: { type: String, trim: true, maxlength: 80, default: "" },
    text: { type: String, trim: true, maxlength: 240, default: "" },
  },
  { _id: false },
);

const aboutSchema = new Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 60, default: DEFAULT_SETTINGS.about.eyebrow },
    headline: { type: String, trim: true, maxlength: 140, default: DEFAULT_SETTINGS.about.headline },
    intro: { type: String, trim: true, maxlength: 600, default: DEFAULT_SETTINGS.about.intro },
    cover_image: { type: String, trim: true, default: "" },

    story_title: {
      type: String,
      trim: true,
      maxlength: 140,
      default: DEFAULT_SETTINGS.about.story_title,
    },
    story: { type: String, trim: true, maxlength: 4000, default: DEFAULT_SETTINGS.about.story },
    story_image: { type: String, trim: true, default: "" },
    founded_year: { type: String, trim: true, maxlength: 12, default: "" },

    chef_name: { type: String, trim: true, maxlength: 80, default: "" },
    chef_title: { type: String, trim: true, maxlength: 80, default: DEFAULT_SETTINGS.about.chef_title },
    chef_quote: { type: String, trim: true, maxlength: 600, default: DEFAULT_SETTINGS.about.chef_quote },
    chef_image: { type: String, trim: true, default: "" },

    highlights: { type: [highlightSchema], default: () => [...DEFAULT_SETTINGS.about.highlights] },
    stats: { type: [statSchema], default: () => [...DEFAULT_SETTINGS.about.stats] },
    milestones: { type: [milestoneSchema], default: () => [...DEFAULT_SETTINGS.about.milestones] },
    gallery: { type: [String], default: () => [] },
  },
  { _id: false },
);

const contactSchema = new Schema(
  {
    eyebrow: { type: String, trim: true, maxlength: 60, default: DEFAULT_SETTINGS.contact.eyebrow },
    headline: {
      type: String,
      trim: true,
      maxlength: 140,
      default: DEFAULT_SETTINGS.contact.headline,
    },
    intro: { type: String, trim: true, maxlength: 600, default: DEFAULT_SETTINGS.contact.intro },
    response_note: {
      type: String,
      trim: true,
      maxlength: 240,
      default: DEFAULT_SETTINGS.contact.response_note,
    },
    reservation_phone: { type: String, trim: true, maxlength: 40, default: "" },
    map_embed: { type: String, trim: true, default: DEFAULT_SETTINGS.contact.map_embed },
    map_link: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

/* ==========================================================================
   RESTAURANT SETTINGS — একটাই ডকুমেন্ট
   `key` ইউনিক, তাই ভুল করেও দ্বিতীয় সেটিংস রো তৈরি হতে পারে না।
   ========================================================================== */
const settingsSchema = new Schema<IRestaurantSettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: "restaurant" },

    restaurant_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      default: DEFAULT_SETTINGS.restaurant_name,
    },
    logo: { type: String, default: "" },
    logo_public_id: { type: String, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    vat_reg_no: { type: String, trim: true, maxlength: 40, default: "" },
    tagline: {
      type: String,
      trim: true,
      maxlength: 60,
      default: DEFAULT_SETTINGS.tagline,
    },

    currency: { type: String, trim: true, maxlength: 4, default: DEFAULT_SETTINGS.currency },
    currency_code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 4,
      default: DEFAULT_SETTINGS.currency_code,
    },

    tax_mode: {
      type: String,
      enum: ["exclusive", "inclusive"],
      default: DEFAULT_SETTINGS.tax_mode,
    },
    vat_percent: { type: Number, min: 0, max: 100, default: DEFAULT_SETTINGS.vat_percent },
    service_charge_percent: {
      type: Number,
      min: 0,
      max: 100,
      default: DEFAULT_SETTINGS.service_charge_percent,
    },
    service_charge_dine_in_only: {
      type: Boolean,
      default: DEFAULT_SETTINGS.service_charge_dine_in_only,
    },

    order_types: {
      type: [String],
      enum: ["delivery", "pickup", "dine_in"],
      default: () => [...DEFAULT_SETTINGS.order_types],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "Keep at least one way of taking orders",
      },
    },
    payment_methods: {
      type: [String],
      enum: ["cod", "bkash", "nagad", "card"],
      default: () => [...DEFAULT_SETTINGS.payment_methods],
      validate: {
        validator: (arr: string[]) => arr.length > 0,
        message: "Keep at least one payment method",
      },
    },

    delivery_fee: { type: Number, min: 0, default: DEFAULT_SETTINGS.delivery_fee },
    free_delivery_above: {
      type: Number,
      min: 0,
      default: DEFAULT_SETTINGS.free_delivery_above,
    },
    min_order_amount: {
      type: Number,
      min: 0,
      default: DEFAULT_SETTINGS.min_order_amount,
    },

    avg_prep_minutes: {
      type: Number,
      min: 1,
      max: 240,
      default: DEFAULT_SETTINGS.avg_prep_minutes,
    },
    order_prefix: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 6,
      default: DEFAULT_SETTINGS.order_prefix,
    },

    invoice_footer: {
      type: String,
      trim: true,
      maxlength: 200,
      default: DEFAULT_SETTINGS.invoice_footer,
    },
    invoice_show_staff: { type: Boolean, default: DEFAULT_SETTINGS.invoice_show_staff },

    /* ---- সাইটের মুখ — About / Contact / ফুটার সবাই এখান থেকে পড়ে ---- */
    socials: { type: socialsSchema, default: () => ({ ...DEFAULT_SETTINGS.socials }) },
    opening_hours: {
      type: [openingHourSchema],
      default: () => [...DEFAULT_SETTINGS.opening_hours],
    },
    about: { type: aboutSchema, default: () => ({}) },
    contact: { type: contactSchema, default: () => ({}) },
  },
  { timestamps: true },
);

const SettingsModel: Model<IRestaurantSettingsDocument> =
  (mongoose.models.Settings as Model<IRestaurantSettingsDocument>) ||
  mongoose.model<IRestaurantSettingsDocument>("Settings", settingsSchema);

export default SettingsModel;
