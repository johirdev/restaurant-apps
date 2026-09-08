import { Document } from "mongoose";

/**
 * ==========================================================================
 * RESTAURANT SETTINGS
 * --------------------------------------------------------------------------
 * পুরো ডাটাবেসে এই ডকুমেন্ট একটাই (singleton) — `key: "restaurant"`।
 * ম্যানেজার ড্যাশবোর্ড থেকে ভ্যাট, সার্ভিস চার্জ, ডেলিভারি ফি সব বদলাতে
 * পারে; কোড বদলাতে হয় না।
 *
 * এখানে দোকানের "মুখ"-ও থাকে — About আর Contact পাতা দুটো পুরোপুরি এই
 * ডকুমেন্ট থেকেই তৈরি হয় (গল্প, সোশ্যাল লিংক, খোলার সময়, ম্যাপ)।
 * ==========================================================================
 */

/**
 * ট্যাক্স মেনুর দামের ভেতরে আছে না বাইরে:
 * - `exclusive` — মেনুর দামের উপরে ভ্যাট যোগ হয় (স্বাভাবিক রেস্টুরেন্ট ইনভয়েস)
 * - `inclusive` — মেনুর দামেই ভ্যাট ধরা আছে, ইনভয়েসে শুধু ভেঙে দেখানো হয়
 */
export type TaxMode = "exclusive" | "inclusive";

/** দোকান কোন কোন ভাবে অর্ডার নেয় — চেকআউটে শুধু এগুলোই দেখা যায় */
export type OfferedOrderType = "delivery" | "pickup" | "dine_in";

/** কোন কোন উপায়ে টাকা নেওয়া হয় */
export type OfferedPaymentMethod = "cod" | "bkash" | "nagad" | "card";

/* ==========================================================================
   সোশ্যাল মিডিয়া
   --------------------------------------------------------------------------
   ফুটার, About আর Contact — তিন জায়গাতেই একই তালিকা দেখা যায়।
   যেটা ফাঁকা, সেটার আইকনই দেখানো হয় না; তাই দোকান যে কয়টা চালায়
   শুধু সেগুলোই সাইটে ওঠে।

   `whatsapp` একটা লিংক নয় — শুধু নম্বর (01712345678 / +8801712345678)।
   লিংকটা কোড বানিয়ে নেয়, তাই ম্যানেজারকে wa.me মনে রাখতে হয় না।
   ========================================================================== */
export interface ISocialLinks {
  facebook: string;
  instagram: string;
  youtube: string;
  x: string;
  tiktok: string;
  linkedin: string;
  /** শুধু নম্বর — wa.me লিংক কোড নিজেই বানায় */
  whatsapp: string;
}

/** সোশ্যাল প্ল্যাটফর্মের নাম — আইকন ম্যাপ আর ড্যাশবোর্ড ফর্ম দুটোই এটা ধরে চলে */
export type SocialPlatform = keyof ISocialLinks;

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "facebook",
  "instagram",
  "youtube",
  "x",
  "tiktok",
  "linkedin",
  "whatsapp",
];

/* ==========================================================================
   খোলার সময়
   --------------------------------------------------------------------------
   সাতটা সারি, `day` দিয়ে বোঝা যায় কোন দিন — 0 = রবিবার … 6 = শনিবার,
   ঠিক `Date#getDay()` এর মতো। তাই "আজ খোলা আছে কিনা" বের করতে কোনো
   নাম মেলানো লাগে না, ইনডেক্স মিলিয়ে দিলেই হয়।

   সময় ২৪-ঘণ্টার "HH:MM" — দেখানোর সময় ১২-ঘণ্টায় বদলে নেওয়া হয়।
   ========================================================================== */
export interface IOpeningHour {
  /** 0 = রবিবার … 6 = শনিবার */
  day: number;
  /** "10:00" */
  open: string;
  /** "23:00" */
  close: string;
  /** সেদিন দোকান বন্ধ */
  closed: boolean;
}

