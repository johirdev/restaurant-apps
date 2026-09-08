import mongoose, { Schema, Model } from "mongoose";
import { IOtpDocument } from "../interfaces/user.interfaces";

const otpSchema = new Schema<IOtpDocument>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    // কোডটা কখনো প্লেইন টেক্সটে রাখা হয় না — ডাটাবেস ফাঁস হলেও OTP বেরোয় না
    code_hash: { type: String, required: true },
    // "register" অ্যাকাউন্ট খোলার সময়, "reset" পাসওয়ার্ড ভুলে গেলে।
    // ("login" পুরোনো রেকর্ডগুলোর জন্য রাখা — নতুন করে আর তৈরি হয় না।)
    purpose: {
      type: String,
      enum: ["register", "login", "reset"],
      default: "register",
      index: true,
    },
    ip: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expires_at: { type: Date, required: true },

    /* ---- পাসওয়ার্ড রিসেটের টিকিট ----
       কোডটা মিলে যাওয়ার পর সাথে সাথেই সেটা পুড়ে যায় (consumed), আর
       বদলে একটা এলোমেলো টিকিট দেওয়া হয়। নতুন পাসওয়ার্ড বসানোর সময়
       ঐ টিকিটটাই লাগে — ৬ ডিজিটের কোডটা আর দ্বিতীয়বার তারে যায় না।
       টিকিটটাও হ্যাশ করেই রাখা, তাই ডাটাবেস ফাঁস হলেও কাজে লাগে না। */
    reset_token_hash: { type: String, default: "", index: true },
    reset_token_expires_at: { type: Date, default: null },
    /** একটা টিকিটে একবারই পাসওয়ার্ড বদলানো যায় */
    reset_token_used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// পুরোনো OTP ২৪ ঘণ্টা পর নিজে থেকেই মুছে যায় (rate-limit গোনার জন্য ততক্ষণ দরকার)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const OtpModel: Model<IOtpDocument> =
  (mongoose.models.Otp as Model<IOtpDocument>) ||
  mongoose.model<IOtpDocument>("Otp", otpSchema);

export default OtpModel;
