import { connectDB } from "@/src/config/db";
import { SettingsService } from "@/src/services/settings.service";
import {
  DEFAULT_SETTINGS,
  type IRestaurantSettings,
} from "@/src/interfaces/settings.interface";

/* ==========================================================================
   দোকানের সেটিংস সার্ভারে তুলে আনা
   --------------------------------------------------------------------------
   /about আর /contact দুটোই সার্ভার কম্পোনেন্ট, তাই সেটিংসটা সরাসরি
   সার্ভিস লেয়ার থেকে নেওয়া হয় — নিজের API তে HTTP রিকোয়েস্ট করে নয়।
   লাভ দুটো: একটা রাউন্ড-ট্রিপ কম, আর গুগল প্রথম HTML এই দোকানের নাম,
   ঠিকানা আর গল্পটা পেয়ে যায়। (আইনি পাতাগুলোও ঠিক এই নিয়মেই চলে।)

   API রুট নিজে `catchAsync` এর ভেতরে DB ধরে নেয়; এখানে সেই মোড়ক নেই,
   তাই connectDB() নিজেদেরই ডাকতে হয়।
   ========================================================================== */

/**
 * ডাটাবেস নাগালে না থাকলেও পাতাটা যেন ভেঙে না পড়ে — তখন ডিফল্ট
 * সেটিংসেই পাতা রেন্ডার হয়। About/Contact পড়ার জন্য, অর্ডার নেওয়ার
 * জন্য নয়; একটা ৫০০ দেখানোর চেয়ে সাধারণ লেখাটুকু দেখানোই ভালো।
 */
export async function loadRestaurant(): Promise<IRestaurantSettings> {
  try {
    await connectDB();
    // সার্ভিসে ৩০ সেকেন্ডের ছোট ক্যাশ আছে — প্রতি ভিজিটে DB ডাকা হয় না
    return await SettingsService.get();
  } catch {
    return DEFAULT_SETTINGS;
  }
}
