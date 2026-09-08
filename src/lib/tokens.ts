import jwt, { SignOptions } from "jsonwebtoken";

/* ==========================================================================
   TOKEN — তিন রকম দর্শক, তিনটে আলাদা চাবি
   --------------------------------------------------------------------------
   আগে অ্যাডমিন, স্টাফ আর কাস্টমার — তিনজনের টোকেনই একই `JWT_SECRET` দিয়ে
   সই হতো আর কোনো `aud` ছিল না। ফলে একটা স্টাফ টোকেন হুবহু অ্যাডমিন
   টোকেনের মতোই দেখাত; শুধু ভেতরের `role` লেখাটাই আলাদা ছিল।

   এখন দুটো স্তর:

     ১. আলাদা চাবি  — রান্নাঘরের ট্যাব বা POS টার্মিনাল থেকে স্টাফ টোকেন
                      বেরিয়ে গেলেও তা দিয়ে অ্যাডমিন টোকেন বানানো যাবে না।
     ২. `aud` দাবি  — প্রতিটা টোকেন বলে দেয় সে কোন দরজার জন্য। স্টাফের
                      টোকেন অ্যাডমিনের দরজায় দিলে সরাসরি বাতিল।

   দুটো একসাথে থাকায় চাবি ফাঁস না হলেও ভুল দরজায় টোকেন কাজ করে না।
   ========================================================================== */

export type TokenAudience = "admin" | "staff" | "customer";

export interface TokenClaims {
  id: string;
  role: string;
  name?: string;
  email?: string;
  phone?: string;
  /**
   * Token version — কাস্টমারের টোকেনে বসে। পাসওয়ার্ড বদলালে ইউজারের
   * `token_version` এক ধাপ বাড়ে, তখন এই সংখ্যাটা আর মেলে না আর অন্য
   * যন্ত্রে খোলা সেশনগুলো সাথে সাথেই অচল হয়ে যায়।
   */
  tv?: number;
}

interface SignedClaims extends TokenClaims {
  aud: TokenAudience;
}

/**
 * কোন দর্শকের জন্য কোন চাবি।
 *
 * `JWT_ADMIN_SECRET` / `JWT_STAFF_SECRET` না দেওয়া থাকলে `JWT_SECRET` এ
 * ফিরে যায় — তখনও `aud` আলাদা করে রাখে, কিন্তু আলাদা চাবি বসালে সুরক্ষা
 * আরও শক্ত হয়। `.env.example` এ দুটোই আছে।
 */
function secretFor(aud: TokenAudience): string {
  const base = process.env.JWT_SECRET;

  const secret =
    aud === "admin"
      ? process.env.JWT_ADMIN_SECRET || base
      : aud === "staff"
        ? process.env.JWT_STAFF_SECRET || base
        : base;

  if (!secret) {
    throw new Error(
      "JWT secret missing — set JWT_SECRET (and ideally JWT_ADMIN_SECRET / JWT_STAFF_SECRET) in .env",
    );
  }
  return secret;
}

/** টোকেন বানাও — `aud` সবসময় ভেতরে বসে যায় */
export function signToken(
  aud: TokenAudience,
  claims: TokenClaims,
  expiresIn: string,
): string {
  const payload: SignedClaims = { ...claims, id: String(claims.id), aud };
  return jwt.sign(payload, secretFor(aud), { expiresIn } as SignOptions);
}

/**
 * টোকেন যাচাই করো — চাবি আর `aud` দুটোই মিলতে হবে।
 * না মিললে null, কখনো throw নয়; ডাকার জায়গাগুলো নিজের মতো করে
 * ৪০১/৪০৩ ঠিক করে নেয়।
 */
export function verifyToken(
  token: string | undefined,
  aud: TokenAudience,
): SignedClaims | null {
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secretFor(aud)) as Partial<SignedClaims>;

    // পুরোনো (aud ছাড়া) টোকেন ইচ্ছে করেই বাতিল — নাহলে স্টাফের টোকেন
    // অ্যাডমিনের দরজাতেও চলত, আর পুরো আলাদা করাটাই অর্থহীন হয়ে যেত
    if (decoded?.aud !== aud) return null;
    if (!decoded?.id || !decoded?.role) return null;

    return decoded as SignedClaims;
  } catch {
    return null;
  }
}

/* ==========================================================================
   কুকির নাম — তিনটে আলাদা, তাই একই ব্রাউজারে ম্যানেজার আর কাস্টমার
   একসাথে লগইন থাকলেও কেউ কারো জায়গায় ঢুকে পড়ে না
   ========================================================================== */
export const ADMIN_COOKIE = "access_token";
export const STAFF_COOKIE = "staff_token";
export const USER_COOKIE = "user_token";

export const cookieFor = (aud: TokenAudience) =>
  aud === "admin" ? ADMIN_COOKIE : aud === "staff" ? STAFF_COOKIE : USER_COOKIE;
