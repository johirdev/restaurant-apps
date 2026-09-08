import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterForm from "@/src/app/components/Clients/Auth/RegisterForm";
import AuthPageShell from "@/src/app/components/Clients/Auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Sign up with your mobile number and a password — we verify the number once with an SMS code.",
};

export default function RegistrationPage() {
  return (
    <AuthPageShell>
      {/* useSearchParams (?next=...) ক্লায়েন্টে পড়া হয়, তাই Suspense লাগে */}
      <Suspense fallback={<div className="h-[420px]" />}>
        <RegisterForm />
      </Suspense>
    </AuthPageShell>
  );
}
