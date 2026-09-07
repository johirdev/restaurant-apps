import type { Metadata } from "next";
import MyOrders from "@/src/app/components/Clients/Account/MyOrders";

export const metadata: Metadata = {
  title: "My orders",
  description: "Every order you have placed, with live status and tracking.",
};

export default function AccountOrdersPage() {
  return <MyOrders />;
}
