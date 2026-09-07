import mongoose, { Schema, Model } from "mongoose";
import { IOtpDocument } from "../interfaces/user.interfaces";

const otpSchema = new Schema<IOtpDocument>(
  {
    phone: { type: String, required: true, trim: true, index: true },
    // কোডটা কখনো প্লেইন টেক্সটে রাখা হয় না — ডাটাবেস ফাঁস হলেও OTP বেরোয় না
    code_hash: { type: String, required: true },
    purpose: { type: String, enum: ["login"], default: "login" },
    ip: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expires_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// পুরোনো OTP ২৪ ঘণ্টা পর নিজে থেকেই মুছে যায় (rate-limit গোনার জন্য ততক্ষণ দরকার)
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

const OtpModel: Model<IOtpDocument> =
  (mongoose.models.Otp as Model<IOtpDocument>) ||
  mongoose.model<IOtpDocument>("Otp", otpSchema);

export default OtpModel;
