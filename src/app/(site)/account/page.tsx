import { Suspense } from "react";
import type { Metadata } from "next";
import ProfileClient from "@/src/app/components/Clients/Account/ProfileClient";

export const metadata: Metadata = {
  title: "My profile",
  description: "Update your name, address and favourite dishes.",
};

export default function AccountProfilePage() {
  return (
    // ?complete=1 ক্লায়েন্টে পড়া হয়, তাই Suspense
    <Suspense fallback={<div className="skeleton h-[520px] rounded-md" />}>
      <ProfileClient />
    </Suspense>
  );
}
