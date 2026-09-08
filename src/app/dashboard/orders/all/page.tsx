import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/**
 * সব অর্ডার এক জায়গায় — পুরোনো বিল খোঁজার জন্য।
 * অর্ডার নম্বর, নাম, ফোন বা টেবিল দিয়ে সার্চ করা যায়।
 */
export default function AllOrdersPage() {
  return (
    <OrdersManager
      title="All orders"
      subtitle="Every order ever taken. Search by order number, phone, name or table."
    />
  );
}
