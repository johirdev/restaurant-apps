import type { Metadata } from "next";
import { Suspense } from "react";
import DisplayFood from "../../components/Clients/AllFoodFilter/DisplayFood";
import {
  loadMenuFoods,
  loadActiveCategories,
} from "../../components/Clients/Shared/loadMenu";

export const metadata: Metadata = {
  title: "Our menu",
  description:
    "Browse every dish on the menu — filter by category, price and rating, then order in a couple of taps.",
  alternates: { canonical: "/foods" },
};

/**
 * মেনুর ডেটা প্রতি ৫ মিনিটে নতুন করে তৈরি হয়।
 *
 * পুরোপুরি ডাইনামিক করলে প্রতিটা ভিজিটে ডাটাবেসে যেত — বছরে লক্ষ
 * ভিজিট হলে সেটাই সবচেয়ে বড় খরচ, অথচ মেনু দিনে দু-চারবারের বেশি
 * বদলায় না। আবার পুরোপুরি স্ট্যাটিক করলে দাম বদলানোর পর নতুন ডিপ্লয়
 * না করা পর্যন্ত পুরোনো দামই দেখাত।
 *
 * ৫ মিনিটে একবার — ভিজিটর CDN থেকে সাথে সাথেই HTML পায়, আর ম্যানেজার
 * দাম বদলানোর পাঁচ মিনিটের মধ্যেই সেটা সবার চোখে পড়ে।
 */
export const revalidate = 300;

export default async function FoodsPage() {
  // দুটো কোয়েরি পাশাপাশি — একটার জন্য আরেকটা অপেক্ষা করে না
  const [foods, categories] = await Promise.all([
    loadMenuFoods(20),
    loadActiveCategories(),
  ]);

  // DisplayFood ভিতরে useSearchParams() ব্যবহার করে (ক্যাটাগরি/ফিল্টার URL থেকে পড়ে),
  // তাই Next.js এর নিয়ম অনুযায়ী এটাকে Suspense বাউন্ডারির ভিতরে রাখতে হয় —
  // নাহলে প্রোডাকশন বিল্ডে prerender এরর দেয়।
  return (
    <Suspense fallback={<FoodsSkeleton />}>
      <DisplayFood
        initialFoods={foods}
        initialTotal={foods.length}
        initialCategories={categories}
      />
    </Suspense>
  );
}

/**
 * আসল পেজের সাথে মিলিয়ে রাখা প্লেসহোল্ডার — ক্যাটাগরি চিপ + কার্ডের গ্রিড।
 * DisplayFood এ কোনো হিরো নেই, তাই এখানেও রাখা হয়নি — নাহলে লোডিংয়ের সময়
 * এক ঝলক বড় হিরো দেখা যেত, তারপর সেটা উধাও হয়ে লেআউট লাফ দিত।
 */
function FoodsSkeleton() {
  return (
    <div className="menu-page">
      <div className="menu-cats no-scrollbar">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[42px] w-[116px] rounded-pill" />
        ))}
      </div>

      <div className="menu-layout">
        <div className="menu-main">
          <div className="menu-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="menu-skel">
                <div className="menu-skel__img skeleton" />
                <div className="menu-skel__body">
                  <div className="menu-skel__line skeleton w-1/3" />
                  <div className="menu-skel__line skeleton w-4/5" />
                  <div className="menu-skel__line skeleton w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
