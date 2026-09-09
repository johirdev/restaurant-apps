import { Suspense } from "react";
import HeroBanner from "../components/Clients/Banner/HeroBanner";
import FoodCategory from "../components/Clients/FoodCategory/FoodCategory";
import ShowFoodItems from "../components/Clients/FoodItems/ShowFoodItems";
import CoolDrinks, { CoolDrinksSkeleton } from "../components/Clients/CoolDrinks/CoolDrinks";
import VideoBlog from "../components/Clients/VideoBlog/VideoBlog";
import StatsSection from "../components/Clients/StatsSection/StatsSection";
import {
  loadMenuFoods,
  loadActiveCategories,
  loadFoodsByCategory,
} from "../components/Clients/Shared/loadMenu";
import { DRINKS_CATEGORY_ID, DRINKS_LIMIT } from "@/src/config/site";
import { loadRestaurant } from "../components/Clients/Shared/loadRestaurant";
import { restaurantJsonLd } from "../components/Clients/Shared/restaurantJsonLd";

/**
 * প্রতি ৫ মিনিটে পাতাটা নতুন করে তৈরি হয় (ISR)।
 *
 * প্রতিটা ভিজিটে ডাটাবেসে যাওয়া অপ্রয়োজনীয় খরচ — মেনু দিনে দু-চারবারের
 * বেশি বদলায় না, অথচ হোমপেজেই সবচেয়ে বেশি ভিজিট। আবার একদম স্ট্যাটিক
 * করলে দাম বদলানোর পর নতুন ডিপ্লয় না করা পর্যন্ত পুরোনো দামই দেখাত।
 * পাঁচ মিনিট দুদিকেই ভারসাম্য রাখে — ভিজিটর CDN থেকে সাথে সাথে HTML
 * পায়, আর ম্যানেজারের বদলটা পাঁচ মিনিটের মধ্যেই সবার চোখে পড়ে।
 */
export const revalidate = 300;

async function DrinksSection() {
  const drinks = await loadFoodsByCategory(DRINKS_CATEGORY_ID, DRINKS_LIMIT);
  return <CoolDrinks drinks={drinks} />;
}

/**
 * হোমপেজ — খাবারই মূল কথা।
 *
 * উপরে হিরো ব্যানার আর নিচের দিকে ভিডিও ব্লগ — দুটোই ড্যাশবোর্ডের
 * "Website" মেনু থেকে আসে। কোনোটার কনটেন্ট না থাকলে সেই সেকশনটা
 * নিজে থেকেই লুকিয়ে থাকে, পেজ ফাঁকা দেখায় না।
 *
 * পাতাটা এখন সার্ভার কম্পোনেন্ট: ক্যাটাগরি আর খাবারের প্রথম তালিকাটা
 * এখানেই তোলা হয় আর প্রথম HTML এর ভেতরেই যায়। আগে পুরোটা ব্রাউজারে
 * হতো, ফলে গুগলের ক্রলার আর ফেসবুকের প্রিভিউ একটা কার্যত ফাঁকা পাতা
 * দেখত — যে পাতাটাই আসলে কাস্টমার আনার কথা।
 */
export default async function Home() {
  // কোয়েরিগুলো পাশাপাশি — একটার জন্য আরেকটা অপেক্ষা করে না
  const [foods, categories, settings] = await Promise.all([
    loadMenuFoods(12),
    loadActiveCategories(),
    loadRestaurant(),
  ]);

  return (
    <div>
      {/*
        দোকানের পরিচয় গুগলের জন্য — ঠিকানা, ফোন, খোলার সময়। এটা থাকায়
        সার্চ ফলাফলে আর ম্যাপে দোকানটা নিজের নামে চেনা যায়।
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd(settings, "/about")),
        }}
      />

      <HeroBanner />
      <FoodCategory initialCategories={categories} />
      <ShowFoodItems initialFoods={foods} />
      {/* পানীয় আলাদা করে stream হয়, তাই fetch চলাকালে card skeleton দেখা যায় */}
      <Suspense fallback={<CoolDrinksSkeleton />}>
        <DrinksSection />
      </Suspense>
      <StatsSection />
      <VideoBlog />
    </div>
  );
}
