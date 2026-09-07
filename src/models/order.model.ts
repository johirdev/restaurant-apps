import mongoose, { Schema, Model } from "mongoose";
import {
  IOrderDocument,
  ORDER_STATUSES,
} from "../interfaces/order.interfaces";

const orderItemSchema = new Schema(
  {
    food_id: { type: Schema.Types.ObjectId, ref: "Food", required: true },
    variation_id: { type: String, required: true },

    // স্ন্যাপশট ফিল্ড — মেনু বদলালেও পুরোনো অর্ডারের ইতিহাস ঠিক থাকে
    name: { type: String, required: true, trim: true },
    variation_name: { type: String, default: "", trim: true },
    image: { type: String, default: "" },

    regular_price: { type: Number, required: true, min: 0 },
    unit_price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },

    spice_level: { type: String, default: "" },
    note: { type: String, default: "", trim: true, maxlength: 200 },

    // রান্নাঘরের স্ক্রিনে শেফ একেকটা পদ আলাদা করে "হয়ে গেছে" চিহ্ন দেয়
    is_ready: { type: Boolean, default: false },
    ready_at: { type: Date, default: null },
    // কনফার্মের পরে POS থেকে যোগ হলে রান্নাঘরে আলাদা করে চোখে পড়ে
    added_later: { type: Boolean, default: false },
  },
  { _id: false },
);

const statusEntrySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false },
);

/** কে সামলাচ্ছে — ওয়েটার / শেফ / যে অর্ডার তুলেছে */
const staffRefSchema = new Schema(
  {
    id: { type: String, default: "" },
    name: { type: String, default: "", trim: true },
    role: { type: String, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema<IOrderDocument>(
  {
    order_number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // লগইন করা কাস্টমার হলে তার আইডি — না থাকলে গেস্ট অর্ডার
    user_id: { type: String, default: "", index: true },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length > 0,
        message: "An order must contain at least one item",
      },
    },

    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true, default: "" },
      address: { type: String, trim: true, default: "" },
      area: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      note: { type: String, trim: true, default: "", maxlength: 500 },
    },

    order_type: {
      type: String,
      enum: ["delivery", "pickup", "dine_in"],
      default: "delivery",
    },

    /* ---- টেবিল ---- */
    table_id: { type: Schema.Types.ObjectId, ref: "Table", default: null },
    table_name: { type: String, trim: true, default: "" },
    table_number: { type: String, trim: true, default: "" },
    guests: { type: Number, min: 0, default: 0 },

    /* ---- কে সামলাচ্ছে ---- */
    taken_by: { type: staffRefSchema, default: () => ({}) },
    waiter: { type: staffRefSchema, default: () => ({}) },
    chef: { type: staffRefSchema, default: () => ({}) },

    payment_method: {
      type: String,
      enum: ["cod", "bkash", "nagad", "card"],
      default: "cod",
    },
    payment_status: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },

    status: { type: String, enum: ORDER_STATUSES, default: "pending" },

    pricing: {
      subtotal: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      service_charge: { type: Number, default: 0, min: 0 },
      vat: { type: Number, default: 0, min: 0 },
      delivery_fee: { type: Number, default: 0, min: 0 },
      total: { type: Number, required: true, min: 0 },
      // হারগুলো অর্ডারের সাথেই জমা থাকে, তাই পুরোনো বিল পরেও হুবহু মেলে
      vat_percent: { type: Number, default: 0, min: 0 },
      service_charge_percent: { type: Number, default: 0, min: 0 },
      tax_mode: {
        type: String,
        enum: ["exclusive", "inclusive"],
        default: "exclusive",
      },
    },

    coupon_code: { type: String, trim: true, uppercase: true, default: "" },
    source: { type: String, enum: ["web", "pos", "phone"], default: "web" },
    placed_ip: { type: String, default: "" },
    scheduled_for: { type: Date, default: null },
    cancelled_reason: { type: String, trim: true, default: "" },

    status_history: { type: [statusEntrySchema], default: [] },

    /* ---- সময়ের ছাপ ---- */
    confirmed_at: { type: Date, default: null },
    kitchen_started_at: { type: Date, default: null },
    kitchen_ready_at: { type: Date, default: null },
    served_at: { type: Date, default: null },
    completed_at: { type: Date, default: null },

    /* ---- ইনভয়েস ---- */
    invoice_printed_at: { type: Date, default: null },
    invoice_print_count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

// ড্যাশবোর্ডের লিস্ট ভিউ — স্ট্যাটাস অনুযায়ী নতুন অর্ডার আগে
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ "customer.phone": 1 });
// রিপোর্ট — কোন টেবিল / কোন কর্মী কত বিক্রি করল
orderSchema.index({ table_id: 1, createdAt: -1 });
orderSchema.index({ "waiter.id": 1, createdAt: -1 });
orderSchema.index({ "chef.id": 1, createdAt: -1 });

const OrderModel: Model<IOrderDocument> =
  (mongoose.models.Order as Model<IOrderDocument>) ||
  mongoose.model<IOrderDocument>("Order", orderSchema);

export default OrderModel;
