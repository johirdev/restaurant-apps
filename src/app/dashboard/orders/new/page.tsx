import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** ধাপ ১ — সবে আসা অর্ডার। ম্যানেজার কনফার্ম করলেই রান্নাঘরে চলে যায়। */
export default function NewOrdersPage() {
  return (
    <OrdersManager
      title="New orders"
      subtitle="Just came in. Confirm one and it goes straight to the kitchen."
      statuses={["pending"]}
    />
  );
}
