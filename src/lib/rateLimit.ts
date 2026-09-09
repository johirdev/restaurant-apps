import { NextRequest } from "next/server";
import RateLimitModel from "../models/rateLimit.model";
import { ApiError } from "./apiError";
import { getClientIp } from "./getClientIp";

/* ==========================================================================
   RATE LIMIT — একটা দরজা কতবার খোলা যাবে
   --------------------------------------------------------------------------
   নিয়মটা সহজ: প্রতিটা "জানালায়" (window) একজন কতবার ডাকতে পারে তার সীমা।
   সীমা পেরোলে ৪২৯ আর `Retry-After` — ব্রাউজার আর আমাদের নিজেদের UI
   দুজনেই বুঝতে পারে কতক্ষণ পরে আবার চেষ্টা করা যাবে।

   দুটো জিনিস ইচ্ছে করেই এভাবে করা:

   ১. **ব্যর্থ হলে দরজা খোলা থাকে।** ডাটাবেস মুহূর্তের জন্য সাড়া না দিলে
      পুরো সাইট বন্ধ হয়ে যাওয়ার চেয়ে ঐ কয়েক সেকেন্ড পাহারা না থাকা ভালো।
      নিরাপত্তার আসল স্তর সবসময় auth — এটা তার উপরের বাড়তি ঢাল।

   ২. **গোনা হয় ডাকার আগে।** অর্থাৎ চেষ্টা ব্যর্থ হলেও গোনা হয়। নাহলে
      ভুল পাসওয়ার্ড দিয়ে অসীমবার চেষ্টা করা যেত।
   ========================================================================== */

export interface RateLimitRule {
  /** কোন দরজা — লগে আর কী-তে এটাই আলাদা করে চেনায় */
  name: string;
  /** এক জানালায় সর্বোচ্চ কতবার */
  limit: number;
  /** জানালার দৈর্ঘ্য, সেকেন্ডে */
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** আর কতবার বাকি */
  remaining: number;
  /** সীমা পেরোলে কত সেকেন্ড পরে আবার চেষ্টা করা যাবে */
  retryAfter: number;
  limit: number;
}

/**
 * IP বের করা — Vercel/প্রক্সির পেছনে বসে থাকা সার্ভারে `x-forwarded-for`
 * সবসময় থাকে না, তাই কয়েকটা হেডার পর পর দেখা হয়।
 */
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    getClientIp(req) ||
    "0.0.0.0"
  );
}

/**
 * গোনা + যাচাই। কখনো throw করে না — সিদ্ধান্তটা ডাকার জায়গা নেয়।
 *
 * @param identity কার হিসাব — সাধারণত IP, লগইন করা থাকলে ইউজার আইডি,
 *                 অর্ডারের ক্ষেত্রে ফোন নম্বর।
 */
