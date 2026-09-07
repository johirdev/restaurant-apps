import mongoose, { Schema, Model } from "mongoose";
import { IAuthBlockDocument } from "../interfaces/user.interfaces";

/**
 * ফোন নম্বর আর IP — দুই ধরনের ব্লকই এখানে জমা হয়।
 * অ্যাকাউন্ট না থাকা নতুন নম্বরও ব্লক করা যায়, কারণ ব্লক ইউজার ডকুমেন্টের
 * উপর নির্ভর করে না।
 */
const authBlockSchema = new Schema<IAuthBlockDocument>(
  {
    key: { type: String, required: true, trim: true },
    type: { type: String, enum: ["phone", "ip"], required: true },
    reason: { type: String, default: "" },
    blocked_until: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

authBlockSchema.index({ key: 1, type: 1 });
// সময় শেষ হলে ব্লক নিজে থেকেই উঠে যায় — আলাদা করে ক্লিনআপ লাগে না
authBlockSchema.index({ blocked_until: 1 }, { expireAfterSeconds: 0 });

const AuthBlockModel: Model<IAuthBlockDocument> =
  (mongoose.models.AuthBlock as Model<IAuthBlockDocument>) ||
  mongoose.model<IAuthBlockDocument>("AuthBlock", authBlockSchema);

export default AuthBlockModel;
