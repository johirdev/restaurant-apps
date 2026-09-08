import mongoose, { Schema, Model } from "mongoose";
import { IUserDocument } from "../interfaces/user.interfaces";

const userImageSchema = new Schema(
  {
    url: { type: String, default: "" },
    public_id: { type: String, default: "" },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // অ্যাকাউন্ট খোলার সময় bcrypt হ্যাশ হয়ে জমা হয়। select:false — তাই কোনো
    // লিস্ট বা প্রোফাইল রেসপন্সে ভুল করেও হ্যাশটা চলে যায় না
    password: { type: String, default: "", select: false },
    name: { type: String, default: "", trim: true, maxlength: 60 },
    email: { type: String, default: "", trim: true, lowercase: true },
    image: { type: userImageSchema, default: () => ({ url: "", public_id: "" }) },

    division: { type: String, default: "", trim: true },
    district: { type: String, default: "", trim: true },
    village: { type: String, default: "", trim: true, maxlength: 120 },
    address: { type: String, default: "", trim: true, maxlength: 300 },

    favorite_dishes: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 20,
        message: "You can save at most 20 favourite dishes",
      },
    },

    status: { type: String, enum: ["active", "blocked"], default: "active" },
    phone_verified: { type: Boolean, default: false },
    password_changed_at: { type: Date, default: null },

    // ভুল পাসওয়ার্ডের হিসাব — সীমা ছাড়ালে নম্বর/ডিভাইস ব্লক হয়
    login_attempts: { type: Number, default: 0 },
    login_attempts_at: { type: Date, default: null },

    last_login_at: { type: Date, default: null },
    last_login_ip: { type: String, default: "" },
    known_ips: { type: [String], default: [] },
    notes: { type: String, default: "", trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

// ড্যাশবোর্ডের ফিল্টার — জেলা আর প্রিয় খাবার ধরে খোঁজা হয়
userSchema.index({ district: 1 });
userSchema.index({ favorite_dishes: 1 });
userSchema.index({ createdAt: -1 });

const UserModel: Model<IUserDocument> =
  (mongoose.models.User as Model<IUserDocument>) ||
  mongoose.model<IUserDocument>("User", userSchema);

export default UserModel;