/* ==========================================================================
   ABOUT পাতার কনটেন্ট
   ========================================================================== */

/** "কেন আমরা" কার্ড — আইকনটা কোডে থাকা একটা নির্দিষ্ট তালিকা থেকে বাছা হয় */
export interface IAboutHighlight {
  /** ABOUT_ICON_KEYS এর একটা — অচেনা হলে ডিফল্ট আইকন বসে */
  icon: string;
  title: string;
  text: string;
}

/** সংখ্যায় গল্প — মান স্ট্রিং, কারণ "১০ হাজার+" ও লেখা যেতে হবে */
export interface IAboutStat {
  value: string;
  label: string;
}

/** সময়রেখার একটা ধাপ */
export interface IAboutMilestone {
  year: string;
  title: string;
  text: string;
}

/**
 * About পাতার সব লেখা ও ছবি।
 * ছবি ফাঁকা থাকলে পাতাটা ভাঙে না — কোড নিজের সাজানো ফলব্যাক বসিয়ে দেয়।
 */
export interface IAboutContent {
  /** হিরোর উপরের ছোট লেবেল */
  eyebrow: string;
  headline: string;
  intro: string;
  /** হিরোর পেছনের চওড়া ছবি */
  cover_image: string;

  story_title: string;
  /** অনুচ্ছেদ আলাদা করতে খালি লাইন — HTML নয়, তাই নিরাপদ */
  story: string;
  /** গল্পের পাশের লম্বা ছবি */
  story_image: string;
  /** "Since 1998" ব্যাজ — ফাঁকা রাখলে ব্যাজটা দেখা যায় না */
  founded_year: string;

  chef_name: string;
  chef_title: string;
  chef_quote: string;
  chef_image: string;

  highlights: IAboutHighlight[];
  stats: IAboutStat[];
  milestones: IAboutMilestone[];
  /** রান্নাঘর/হলের ছবি — একটাও না থাকলে গ্যালারিটা লুকিয়ে যায় */
  gallery: string[];
}

/* ==========================================================================
   CONTACT পাতার কনটেন্ট
   ========================================================================== */
export interface IContactContent {
  eyebrow: string;
  headline: string;
  intro: string;
  /** ফর্মের নিচে ছোট আশ্বাসের লাইন */
  response_note: string;
  /** টেবিল বুকিং / বড় অর্ডারের আলাদা নম্বর — ফাঁকা হলে মূল ফোনটাই দেখানো হয় */
  reservation_phone: string;
  /** গুগল ম্যাপ embed এর src URL (আস্ত iframe পেস্ট করলেও src টা ছেঁকে নেওয়া হয়) */
  map_embed: string;
  /** "Get directions" বোতাম — ফাঁকা হলে ঠিকানা দিয়ে সার্চ লিংক বানানো হয় */
  map_link: string;
}

export interface IRestaurantSettings {
  /** সবসময় "restaurant" — একটাই ডকুমেন্ট নিশ্চিত করার জন্য */
  key: string;

  /* ---- পরিচয় (ইনভয়েসের মাথায় ছাপা হয়) ---- */
  restaurant_name: string;
  logo?: string;
  logo_public_id?: string;
  address: string;
  phone: string;
  email?: string;
  /** ভ্যাট রেজিস্ট্রেশন / BIN নম্বর — ইনভয়েসে দেখাতে হয় */
  vat_reg_no?: string;
  /** লোগোর নিচের এক-লাইন পরিচয় — "QUALITY FOOD" */
  tagline: string;

  /* ---- টাকা ---- */
  currency: string;
  currency_code: string;

