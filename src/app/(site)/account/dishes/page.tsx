import type { Metadata } from "next";
import MyDishes from "@/src/app/components/Clients/Account/MyDishes";

export const metadata: Metadata = {
  title: "Dishes I ordered",
  description: "The dishes you have tried — reorder them or leave a review.",
};

export default function AccountDishesPage() {
  return <MyDishes />;
}
