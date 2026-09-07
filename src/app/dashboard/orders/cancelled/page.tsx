import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** বাতিল হওয়া অর্ডার */
export default function CancelledOrdersPage() {
  return (
    <OrdersManager
      title="Cancelled orders"
      subtitle="Orders that were cancelled before delivery."
      statuses={["cancelled"]}
    />
  );
}
