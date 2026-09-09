import { NextRequest, NextResponse } from "next/server";

/* ==========================================================================
   PROXY — অ্যাপে ঢোকার আগের দরজা
   --------------------------------------------------------------------------
   (Next.js ১৬ তে `middleware.ts` এর নতুন নাম `proxy.ts`। ডিফল্টে Node.js
   রানটাইমে চলে, আর প্রতিটা রিকোয়েস্ট রেন্ডার/রুট হ্যান্ডলারে পৌঁছানোর
   আগেই এখান দিয়ে যায়।)

   এখানে তিনটে কাজ, তিনটেই সস্তা — কোনো ডাটাবেস কল নেই, কারণ এই কোডটা
   প্রতিটা রিকোয়েস্টে চলে:

     ১. **স্ক্যানার তাড়ানো** — `/.env`, `/wp-admin`, `/phpmyadmin` — এই
        পথগুলো এই অ্যাপে নেই, কিন্তু বট রোজ হাজারবার চেষ্টা করে। ৪০৪
        রেন্ডার করাও খরচ; তাই সোজা ৪০৪ দিয়ে বিদায়।

     ২. **বার্স্ট আটকানো** — এক IP থেকে সেকেন্ডে ডজনখানেক ডাক এলে সেটা
        মানুষ নয়। মেমোরিতে রাখা ছোট একটা হিসাব দিয়ে সেটুকু থামানো হয়।
        এটা নিখুঁত নয় (ইনস্ট্যান্স বদলালে হিসাব নতুন করে শুরু), কিন্তু
        সেটাই ঠিক আছে — আসল, নিখুঁত পাহারা ডাটাবেস-ভিত্তিক
        `src/lib/rateLimit.ts` এ, রুট হ্যান্ডলারের ভেতরে।

     ৩. **সিকিউরিটি হেডার** — ক্লিকজ্যাকিং, MIME স্নিফিং, রেফারার ফাঁস
        বন্ধ করা। এগুলো একবার বসালে পুরো অ্যাপ ঢাকা পড়ে যায়।

   ⚠️ এখানে auth যাচাই করা হয় না। প্রতিটা রুট নিজেই নিজের টোকেন দেখে —
   পাহারা এক জায়গায় জড়ো করলে একটা রুট ম্যাচার ভুল হলেই সব খুলে যেত।
   ========================================================================== */

/* --------------------------------------------------------------------------
   ১. যেসব পথ এই অ্যাপে নেই — শুধু স্ক্যানারই খোঁজে
   -------------------------------------------------------------------------- */
const SCANNER_PATHS =
  /^\/(?:\.env|\.git|\.aws|\.ssh|wp-admin|wp-login|wp-content|wordpress|phpmyadmin|xmlrpc\.php|vendor\/|cgi-bin\/|admin\.php|config\.json|\.well-known\/security|backup|dump\.sql|composer\.(?:json|lock))/i;

/* --------------------------------------------------------------------------
   ২. যেসব বট সাইটের কোনো উপকারে আসে না
   --------------------------------------------------------------------------
   সার্চ ইঞ্জিন (Google, Bing) আর সোশ্যাল প্রিভিউ (Facebook, WhatsApp)
   ইচ্ছে করেই বাদ — ওরাই তো কাস্টমার আনে। এখানে শুধু সেই স্ক্র্যাপারগুলো
   যারা পুরো সাইট কপি করে নেয় বা প্রতিযোগীর দাম দেখতে আসে।
   -------------------------------------------------------------------------- */
const UNWANTED_BOTS =
  /(?:ahrefsbot|semrushbot|dotbot|mj12bot|blexbot|petalbot|dataforseo|seokicks|serpstatbot|zoominfobot|megaindex|barkrowler|python-requests|scrapy|curl\/|wget\/|libwww-perl|go-http-client|masscan|nikto|sqlmap|nmap)/i;