  /* ---- ট্যাক্স ---- */
  tax_mode: TaxMode;
  /** ভ্যাট শতাংশে — 0 দিলে ভ্যাট পুরোপুরি বন্ধ */
  vat_percent: number;
  /** সার্ভিস চার্জ শতাংশে — 0 দিলে বন্ধ */
  service_charge_percent: number;
  /** সার্ভিস চার্জ শুধু ডাইন-ইনে নেওয়া হবে কিনা */
  service_charge_dine_in_only: boolean;

  /* ---- দোকান কী কী অফার করে ---- */
  /** চেকআউট আর POS দুই জায়গাতেই কেবল এই ধরনগুলো দেখা যায় */
  order_types: OfferedOrderType[];
  payment_methods: OfferedPaymentMethod[];

  /* ---- ডেলিভারি ---- */
  delivery_fee: number;
  free_delivery_above: number;
  min_order_amount: number;

  /* ---- অপারেশন ---- */
  avg_prep_minutes: number;
  /** অর্ডার নম্বরের শুরুর অংশ — ORD-260907-0001 */
  order_prefix: string;

  /* ---- ইনভয়েস ---- */
  invoice_footer: string;
  /** ইনভয়েসের নিচে "Served by <waiter>" ছাপা হবে কিনা */
  invoice_show_staff: boolean;

  /* ---- সাইটের মুখ (About / Contact / Footer) ---- */
  socials: ISocialLinks;
  opening_hours: IOpeningHour[];
  about: IAboutContent;
  contact: IContactContent;
}

export interface IRestaurantSettingsDocument
  extends IRestaurantSettings,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * PATCH /settings এ যা পাঠানো যায়।
 *
 * উপরের স্তরের ফিল্ডগুলো তো ঐচ্ছিক বটেই, `socials` / `about` / `contact`
 * এর ভেতরের চাবিগুলোও ঐচ্ছিক — ড্যাশবোর্ডের একটা সেকশন সেভ করলে বাকি
 * সব আবার পাঠাতে হয় না। সার্ভিস লেয়ার পুরোনো মানের সাথে মিলিয়ে নেয়।
 */
export type RestaurantSettingsUpdate = Partial<
  Omit<IRestaurantSettings, "socials" | "about" | "contact">
> & {
  socials?: Partial<ISocialLinks>;
  about?: Partial<IAboutContent>;
  contact?: Partial<IContactContent>;
};

/** সপ্তাহের দিনের নাম — ইনডেক্সটাই `IOpeningHour.day` */
export const WEEKDAYS = [
  { short: "Sun", long: "Sunday" },
  { short: "Mon", long: "Monday" },
  { short: "Tue", long: "Tuesday" },
  { short: "Wed", long: "Wednesday" },
  { short: "Thu", long: "Thursday" },
  { short: "Fri", long: "Friday" },
  { short: "Sat", long: "Saturday" },
] as const;

/**
 * About কার্ডে যে আইকনগুলো বাছা যায়।
 * ম্যানেজার ড্রপডাউন থেকে একটা বাছে, সাইট সেটাকে lucide আইকনে বদলে নেয় —
 * ডাটাবেসে কোনো কম্পোনেন্ট বসে না, শুধু এই চাবিগুলোর একটা।
 */
export const ABOUT_ICON_KEYS = [
  "chef",
  "leaf",
  "flame",
  "heart",
  "award",
  "clock",
  "truck",
  "shield",
  "sparkles",
  "utensils",
] as const;

export type AboutIconKey = (typeof ABOUT_ICON_KEYS)[number];

/** নতুন ইনস্টলে সাতটা দিনই খোলা — ম্যানেজার পরে বন্ধের দিন বেছে নেয় */
const DEFAULT_HOURS: IOpeningHour[] = [
  { day: 0, open: "11:00", close: "22:30", closed: false },
  { day: 1, open: "10:00", close: "23:00", closed: false },
  { day: 2, open: "10:00", close: "23:00", closed: false },
  { day: 3, open: "10:00", close: "23:00", closed: false },
  { day: 4, open: "10:00", close: "23:30", closed: false },
  { day: 5, open: "14:00", close: "23:30", closed: false },
  { day: 6, open: "09:00", close: "23:30", closed: false },
];

