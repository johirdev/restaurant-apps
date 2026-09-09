import type { MetadataRoute } from "next";
import { connectDB } from "@/src/config/db";
import FoodModel from "@/src/models/food.model";
import CategoryModel from "@/src/models/category.models";
import { SITE_URL } from "@/src/config/site";

/* ==========================================================================
   sitemap.xml — গুগলকে সাইটের মানচিত্র দেওয়া
   --------------------------------------------------------------------------
   এতদিন কোনো সাইটম্যাপ ছিল না, তাই গুগলকে লিংক ধরে ধরে নিজে খুঁজে
   বেড়াতে হতো। খাবারের পাতাগুলো (`/foods/<id>`) সবচেয়ে বেশি ক্ষতিগ্রস্ত
   হতো — ওগুলোতে পৌঁছাতে হলে আগে মেনু পাতার JavaScript চালাতে হতো,
   আর ক্রলার সবসময় সেটা করে না। ফলে যে পাতাগুলো আসলে কাস্টমার আনে,
   সেগুলোই সার্চে সবচেয়ে দেরিতে উঠত।

   `lastModified` আসল আপডেটের সময় — খাবারের দাম বদলালে গুগল সেটা
   দেখে আবার এসে পাতাটা তাজা করে নেয়।

   ডাটাবেস নাগালে না থাকলে অন্তত স্থির পাতাগুলোর তালিকা যায় — একটা
   ৫০০ এরর দিলে গুগল সাইটম্যাপটাকেই ভাঙা ধরে নিত।
   ========================================================================== */

export const revalidate = 3600; // ঘণ্টায় একবার নতুন করে বানানো যথেষ্ট

/** যে পাতাগুলো সবসময় থাকে */
const staticRoutes: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/foods`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
  { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${SITE_URL}/refund`, changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    await connectDB();

    const [foods, categories] = await Promise.all([
      FoodModel.find({ status: "active" })
        .select("_id updatedAt")
        .sort({ updatedAt: -1 })
        // গুগল এক ফাইলে ৫০,০০০ URL পর্যন্ত নেয়; মেনু কখনো এত বড় হবে না,
        // তবু সীমাটা থাকা ভালো — ভুলবশত কিছু হলে সাইটম্যাপ ভাঙে না
        .limit(5000)
        .lean(),

      CategoryModel.find({ status: "active" })
        .select("slug updatedAt")
        .limit(500)
        .lean(),
    ]);

    const foodRoutes: MetadataRoute.Sitemap = foods.map((food) => ({
      url: `${SITE_URL}/foods/${String(food._id)}`,
      lastModified: food.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // ক্যাটাগরি পাতা আলাদা নেই — মেনু পাতায় ফিল্টার হিসেবে খোলে
    const categoryRoutes: MetadataRoute.Sitemap = categories
      .filter((c) => c.slug)
      .map((category) => ({
        url: `${SITE_URL}/foods?category=${encodeURIComponent(category.slug!)}`,
        lastModified: category.updatedAt ?? new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    return [...staticRoutes, ...categoryRoutes, ...foodRoutes];
  } catch (err) {
    console.error("[sitemap] falling back to static routes:", err);
    return staticRoutes;
  }
}
