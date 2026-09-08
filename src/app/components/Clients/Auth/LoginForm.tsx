"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { CheckCircle2, LogIn, Loader2, Phone, ShieldCheck } from "lucide-react";
import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import PasswordField from "./PasswordField";
import { useUser, type SiteUser } from "./UserProvider";

/* ==========================================================================
   লগইন — ফোন নম্বর + পাসওয়ার্ড
   --------------------------------------------------------------------------
   OTP কেবল অ্যাকাউন্ট খোলার সময় লাগে (দেখুন RegisterForm)। একবার
   অ্যাকাউন্ট হয়ে গেলে এখানে নম্বর আর পাসওয়ার্ড দিলেই হয়।
   ========================================================================== */

type LoginResult = {
  user: SiteUser;
  profile_complete: boolean;
  token: string;
};

const phoneValid = (phone: string) =>
  /^(?:\+?88)?01[3-9]\d{8}$/.test(phone.trim());

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isLoggedIn, loading } = useUser();

  // লগইনের পরে যেখানে ফেরত যাবে — ?next=/checkout এভাবে আসে
  const nextUrl = searchParams.get("next") || "/account";

  // পাসওয়ার্ড রিসেট করে এইমাত্র এখানে এসেছে কিনা (?reset=1)
  const justReset = searchParams.get("reset") === "1";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // আগে থেকেই লগইন থাকলে এই পেজে বসে থাকার মানে নেই
  useEffect(() => {
    if (!loading && isLoggedIn) router.replace(nextUrl);
  }, [loading, isLoggedIn, nextUrl, router]);

  const submit = useCallback(async () => {
    if (!phoneValid(phone)) {
      setError("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await apiPost<LoginResult>("/api/v1/users/login", {
        phone: phone.trim(),
        password,
      });
      const data = res.data;
      setUser(data.user);
      toast.success(res.message);

      // নাম/জেলা না থাকলে সোজা প্রোফাইলে — অর্ডারের সময় আর আটকাবে না
      router.replace(data.profile_complete ? nextUrl : "/account?complete=1");
      router.refresh();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }, [phone, password, setUser, router, nextUrl]);

  return (
    <div className="site-card mx-auto w-full max-w-[440px] overflow-hidden">
      {/* ---------- হেডার ---------- */}
      <div className="border-b border-border bg-brand-tint px-6 py-7 text-center sm:px-8">
        <span className="site-eyebrow">Welcome back</span>
        <h1 className="mt-1 font-display text-[26px] font-bold text-ink sm:text-[30px]">
          Log in
        </h1>
        <p className="mx-auto mt-2 max-w-[330px] text-[13.5px] leading-relaxed text-ink-soft">
          Use the mobile number and password you signed up with.
        </p>
      </div>

      {/* ---------- ফর্ম ---------- */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5 px-6 py-7 sm:px-8"
      >
        {/* রিসেটের পর এখানেই এসে পড়ে — নতুন পাসওয়ার্ডটা যে কাজ করছে,
            সেটা একবার লগইন করেই সে নিশ্চিত হয় */}
        {justReset && (
          <div className="flex items-center gap-2 rounded-sm bg-herb-soft px-4 py-2.5 text-[12.5px] font-semibold text-herb-dark">
            <CheckCircle2 size={15} />
            Password changed. Log in with your new one.
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="login-phone" className="text-[13px] font-bold text-ink">
            Mobile number
          </label>
          <div className="relative">
            <Phone
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="login-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              autoFocus
              placeholder="01712345678"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError("");
              }}
              className={`site-input h-12 pl-10 pr-4 text-[15px] font-semibold tracking-wide ${
                error ? "is-invalid" : ""
              }`}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <PasswordField
            label="Password"
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError("");
            }}
            autoComplete="current-password"
            disabled={busy}
          />

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-bold text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {error && (
          <p className="text-[12.5px] font-semibold text-chili">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !phone.trim() || !password}
          className="site-btn site-btn-primary h-12 w-full text-[15px]"
        >
          {busy ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Logging in…
            </>
          ) : (
            <>
              <LogIn size={17} /> Log in
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-ink-faint">
          <ShieldCheck size={13} /> Your number and password stay private.
        </p>
      </form>

      {/* ---------- ফুটার ---------- */}
      <div className="border-t border-border bg-canvas px-6 py-4 text-center text-[13px] text-ink-soft">
        New here?{" "}
        <Link
          href="/registration"
          className="font-bold text-brand hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
