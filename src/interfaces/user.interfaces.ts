import { Document, Types } from "mongoose";

export type UserStatus = "active" | "blocked";

export interface IUserImage {
  url: string;
  public_id: string;
}

export interface IUser {
  /** সবসময় 01XXXXXXXXX চেহারায় — লগইনের আসল পরিচয় এটাই */
  phone: string;
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
];

export const UserPaginationFields = ["page", "limit", "sortBy", "sortOrder"];

/* ------------------------------------------------------------------ *
 * OTP + ব্লক
 * ------------------------------------------------------------------ */
export type OtpPurpose = "login";

export interface IOtpDocument extends Document {
  phone: string;
  code_hash: string;
  purpose: OtpPurpose;
  ip: string;
  attempts: number;
  consumed: boolean;
  expires_at: Date;
  createdAt: Date;
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
