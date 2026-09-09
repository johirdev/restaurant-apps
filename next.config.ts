import type { NextConfig } from "next";

/* ==========================================================================
   NEXT CONFIG
   --------------------------------------------------------------------------
   এখানে তিনটে আলাদা জিনিস, তিনটেরই আলাদা কারণ:

     ১. **ছবি** — মেনুর ছবিই পাতার সবচেয়ে ভারী অংশ। AVIF/WebP এ পাঠালে
        একই ছবি অর্ধেকেরও কম ব্যান্ডউইথে যায়, তাই মোবাইলে পাতা দ্রুত
        খোলে আর Core Web Vitals (LCP) ভালো হয় — গুগল সেটাই র‍্যাঙ্কিংয়ে
        ধরে।

     ২. **হেডার** — নিরাপত্তার স্তরগুলো `src/proxy.ts` এও বসে, কিন্তু
        proxy স্ট্যাটিক ফাইলে চলে না। তাই মৌলিক হেডারগুলো এখানেও, আর
        API তে ক্যাশ বন্ধ করা — নাহলে CDN একজনের ব্যক্তিগত উত্তর
        আরেকজনকে দেখিয়ে দিতে পারত।

     ৩. **পাওয়ার্ড-বাই** — সার্ভার কী দিয়ে চলছে সেটা বাইরে বলার দরকার
        নেই; আক্রমণকারীর কাজ সহজ করে দেয়।
   ========================================================================== */

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" — অপ্রয়োজনীয় তথ্য ফাঁস
  poweredByHeader: false,

  // ভুল টাইপ নিয়ে প্রোডাকশন বিল্ড কখনো পাস করবে না
  typescript: { ignoreBuildErrors: false },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
    // আধুনিক ফরম্যাট আগে — ব্রাউজার না বুঝলে Next নিজেই JPEG এ ফিরে যায়
    formats: ["image/avif", "image/webp"],
    // Cloudinary এর ছবি বদলায় না (নতুন ছবিতে নতুন URL), তাই লম্বা ক্যাশ
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // SVG বাইরে থেকে নেওয়া হয় না — SVG এর ভেতরে স্ক্রিপ্ট থাকতে পারে
    dangerouslyAllowSVG: false,
  },

  async headers() {
    return [
      {
        // পুরো সাইট
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        /**
         * API এর উত্তর কখনো ক্যাশে রাখা যাবে না।
         * একজনের প্রোফাইল বা অর্ডারের উত্তর CDN ধরে রাখলে পরের
         * ভিজিটর সেটাই দেখে ফেলত — সবচেয়ে বাজে ধরনের ডেটা ফাঁস।
         */
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, private",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        // ড্যাশবোর্ড কখনো সার্চে আসা উচিত নয়
        source: "/dashboard/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
