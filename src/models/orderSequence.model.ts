import mongoose, { Schema, Model, Document } from "mongoose";

/* ==========================================================================
   ORDER SEQUENCE — দিনের ক্রমিক নম্বরের কাউন্টার
   --------------------------------------------------------------------------
   প্রতিটা ব্যবসায়িক দিনের জন্য একটা করে ডকুমেন্ট (`key = "ORD-260907"`),
   আর তার ভেতরে ঐ দিনের সর্বশেষ ক্রমিক সংখ্যা।

   কেন আলাদা কালেকশন, `countDocuments()` কেন নয়:
   দুজন কাস্টমার একই সেকেন্ডে অর্ডার দিলে দুজনেই একই সংখ্যা গুনত, দুজনেরই
   নম্বর হতো `...-0007`, আর দ্বিতীয়জন `order_number` এর unique ইনডেক্সে
   ধাক্কা খেয়ে ৪০৯ পেত — চেকআউটে ঠিক এই এররটাই আসছিল।

   `$inc` মঙ্গোতে পরমাণু (atomic): একই মুহূর্তে দুটো ডাক এলেও একজন ৭
   পায়, আরেকজন ৮। সার্ভার কয়টা ইনস্ট্যান্সে চলছে তাতে কিছু যায় আসে না।
   ========================================================================== */

export interface IOrderSequenceDocument extends Document {
  key: string;
  value: number;
  updated_at: Date;
}

const orderSequenceSchema = new Schema<IOrderSequenceDocument>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
    /** শেষ কবে ব্যবহার হয়েছিল — পুরোনো কাউন্টার পরিষ্কার করার কাজে লাগে */
    updated_at: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

// প্রতিটা দিনের কাউন্টার ৬০ দিন পরে নিজে থেকেই মুছে যায় — কালেকশনটা
// ছোট থাকে, আর পুরোনো দিনের নম্বর আর কখনো লাগেও না
orderSequenceSchema.index({ updated_at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });

const OrderSequenceModel: Model<IOrderSequenceDocument> =
  (mongoose.models.OrderSequence as Model<IOrderSequenceDocument>) ||
  mongoose.model<IOrderSequenceDocument>("OrderSequence", orderSequenceSchema);

export default OrderSequenceModel;