export async function checkRateLimit(
  rule: RateLimitRule,
  identity: string,
): Promise<RateLimitResult> {
  const windowMs = rule.windowSeconds * 1000;
  const now = Date.now();

  // জানালার নম্বর — একই জানালার সব ডাক একই ডকুমেন্টে গোনা হয়
  const bucket = Math.floor(now / windowMs);
  const expiresAt = new Date((bucket + 1) * windowMs);
  const key = `${rule.name}:${identity}:${bucket}`;

  try {
    const doc = await RateLimitModel.findOneAndUpdate(
      { key },
      { $inc: { count: 1 }, $setOnInsert: { key, expires_at: expiresAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    const count = doc?.count ?? 1;
    const retryAfter = Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000));

    return {
      ok: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      retryAfter,
      limit: rule.limit,
    };
  } catch (err) {
    // দুটো রিকোয়েস্ট একই মুহূর্তে একই কী upsert করলে একটা E11000 পায় —
    // সেটা সীমা ছাড়ানো নয়, তাই ছেড়ে দেওয়াই ঠিক
    console.error(`[rateLimit] ${rule.name} store failed:`, err);
    return { ok: true, remaining: rule.limit, retryAfter: 0, limit: rule.limit };
  }
}

/** সীমা পেরোলে সরাসরি ৪২৯ — `catchAsync` সেটা রেসপন্সে রূপ দেয় */
export async function assertRateLimit(
  rule: RateLimitRule,
  identity: string,
  message?: string,
): Promise<RateLimitResult> {
  const result = await checkRateLimit(rule, identity);

  if (!result.ok) {
    throw new ApiError(
      429,
      message ||
        `Too many requests. Please wait ${result.retryAfter} second${
          result.retryAfter === 1 ? "" : "s"
        } and try again.`,
      [{ path: "rate_limit", message: String(result.retryAfter) }],
      { "Retry-After": String(result.retryAfter) },
    );
  }

  return result;
}

/** IP ধরে সীমা — সবচেয়ে বেশি ব্যবহৃত রূপ */
export const limitByIp = (rule: RateLimitRule, req: NextRequest, message?: string) =>
  assertRateLimit(rule, `ip:${clientIp(req)}`, message);

/* ==========================================================================
   অ্যাপের দরজাগুলো আর তাদের সীমা — এক জায়গায়, তাই পরে টিউন করা সহজ
   --------------------------------------------------------------------------
   সংখ্যাগুলো ইচ্ছে করেই আসল মানুষের ব্যবহারের চেয়ে ঢের বেশি রাখা: একজন
   সত্যিকারের কাস্টমার কখনোই মিনিটে ৩০ বার মেনু লোড করে না, কিন্তু একটা
   স্ক্রিপ্ট করে। তাই এগুলো ভালো ব্যবহারকারীর পথে বাধা হয় না।
   ========================================================================== */
export const RATE_RULES = {
  /** সাধারণ পাবলিক GET — মেনু, ক্যাটাগরি, রিভিউ */
  publicRead: { name: "read", limit: 240, windowSeconds: 60 },

  /** অর্ডার বসানো — নিচে আলাদা ৩ মিনিটের কুলডাউনও আছে */
  orderCreate: { name: "order", limit: 8, windowSeconds: 60 * 10 },

  /** লগইন — পাসওয়ার্ড অনুমান করার চেষ্টা ঠেকায় */
  login: { name: "login", limit: 10, windowSeconds: 60 * 10 },

  /** রেজিস্ট্রেশন — এক IP থেকে ভুয়া অ্যাকাউন্টের বন্যা ঠেকায় */
  register: { name: "register", limit: 5, windowSeconds: 60 * 60 },

  /** OTP — প্রতিটা SMS এ টাকা লাগে, তাই সবচেয়ে কড়া */
  otp: { name: "otp", limit: 5, windowSeconds: 60 * 60 },

  /** পাসওয়ার্ড রিসেট */
  passwordReset: { name: "pwreset", limit: 8, windowSeconds: 60 * 60 },

  /** অর্ডার ট্র্যাকিং — নম্বর অনুমান করে অন্যের অর্ডার দেখার চেষ্টা ঠেকায় */
  track: { name: "track", limit: 20, windowSeconds: 60 * 5 },

  /** যোগাযোগ ফর্ম — স্প্যাম */
  contact: { name: "contact", limit: 3, windowSeconds: 60 * 60 },

  /** রিভিউ লেখা */
  review: { name: "review", limit: 10, windowSeconds: 60 * 60 },

  /** ছবি আপলোড — Cloudinary কোটা বাঁচায় */
  upload: { name: "upload", limit: 40, windowSeconds: 60 * 10 },

  /** ভিউ কাউন্টার — একই খাবারে বারবার হিট করে সংখ্যা ফোলানো ঠেকায় */
  foodView: { name: "view", limit: 60, windowSeconds: 60 * 10 },
} as const satisfies Record<string, RateLimitRule>;
