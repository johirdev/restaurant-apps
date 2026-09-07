/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ==========================================================================
 * USER AUTH — ফোন নম্বর + OTP
 * পাসওয়ার্ড নেই। কাস্টমার নম্বর দেয় → OTP আসে → OTP মিললে টোকেন পায়।
 * নম্বরটা আগে না থাকলে সেখানেই নতুন অ্যাকাউন্ট তৈরি হয়ে যায়।
 * ==========================================================================
 */
import crypto from "crypto";
import UserModel from "../models/user.model";
import OtpModel from "../models/otp.model";
import AuthBlockModel from "../models/authBlock.model";
import { ApiError, BadRequest, TooManyRequests } from "../lib/apiError";
import { jwtHelpers } from "../lib/jwtHelpers";
import { normalizeBdPhone } from "../lib/phone";
import { sendSms, otpMessage, smsEnabled, isProduction } from "./sms.service";

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
  /** ৬ ঘণ্টায় সর্বোচ্চ কয়বার ভুল কোড দেওয়া যাবে */
  loginMaxAttempts: 5,
  loginWindowHours: 6,
  loginBlockHours: 6,
  /** পরপর দুটো OTP এর মাঝে সর্বনিম্ন বিরতি (সেকেন্ড) */
  resendCooldownSeconds: 60,
  /** এক IP থেকে ৩ ঘণ্টায় সর্বোচ্চ কয়টা OTP — শেয়ার্ড নেটওয়ার্কের কথা ভেবে ঢিলা */
  ipMaxPerWindow: 15,
} as const;

const HOUR = 60 * 60 * 1000;

const hashCode = (code: string, phone: string) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET || "otp-fallback-secret")
    .update(phone + ":" + code)
    .digest("hex");

const sixDigits = () => String(crypto.randomInt(100000, 1000000));

const minutesLeft = (until: Date) =>
  Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000));

const humanWait = (until: Date) => {
  const mins = minutesLeft(until);
  if (mins < 60) return mins + (mins === 1 ? " minute" : " minutes");
  const hrs = Math.ceil(mins / 60);
  return hrs + (hrs === 1 ? " hour" : " hours");
};

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
   ধাপ ১ — OTP পাঠানো
   ========================================================================== */
export const sendOtp = async (rawPhone: string, ip: string) => {
  const phone = normalizeBdPhone(rawPhone);
  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw BadRequest("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
  }

  await assertNotBlocked(phone, ip);

  const user = await UserModel.findOne({ phone }).lean();
  if (user?.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  const windowStart = new Date(Date.now() - AUTH_RULES.otpWindowHours * HOUR);

  const [sentInWindow, lastOtp, ipCount] = await Promise.all([
    OtpModel.countDocuments({ phone, createdAt: { $gte: windowStart } }),
    OtpModel.findOne({ phone }).sort({ createdAt: -1 }).lean(),
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

  // আগের কোডগুলো আর কাজ করবে না — সবসময় শেষেরটাই বৈধ
  await OtpModel.updateMany({ phone, consumed: false }, { $set: { consumed: true } });

  await OtpModel.create({
    phone,
    code_hash: hashCode(code, phone),
    purpose: "login",
    ip,
    expires_at,
  });

  // SMS পাঠাতে না পারলে কোডটা বাঁচিয়ে রাখার মানে নেই
  try {
    await sendSms(phone, otpMessage(code, AUTH_RULES.otpTtlMinutes));
  } catch (err) {
    await OtpModel.updateMany({ phone, consumed: false }, { $set: { consumed: true } });
    throw err;
  }

  return {
    phone,
    is_new_user: !user,
    expires_in: AUTH_RULES.otpTtlMinutes * 60,
    resend_after: AUTH_RULES.resendCooldownSeconds,
    attempts_left: AUTH_RULES.otpMaxPerWindow - sentInWindow - 1,
    // SMS বন্ধ থাকা লোকাল ডেভেই কেবল কোডটা ফেরত যায়, প্রোডাকশনে কখনো নয়
    ...(!smsEnabled() && !isProduction() ? { dev_otp: code } : {}),
  };
};

/* ==========================================================================
   ধাপ ২ — OTP মিলিয়ে দেখা, তারপর টোকেন
   ========================================================================== */
export const verifyOtp = async (rawPhone: string, rawCode: string, ip: string) => {
  const phone = normalizeBdPhone(rawPhone);
  const code = String(rawCode || "").trim();

  if (!/^\d{6}$/.test(code)) throw BadRequest("Enter the 6-digit code we sent you");

  await assertNotBlocked(phone, ip);

  const otp = await OtpModel.findOne({ phone, consumed: false }).sort({
    createdAt: -1,
  });

  if (!otp) throw BadRequest("This code is no longer valid. Please request a new one.");

  if (otp.expires_at.getTime() < Date.now()) {
    otp.consumed = true;
    await otp.save();
    throw BadRequest("The code has expired. Please request a new one.");
  }

  if (otp.code_hash !== hashCode(code, phone)) {
    otp.attempts += 1;
    await otp.save();

    // ৬ ঘণ্টায় মোট কতবার ভুল হলো — সীমা ছাড়ালে নম্বর আর ডিভাইস দুটোই ব্লক
    const windowStart = new Date(Date.now() - AUTH_RULES.loginWindowHours * HOUR);
    const recent = await OtpModel.find({ phone, createdAt: { $gte: windowStart } })
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

  // নম্বরটা আগে না থাকলে এখানেই রেজিস্ট্রেশন হয়ে যায়
  const isNew = !(await UserModel.exists({ phone }));

  const user = await UserModel.findOneAndUpdate(
    { phone },
    {
      $set: {
        phone,
        phone_verified: true,
        last_login_at: new Date(),
        last_login_ip: ip,
      },
      $addToSet: { known_ips: ip },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  if (user.status === "blocked") {
    throw new ApiError(403, "This account has been blocked. Please contact support.");
  }

  // সফল লগইনের পর আগের ব্যর্থ চেষ্টাগুলো আর গোনা হবে না
  await OtpModel.updateMany({ phone }, { $set: { attempts: 0, consumed: true } });

  const token = jwtHelpers.createToken(
    { id: String(user._id), phone: user.phone, role: "user" },
    process.env.JWT_SECRET as string,
    process.env.JWT_EXPIRES_IN || "30d",
  );

  return {
    token,
    is_new_user: isNew,
    /** নাম/জেলা না থাকলে ফ্রন্টএন্ড সোজা প্রোফাইল এডিট পেজে পাঠায় */
    profile_complete: !!(user.name && user.district),
    user: user.toObject(),
  };
};

/** ব্লক তুলে দেওয়া — ড্যাশবোর্ড থেকে অ্যাডমিন ব্যবহার করে */
export const clearBlocks = async (rawPhone: string) => {
  const phone = normalizeBdPhone(rawPhone);
  const res = await AuthBlockModel.deleteMany({ key: phone, type: "phone" });
  await OtpModel.updateMany({ phone }, { $set: { attempts: 0 } });
  return { removed: res.deletedCount ?? 0 };
};
