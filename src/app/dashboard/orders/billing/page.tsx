import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/**
 * ধাপ ৪ — খাওয়া শেষ / ডেলিভারি হয়ে গেছে, এখন টাকা নেওয়া বাকি।
 * শুধু বকেয়া বিলগুলোই এখানে — টাকা নিলে তালিকা থেকে চলে যায়।
 */
export default function BillingPage() {
  return (
    <OrdersManager
      title="Billing"
      subtitle="Served or delivered, payment still due. Take the money, then mark it paid."
      statuses={["served", "out_for_delivery", "delivered"]}
      paymentStatus="unpaid"
    />
  );
}
