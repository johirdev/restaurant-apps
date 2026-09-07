import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** রাইডারের হাতে থাকা ডেলিভারি অর্ডার */
export default function DeliveryOrdersPage() {
  return (
    <OrdersManager
      title="Delivery orders"
      orderType="delivery"
      statuses={["ready", "out_for_delivery", "delivered"]}
    />
  );
}
