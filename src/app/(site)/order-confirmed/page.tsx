import type { Metadata } from "next";
import { Suspense } from "react";
import OrderTracker from "@/src/app/components/Clients/Order/OrderTracker";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Follow your order from the kitchen to your door.",
  robots: { index: false, follow: false },
};

export default function OrderConfirmedPage() {
  // useSearchParams ব্যবহার করে এমন কম্পোনেন্ট Suspense এর ভিতরে থাকতে হয়
  return (
    <Suspense
      fallback={
        <div className="max-width px-4 py-20">
          <div className="skeleton mx-auto h-72 max-w-3xl rounded-md" />
        </div>
      }
    >
      <OrderTracker />
    </Suspense>
  );
}
