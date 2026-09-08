import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/** ধাপ ৩ — রান্না শেষ, এখন টেবিলে বা রাইডারের হাতে যাবে। */
export default function ReadyOrdersPage() {
  return (
    <OrdersManager
      title="Ready to serve"
      subtitle="Food is cooked. Send it to the table, or hand it to the rider."
      statuses={["ready"]}
    />
  );
}
