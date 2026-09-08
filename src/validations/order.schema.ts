import { z } from "zod";
import { ORDER_STATUSES } from "../interfaces/order.interfaces";
import { normalizeBdPhone } from "../lib/phone";

/* ==========================================================================
   অর্ডারের ভ্যালিডেশন — একই স্কিমা সার্ভার (route) আর ক্লায়েন্ট (checkout form)
   দুই জায়গায় ব্যবহার হয়, তাই নিয়ম কখনো দুই রকম হয় না।
   ========================================================================== */

/** বাংলাদেশি মোবাইল নম্বর: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX */
const bdPhone = z
  .string()
  .trim()
  .regex(
    /^(?:\+?88)?01[3-9]\d{8}$/,
    "Enter a valid Bangladeshi mobile number (e.g. 01712345678)",
  )
  // +8801… / 8801… সবই একই 01… চেহারায় জমা হয়, তাই পরে ট্র্যাক করতে নম্বর মেলে
  .transform(normalizeBdPhone);

export const orderItemInputSchema = z.object({
  food_id: z.string().trim().min(1, "Food id is required"),
  variation_id: z.string().trim().min(1, "Please choose a size / variation"),
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(50, "Maximum 50 of a single item per order"),
  note: z.string().trim().max(200, "Note is too long").optional(),
});

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(60, "Name is too long"),
  phone: bdPhone,
  email: z.union([z.literal(""), z.email("Enter a valid email")]).optional(),
  address: z.string().trim().max(300, "Address is too long").optional(),
  area: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500, "Note is too long").optional(),
});

export const createOrderSchema = z
  .object({
    items: z.array(orderItemInputSchema).min(1, "Your cart is empty"),
    customer: customerSchema,
    order_type: z.enum(["delivery", "pickup", "dine_in"]).default("delivery"),

    /* ---- ডাইন-ইন ---- */
    table_id: z.string().trim().optional(),
    table_number: z.string().trim().max(20).optional(),
    guests: z.coerce.number().int().min(0).max(100).optional(),

    /* ---- POS ---- */
    waiter_id: z.string().trim().optional(),
    /** ম্যানেজারের দেওয়া ছাড় (টাকায়) — কাস্টমার সাইট থেকে আসে না */
    discount: z.coerce.number().min(0).max(1_000_000).optional(),

    payment_method: z.enum(["cod", "bkash", "nagad", "card"]).default("cod"),
    coupon_code: z.string().trim().max(30).optional(),
    scheduled_for: z.coerce.date().optional(),
  })
  // ডেলিভারি হলে ঠিকানা বাধ্যতামূলক
  .refine(
    (v) => v.order_type !== "delivery" || (v.customer.address?.trim().length ?? 0) >= 10,
    {
      message: "Delivery address must be at least 10 characters",
      path: ["customer", "address"],
    },
  )
  // ডাইন-ইনে টেবিল আর বাধ্যতামূলক নয় — সব টেবিল ভরা থাকলে কাস্টমার
  // সারিতে দাঁড়ায়, ম্যানেজার পরে খালি টেবিলে বসিয়ে দেন
  ;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  note: z.string().trim().max(300).optional(),
  cancelled_reason: z.string().trim().max(300).optional(),
});

export const updatePaymentSchema = z.object({
  payment_status: z.enum(["unpaid", "paid", "refunded"]),
  payment_method: z.enum(["cod", "bkash", "nagad", "card"]).optional(),
});

/** চলতি অর্ডারে নতুন পদ যোগ (টেবিলে বসে আবার অর্ডার) */
export const addOrderItemsSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Add at least one item"),
});

/** একটা লাইনের সংখ্যা বদল — 0 দিলে লাইনটা মুছে যায় */
export const updateOrderItemSchema = z.object({
  index: z.coerce.number().int().min(0),
  quantity: z.coerce.number().int().min(0).max(50),
});

/** রান্নাঘরের স্ক্রিন — একটা পদ হয়ে গেছে / হয়নি */
export const setItemReadySchema = z.object({
  index: z.coerce.number().int().min(0),
  is_ready: z.coerce.boolean(),
});

/** ওয়েটার / শেফ / টেবিল বসানো */
export const assignOrderSchema = z.object({
  waiter_id: z.string().trim().optional(),
  chef_id: z.string().trim().optional(),
  table_id: z.string().trim().optional(),
});

export const setDiscountSchema = z.object({
  discount: z.coerce.number().min(0).max(1_000_000),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

/** সারি থেকে টেবিলে বসানো */
export const seatOrderSchema = z.object({
  table_id: z.string().trim().min(1, "Pick a table"),
});
