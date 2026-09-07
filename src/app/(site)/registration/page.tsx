import { Suspense } from "react";
import type { Metadata } from "next";
import OtpAuthForm from "@/src/app/components/Clients/Auth/OtpAuthForm";
import AuthPageShell from "@/src/app/components/Clients/Auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create an account with just your mobile number — no password needed.",
};

export default function RegistrationPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<div className="h-[420px]" />}>
        <OtpAuthForm mode="register" />
      </Suspense>
    </AuthPageShell>
  );
}
