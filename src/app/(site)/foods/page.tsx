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

function FoodsSkeleton() {
  return (
    <div className="max-width px-4 py-12 sm:px-6">
      <div className="skeleton mb-6 h-10 w-64 rounded-sm" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="flex flex-col gap-2 p-3.5">
              <div className="skeleton h-4 w-3/4 rounded-xs" />
              <div className="skeleton h-3 w-1/2 rounded-xs" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
