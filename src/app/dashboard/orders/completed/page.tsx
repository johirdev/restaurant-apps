import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** শেষ — টাকা মেটানো হয়ে গেছে। পুরোনো বিল খুঁজে বের করার জায়গা। */
export default function CompletedOrdersPage() {
  return (
    <OrdersManager
      title="Completed"
      subtitle="Paid and done. Open any of them to view or reprint the bill."
      statuses={["delivered"]}
      paymentStatus="paid"
    />
  );
}
