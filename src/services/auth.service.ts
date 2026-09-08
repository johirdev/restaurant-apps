/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ==========================================================================
 * USER AUTH — ফোন নম্বর + পাসওয়ার্ড
 * --------------------------------------------------------------------------
 * OTP কেবল একবারই লাগে — অ্যাকাউন্ট খোলার সময় নম্বরটা সত্যি কিনা দেখতে।
 * অ্যাকাউন্ট হয়ে গেলে কাস্টমার নম্বর + পাসওয়ার্ড দিয়েই লগইন করে, আর
 * পাসওয়ার্ড বদলাতে পারে /account পেজ থেকে।
 *
 *   ১) sendRegisterOtp      → নতুন নম্বরে ৬ ডিজিটের কোড
 *   ২) registerWithOtp      → কোড + পাসওয়ার্ড = অ্যাকাউন্ট তৈরি, সাথে টোকেন
 *   ৩) loginWithPassword    → নম্বর + পাসওয়ার্ড
 *   ৪) changePassword       → পুরোনোটা মিলিয়ে নতুনটা বসানো (লগইন থাকা অবস্থায়)
 *   ৫) sendResetOtp         → পাসওয়ার্ড ভুলে গেলে নম্বরে কোড
 *   ৬) verifyResetOtp       → কোড মিলিয়ে অল্প সময়ের একটা টিকিট দেওয়া
 *   ৭) resetPasswordWithTicket → টিকিট দেখিয়ে নতুন পাসওয়ার্ড বসানো
 *
 * OTP দুই কাজে ব্যবহার হয় — অ্যাকাউন্ট খোলা (`register`) আর পাসওয়ার্ড
 * রিসেট (`reset`)। দুটোর গোনা আলাদা, আর এক কাজের কোড অন্য কাজে চলে না।
 * ==========================================================================
 */
import crypto from "crypto";
import bcrypt from "bcrypt";
import UserModel from "../models/user.model";
import OtpModel from "../models/otp.model";
import AuthBlockModel from "../models/authBlock.model";
import { ApiError, BadRequest, Conflict, TooManyRequests } from "../lib/apiError";
import { signToken } from "../lib/tokens";
import { normalizeBdPhone } from "../lib/phone";
import type { OtpPurpose } from "../interfaces/user.interfaces";
import {
  sendSms,
  otpMessage,
  resetOtpMessage,
  smsEnabled,
  isProduction,
} from "./sms.service";

/* ==========================================================================
   নিয়মকানুন — এক জায়গায়, তাই UI আর সার্ভার একই কথা বলে
   ========================================================================== */
export const AUTH_RULES = {
  /** OTP কত মিনিট বৈধ */
  otpTtlMinutes: 5,
  /** ৩ ঘণ্টায় সর্বোচ্চ কয়টা OTP পাঠানো যাবে */
  otpMaxPerWindow: 3,
  otpWindowHours: 3,
  /** সীমা ছাড়ালে কত ঘণ্টা ব্লক */
  otpBlockHours: 6,
  /** ৬ ঘণ্টায় সর্বোচ্চ কয়বার ভুল কোড/পাসওয়ার্ড দেওয়া যাবে */
  loginMaxAttempts: 5,
  loginWindowHours: 6,
  loginBlockHours: 6,
  /** পরপর দুটো OTP এর মাঝে সর্বনিম্ন বিরতি (সেকেন্ড) */
  resendCooldownSeconds: 60,
  /** এক IP থেকে ৩ ঘণ্টায় সর্বোচ্চ কয়টা OTP — শেয়ার্ড নেটওয়ার্কের কথা ভেবে ঢিলা */
  ipMaxPerWindow: 15,
  /** পাসওয়ার্ডের দৈর্ঘ্য — একই সীমা UI আর সার্ভার দুই জায়গায় */
  passwordMinLength: 6,
  passwordMaxLength: 64,
  /**
   * রিসেটের কোড মিলে যাওয়ার পর নতুন পাসওয়ার্ড বসানোর জন্য কত মিনিট সময়।
   * ছোট রাখাই ভালো — এতটুকুই যথেষ্ট, অথচ টিকিটটা হাতছাড়া হলে কাজে
   * লাগানোর জানালাটা সরু থাকে।
   */
  resetTicketMinutes: 10,
} as const;

