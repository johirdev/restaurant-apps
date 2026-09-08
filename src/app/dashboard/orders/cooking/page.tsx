import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** ধাপ ২ — কনফার্ম হয়ে রান্নাঘরে আছে। */
export default function CookingOrdersPage() {
  return (
    <OrdersManager
      title="Cooking"
      subtitle="Confirmed and in the kitchen. The chef marks each dish done."
      statuses={["confirmed", "preparing"]}
    />
  );
}
