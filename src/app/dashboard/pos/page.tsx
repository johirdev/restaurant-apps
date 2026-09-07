import { Suspense } from "react";
import PosScreen from "@/src/app/components/DashBoard/Pos/PosScreen";

/** ?table= / ?order= ক্লায়েন্টে পড়া হয়, তাই Suspense দরকার */
export default function PosPage() {
  return (
    <Suspense fallback={<div className="admin-skeleton h-screen rounded-xl" />}>
      <PosScreen />
    </Suspense>
  );
}
