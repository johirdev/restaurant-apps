import type { Metadata } from "next";
import CartPageClient from "@/src/app/components/Clients/Cart/CartPageClient";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the dishes in your cart before checking out.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageClient />;
}
