import { Document } from "mongoose";

/**
 * ==========================================================================
 * RESTAURANT SETTINGS
 * --------------------------------------------------------------------------
 * পুরো ডাটাবেসে এই ডকুমেন্ট একটাই (singleton) — `key: "restaurant"`।
 * ম্যানেজার ড্যাশবোর্ড থেকে ভ্যাট, সার্ভিস চার্জ, ডেলিভারি ফি সব বদলাতে
 * পারে; কোড বদলাতে হয় না।
 * ==========================================================================
 */

/**
 * ট্যাক্স মেনুর দামের ভেতরে আছে না বাইরে:
 * - `exclusive` — মেনুর দামের উপরে ভ্যাট যোগ হয় (স্বাভাবিক রেস্টুরেন্ট ইনভয়েস)
 * - `inclusive` — মেনুর দামেই ভ্যাট ধরা আছে, ইনভয়েসে শুধু ভেঙে দেখানো হয়
 */
export type TaxMode = "exclusive" | "inclusive";

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
}

export interface IRestaurantSettingsDocument
  extends IRestaurantSettings,
    Document {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ডাটাবেসে সেটিংস না থাকলে (একদম নতুন ইনস্টল) এই মানগুলোই চলে,
 * আর ক্লায়েন্টে সেটিংস লোড হওয়ার আগ পর্যন্ত এগুলোই দেখা যায়।
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

  currency: "৳",
  currency_code: "BDT",

  tax_mode: "exclusive",
  vat_percent: 5,
  service_charge_percent: 0,
  service_charge_dine_in_only: true,

  delivery_fee: 60,
  free_delivery_above: 1000,
  min_order_amount: 150,

  avg_prep_minutes: 30,
  order_prefix: "ORD",

  invoice_footer: "Thank you for dining with us!",
  invoice_show_staff: true,
};

/** কাস্টমার সাইট যেসব ফিল্ড দেখতে পাবে — বাকিগুলো স্টাফ-only */
export const PUBLIC_SETTINGS_FIELDS = [
  "restaurant_name",
  "logo",
  "address",
  "phone",
  "email",
  "currency",
  "currency_code",
  "tax_mode",
  "vat_percent",
  "service_charge_percent",
  "service_charge_dine_in_only",
  "delivery_fee",
  "free_delivery_above",
  "min_order_amount",
  "avg_prep_minutes",
] as const;
