import OrdersManager from "@/src/app/components/DashBoard/Orders/OrdersManager";

/**
 * সব চালু অর্ডার — এখান থেকেই ম্যানেজার কনফার্ম করে (তখনই রান্নাঘরে যায়),
 * আর রান্না শেষ হলে টেবিলে/রাইডারের কাছে পাঠায়।
 */
export default function LiveOrdersPage() {
  return (
    <OrdersManager
      title="Live orders"
      subtitle="Everything still moving — confirm, send to the kitchen, then out to the table or rider."
      statuses={[
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "out_for_delivery",
      ]}
    />
  );
}