/* --------------------------------------------------------------------------
   ৩. বার্স্ট লিমিটার — খুব অল্প জায়গা নেয়, তাই প্রতিটা রিকোয়েস্টে চালানো যায়
   -------------------------------------------------------------------------- */
const BURST_WINDOW_MS = 10_000;
/** ১০ সেকেন্ডে সর্বোচ্চ কত ডাক — একটা পেজ লোডে ছবি/API মিলিয়ে ২০-৩০ হতে পারে */
const BURST_MAX = 120;
/** API তে আলাদা, কড়া সীমা */
const BURST_MAX_API = 60;
/** মেমোরির হিসাব যেন অসীম না বাড়ে */
const MAX_TRACKED_IPS = 5000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function overBurstLimit(ip: string, isApi: boolean): boolean {
  const now = Date.now();

  // জানালা শেষ হয়ে যাওয়া হিসাবগুলো মাঝে মাঝে ঝেড়ে ফেলি
  if (buckets.size > MAX_TRACKED_IPS) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    // তাতেও না কমলে পুরোটাই মুছে নতুন করে শুরু — মেমোরি বাড়তে দেওয়া যায় না
    if (buckets.size > MAX_TRACKED_IPS) buckets.clear();
  }

  const key = isApi ? `a:${ip}` : `p:${ip}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + BURST_WINDOW_MS });
    return false;
  }

  bucket.count++;
  return bucket.count > (isApi ? BURST_MAX_API : BURST_MAX);
}

/* --------------------------------------------------------------------------
   ৪. সিকিউরিটি হেডার
   -------------------------------------------------------------------------- */
function harden(res: NextResponse): NextResponse {
  // অন্য কেউ iframe এ ঢুকিয়ে ক্লিকজ্যাকিং করতে পারবে না
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  // ব্রাউজার ফাইলের ধরন নিজে অনুমান করবে না
  res.headers.set("X-Content-Type-Options", "nosniff");
  // বাইরের সাইটে পুরো URL (কোয়েরি সহ) ফাঁস হবে না
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // ক্যামেরা/মাইক/লোকেশন — কোনোটাই এই সাইটের দরকার নেই
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  // HTTPS ছাড়া আর কখনো এই ডোমেইনে আসবে না
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  res.headers.set("X-DNS-Prefetch-Control", "on");
  return res;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* ---- স্ক্যানার ---- */
  if (SCANNER_PATHS.test(pathname)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ua = req.headers.get("user-agent") || "";

  /* ---- অবাঞ্ছিত বট ---- */
  if (UNWANTED_BOTS.test(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // User-Agent একেবারেই না থাকা মানে প্রায় সবসময়ই স্ক্রিপ্ট।
  // API তে সেটা আটকাই, পেজে নয় (কিছু পুরোনো ব্রাউজার/প্রক্সি খালি পাঠায়)।
  const isApi = pathname.startsWith("/api/");
  if (isApi && ua.trim().length < 8) {
    return NextResponse.json(
      { success: false, message: "Forbidden" },
      { status: 403 },
    );
  }

  /* ---- বার্স্ট ---- */
  const ip =
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (ip !== "unknown" && overBurstLimit(ip, isApi)) {
    return NextResponse.json(
      {
        success: false,
        message: "You are going a bit too fast. Please wait a moment.",
      },
      {
        status: 429,
        headers: { "Retry-After": "10", "Cache-Control": "no-store" },
      },
    );
  }

  return harden(NextResponse.next());
}

export const config = {
  /**
   * স্ট্যাটিক ফাইল আর ছবির অপ্টিমাইজেশন বাদ — ওগুলো CDN থেকেই যায়,
   * ওদের জন্য প্রতিবার এই কোড চালানো শুধু খরচ বাড়াত। robots.txt আর
   * sitemap.xml ও বাদ, নাহলে ক্রলার নিজেই বার্স্ট লিমিটে আটকে যেত।
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|css|js|map)$).*)",
  ],
};
