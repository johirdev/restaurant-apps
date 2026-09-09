/* ==========================================================================
   ব্যবসায়িক দিন — সার্ভারের ঘড়ি নয়, দোকানের ঘড়ি
   --------------------------------------------------------------------------
   Vercel এর সার্ভার UTC তে চলে। বাংলাদেশ UTC+৬। ফলে `new Date().getDate()`
   ব্যবহার করলে "আজকের দিন" শুরু হতো বাংলাদেশ সময় ভোর ৬টায় — অর্থাৎ
   রাত ১২টা থেকে ভোর ৬টার অর্ডারগুলো "গতকালের" হিসাবে গোনা হতো, আর
   অর্ডার নম্বরের তারিখটাও এক দিন পিছিয়ে থাকত।

   এখানকার সব হিসাব `RESTAURANT_TZ` ধরে হয়, তাই:
     • অর্ডার নম্বরে সঠিক তারিখ বসে
     • ড্যাশবোর্ডের "আজকের বিক্রি" রাত ১২টায় রিসেট হয়, ভোর ৬টায় নয়
     • দিনের হিসাব (ledger) ঠিক দিনেই জমা হয়

   টাইমজোন বদলাতে হলে শুধু `RESTAURANT_TIMEZONE` env বসান।
   ========================================================================== */

export const RESTAURANT_TZ = process.env.RESTAURANT_TIMEZONE || "Asia/Dhaka";

/** ঐ টাইমজোনে দিনটার year/month/day — Intl ব্যবহার করায় DST-ও ঠিক থাকে */
function zonedParts(date: Date, timeZone = RESTAURANT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/**
 * দোকানের টাইমজোনে UTC থেকে কত মিনিট এগিয়ে — ঐ মুহূর্তের জন্য হিসাব করা,
 * তাই DST বদলালেও ঠিক থাকে।
 */
function offsetMinutes(date: Date, timeZone = RESTAURANT_TZ): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** "2026-09-09" — ব্যবসায়িক দিনের চাবি, ledger আর রিপোর্ট এটাই ব্যবহার করে */
export function businessDayKey(date: Date = new Date()): string {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "260909" — অর্ডার নম্বরের তারিখ-ছাপ */
export function orderDateStamp(date: Date = new Date()): string {
  const { year, month, day } = zonedParts(date);
  return [
    String(year).slice(-2),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("");
}

/** ঐ ব্যবসায়িক দিনের শুরু — আসল UTC মুহূর্ত, তাই মঙ্গোর তুলনায় সরাসরি বসে */
export function startOfBusinessDay(date: Date = new Date()): Date {
  const { year, month, day } = zonedParts(date);
  const offset = offsetMinutes(date);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offset * 60000);
}

/** ঐ ব্যবসায়িক দিনের শেষ মুহূর্ত */
export function endOfBusinessDay(date: Date = new Date()): Date {
  const start = startOfBusinessDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** আজ থেকে n দিন আগের দিনের শুরু — রিপোর্টের রেঞ্জ বানাতে */
export function startOfDaysAgo(days: number, from: Date = new Date()): Date {
  return startOfBusinessDay(new Date(from.getTime() - days * 24 * 60 * 60 * 1000));
}
