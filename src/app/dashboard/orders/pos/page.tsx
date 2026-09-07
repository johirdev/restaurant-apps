import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/**
 * কাউন্টারে বসে নেওয়া (dine-in) অর্ডারের তালিকা।
 * নতুন অর্ডার তুলতে হলে POS স্ক্রিন: /dashboard/pos
 */
export default function PosOrdersPage() {
  return (
    <OrdersManager
      title="Counter orders"
      subtitle="Dine-in orders taken at the counter. Use POS / New order to add one."
      orderType="dine_in"
    />
  );
}
