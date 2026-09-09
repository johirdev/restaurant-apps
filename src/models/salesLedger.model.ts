import mongoose, { Schema, Model, Document } from "mongoose";

/* ==========================================================================
   SALES LEDGER — দিনের হিসাবের খাতা
   --------------------------------------------------------------------------
   একটা অর্ডার শেষ (delivered) বা বাতিল (cancelled) হওয়ার মুহূর্তে তার
   অঙ্কগুলো ঐ দিনের খাতায় যোগ হয়ে যায়। প্রতিদিনের জন্য একটাই ডকুমেন্ট।

   কেন আলাদা খাতা দরকার — তিনটে কারণ, তিনটেই বাস্তব:

     ১. **অর্ডার মুছে ফেলা যায়, হিসাব থাকে।** তিন মাসের পুরোনো অর্ডার
        রিকোয়েস্টগুলো মুছে ফেলার পরেও "গত বছরের এপ্রিলে কত বিক্রি হয়েছিল"
        প্রশ্নের উত্তর হুবহু একই থাকে। খাতা কখনো মোছা হয় না।

     ২. **রিপোর্ট সবসময় দ্রুত।** এক বছরে ৩৬৫টা ডকুমেন্ট। বছরের হিসাব
        মানে ৩৬৫টা সারি যোগ করা — লক্ষ লক্ষ অর্ডার স্ক্যান করা নয়।
        অর্ডার যত বাড়ুক, ড্যাশবোর্ড একই গতিতে খোলে।

     ৩. **অঙ্ক পাল্টায় না।** অর্ডার সম্পাদনা হলেও (দাম বদল, ছাড়) খাতায়
        বসে যায় শুধু চূড়ান্ত অঙ্কটাই, আর একবার বসলে আর নড়ে না। তাই
        গত মাসের হিসাব আজ দেখলেও যা, ছয় মাস পরে দেখলেও তাই।

   দিনের সীমাটা দোকানের টাইমজোনে (Asia/Dhaka) — সার্ভারের UTC ঘড়িতে নয়।
   ========================================================================== */

/** এক ধরনের ভাগের হিসাব — কয়টা অর্ডার, কত টাকা */
export interface ILedgerBucket {
  orders: number;
  total: number;
}

export interface ISalesLedgerDocument extends Document {
  /** "2026-09-09" — ব্যবসায়িক দিন, এটাই চাবি */
  day: string;
  /** মাস আর বছর আলাদা করে রাখা, তাই মাসিক/বার্ষিক রিপোর্ট ইনডেক্স ধরে চলে */
  month: string;
  year: number;

  /** বিক্রি হিসেবে গোনা অর্ডার (বাতিল বাদ) */
  orders: number;
  cancelled_orders: number;
  /** মোট কয়টা পদ বিক্রি হলো */
  items_sold: number;

  /* ---- টাকার ভাঙা হিসাব — ইনভয়েসের প্রতিটা লাইন এখানে যোগ হয় ---- */
  gross: number;
  discount: number;
  service_charge: number;
  vat: number;
  delivery_fee: number;
  /** কাস্টমারের কাছ থেকে আসা মোট টাকা */
  net: number;
  /** বাতিল হওয়া অর্ডারের টাকার অঙ্ক — কত ব্যবসা হাতছাড়া হলো */
  cancelled_value: number;

  /* ---- ভাগ করা হিসাব ---- */
  by_type: Record<string, ILedgerBucket>;
  by_payment: Record<string, ILedgerBucket>;
  by_source: Record<string, ILedgerBucket>;

  /**
   * কোন পদ কতটা বিক্রি হলো — চাবি `<food_id>_<variation_id>`।
   * "এই মাসের সবচেয়ে বেশি বিক্রি হওয়া দশটা পদ" এখান থেকেই আসে,
   * লক্ষ লক্ষ অর্ডারের ভেতরে ঢুকে গুনতে হয় না।
   */
  items: Record<string, { name: string; quantity: number; revenue: number }>;

  first_order_at: Date;
  last_order_at: Date;
}

const bucketDefault = () => ({});

const salesLedgerSchema = new Schema<ISalesLedgerDocument>(
  {
    day: { type: String, required: true, unique: true },
    month: { type: String, required: true, index: true },
    year: { type: Number, required: true, index: true },

    orders: { type: Number, default: 0 },
    cancelled_orders: { type: Number, default: 0 },
    items_sold: { type: Number, default: 0 },

    gross: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    service_charge: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    delivery_fee: { type: Number, default: 0 },
    net: { type: Number, default: 0 },
    cancelled_value: { type: Number, default: 0 },

    by_type: { type: Schema.Types.Mixed, default: bucketDefault },
    by_payment: { type: Schema.Types.Mixed, default: bucketDefault },
    by_source: { type: Schema.Types.Mixed, default: bucketDefault },
    items: { type: Schema.Types.Mixed, default: bucketDefault },

    first_order_at: { type: Date, default: null },
    last_order_at: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

// তারিখের রেঞ্জ ধরে রিপোর্ট — সবচেয়ে বেশি ব্যবহৃত কোয়েরি
salesLedgerSchema.index({ day: -1 });

const SalesLedgerModel: Model<ISalesLedgerDocument> =
  (mongoose.models.SalesLedger as Model<ISalesLedgerDocument>) ||
  mongoose.model<ISalesLedgerDocument>("SalesLedger", salesLedgerSchema);

export default SalesLedgerModel;
