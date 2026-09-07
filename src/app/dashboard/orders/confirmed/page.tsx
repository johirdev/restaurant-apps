import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** কনফার্ম হয়ে রান্না/সরবরাহের পথে থাকা এবং সম্পন্ন অর্ডার */
export default function ConfirmedOrdersPage() {
  return (
    <OrdersManager
      title="Confirmed orders"
      statuses={["confirmed", "preparing", "ready", "served", "delivered"]}
    />
  );
}
