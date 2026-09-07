import { Suspense } from "react";
import type { Metadata } from "next";
import OtpAuthForm from "@/src/app/components/Clients/Auth/OtpAuthForm";
import AuthPageShell from "@/src/app/components/Clients/Auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in with your mobile number to track orders, save addresses and review the dishes you have tried.",
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      {/* useSearchParams (?next=...) ক্লায়েন্টে পড়া হয়, তাই Suspense লাগে */}
      <Suspense fallback={<div className="h-[420px]" />}>
        <OtpAuthForm mode="login" />
      </Suspense>
    </AuthPageShell>
  );
}
