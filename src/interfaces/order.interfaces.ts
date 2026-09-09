import { Document, Types } from "mongoose";
import type { TaxMode } from "./settings.interface";

/**
 * অর্ডারের জীবনচক্র — রেস্টুরেন্টে যেভাবে কাজটা আসলে হয়:
 *
 *   pending           কাস্টমার/ওয়েটার অর্ডার দিয়েছে, ম্যানেজার এখনো দেখেনি
 *   confirmed         ম্যানেজার কনফার্ম করেছে → ইনভয়েস ছাপা যায়, রান্নাঘরে চলে গেছে
 *   preparing         শেফ রান্না শুরু করেছে
 *   ready             শেফ শেষ করেছে → ম্যানেজারের কাছে খবর গেছে
 *   served            ম্যানেজার/ওয়েটার টেবিলে দিয়ে এসেছে (ডাইন-ইন)
 *   out_for_delivery  রাইডারের হাতে গেছে (ডেলিভারি)
 *   delivered         কাজ শেষ — বিল মেটানো, টেবিল খালি
 *   cancelled         বাতিল
 */
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "served"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type OrderType = "delivery" | "pickup" | "dine_in";
export type PaymentMethod = "cod" | "bkash" | "nagad" | "card";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type OrderSource = "web" | "pos" | "phone";

/** অর্ডারের প্রতিটা লাইন — দাম সবসময় সার্ভারে DB থেকে হিসাব হয়ে বসে */
export interface IOrderItem {
  food_id: Types.ObjectId | string;
  variation_id: string;
  /** স্ন্যাপশট — পরে খাবারের নাম/দাম বদলালেও পুরোনো অর্ডার অক্ষত থাকে */
  name: string;
  variation_name: string;
  image?: string;
  regular_price: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  spice_level?: string;
  note?: string;
  /** রান্নাঘরের স্ক্রিনে শেফ একেকটা পদ আলাদা করে টিক দেয় */
  is_ready: boolean;
  ready_at?: Date | null;
  /** অর্ডার কনফার্মের পরে POS থেকে যোগ হওয়া পদ — রান্নাঘরে "নতুন" চিহ্ন পায় */
  added_later: boolean;
}

export interface IOrderCustomer {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  area?: string;
  city?: string;
  note?: string;
}

export interface IOrderPricing {
  subtotal: number;
  discount: number;
  service_charge: number;
  vat: number;
  delivery_fee: number;
  total: number;
  /** হিসাবের সময়ের হার — পরে সেটিংস বদলালেও পুরোনো ইনভয়েস মিলে যায় */
  vat_percent: number;
  service_charge_percent: number;
  tax_mode: TaxMode;
}

export interface IOrderStatusEntry {
  status: OrderStatus;
  at: Date;
  by?: string;
  note?: string;
}

/** অর্ডারটা কে তুলেছে — POS এ ওয়েটার/ক্যাশিয়ারের নাম বিলে ছাপা হয় */
export interface IOrderStaffRef {
  id?: string;
  name?: string;
  role?: string;
}

export interface IOrder {
  order_number: string;
  /** লগইন করা কাস্টমারের আইডি — গেস্ট অর্ডারে খালি */
  user_id?: string;
  items: IOrderItem[];
  customer: IOrderCustomer;
  order_type: OrderType;

  /* ---- টেবিল (ডাইন-ইন) ---- */
  table_id?: Types.ObjectId | string | null;
  /** টেবিলের নাম স্ন্যাপশট — টেবিল মুছে গেলেও পুরোনো বিল পড়া যায় */
  table_name?: string;
  table_number?: string;
  guests?: number;

  /* ---- কে সামলাচ্ছে ---- */
  /** অর্ডারটা যে তুলেছে (POS/ওয়েব) */
  taken_by?: IOrderStaffRef;
  /** টেবিলের দায়িত্বে থাকা ওয়েটার */
  waiter?: IOrderStaffRef;
  /** যে শেফ রান্না করেছে */
  chef?: IOrderStaffRef;

  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  pricing: IOrderPricing;
  coupon_code?: string;
  source: OrderSource;
  placed_ip?: string;
  scheduled_for?: Date;
  cancelled_reason?: string;
  status_history: IOrderStatusEntry[];

  /* ---- সময়ের ছাপ — রিপোর্টে "কত মিনিটে রান্না হলো" এখান থেকেই আসে ---- */
  confirmed_at?: Date | null;
  kitchen_started_at?: Date | null;
  kitchen_ready_at?: Date | null;
  served_at?: Date | null;
  completed_at?: Date | null;

  /* ---- ইনভয়েস ---- */
  invoice_printed_at?: Date | null;
  invoice_print_count: number;

  /**
   * দিনের হিসাবের খাতায় ("2026-09-09") বসে গেছে কিনা।
   * খালি মানে এখনো বসেনি — একই অর্ডার দুবার গোনা ঠেকায়।
   */
  ledger_day?: string;
}

export interface IOrderDocument extends IOrder, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ------------------------------------------------------------------ *
 * Query surface — কন্ট্রোলার এই লিস্ট ধরে query string ফিল্টার করে
 * ------------------------------------------------------------------ */
export const OrderSearchableFields = [
  "order_number",
  "customer.name",
  "customer.phone",
  "customer.address",
  "table_name",
];

export const OrderFilterableFields = [
  "searchTerm",
  "user_id",
  "status",
  "order_type",
  "payment_status",
  "payment_method",
  "source",
  "table_id",
  "waiter.id",
  "chef.id",
  "dateFrom",
  "dateTo",
];

export const OrderPaginationFields = ["page", "limit", "sortBy", "sortOrder"];

/** স্ট্যাটাস কোন কোন স্ট্যাটাসে যেতে পারে — অবৈধ ট্রানজিশন সার্ভারে আটকে যায় */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  // রান্না শেষ — ম্যানেজার এখান থেকে টেবিলে পাঠায় বা রাইডারকে দেয়
  ready: ["served", "out_for_delivery", "delivered", "cancelled"],
  served: ["delivered", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_FLOW) as OrderStatus[];

/**
 * টেবিল কখন সত্যিই দখলে।
 *
 * `pending` ইচ্ছে করেই বাদ — ম্যানেজার কনফার্ম করার আগ পর্যন্ত অর্ডারটা
 * কেবল একটা অনুরোধ, কেউ টেবিলে বসেনি। আগে pending ও ধরা হতো, ফলে
 * যে কেউ অর্ডার বসিয়ে দিলেই টেবিলটা সবার জন্য বন্ধ হয়ে যেত।
 */
export const TABLE_HELD_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "served",
  "out_for_delivery",
];

/** এই স্ট্যাটাসগুলোতে অর্ডার এখনো "চলছে" — বিল খোলা, বদলানো যায় */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "out_for_delivery",
];

/** রান্নাঘরের স্ক্রিনে যে অর্ডারগুলো দেখা যায় */
export const KITCHEN_STATUSES: OrderStatus[] = ["confirmed", "preparing", "ready"];

/** বিক্রির হিসাবে যেগুলো গোনা হয় (বাতিল বাদ) */
export const REVENUE_STATUSES: OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "served",
  "out_for_delivery",
  "delivered",
];
