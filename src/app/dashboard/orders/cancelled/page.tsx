import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** বাতিল হওয়া অর্ডার */
export default function CancelledOrdersPage() {
  return (
    <OrdersManager
      title="Cancelled"
      subtitle="Orders that were cancelled, with the reason recorded."
      statuses={["cancelled"]}
    />
  );
}
