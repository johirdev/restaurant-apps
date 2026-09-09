import mongoose, { Schema, Model, Document } from "mongoose";

/* ==========================================================================
   RATE LIMIT — কে কতবার ডাকছে, তার হিসাব
   --------------------------------------------------------------------------
   সার্ভারলেস (Vercel) এ প্রতিটা রিকোয়েস্ট আলাদা ইনস্ট্যান্সে পড়তে পারে,
   তাই মেমোরিতে গোনা কাউন্টার কাজে দেয় না — এক ইনস্ট্যান্সে ৫ বার আটকালেও
   পরেরটা আবার ০ থেকে গোনা শুরু করত। তাই হিসাবটা ডাটাবেসেই থাকে; সব
   ইনস্ট্যান্স একই সংখ্যা দেখে।

   প্রতিটা ডকুমেন্ট একটা "জানালার" হিসাব:
       key = "<নাম>:<কার>:<জানালার নম্বর>"
   জানালা শেষ হলে ডকুমেন্টটা TTL ইনডেক্সে নিজে থেকেই মুছে যায় — আলাদা
   করে ক্লিনআপ চালাতে হয় না, আর কালেকশনও বাড়তে থাকে না।
   ========================================================================== */

export interface IRateLimitDocument extends Document {
  key: string;
  count: number;
  expires_at: Date;
}

const rateLimitSchema = new Schema<IRateLimitDocument>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expires_at: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false },
);

// জানালার মেয়াদ শেষ → মঙ্গো নিজেই ডকুমেন্টটা সরিয়ে দেয়
rateLimitSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const RateLimitModel: Model<IRateLimitDocument> =
  (mongoose.models.RateLimit as Model<IRateLimitDocument>) ||
  mongoose.model<IRateLimitDocument>("RateLimit", rateLimitSchema);

export default RateLimitModel;
