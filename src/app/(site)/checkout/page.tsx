import type { Metadata } from "next";
import CheckoutClient from "@/src/app/components/Clients/Checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your order and get it delivered hot to your door.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
