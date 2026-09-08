"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { PASSWORD_MIN, PASSWORD_MAX } from "@/src/validations/user.schema";
import PasswordField from "./PasswordField";
import { useUser, type SiteUser } from "./UserProvider";

/* ==========================================================================
   অ্যাকাউন্ট খোলা — নম্বর + পাসওয়ার্ড, তারপর একবার OTP
   --------------------------------------------------------------------------
   ধাপ ১: নাম (ঐচ্ছিক), নম্বর আর পাসওয়ার্ড নিয়ে নম্বরে কোড পাঠানো হয়।
   ধাপ ২: কোড মিললে সার্ভার অ্যাকাউন্টটা বানিয়ে পাসওয়ার্ডটা বসিয়ে দেয়।

   পাসওয়ার্ডটা ধাপ ১ এই নেওয়া হয় ইচ্ছে করেই — SMS হাতে আসার পর কাস্টমার
   শুধু ৬টা ডিজিট বসায়, নতুন করে ফর্ম ভরতে হয় না। যাচাই হয়ে গেলে পরের
   বার থেকে শুধু নম্বর + পাসওয়ার্ডেই লগইন, OTP আর কখনো লাগে না।
   ========================================================================== */

type SendResult = {
  phone: string;
  is_new_user: boolean;
  expires_in: number;
  resend_after: number;
  attempts_left: number;
  /** SMS বন্ধ থাকা লোকাল ডেভেই কেবল আসে */
  dev_otp?: string;
};

type RegisterResult = {
  user: SiteUser;
  is_new_user: boolean;
  profile_complete: boolean;
  token: string;
};

const CODE_LENGTH = 6;

/** 01712345678 → 017 1234 5678 (শুধু দেখানোর জন্য) */
const prettyPhone = (phone: string) =>
  phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");

