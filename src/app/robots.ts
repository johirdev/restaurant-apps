import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/config/site";

/* ==========================================================================
   robots.txt — ক্রলারকে কী দেখতে দেব, কী দেব না
   --------------------------------------------------------------------------
   এতদিন ফাইলটাই ছিল না, তাই ক্রলার ধরে নিত সবকিছু ঘোরা যায় — API,
   ড্যাশবোর্ড, কার্ট, চেকআউট সব। তাতে দুটো ক্ষতি হতো:

     • **খরচ** — বট প্রতিদিন `/api/v1/...` হাজারবার ডাকত, প্রতিটাতেই
       ডাটাবেস কোয়েরি। কোনো লাভ ছাড়াই সার্ভার আর মঙ্গোর বিল বাড়ত।

     • **SEO** — গুগলের "crawl budget" নষ্ট হতো ব্যক্তিগত পাতায়, অথচ
       আসল খাবারের পাতাগুলোই দেরিতে ইনডেক্স হতো। কার্ট বা চেকআউটের
       মতো পাতা সার্চ ফলাফলে এলে সেটা আরও খারাপ দেখাত।

   `crawlDelay` শুধু আক্রমণাত্মক ক্রলারদের জন্য — গুগল/বিং এটা মানে না,
   ওদের গতি Search Console থেকে ঠিক করতে হয়, আর ওদের গতি সমস্যাও নয়।
   ========================================================================== */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",        // পুরো API — ক্রল করার কিছু নেই
          "/dashboard",   // ভেতরের ড্যাশবোর্ড
          "/dashboard/",
          "/account",     // কাস্টমারের নিজের পাতা
          "/account/",
          "/cart",
          "/checkout",
          "/order-confirmed",
          "/track-order",
          "/login",
          "/registration",
          "/forgot-password",
        ],
      },
      {
        // সাইটের কনটেন্ট কপি করে নেওয়া স্ক্র্যাপারগুলো — proxy.ts এও আটকানো,
        // এটা ভদ্রভাবে আগে বলে দেওয়া
        userAgent: [
          "AhrefsBot",
          "SemrushBot",
          "DotBot",
          "MJ12bot",
          "BLEXBot",
          "PetalBot",
          "DataForSeoBot",
        ],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
