import type { Metadata } from "next";
import { Suspense } from "react";
import DisplayFood from "../../components/Clients/AllFoodFilter/DisplayFood";

export const metadata: Metadata = {
  title: "Our menu",
  description:
    "Browse every dish on the menu — filter by category, price and rating, then order in a couple of taps.",
};

export default function FoodsPage() {
  // DisplayFood ভিতরে useSearchParams() ব্যবহার করে (ক্যাটাগরি/ফিল্টার URL থেকে পড়ে),
  // তাই Next.js এর নিয়ম অনুযায়ী এটাকে Suspense বাউন্ডারির ভিতরে রাখতে হয় —
  // নাহলে প্রোডাকশন বিল্ডে prerender এরর দেয়।
  return (
    <Suspense fallback={<FoodsSkeleton />}>
      <DisplayFood />
    </Suspense>
  );
}

/** আসল পেজের সাথে মিলিয়ে রাখা প্লেসহোল্ডার — হিরো + কার্ডের গ্রিড */
function FoodsSkeleton() {
  return (
    <div className="menu-page">
      <div className="menu-hero">
        <span className="menu-hero__aurora" aria-hidden="true" />
        <span className="menu-hero__mesh" aria-hidden="true" />
        <div className="menu-hero__inner">
          <div className="h-7 w-40 rounded-pill bg-white/10" />
          <div className="mt-5 h-12 w-3/4 max-w-md rounded-sm bg-white/10" />
          <div className="mt-4 h-4 w-2/3 max-w-sm rounded-xs bg-white/10" />
          <div className="mt-7 h-[54px] w-full max-w-[480px] rounded-pill bg-white/10" />
        </div>
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