type FieldErrors = {
  name?: string;
  phone?: string;
  password?: string;
  confirm?: string;
};

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isLoggedIn, loading } = useUser();

  // সাইনআপের পরে যেখানে ফেরত যাবে — ?next=/checkout এভাবে আসে
  const nextUrl = searchParams.get("next") || "/account";

  const [step, setStep] = useState<"details" | "code">("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [sent, setSent] = useState<SendResult | null>(null);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));

  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  // আগে থেকেই লগইন থাকলে এই পেজে বসে থাকার মানে নেই
  useEffect(() => {
    if (!loading && isLoggedIn) router.replace(nextUrl);
  }, [loading, isLoggedIn, nextUrl, router]);

  /* ---- দুটো কাউন্টডাউন: আবার কোড চাওয়ার বিরতি, আর কোডের মেয়াদ ---- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (expiresIn <= 0) return;
    const t = setTimeout(() => setExpiresIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [expiresIn]);

  const codeValue = code.join("");
  const phoneValid = /^(?:\+?88)?01[3-9]\d{8}$/.test(phone.trim());

  const mmss = useMemo(() => {
    const m = Math.floor(expiresIn / 60);
    const s = expiresIn % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [expiresIn]);

  const detailsReady =
    phoneValid && password.length >= PASSWORD_MIN && confirm === password;

  /* ---------------- ধাপ ১ — যাচাই করে কোড পাঠাও ----------------
     সার্ভারও ঠিক এই নিয়মগুলোই আবার দেখে; এখানে দেখাটা শুধু SMS
     পাঠানোর আগেই ভুলটা ধরিয়ে দেওয়ার জন্য */
  const sendCode = useCallback(
    async (isResend = false) => {
      const found: FieldErrors = {};

      const trimmedName = name.trim();
      if (trimmedName && trimmedName.length < 3) {
        found.name = "Name must be at least 3 characters";
      }
      if (!phoneValid) {
        found.phone = "Enter a valid Bangladeshi mobile number (e.g. 01712345678)";
      }
      if (password.length < PASSWORD_MIN) {
        found.password = `Password must be at least ${PASSWORD_MIN} characters long`;
      } else if (password.length > PASSWORD_MAX) {
        found.password = "Password is too long";
      }
      if (confirm !== password) {
        found.confirm = "Both passwords must match";
      }

      setErrors(found);
      setFormError("");
      if (Object.keys(found).length) return;

      setBusy(true);
      try {
        const res = await apiPost<SendResult>("/api/v1/users/otp/send", {
          phone: phone.trim(),
        });
        const data = res.data;
        setSent(data);
        setStep("code");
        setCode(Array(CODE_LENGTH).fill(""));
        setCooldown(data.resend_after ?? 60);
        setExpiresIn(data.expires_in ?? 300);
        toast.success(isResend ? "New code sent" : res.message);
        // কোডের ঘরে ফোকাস — মোবাইলে কীবোর্ড সাথে সাথে খুলে যায়
        setTimeout(() => boxRefs.current[0]?.focus(), 60);
      } catch (err) {
        const msg = getApiErrorMessage(err);
        // নম্বরে আগেই অ্যাকাউন্ট থাকলে সার্ভার এখানেই থামায় — ফোনের ঘরেই
        // মেসেজটা দেখাই, তাহলে লগইন লিংকটা চোখের সামনেই থাকে
        setErrors(
          msg.toLowerCase().includes("already has an account")
            ? { phone: msg }
            : {},
        );
        setFormError(msg);
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    },
    [name, phone, phoneValid, password, confirm],
  );

  /* ---------------- ধাপ ২ — কোড মেলাও, অ্যাকাউন্ট তৈরি ---------------- */
  const verify = useCallback(
    async (value: string) => {
      if (value.length !== CODE_LENGTH) {
        setFormError(`The code is ${CODE_LENGTH} digits`);
        return;
      }
      setBusy(true);
      setFormError("");
      try {
        const res = await apiPost<RegisterResult>("/api/v1/users/register", {
          phone: sent?.phone ?? phone.trim(),
          code: value,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        });
        const data = res.data;
        setUser(data.user);
        toast.success(res.message);

        // নাম/জেলা না থাকলে সোজা প্রোফাইলে — অর্ডারের সময় আর আটকাবে না
        router.replace(data.profile_complete ? nextUrl : "/account?complete=1");
        router.refresh();
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setFormError(msg);
        toast.error(msg);
        setCode(Array(CODE_LENGTH).fill(""));
        boxRefs.current[0]?.focus();
      } finally {
        setBusy(false);
      }
    },
    [sent, phone, password, name, setUser, router, nextUrl],
  );

  /* ---------------- OTP বক্সগুলোর আচরণ ---------------- */
  const writeBox = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // একটা ঘরে অনেকগুলো ডিজিট এলে (পেস্ট / SMS অটোফিল) পরপর ঘরে ছড়িয়ে দিই
    const next = [...code];
    for (let i = 0; i < digits.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = digits[i];
    }
    setCode(next);

    const filled = next.join("");
    if (filled.length === CODE_LENGTH) {
      verify(filled);
      return;
    }

    const jumpTo = Math.min(index + digits.length, CODE_LENGTH - 1);
    boxRefs.current[jumpTo]?.focus();
  };

  const onBoxKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...code];
      // ঘর খালি থাকলে আগের ঘরটা মুছি — টাইপো ঠিক করা সহজ হয়
      if (next[index]) {
        next[index] = "";
      } else if (index > 0) {
        next[index - 1] = "";
        boxRefs.current[index - 1]?.focus();
      }
      setCode(next);
    } else if (e.key === "ArrowLeft" && index > 0) {
      boxRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      boxRefs.current[index + 1]?.focus();
    }
  };

  const backToDetails = () => {
    setStep("details");
    setSent(null);
    setFormError("");
    setCode(Array(CODE_LENGTH).fill(""));
  };

  return (
    <div className="site-card mx-auto w-full max-w-[440px] overflow-hidden">
      {/* ---------- হেডার ---------- */}
      <div className="border-b border-border bg-brand-tint px-6 py-7 text-center sm:px-8">
        <span className="site-eyebrow">Let us get you started</span>
        <h1 className="mt-1 font-display text-[26px] font-bold text-ink sm:text-[30px]">
          {step === "details" ? "Create your account" : "Verify your number"}
        </h1>
        <p className="mx-auto mt-2 max-w-[330px] text-[13.5px] leading-relaxed text-ink-soft">
          {step === "details" ? (
            "Pick a password now — after this one-time check you will log in with just your number and password."
          ) : (
            <>
              We sent a {CODE_LENGTH}-digit code to{" "}
              <span className="font-bold text-ink">
                {prettyPhone(sent?.phone ?? phone)}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="px-6 py-7 sm:px-8">
        {/* ================= ধাপ ১ — নম্বর ও পাসওয়ার্ড ================= */}
        {step === "details" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="register-name"
                className="flex items-baseline justify-between gap-2 text-[13px] font-bold text-ink"
              >
                Your name
                <span className="text-[11.5px] font-medium text-ink-faint">
                  Optional
                </span>
              </label>
              <div className="relative">
                <User
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="name"
                  maxLength={60}
                  placeholder="e.g. Rahim Uddin"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors((p) => ({ ...p, name: "" }));
                  }}
                  className={`site-input h-12 pl-10 pr-4 text-[15px] ${
                    errors.name ? "is-invalid" : ""
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-[12.5px] font-semibold text-chili">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="register-phone"
                className="text-[13px] font-bold text-ink"
              >
                Mobile number
              </label>
              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="register-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  placeholder="01712345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErrors((p) => ({ ...p, phone: "" }));
                    setFormError("");
                  }}
                  className={`site-input h-12 pl-10 pr-4 text-[15px] font-semibold tracking-wide ${
                    errors.phone ? "is-invalid" : ""
                  }`}
                />
              </div>
              {errors.phone ? (
                <p className="text-[12.5px] font-semibold text-chili">
                  {errors.phone}
                </p>
              ) : (
                <p className="text-[12px] text-ink-faint">
                  Bangladeshi numbers only. We will text a code to this number.
                </p>
              )}
            </div>

            <PasswordField
              label="Password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                setErrors((p) => ({ ...p, password: "", confirm: "" }));
              }}
              autoComplete="new-password"
              disabled={busy}
              error={errors.password}
              hint={`At least ${PASSWORD_MIN} characters`}
            />

            <PasswordField
              label="Confirm password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                setErrors((p) => ({ ...p, confirm: "" }));
              }}
              autoComplete="new-password"
              disabled={busy}
              error={errors.confirm}
            />

            {formError && !errors.phone && (
              <p className="text-[12.5px] font-semibold text-chili">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !detailsReady}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Send verification code
                </>
              )}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[12px] text-ink-faint">
              <Lock size={13} /> We never share your number.
            </p>
          </form>
        )}

        {/* ================= ধাপ ২ — কোড ================= */}
        {step === "code" && (
          <div className="space-y-5">
            {/* লোকাল ডেভে SMS বন্ধ থাকলে কোডটা এখানেই দেখা যায় */}
            {sent?.dev_otp && (
              <div className="rounded-sm border border-dashed border-saffron-dark bg-saffron-soft px-4 py-2.5 text-center text-[13px] font-bold text-saffron-dark">
                Dev mode — your code is {sent.dev_otp}
              </div>
            )}

            <div
              className="flex justify-center gap-2 sm:gap-2.5"
              onPaste={(e) => {
                e.preventDefault();
                writeBox(0, e.clipboardData.getData("text"));
              }}
            >
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    boxRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? "one-time-code" : "off"}
                  maxLength={CODE_LENGTH}
                  value={digit}
                  disabled={busy}
                  onChange={(e) => writeBox(i, e.target.value)}
                  onKeyDown={(e) => onBoxKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  className={`site-input w-11 text-center text-[20px] font-extrabold sm:w-12 ${
                    formError ? "is-invalid" : ""
                  }`}
                  style={{ height: "52px" }}
                />
              ))}
            </div>

            {formError && (
              <p className="text-center text-[12.5px] font-semibold text-chili">
                {formError}
              </p>
            )}

            <button
              type="button"
              onClick={() => verify(codeValue)}
              disabled={busy || codeValue.length !== CODE_LENGTH}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Creating your
                  account…
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Verify &amp; create account
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[12.5px]">
              <button
                type="button"
                onClick={backToDetails}
                className="inline-flex items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-brand"
              >
                <ArrowLeft size={14} /> Change details
              </button>

              <button
                type="button"
                onClick={() => sendCode(true)}
                disabled={busy || cooldown > 0}
                className="inline-flex items-center gap-1.5 font-bold text-brand transition-opacity disabled:opacity-45"
              >
                <RefreshCw size={14} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>

            <p className="text-center text-[12px] text-ink-faint">
              {expiresIn > 0
                ? `This code expires in ${mmss}`
                : "This code has expired — please ask for a new one."}
            </p>
          </div>
        )}
      </div>

      {/* ---------- ফুটার ---------- */}
      <div className="border-t border-border bg-canvas px-6 py-4 text-center text-[13px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Log in
        </Link>
      </div>
    </div>
  );
}
