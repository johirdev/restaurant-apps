/**
 * ==========================================================================
 * SMS — BulkSMSBD
 * .env এ কনফিগারেশন:
 *   BULKSMSBD_API_URL, BULKSMSBD_API_KEY, BULKSMSBD_SENDER_ID,
 *   SMS_ENABLED, APP_NAME
 * ==========================================================================
 */
import { ApiError } from "../lib/apiError";
import { normalizeBdPhone } from "../lib/phone";

const API_URL = process.env.BULKSMSBD_API_URL || "http://bulksmsbd.net/api/smsapi";
const API_KEY = process.env.BULKSMSBD_API_KEY || "";
const SENDER_ID = process.env.BULKSMSBD_SENDER_ID || "";
const APP_NAME = process.env.APP_NAME || "Restaurant";

/** SMS_ENABLED=true না থাকলে সত্যিকারের SMS যায় না — লোকাল ডেভে সুবিধা */
export const smsEnabled = () =>
  process.env.SMS_ENABLED === "true" && !!API_KEY && !!SENDER_ID;

export const isProduction = () => process.env.NODE_ENV === "production";

/** ব্যালান্স/গেটওয়ে ফুরিয়ে গেলে কাস্টমার এই বার্তাটাই দেখে */
export const SMS_DOWN_MESSAGE =
  "SMS quota has run out — our management has already been informed. Please try again in a little while.";

/**
 * BulkSMSBD এর এরর কোডগুলোর মানে। যেগুলো টাকা/অ্যাকাউন্ট সংক্রান্ত সেগুলোতে
 * কাস্টমারকে দোষ দেওয়া যায় না, তাই আমরা "ব্যালান্স শেষ" বার্তাই দেখাই।
 */
const RESPONSE_CODES: Record<number, string> = {
  202: "SMS Submitted Successfully",
  1001: "Invalid Number",
  1002: "Sender id not correct or disabled",
  1003: "Please fill all required fields",
  1005: "Internal Error",
  1006: "Balance validity not available",
  1007: "Balance insufficient",
  1011: "User ID not found",
  1012: "Masking SMS must be sent in Bengali",
  1013: "Sender ID has no gateway by api key",
  1014: "Sender type name not found using this sender by api key",
  1015: "Sender ID has no valid gateway by api key",
  1016: "Sender type name active price info not found by this sender id",
  1017: "Sender type name price info not found by this sender id",
  1018: "The owner of this account is disabled",
  1019: "The sender type name price of this account is disabled",
  1020: "The parent of this account is not found",
  1021: "The parent active sender type price of this account is not found",
  1031: "Your account is not verified, please contact administrator",
  1032: "IP is not white-listed",
};

/** এই কোডগুলো মানে আমাদের নিজেদের অ্যাকাউন্টে সমস্যা — কাস্টমারের নয় */
const OUR_FAULT_CODES = new Set([
  1002, 1005, 1006, 1007, 1011, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020,
  1021, 1031, 1032,
]);

/**
 * ম্যানেজমেন্টকে জানানো। এখন সার্ভার লগেই যায় — পরে এখানে ইমেইল/স্ল্যাক
 * হুক বসালে বাকি কোডের কিছুই বদলাতে হবে না।
 */
export function notifyManagement(subject: string, detail: unknown) {
  console.error(`[SMS ALERT] ${subject}`, detail);
}

export interface SendSmsResult {
  delivered: boolean;
  /** SMS বন্ধ থাকলে (ডেভ মোড) কোডটা ফেরত আসে, প্রোডাকশনে কখনো নয় */
  devCode?: string;
  provider?: string;
}

/** একটা নম্বরে SMS পাঠায়। ব্যর্থ হলে 503 সহ ApiError ছুঁড়ে দেয়। */
export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const number = `88${normalizeBdPhone(phone)}`;

  if (!smsEnabled()) {
    // কনফিগারেশন নেই — ডেভে কনসোলেই দেখাই, প্রোডাকশনে এটা সত্যিকারের সমস্যা
    if (isProduction()) {
      notifyManagement("SMS is disabled or misconfigured in production", {
        hasKey: !!API_KEY,
        hasSender: !!SENDER_ID,
        SMS_ENABLED: process.env.SMS_ENABLED,
      });
      throw new ApiError(503, SMS_DOWN_MESSAGE);
    }
    console.info(`[SMS DEV] → ${number}: ${message}`);
    return { delivered: false, provider: "dev" };
  }

  const url = new URL(API_URL);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("type", "text");
  url.searchParams.set("number", number);
  url.searchParams.set("senderid", SENDER_ID);
  url.searchParams.set("message", message);

  let body: string;
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      // গেটওয়ে ঝুলে থাকলে যেন পুরো রিকোয়েস্ট আটকে না থাকে
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    body = await res.text();
  } catch (err) {
    notifyManagement("BulkSMSBD unreachable", err);
    throw new ApiError(503, SMS_DOWN_MESSAGE);
  }

  // সফল হলে {"response_code":202,...}, ব্যর্থ হলেও একই আকারে কোড আসে
  let code = 0;
  try {
    code = Number(JSON.parse(body)?.response_code ?? 0);
  } catch {
    code = Number((body.match(/"?response_code"?\s*:\s*(\d+)/) || [])[1] || 0);
  }

  if (code === 202) return { delivered: true, provider: "bulksmsbd" };

  const reason = RESPONSE_CODES[code] || `Unknown SMS gateway response: ${body}`;

  if (OUR_FAULT_CODES.has(code) || !code) {
    notifyManagement(`BulkSMSBD failure (${code})`, reason);
    throw new ApiError(503, SMS_DOWN_MESSAGE);
  }

  // 1001 (ভুল নম্বর) / 1003 (ফিল্ড মিসিং) — এগুলো ইনপুটের সমস্যা
  throw new ApiError(400, reason);
}

/** OTP এর SMS টেক্সট — এক জায়গায় থাকলে ব্র্যান্ডের নাম বদলানো সহজ */
export const otpMessage = (code: string, minutes: number) =>
  `Your ${APP_NAME} verification code is ${code}. It is valid for ${minutes} minutes. Do not share this code with anyone.`;

/**
 * পাসওয়ার্ড রিসেটের কোড আলাদা করে লেখা হয় — গ্রাহক যেন বোঝে কোন কাজের
 * জন্য কোডটা এসেছে। কেউ তার অজান্তে রিসেট চাইলে এই লেখাটাই সতর্ক করে।
 */
export const resetOtpMessage = (code: string, minutes: number) =>
  `${code} is your ${APP_NAME} password reset code, valid for ${minutes} minutes. If you did not ask to reset your password, ignore this message.`;
