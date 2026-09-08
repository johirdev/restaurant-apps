import { Document, Types } from "mongoose";

export type UserStatus = "active" | "blocked";

export interface IUserImage {
  url: string;
  public_id: string;
}

export interface IUser {
  /** সবসময় 01XXXXXXXXX চেহারায় — লগইনের আসল পরিচয় এটাই */
  phone: string;
  /** bcrypt হ্যাশ — কোয়েরিতে আসে না (`select: false`), তাই রেসপন্সেও যায় না */
  password?: string;
  name: string;
  email?: string;
  image?: IUserImage;

  division?: string;
  district?: string;
  /** গ্রাম/এলাকা — কাস্টমার নিজে লেখে, ড্রপডাউন নয় */
  village?: string;
  address?: string;

  /** প্রিয় খাবারগুলো — ["Biryani", "Kacchi"] */
  favorite_dishes: string[];

  status: UserStatus;
  phone_verified: boolean;
  password_changed_at?: Date | null;
  /** সেশনের প্রজন্ম — পাসওয়ার্ড বদলালে বাড়ে, পুরোনো টোকেন তখন অচল */
  token_version?: number;
  /** পরপর কয়বার ভুল পাসওয়ার্ড পড়েছে — ঠিক পাসওয়ার্ড দিলে শূন্য হয়ে যায় */
  login_attempts: number;
  /** গোনাটা কখন শুরু হয়েছিল — উইন্ডো পেরোলে আবার শূন্য থেকে গোনা শুরু */
  login_attempts_at?: Date | null;
  last_login_at?: Date | null;
  last_login_ip?: string;
  /** কোন কোন IP থেকে এই অ্যাকাউন্ট ব্যবহার হয়েছে — সন্দেহজনক কিছু হলে কাজে লাগে */
  known_ips: string[];
  notes?: string;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** JWT এর ভেতরে যা যা থাকে */
export interface IUserTokenPayload {
  id: string;
  phone: string;
  role: "user";
  /** টোকেনটা কোন প্রজন্মের — ইউজারের `token_version` এর সাথে মিলতে হয় */
  tv?: number;
}

/* ------------------------------------------------------------------ *
 * Query surface — ড্যাশবোর্ডের ইউজার লিস্ট এই ফিল্ডগুলো দিয়ে ছাঁকে
 * ------------------------------------------------------------------ */
export const UserSearchableFields = ["name", "phone", "email", "village"];

export const UserFilterableFields = [
  "searchTerm",
  "district",
  "division",
  "status",
  "favorite_dish",
  /** "true" / "false" — ফোন যাচাই হয়েছে কিনা */
  "phone_verified",
];

export const UserPaginationFields = ["page", "limit", "sortBy", "sortOrder"];

/* ------------------------------------------------------------------ *
 * OTP + ব্লক
 * ------------------------------------------------------------------ */
/** OTP এখন কেবল অ্যাকাউন্ট তৈরির সময় লাগে; "login" পুরোনো রেকর্ডের জন্য রাখা */
export type OtpPurpose = "register" | "login" | "reset";

export interface IOtpDocument extends Document {
  phone: string;
  code_hash: string;
  purpose: OtpPurpose;
  ip: string;
  attempts: number;
  consumed: boolean;
  expires_at: Date;
  createdAt: Date;
  /** কোড মিলে যাওয়ার পর দেওয়া রিসেট টিকিটের হ্যাশ (purpose: "reset") */
  reset_token_hash?: string;
  reset_token_expires_at?: Date | null;
  reset_token_used?: boolean;
}

export type AuthBlockType = "phone" | "ip";

export interface IAuthBlockDocument extends Document {
  /** ফোন নম্বর অথবা IP — দুটোই একই কালেকশনে রাখা হয় */
  key: string;
  type: AuthBlockType;
  reason: string;
  blocked_until: Date;
  createdAt: Date;
}
