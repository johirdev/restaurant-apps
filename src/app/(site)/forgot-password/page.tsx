import type { Metadata } from "next";
import ForgotPasswordForm from "@/src/app/components/Clients/Auth/ForgotPasswordForm";
import AuthPageShell from "@/src/app/components/Clients/Auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Forgot password",
  description:
    "Reset your password with a one-time code sent to your mobile number.",
  // পাসওয়ার্ড রিসেটের পাতা সার্চে থাকার কোনো দরকার নেই
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell>
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
