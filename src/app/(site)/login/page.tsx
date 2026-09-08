import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "@/src/app/components/Clients/Auth/LoginForm";
import AuthPageShell from "@/src/app/components/Clients/Auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in with your mobile number and password to track orders, save addresses and review the dishes you have tried.",
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      {/* useSearchParams (?next=...) ক্লায়েন্টে পড়া হয়, তাই Suspense লাগে */}
      <Suspense fallback={<div className="h-[420px]" />}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
