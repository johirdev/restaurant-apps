import type { Metadata } from "next";
import { Suspense } from "react";
import OrderTracker from "@/src/app/components/Clients/Order/OrderTracker";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Enter your order number and mobile number to see exactly where your food is.",
};

export default function TrackOrderPage() {
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
