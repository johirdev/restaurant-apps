import { connectDB } from "@/src/config/db";
import { FoodService } from "@/src/services/food.service";
import { CategoryService } from "@/src/services/category.service";
import type { FoodItem } from "../FoodItems/FoodCard";
import type { Category } from "../FoodCategory/FoodCategory";

/* ==========================================================================
   মেনুর ডেটা সার্ভারেই তুলে আনা — "data first"
   --------------------------------------------------------------------------
   আগে হোমপেজ আর মেনু পাতা দুটোই খালি HTML পাঠাত, তারপর ব্রাউজারে
   JavaScript চলার পর `/api/v1/foods` ডেকে খাবারগুলো আনত। তিনটে আলাদা
   ক্ষতি হতো:

     ১. **SEO** — গুগলের ক্রলার প্রথমে যে HTML টা পায়, সেখানে একটাও
        খাবারের নাম থাকত না। যে পাতাগুলো আসলে কাস্টমার আনে, সার্চ ইঞ্জিন
        সেগুলোকেই ফাঁকা দেখত। সোশ্যাল প্রিভিউ (ফেসবুক, হোয়াটসঅ্যাপ)
        তো JavaScript চালায়ই না — লিংক শেয়ার করলে কিছুই দেখা যেত না।

     ২. **গতি** — ব্রাউজারকে দুটো ধাপে অপেক্ষা করতে হতো: আগে HTML,
        তারপর API। দ্বিতীয় ধাপটা শুরুই হতো না যতক্ষণ না JavaScript
        ডাউনলোড হয়ে চলত। মোবাইল ইন্টারনেটে সেটাই সবচেয়ে বড় দেরি।

     ৩. **খরচ** — প্রতিটা ভিজিটে অন্তত একটা করে বাড়তি HTTP রিকোয়েস্ট।

   এখন সার্ভার নিজের সার্ভিস লেয়ার থেকে সরাসরি ডেটা নেয় (নিজের API তে
   HTTP রিকোয়েস্ট করে নয় — সেটা অর্থহীন রাউন্ড-ট্রিপ), আর প্রথম HTML
   এই খাবারগুলো নিয়েই যায়। ক্লায়েন্ট কম্পোনেন্ট সেই ডেটা দিয়েই শুরু
   করে, তাই সার্চ বা ফিল্টার না চাপা পর্যন্ত আর কোনো API কল লাগে না।

   ডাটাবেস নাগালে না থাকলে খালি তালিকা ফেরে — পাতাটা তখন ক্লায়েন্ট থেকে
   নিজেই চেষ্টা করে। একটা ৫০০ এরর দেখানোর চেয়ে সেটাই ভালো।
   ========================================================================== */

/**
 * সার্ভারের মঙ্গো ডকুমেন্ট ক্লায়েন্ট কম্পোনেন্টে সরাসরি পাঠানো যায় না —
 * ObjectId আর Date সাধারণ JSON নয়। এই ধাপটা সেগুলোকে স্ট্রিং বানায়,
 * ঠিক যেমনটা API দিয়ে এলে ক্লায়েন্ট পেত। তাই ক্লায়েন্ট কম্পোনেন্টের
 * টাইপগুলো দুই পথেই হুবহু মেলে।
 */
const plain = <T>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T;

/** হোমপেজ আর মেনু পাতা — প্রথম পর্দায় যতটা দেখা যায় ততটুকু */
export async function loadMenuFoods(limit = 12): Promise<FoodItem[]> {
  try {
    await connectDB();

    const result = await FoodService.getAllFoods(
      { status: "active" },
      { page: 1, limit, sortBy: "createdAt", sortOrder: "desc" },
    );

    return plain<FoodItem[]>(result.data);
  } catch (err) {
    console.error("[loadMenu] foods:", err);
    return [];
  }
}

/** ক্যাটাগরির চাকা — হোমপেজের উপরের সারি */
export async function loadActiveCategories(): Promise<Category[]> {
  try {
    await connectDB();
    return plain<Category[]>(await CategoryService.getActiveCategories());
  } catch (err) {
    console.error("[loadMenu] categories:", err);
    return [];
  }
}

/**
 * একটা নির্দিষ্ট ক্যাটাগরির খাবার — হোমপেজের ঠান্ডা পানীয়ের সারি।
 *
 * `/foods?category_id=…` পাতাটা যা দেখায়, এটাও ঠিক সেই ফিল্টারই ব্যবহার
 * করে — তাই দুই জায়গায় কখনো দুই রকম তালিকা আসে না। ডেটা সার্ভারেই তোলা
 * হয় বলে পানীয়গুলোর নাম আর দাম প্রথম HTML এই চলে যায়; স্লাইডারটা শুধু
 * সাজিয়ে দেখায়, আনার জন্য আর কোনো API কল করে না।
 */
export async function loadFoodsByCategory(
  categoryId: string,
  limit = 12,
): Promise<FoodItem[]> {
  if (!categoryId) return [];

  try {
    await connectDB();

    const result = await FoodService.getAllFoods(
      { status: "active", category_id: categoryId },
      { page: 1, limit, sortBy: "createdAt", sortOrder: "desc" },
    );

    return plain<FoodItem[]>(result.data);
  } catch (err) {
    console.error("[loadMenu] category foods:", err);
    return [];
  }
}