const HOUR = 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

const hashCode = (code: string, phone: string) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "otp-fallback-secret")
    .update(phone + ":" + code)
    .digest("hex");

const sixDigits = () => String(crypto.randomInt(100000, 1000000));

/**
 * দুটো হেক্স হ্যাশ মেলানো — সময় মেপে আন্দাজ করার (timing attack) সুযোগ
 * না দিয়ে। `===` অমিল পেলেই থেমে যায়, তাই কোন অক্ষর পর্যন্ত মিলেছে সেটা
 * উত্তরের সময় থেকে আঁচ করা যায়; `timingSafeEqual` পুরোটাই মিলিয়ে দেখে।
 */
const sameHash = (a: string, b: string) => {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

/** রিসেট টিকিট — আন্দাজ করার মতো নয়, আর ডাটাবেসে কেবল হ্যাশটাই থাকে */
const newTicket = () => crypto.randomBytes(32).toString("base64url");

const hashTicket = (ticket: string) =>
  crypto.createHash("sha256").update(ticket).digest("hex");

const minutesLeft = (until: Date) =>
  Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));

const humanWait = (until: Date) => {
  const mins = minutesLeft(until);
  if (mins < 60) return mins + (mins === 1 ? " minute" : " minutes");
  const hrs = Math.ceil(mins / 60);
  return hrs + (hrs === 1 ? " hour" : " hours");
};

/** সাইনআপ আর পাসওয়ার্ড বদল — দুই জায়গাতেই একই নিয়ম */
const assertStrongPassword = (password: string) => {
  const value = String(password || "");
  if (value.length < AUTH_RULES.passwordMinLength) {
    throw BadRequest(
      "Password must be at least " +
        AUTH_RULES.passwordMinLength +
        " characters long",
    );
  }
  if (value.length > AUTH_RULES.passwordMaxLength) {
    throw BadRequest("Password is too long");
  }
  return value;
};

/**
 * টোকেনে `tv` (token version) বসিয়ে দিই। পাসওয়ার্ড বদলালে ইউজারের
 * `token_version` এক ধাপ বাড়ে, তাই আগের টোকেনগুলো তখনই অচল হয়ে যায় —
 * `requireUser` প্রতিটা রিকোয়েস্টে সংখ্যা দুটো মিলিয়ে দেখে।
 */
const issueToken = (user: {
  _id: unknown;
  phone: string;
  token_version?: number;
}) =>
  signToken(
    "customer",
    {
      id: String(user._id),
      phone: user.phone,
      role: "user",
      tv: user.token_version ?? 0,
    },
    process.env.JWT_EXPIRES_IN || "30d",
  );

/* ==========================================================================
   ব্লক — ফোন আর IP দুটোই দেখা হয়
   ========================================================================== */
