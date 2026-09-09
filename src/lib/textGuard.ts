/* ==========================================================================
   লেখা পাহারা — শব্দ গোনা আর লিংক ধরা
   --------------------------------------------------------------------------
   কন্টাক্ট ফর্মের মতো খোলা ইনবক্সে স্প্যামারের একটাই লক্ষ্য থাকে: লিংক
   গুঁজে দেওয়া। honeypot আর থ্রটল বটের সংখ্যা কমায়, কিন্তু যেটা ঢোকে
   সেটার ভেতরের লিংক আটকায় না — এই ফাইলটা সেই কাজটা করে।

   নিয়মগুলো এক জায়গায় রাখা, কারণ একই যাচাই ব্রাউজারে (react-hook-form
   এর resolver) আর সার্ভারে (parseBody) দুই জায়গাতেই চলে।
   ========================================================================== */

/** ফাঁকা জায়গা ধরে ভাগ করে শব্দ গোনা — একাধিক স্পেস/নতুন লাইন একটাই ধরা হয় */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * সাধারণ ইমেইল ঠিকানা — লিংক খোঁজার আগে এগুলো সরিয়ে নেওয়া হয়।
 * নাহলে "আমাকে rahim@gmail.com এ মেইল করবেন" লেখাটাও ডোমেইন হিসেবে
 * ধরা পড়ত, অথচ ওটা লিংক নয়। (mailto: আলাদা করে নিচে আটকানো আছে।)
 */
const EMAIL_RX = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

/**
 * লিংকের চেনা চেহারাগুলো। শেষ প্যাটার্নটা ছদ্মবেশের জন্য — স্প্যামার
 * ফিল্টার এড়াতে "example (dot) com" বা "example[.]com" লেখে, তাই
 * শুধু আসল ডট খুঁজলে সহজেই ফাঁকি দেওয়া যেত।
 */
const LINK_PATTERNS: RegExp[] = [
  // http://, https://, ftp://, mailto: — সরাসরি স্কিম
  /\b(?:https?|ftp|mailto|tel|data):/i,
  // স্কিম ছাড়া www.
  /\bwww\d{0,3}\./i,
  // <a href=…> বা [text](url) — HTML আর মার্কডাউনের লিংক
  /<\s*a[\s>]/i,
  /\[[^\]]*\]\s*\([^)]*\)/,
  // চেনা টপ-লেভেল ডোমেইন — example.com, my-shop.xyz, t.me/…
  /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:com|net|org|io|co|xyz|info|biz|shop|store|online|site|click|link|top|live|app|dev|ai|me|ly|gg|tk|ru|cn|in|uk|us|bd)\b/i,
  // ছদ্মবেশ ১: বন্ধনীর ভেতরে ডট — example[.]com, example (dot) com, example{.}xyz
  /\b[a-z0-9-]{2,}\s*[([{]\s*(?:\.|dot|ডট)\s*[)\]}]\s*[a-z]{2,}\b/i,
  // ছদ্মবেশ ২: ফাঁকা জায়গায় লেখা "dot" — example dot com
  /\b[a-z0-9-]{2,}\s+(?:dot|ডট)\s+[a-z]{2,}\b/i,
];

/**
 * লেখাটায় কোনো লিংক আছে কিনা।
 * ইমেইল ঠিকানা বাদ দিয়ে দেখা হয় — অতিথি নিজের ইমেইল লিখলে সেটা
 * স্প্যাম নয়, আর তার জন্য ফর্মে আলাদা মাঠও আছে।
 */
export function hasLink(text: string): boolean {
  const withoutEmails = text.replace(EMAIL_RX, " ");
  return LINK_PATTERNS.some((rx) => rx.test(withoutEmails));
}

export const NO_LINK_MESSAGE =
  "Links are not allowed in the message. Please write your message in plain words.";