/**
 * ডাটাবেসে সেটিংস না থাকলে (একদম নতুন ইনস্টল) এই মানগুলোই চলে,
 * আর ক্লায়েন্টে সেটিংস লোড হওয়ার আগ পর্যন্ত এগুলোই দেখা যায়।
 *
 * About/Contact এর লেখাগুলো ইচ্ছে করেই ব্র্যান্ড-নিরপেক্ষ — যেকোনো
 * রেস্টুরেন্টে বসিয়ে দিলে পাতাটা প্রথম দিন থেকেই ভরা দেখায়, আর
 * ম্যানেজার নিজের গল্প বসানো পর্যন্ত ফাঁকা জায়গা থাকে না।
 */
export const DEFAULT_SETTINGS: IRestaurantSettings = {
  key: "restaurant",

  restaurant_name: "My Restaurant",
  logo: "",
  logo_public_id: "",
  address: "",
  phone: "",
  email: "",
  vat_reg_no: "",
  tagline: "QUALITY FOOD",

  currency: "৳",
  currency_code: "BDT",

  tax_mode: "exclusive",
  vat_percent: 5,
  service_charge_percent: 0,
  service_charge_dine_in_only: true,

  order_types: ["delivery", "pickup", "dine_in"],
  payment_methods: ["cod", "bkash", "nagad", "card"],

  delivery_fee: 60,
  free_delivery_above: 1000,
  min_order_amount: 150,

  avg_prep_minutes: 30,
  order_prefix: "ORD",

  invoice_footer: "Thank you for dining with us!",
  invoice_show_staff: true,

  socials: {
    facebook: "",
    instagram: "",
    youtube: "",
    x: "",
    tiktok: "",
    linkedin: "",
    whatsapp: "",
  },

  opening_hours: DEFAULT_HOURS,

  about: {
    eyebrow: "Our story",
    headline: "রান্নাঘরের আঁচ থেকে আপনার টেবিল পর্যন্ত",
    intro:
      "রোজ ভোরের বাজার, কাঠের চুলার ধীর আঁচ আর হাতে বাটা মসলা — আমাদের রান্নার পুরো রহস্য এইটুকুই। প্রতিটা প্লেট সেই একই যত্নে যায়, সে আপনি হলে বসে খান কিংবা বাসায় অর্ডার করুন।",
    cover_image: "",

    story_title: "একটা ছোট রান্নাঘর, তিন প্রজন্মের রেসিপি",
    story:
      "শুরুটা ছিল ছয় টেবিলের একটা ঘর, আর দাদির হাতে লেখা একটা রেসিপির খাতা। মসলা তখনও পাথরের শিলে বাটা হতো, আর ঝোলটা ফুটত ধীরে — তাড়াহুড়োর কোনো জায়গা ছিল না।\n\nআজ টেবিল বেড়েছে, রান্নাঘর বড় হয়েছে, কিন্তু খাতাটা বদলায়নি। একই মাপ, একই আঁচ, একই সময়। যে ঝোল দুই ঘণ্টা চায়, সেটা আজও দুই ঘণ্টা ধরেই রান্না হয়।\n\nবাজারটা আমরা নিজেরাই করি। মাছ আসে ভোরের নৌকা থেকে, সবজি সেই সকালেই, আর মাংস দিনে একবার — যতটুকু সেদিন লাগবে, ঠিক ততটুকু। তাই আগের দিনের বলে আমাদের রান্নাঘরে কিছু নেই।",
    story_image: "",
    founded_year: "",

    chef_name: "",
    chef_title: "Head Chef",
    chef_quote:
      "ভালো রান্নার কোনো শর্টকাট নেই। ভালো বাজার, ঠিক আঁচ আর যথেষ্ট সময় — এই তিনটে দিলে খাবার নিজেই ভালো হয়ে ওঠে।",
    chef_image: "",

    highlights: [
      {
        icon: "leaf",
        title: "রোজ ভোরের বাজার",
        text: "মাছ, সবজি আর মাংস — সব সেদিনের, জমিয়ে রাখা কিছু নয়।",
      },
      {
        icon: "flame",
        title: "ধীর আঁচে রান্না",
        text: "যে রান্না সময় চায়, তাকে সময় দেওয়া হয়। তাড়াহুড়ো স্বাদ কেড়ে নেয়।",
      },
      {
        icon: "shield",
        title: "১০০% হালাল",
        text: "সাপ্লাই চেইনের প্রতিটা ধাপ যাচাই করা, কোনো ব্যতিক্রম নেই।",
      },
      {
        icon: "truck",
        title: "গরম অবস্থায় ডেলিভারি",
        text: "ইনসুলেটেড ব্যাগে যায়, তাই দরজায় পৌঁছেও খাবার গরম থাকে।",
      },
    ],

    stats: [
      { value: "১২+", label: "বছরের পথচলা" },
      { value: "৬০০+", label: "রোজকার অতিথি" },
      { value: "৯৫+", label: "মেনুর পদ" },
      { value: "৪.৮", label: "গড় রেটিং" },
    ],

    milestones: [
      {
        year: "2013",
        title: "ছয় টেবিলের শুরু",
        text: "একটা ছোট ঘর, দুজন রাঁধুনি আর পাড়ার কিছু নিয়মিত মুখ।",
      },
      {
        year: "2017",
        title: "নিজস্ব বাজার দল",
        text: "মাঝের হাত সরিয়ে সরাসরি চাষি আর মাছের আড়ত থেকে কেনা শুরু।",
      },
      {
        year: "2021",
        title: "অনলাইন ডেলিভারি",
        text: "নিজেদের রাইডার দল, তাই খাবারটা শেষ পর্যন্ত আমাদের হাতেই থাকে।",
      },
      {
        year: "2024",
        title: "নতুন রান্নাঘর",
        text: "কাচের দেয়াল — অতিথিরা চাইলে রান্না হতে দেখতে পারেন।",
      },
    ],

    gallery: [],
  },

  contact: {
    eyebrow: "Say hello",
    headline: "কিছু জানার আছে? বলুন",
    intro:
      "টেবিল বুকিং, বড় অর্ডার, অনুষ্ঠানের খাবার কিংবা শুধুই একটা পরামর্শ — যা-ই হোক, আমরা শুনতে রাজি আছি।",
    response_note:
      "সাধারণত ২৪ ঘণ্টার মধ্যে উত্তর দিই। খুব জরুরি হলে সরাসরি ফোন করে ফেলুন।",
    reservation_phone: "",
    // ম্যানেজার নিজের দোকানের ম্যাপ না বসানো পর্যন্ত এটাই দেখা যায়
    map_embed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1448.9273097762118!2d90.4074126261149!3d23.78060942512706!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c700345080a9%3A0x3e2b2788cf80987e!2sDurbin%20Bangla!5e0!3m2!1sen!2sbd!4v1788892021350!5m2!1sen!2sbd",
    map_link: "",
  },
};

/** কাস্টমার সাইট যেসব ফিল্ড দেখতে পাবে — বাকিগুলো স্টাফ-only */
export const PUBLIC_SETTINGS_FIELDS = [
  "restaurant_name",
  "logo",
  "address",
  "phone",
  "email",
  "tagline",
  "currency",
  "currency_code",
  "tax_mode",
  "vat_percent",
  "service_charge_percent",
  "service_charge_dine_in_only",
  "order_types",
  "payment_methods",
  "delivery_fee",
  "free_delivery_above",
  "min_order_amount",
  "avg_prep_minutes",
  "socials",
  "opening_hours",
  "about",
  "contact",
] as const;
