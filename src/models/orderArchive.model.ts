import mongoose, { Schema, Model, Document } from "mongoose";

/* ==========================================================================
   ORDER ARCHIVE — শেষ হয়ে যাওয়া অর্ডারের হালকা কপি
   --------------------------------------------------------------------------
   দিনের খাতা (`SalesLedger`) বলে দেয় "৯ সেপ্টেম্বর কত বিক্রি হয়েছিল"।
   কিন্তু কখনো কখনো একটা নির্দিষ্ট অর্ডারই দেখতে হয় — কাস্টমার ছয় মাস
   পরে ফোন করে বলেন "আমার ORD-260909-0042 এ কী কী ছিল?", কিংবা ভ্যাটের
   হিসাব মেলাতে হয়। তখন খাতা যথেষ্ট নয়।

   তাই অর্ডার শেষ হওয়ার সাথে সাথেই তার একটা ছাঁটা কপি এখানে জমা হয়:

     রাখা হয়   — নম্বর, কাস্টমার, কী কী পদ, দাম, ভ্যাট, সময়, কে সামলেছে
     বাদ যায়   — ছবির লিংক, ধাপে ধাপে স্ট্যাটাসের ইতিহাস, রান্নাঘরের টিক

   ছেঁটে ফেলা অংশগুলোই আসল অর্ডার ডকুমেন্টের বেশিরভাগ জায়গা নেয়, অথচ
   ছয় মাস পরে ওগুলোর কোনো দরকার হয় না। ফলে আর্কাইভের একটা সারি মূল
   অর্ডারের তুলনায় অনেক ছোট, আর এক বছরের ডেটাও হালকা থাকে।

   এই কপিটা থাকে বলেই মূল `orders` কালেকশন থেকে পুরোনো অর্ডার নিশ্চিন্তে
   মুছে ফেলা যায় — হিসাবও যায় না, অর্ডারের বিবরণও যায় না।
   ========================================================================== */

export interface IOrderArchiveDocument extends Document {
  order_number: string;
  /** মূল অর্ডারের `_id` — পুরোনো লিংক আর ইনভয়েস তবু কাজ করে */
  original_id: mongoose.Types.ObjectId;
  /** ব্যবসায়িক দিন ("2026-09-09") — খাতার সাথে মেলানোর জন্য */
  day: string;
}

const archivedItemSchema = new Schema(
  {
    food_id: { type: Schema.Types.ObjectId, ref: "Food" },
    variation_id: { type: String, default: "" },
    name: { type: String, default: "" },
    variation_name: { type: String, default: "" },
    unit_price: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
  },
  { _id: false },
);

const orderArchiveSchema = new Schema(
  {
    order_number: { type: String, required: true, unique: true },
    original_id: { type: Schema.Types.ObjectId, required: true, index: true },
    day: { type: String, required: true, index: true },

    customer: {
      name: { type: String, default: "" },
      phone: { type: String, default: "", index: true },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      area: { type: String, default: "" },
    },
    user_id: { type: String, default: "", index: true },

    items: { type: [archivedItemSchema], default: [] },

    order_type: { type: String, default: "" },
    status: { type: String, default: "" },
    payment_method: { type: String, default: "" },
    payment_status: { type: String, default: "" },
    source: { type: String, default: "" },

    table_name: { type: String, default: "" },
    waiter_name: { type: String, default: "" },
    chef_name: { type: String, default: "" },

    pricing: {
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      service_charge: { type: Number, default: 0 },
      vat: { type: Number, default: 0 },
      delivery_fee: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      vat_percent: { type: Number, default: 0 },
      service_charge_percent: { type: Number, default: 0 },
      tax_mode: { type: String, default: "exclusive" },
    },

    cancelled_reason: { type: String, default: "" },

    placed_at: { type: Date, required: true },
    completed_at: { type: Date, default: null },
    /** কখন আর্কাইভে এলো */
    archived_at: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

// পুরোনো অর্ডার খোঁজার দুটো স্বাভাবিক পথ: তারিখ ধরে, আর ফোন ধরে
orderArchiveSchema.index({ placed_at: -1 });
orderArchiveSchema.index({ "customer.phone": 1, placed_at: -1 });

const OrderArchiveModel: Model<IOrderArchiveDocument> =
  (mongoose.models.OrderArchive as Model<IOrderArchiveDocument>) ||
  mongoose.model<IOrderArchiveDocument>("OrderArchive", orderArchiveSchema);

export default OrderArchiveModel;