async function block(
  key: string,
  type: "phone" | "ip",
  hours: number,
  reason: string,
) {
  const blocked_until = new Date(Date.now() + hours * HOUR);
  await AuthBlockModel.findOneAndUpdate(
    { key, type },
    { key, type, reason, blocked_until },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return blocked_until;
}

/** ফোন বা IP যেকোনো একটা ব্লক থাকলেই আর এগোনো যাবে না */
async function assertNotBlocked(phone: string, ip: string) {
  const now = new Date();
  const hits = await AuthBlockModel.find({
    blocked_until: { $gt: now },
    $or: [
      { key: phone, type: "phone" },
      { key: ip, type: "ip" },
    ],
  }).lean();

  if (!hits.length) return;

  const soonest = hits.reduce((a, b) => (a.blocked_until < b.blocked_until ? a : b));
  const what = soonest.type === "phone" ? "number" : "device";

  throw new ApiError(
    429,
    "Too many attempts. This " +
      what +
      " is blocked for another " +
      humanWait(new Date(soonest.blocked_until)) +
      ".",
  );
}

/* ==========================================================================
   ধাপ ১ — অ্যাকাউন্ট খোলার OTP পাঠানো
   নম্বরে আগেই পাসওয়ার্ড-সহ অ্যাকাউন্ট থাকলে এখানেই থামিয়ে দিই — তাকে
   লগইন পেজে যেতে বলা হয়, শুধু শুধু SMS খরচ হয় না।
   ========================================================================== */
export const sendRegisterOtp = async (rawPhone: string, ip: string) => {
  const phone = normalizeBdPhone(rawPhone);
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw BadRequest("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
  }

  await assertNotBlocked(phone, ip);

  const user = await UserModel.findOne({ phone }).select("+password status").lean();

  if (user?.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  if (user?.password) {
    throw Conflict(
      "This number already has an account. Please log in with your password.",
    );
  }

  const windowStart = new Date(Date.now() - AUTH_RULES.otpWindowHours * HOUR);

  const [sentInWindow, lastOtp, ipCount] = await Promise.all([
    // গোনাটা কেবল সাইনআপের কোডের — পাসওয়ার্ড রিসেটের কোড আলাদা হিসাবে চলে
    OtpModel.countDocuments({
      phone,
      purpose: "register",
      createdAt: { $gte: windowStart },
    }),
    OtpModel.findOne({ phone, purpose: "register" }).sort({ createdAt: -1 }).lean(),
    OtpModel.countDocuments({ ip, createdAt: { $gte: windowStart } }),
  ]);

  // ৩ ঘণ্টায় ৩ বারের বেশি — নম্বরটা ৬ ঘণ্টার জন্য ব্লক
  if (sentInWindow >= AUTH_RULES.otpMaxPerWindow) {
    const until = await block(
      phone,
      "phone",
      AUTH_RULES.otpBlockHours,
      "More than " +
        AUTH_RULES.otpMaxPerWindow +
        " OTP requests within " +
        AUTH_RULES.otpWindowHours +
        " hours",
    );
    throw TooManyRequests(
      "You have already asked for " +
        AUTH_RULES.otpMaxPerWindow +
        " codes in " +
        AUTH_RULES.otpWindowHours +
        " hours. Please try again after " +
        humanWait(until) +
        ".",
    );
  }

  if (ipCount >= AUTH_RULES.ipMaxPerWindow) {
    const until = await block(
      ip,
      "ip",
      AUTH_RULES.otpBlockHours,
      "Too many OTP requests from one device",
    );
    throw TooManyRequests(
      "Too many verification codes were requested from this device. Please try again after " +
        humanWait(until) +
        ".",
    );
  }

  // খুব দ্রুত পরপর চাওয়া আটকাই
  if (lastOtp && !lastOtp.consumed) {
    const since = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
    if (since < AUTH_RULES.resendCooldownSeconds) {
      throw TooManyRequests(
        "Please wait " +
          Math.ceil(AUTH_RULES.resendCooldownSeconds - since) +
          " seconds before asking for another code.",
      );
    }
  }

  const code = sixDigits();
  const expires_at = new Date(Date.now() + AUTH_RULES.otpTtlMinutes * 60 * 1000);

  // আগের সাইনআপ কোডগুলো আর কাজ করবে না — সবসময় শেষেরটাই বৈধ।
  // `purpose` ধরে ছাঁকা জরুরি, নাহলে চলতি একটা রিসেট কোডও এখানে পুড়ে যেত।
  await OtpModel.updateMany(
    { phone, purpose: "register", consumed: false },
    { $set: { consumed: true } },
  );

  await OtpModel.create({
    phone,
    code_hash: hashCode(code, phone),
    purpose: "register",
    ip,
    expires_at,
  });

  // SMS পাঠাতে না পারলে কোডটা বাঁচিয়ে রাখার মানে নেই
  try {
    await sendSms(phone, otpMessage(code, AUTH_RULES.otpTtlMinutes));
  } catch (err) {
    await OtpModel.updateMany(
      { phone, purpose: "register", consumed: false },
      { $set: { consumed: true } },
    );
    throw err;
  }

  return {
    phone,
    /** নম্বরটা একদম নতুন, নাকি পুরোনো (পাসওয়ার্ডহীন) অ্যাকাউন্ট */
    is_new_user: !user,
    expires_in: AUTH_RULES.otpTtlMinutes * 60,
    resend_after: AUTH_RULES.resendCooldownSeconds,
    attempts_left: AUTH_RULES.otpMaxPerWindow - sentInWindow - 1,
    // SMS বন্ধ থাকা লোকাল ডেভেই কেবল কোডটা ফেরত যায়, প্রোডাকশনে কখনো নয়
    ...(!smsEnabled() && !isProduction() ? { dev_otp: code } : {}),
  };
};

/* ==========================================================================
   কোড মিলিয়ে দেখা — ভুল হলে গোনা হয়, বারবার ভুল হলে ব্লক
   --------------------------------------------------------------------------
   `purpose` মিলিয়ে দেখা জরুরি: সাইনআপের কোড দিয়ে যেন পাসওয়ার্ড রিসেট
   করা না যায়, আর উল্টোটাও নয়।
   ========================================================================== */
async function consumeOtp(
  phone: string,
  rawCode: string,
  ip: string,
  purpose: OtpPurpose,
) {
  const code = String(rawCode || "").trim();
  if (!/^\d{6}$/.test(code)) throw BadRequest("Enter the 6-digit code we sent you");

  const otp = await OtpModel.findOne({ phone, purpose, consumed: false }).sort({
    createdAt: -1,
  });

  if (!otp) throw BadRequest("This code is no longer valid. Please request a new one.");

  if (otp.expires_at.getTime() < Date.now()) {
    otp.consumed = true;
    await otp.save();
    throw BadRequest("The code has expired. Please request a new one.");
  }

  if (!sameHash(otp.code_hash, hashCode(code, phone))) {
    otp.attempts += 1;
    await otp.save();

    // ৬ ঘণ্টায় মোট কতবার ভুল হলো — সীমা ছাড়ালে নম্বর আর ডিভাইস দুটোই ব্লক
    const windowStart = new Date(Date.now() - AUTH_RULES.loginWindowHours * HOUR);
    const recent = await OtpModel.find({
      phone,
      purpose,
      createdAt: { $gte: windowStart },
    })
      .select("attempts")
      .lean();
    const failed = recent.reduce((sum, o: any) => sum + (o.attempts || 0), 0);

    if (failed >= AUTH_RULES.loginMaxAttempts) {
      const [until] = await Promise.all([
        block(
          phone,
          "phone",
          AUTH_RULES.loginBlockHours,
          failed + " wrong codes within " + AUTH_RULES.loginWindowHours + " hours",
        ),
        block(
          ip,
          "ip",
          AUTH_RULES.loginBlockHours,
          "Too many wrong codes from this device",
        ),
      ]);
      throw TooManyRequests(
        "Too many wrong codes. Your number and device are blocked for " +
          humanWait(until) +
          ".",
      );
    }

    const left = AUTH_RULES.loginMaxAttempts - failed;
    throw BadRequest(
      "Wrong code. " + left + (left === 1 ? " attempt" : " attempts") + " left.",
    );
  }

  otp.consumed = true;
  await otp.save();

  // কোড মিলে গেছে — এই কাজের পুরোনো ব্যর্থ চেষ্টাগুলো আর গোনার দরকার নেই।
  // `_id` বাদ দিই, নাহলে উপরে সেভ করা ডকুমেন্টটাই আবার লেখা হতো আর
  // পরে বসানো রিসেট টিকিটটা মুছে যেত।
  await OtpModel.updateMany(
    { phone, purpose, _id: { $ne: otp._id } },
    { $set: { attempts: 0, consumed: true } },
  );

  return otp;
}

/* ==========================================================================
   ধাপ ২ — কোড + পাসওয়ার্ড = অ্যাকাউন্ট তৈরি
   ========================================================================== */
export const registerWithOtp = async (
  input: { phone: string; code: string; password: string; name?: string },
  ip: string,
) => {
  const phone = normalizeBdPhone(input.phone);
  const password = assertStrongPassword(input.password);

  await assertNotBlocked(phone, ip);

  const existing = await UserModel.findOne({ phone })
    .select("+password status")
    .lean();

  if (existing?.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }
  if (existing?.password) {
    throw Conflict(
      "This number already has an account. Please log in with your password.",
    );
  }

  await consumeOtp(phone, input.code, ip, "register");

  const isNew = !existing;
  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await UserModel.findOneAndUpdate(
    { phone },
    {
      $set: {
        phone,
        password: password_hash,
        password_changed_at: new Date(),
        phone_verified: true,
        login_attempts: 0,
        login_attempts_at: null,
        last_login_at: new Date(),
        last_login_ip: ip,
        ...(input.name?.trim() ? { name: input.name.trim() } : {}),
      },
      $addToSet: { known_ips: ip },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  return {
    token: issueToken(user),
    is_new_user: isNew,
    /** নাম/জেলা না থাকলে ফ্রন্টএন্ড সোজা প্রোফাইল এডিট পেজে পাঠায় */
    profile_complete: !!(user.name && user.district),
    user: user.toObject(),
  };
};

/* ==========================================================================
   লগইন — নম্বর + পাসওয়ার্ড
   ========================================================================== */
export const loginWithPassword = async (
  rawPhone: string,
  rawPassword: string,
  ip: string,
) => {
  const phone = normalizeBdPhone(rawPhone);
  const password = String(rawPassword || "");

  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw BadRequest("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
  }
  if (!password) throw BadRequest("Enter your password");

  await assertNotBlocked(phone, ip);

  const user = await UserModel.findOne({ phone }).select("+password");

  // নম্বর নেই বা পাসওয়ার্ড ভুল — দুটোতেই একই বার্তা নয়, কারণ কাস্টমারের
  // "আমার অ্যাকাউন্টই নেই" জানাটা এখানে উপকারী, ক্ষতিকর নয়
  if (!user) {
    throw new ApiError(
      401,
      "No account found with this number. Please create an account first.",
    );
  }

  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  // পুরোনো OTP-only অ্যাকাউন্ট — পাসওয়ার্ড কখনো সেট হয়নি
  if (!user.password) {
    throw new ApiError(
      409,
      "This account has no password yet. Please set one from the sign-up page.",
    );
  }

  const matched = await bcrypt.compare(password, user.password);

  if (!matched) {
    // উইন্ডো পেরিয়ে গেলে গোনাটা নতুন করে শুরু হয়
    const windowStart = Date.now() - AUTH_RULES.loginWindowHours * HOUR;
    const stale =
      !user.login_attempts_at ||
      new Date(user.login_attempts_at).getTime() < windowStart;

    const attempts = stale ? 1 : (user.login_attempts || 0) + 1;

    user.login_attempts = attempts;
    if (stale) user.login_attempts_at = new Date();
    await user.save();

    if (attempts >= AUTH_RULES.loginMaxAttempts) {
      const [until] = await Promise.all([
        block(
          phone,
          "phone",
          AUTH_RULES.loginBlockHours,
          attempts +
            " wrong passwords within " +
            AUTH_RULES.loginWindowHours +
            " hours",
        ),
        block(
          ip,
          "ip",
          AUTH_RULES.loginBlockHours,
          "Too many wrong passwords from this device",
        ),
      ]);
      throw TooManyRequests(
        "Too many wrong passwords. Your number and device are blocked for " +
          humanWait(until) +
          ".",
      );
    }

    const left = AUTH_RULES.loginMaxAttempts - attempts;
    throw new ApiError(
      401,
      "Wrong password. " + left + (left === 1 ? " attempt" : " attempts") + " left.",
    );
  }

  user.login_attempts = 0;
  user.login_attempts_at = null;
  user.last_login_at = new Date();
  user.last_login_ip = ip;
  if (!user.known_ips.includes(ip)) user.known_ips.push(ip);
  await user.save();

  const safe = user.toObject();
  delete (safe as any).password;

  return {
    token: issueToken(user),
    profile_complete: !!(user.name && user.district),
    user: safe,
  };
};

/* ==========================================================================
   পাসওয়ার্ড বদল — /account পেজ থেকে, লগইন থাকা অবস্থায়
   ========================================================================== */
export const changePassword = async (
  userId: string,
  currentPassword: string | undefined,
  newPasswordRaw: string,
) => {
  const newPassword = assertStrongPassword(newPasswordRaw);

  const user = await UserModel.findById(userId).select("+password");
  if (!user) throw new ApiError(404, "Your account was not found");
  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  // পাসওয়ার্ড সেট করাই থাকলে পুরোনোটা মিলিয়ে নেওয়া বাধ্যতামূলক
  if (user.password) {
    if (!currentPassword) throw BadRequest("Enter your current password");

    const matched = await bcrypt.compare(currentPassword, user.password);
    if (!matched) throw new ApiError(401, "Your current password is not correct");

    if (await bcrypt.compare(newPassword, user.password)) {
      throw BadRequest("The new password must be different from the current one");
    }
  }

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  user.password_changed_at = new Date();
  // পাসওয়ার্ড বদলেছে মানে বাকি সব যন্ত্রের সেশন এখানেই শেষ
  user.token_version = (user.token_version ?? 0) + 1;
  user.login_attempts = 0;
  user.login_attempts_at = null;
  await user.save();

  // যে যন্ত্র থেকে বদলানো হলো সেটাকে বের করে দেওয়ার মানে নেই — তাকে
  // নতুন প্রজন্মের একটা টোকেন দিয়ে দিই, কন্ট্রোলার সেটা কুকিতে বসায়
  return { changed_at: user.password_changed_at, token: issueToken(user) };
};

/* ==========================================================================
   পাসওয়ার্ড ভুলে গেলে — ধাপ ১: নম্বরে রিসেট কোড পাঠানো
   --------------------------------------------------------------------------
   নিয়মগুলো সাইনআপের OTP এর মতোই: ৩ ঘণ্টায় সর্বোচ্চ ৩টা কোড, তারপর
   নম্বরটা ৬ ঘণ্টার জন্য ব্লক। গোনাটা কেবল রিসেটের কোডের — কারণ যে
   নম্বরে অ্যাকাউন্ট আছে সে সাইনআপ OTP চাইতেই পারে না, আর যার অ্যাকাউন্ট
   নেই সে রিসেট চাইতে পারে না; দুটো পথ কখনো এক নম্বরে মেশে না।

   অ্যাকাউন্ট নেই — এটা লুকাই না। এই অ্যাপে লগইনও একই কথা বলে
   ("No account found with this number"), তাই এখানে লুকোলে শুধু গ্রাহকই
   বিভ্রান্ত হতো, আক্রমণকারীর কিছু আটকাত না।
   ========================================================================== */
export const sendResetOtp = async (rawPhone: string, ip: string) => {
  const phone = normalizeBdPhone(rawPhone);
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw BadRequest("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
  }

  await assertNotBlocked(phone, ip);

  const user = await UserModel.findOne({ phone }).select("+password status").lean();

  if (!user) {
    throw new ApiError(
      404,
      "No account found with this number. Please create an account first.",
    );
  }

  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  const windowStart = new Date(Date.now() - AUTH_RULES.otpWindowHours * HOUR);

  const [sentInWindow, lastOtp, ipCount] = await Promise.all([
    OtpModel.countDocuments({
      phone,
      purpose: "reset",
      createdAt: { $gte: windowStart },
    }),
    OtpModel.findOne({ phone, purpose: "reset" }).sort({ createdAt: -1 }).lean(),
    OtpModel.countDocuments({ ip, createdAt: { $gte: windowStart } }),
  ]);

  // ৩ ঘণ্টায় ৩ বারের বেশি — নম্বরটা ৬ ঘণ্টার জন্য ব্লক
  if (sentInWindow >= AUTH_RULES.otpMaxPerWindow) {
    const until = await block(
      phone,
      "phone",
      AUTH_RULES.otpBlockHours,
      "More than " +
        AUTH_RULES.otpMaxPerWindow +
        " password reset codes within " +
        AUTH_RULES.otpWindowHours +
        " hours",
    );
    throw TooManyRequests(
      "You have already asked for " +
        AUTH_RULES.otpMaxPerWindow +
        " reset codes in " +
        AUTH_RULES.otpWindowHours +
        " hours. This number is blocked for " +
        humanWait(until) +
        ".",
    );
  }

  if (ipCount >= AUTH_RULES.ipMaxPerWindow) {
    const until = await block(
      ip,
      "ip",
      AUTH_RULES.otpBlockHours,
      "Too many OTP requests from one device",
    );
    throw TooManyRequests(
      "Too many verification codes were requested from this device. Please try again after " +
        humanWait(until) +
        ".",
    );
  }

  // খুব দ্রুত পরপর চাওয়া আটকাই
  if (lastOtp && !lastOtp.consumed) {
    const since = (Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000;
    if (since < AUTH_RULES.resendCooldownSeconds) {
      throw TooManyRequests(
        "Please wait " +
          Math.ceil(AUTH_RULES.resendCooldownSeconds - since) +
          " seconds before asking for another code.",
      );
    }
  }

  const code = sixDigits();
  const expires_at = new Date(Date.now() + AUTH_RULES.otpTtlMinutes * 60 * 1000);

  // আগের রিসেট কোডগুলো আর কাজ করবে না — সবসময় শেষেরটাই বৈধ
  await OtpModel.updateMany(
    { phone, purpose: "reset", consumed: false },
    { $set: { consumed: true } },
  );

  await OtpModel.create({
    phone,
    code_hash: hashCode(code, phone),
    purpose: "reset",
    ip,
    expires_at,
  });

  // SMS পাঠাতে না পারলে কোডটা বাঁচিয়ে রাখার মানে নেই
  try {
    await sendSms(phone, resetOtpMessage(code, AUTH_RULES.otpTtlMinutes));
  } catch (err) {
    await OtpModel.updateMany(
      { phone, purpose: "reset", consumed: false },
      { $set: { consumed: true } },
    );
    throw err;
  }

  return {
    phone,
    expires_in: AUTH_RULES.otpTtlMinutes * 60,
    resend_after: AUTH_RULES.resendCooldownSeconds,
    attempts_left: AUTH_RULES.otpMaxPerWindow - sentInWindow - 1,
    // SMS বন্ধ থাকা লোকাল ডেভেই কেবল কোডটা ফেরত যায়, প্রোডাকশনে কখনো নয়
    ...(!smsEnabled() && !isProduction() ? { dev_otp: code } : {}),
  };
};

/* ==========================================================================
   পাসওয়ার্ড ভুলে গেলে — ধাপ ২: কোডটা মিলিয়ে দেখা
   --------------------------------------------------------------------------
   কোডটা এখানেই পুড়ে যায়, আর বদলে অল্প সময়ের (resetTicketMinutes) একটা
   এলোমেলো টিকিট দেওয়া হয়। নতুন পাসওয়ার্ড বসানোর সময় ঐ টিকিটটাই লাগে।

   এভাবে করার কারণ তিনটে:
     • ৬ ডিজিটের কোডটা তারে একবারই যায় — দ্বিতীয়বার আর পাঠাতে হয় না।
     • গ্রাহক ভুল কোড দিলে সাথে সাথেই জানতে পারে, পুরো পাসওয়ার্ড ফর্ম
       ভরে ফেলার পরে নয়।
     • টিকিটটা একবারই খাটে আর ১০ মিনিটে ফুরিয়ে যায়, তাই কেউ সেটা
       হাতিয়ে নিলেও জানালাটা সরু।
   ========================================================================== */
export const verifyResetOtp = async (
  input: { phone: string; code: string },
  ip: string,
) => {
  const phone = normalizeBdPhone(input.phone);

  await assertNotBlocked(phone, ip);

  const user = await UserModel.findOne({ phone }).select("status").lean();

  if (!user) throw new ApiError(404, "No account found with this number.");
  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  const otp = await consumeOtp(phone, input.code, ip, "reset");

  const ticket = newTicket();
  otp.reset_token_hash = hashTicket(ticket);
  otp.reset_token_expires_at = new Date(
    Date.now() + AUTH_RULES.resetTicketMinutes * 60 * 1000,
  );
  otp.reset_token_used = false;
  await otp.save();

  return {
    phone,
    reset_token: ticket,
    expires_in: AUTH_RULES.resetTicketMinutes * 60,
  };
};

/* ==========================================================================
   পাসওয়ার্ড ভুলে গেলে — ধাপ ৩: টিকিট দেখিয়ে নতুন পাসওয়ার্ড বসানো
   --------------------------------------------------------------------------
   এখানে টোকেন দেওয়া হয় না। পাসওয়ার্ড বদলের পর গ্রাহককে নতুন পাসওয়ার্ড
   দিয়ে একবার লগইন করতে হয় — এতে সে নিজেই নিশ্চিত হয় নতুনটা মনে আছে,
   আর কেউ কোড হাতিয়ে নিলেও সাথে সাথে সেশন পেয়ে যায় না।

   সাথে `token_version` এক ধাপ বাড়ে, তাই অন্য যেকোনো যন্ত্রে খোলা থাকা
   সেশন — চুরি যাওয়া টোকেন সমেত — ঠিক এই মুহূর্তেই অচল হয়ে যায়।
   ========================================================================== */
export const resetPasswordWithTicket = async (
  input: { phone: string; reset_token: string; password: string },
  ip: string,
) => {
  const phone = normalizeBdPhone(input.phone);
  const password = assertStrongPassword(input.password);

  await assertNotBlocked(phone, ip);

  // টিকিটটা হ্যাশ করেই খোঁজা হয় — ডাটাবেসে আসলটা কখনো থাকে না
  const otp = await OtpModel.findOne({
    phone,
    purpose: "reset",
    reset_token_hash: hashTicket(String(input.reset_token || "")),
  });

  const expired =
    !otp?.reset_token_expires_at ||
    otp.reset_token_expires_at.getTime() < Date.now();

  if (!otp || otp.reset_token_used || expired) {
    throw BadRequest(
      "This reset link has expired. Please ask for a new code and try again.",
    );
  }

  const user = await UserModel.findOne({ phone }).select("+password");

  if (!user) throw new ApiError(404, "No account found with this number.");
  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  // নতুন পাসওয়ার্ড আগেরটার মতো হলে বদলানোর মানেই থাকে না
  if (user.password && (await bcrypt.compare(password, user.password))) {
    throw BadRequest("The new password must be different from your old one");
  }

  // টিকিটটা আগে পুড়িয়ে দিই — পাসওয়ার্ড লেখার মাঝপথে দ্বিতীয় একটা
  // রিকোয়েস্ট এলে সেটা যেন আর ঢুকতে না পারে
  otp.reset_token_used = true;
  await otp.save();

  user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.password_changed_at = new Date();
  user.phone_verified = true;
  // অন্য সব যন্ত্রের সেশন এখানেই শেষ
  user.token_version = (user.token_version ?? 0) + 1;
  // কোড মিলেছে মানে নম্বরটা তারই — আগের ব্যর্থ লগইনের গোনা মুছে দিই
  user.login_attempts = 0;
  user.login_attempts_at = null;
  await user.save();

  // ভুল পাসওয়ার্ডের কারণে বসা ব্লকও উঠে যাক, নাহলে নতুন পাসওয়ার্ড
  // নিয়েও গ্রাহক ঘণ্টার পর ঘণ্টা ঢুকতে পারত না
  await AuthBlockModel.deleteMany({ key: phone, type: "phone" });

  return { phone, changed_at: user.password_changed_at };
};

/** ব্লক তুলে দেওয়া — ড্যাশবোর্ড থেকে অ্যাডমিন ব্যবহার করে */
export const clearBlocks = async (rawPhone: string) => {
  const phone = normalizeBdPhone(rawPhone);
  const res = await AuthBlockModel.deleteMany({ key: phone, type: "phone" });
  await Promise.all([
    OtpModel.updateMany({ phone }, { $set: { attempts: 0 } }),
    UserModel.updateOne(
      { phone },
      { $set: { login_attempts: 0, login_attempts_at: null } },
    ),
  ]);
  return { removed: res.deletedCount ?? 0 };
};
