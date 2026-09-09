/* ==========================================================================
   সাইটের ঠিকানা — এক জায়গায়
   --------------------------------------------------------------------------
   ডোমেইনটা আগে তিন-চার জায়গায় হাতে লেখা ছিল (লেআউট, খাবারের পাতা,
   sitemap)। একটা জায়গায় বদলে অন্যগুলো ভুলে গেলে canonical URL আর
   OG ইমেজ ভুল ডোমেইনে চলে যেত — গুগল তখন দুটো আলাদা সাইট ভাবে আর
   র‍্যাঙ্কিং ভাগ হয়ে যায়।

   Vercel প্রতিটা ডিপ্লয়ে `VERCEL_PROJECT_PRODUCTION_URL` বসিয়ে দেয়,
   তাই ডোমেইন বদলালে কোড ছোঁয়া লাগে না।
   ========================================================================== */
const fromEnv =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "");

export const SITE_URL = (fromEnv || "https://durbinbangla.vercel.app").replace(
  /\/$/,
  "",
);

/** পুরো URL বানায় — `absoluteUrl("/foods/123")` */
export const absoluteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
