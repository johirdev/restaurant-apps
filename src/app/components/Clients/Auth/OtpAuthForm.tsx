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
} from "lucide-react";
import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { useUser, type SiteUser } from "./UserProvider";

/* ==========================================================================
   ফোন + OTP লগইন
   --------------------------------------------------------------------------
   পাসওয়ার্ড নেই। নম্বর দাও → ৬ ডিজিটের কোড আসে → কোড মিললে ঢুকে গেলে।
   নম্বরটা নতুন হলে সার্ভার সেখানেই অ্যাকাউন্ট বানিয়ে দেয়, তাই "লগইন" আর
   "রেজিস্ট্রেশন" আসলে একই ফ্লো — শুধু লেখাগুলো আলাদা।
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

type VerifyResult = {
  user: SiteUser;
  is_new_user: boolean;
  profile_complete: boolean;
  token: string;
};

const CODE_LENGTH = 6;

const COPY = {
  login: {
    eyebrow: "Welcome back",
    title: "Log in",
    subtitle: "Enter your mobile number — we will text you a 6-digit code.",
    submit: "Send code",
    footerText: "New here?",
    footerLink: "Create an account",
    footerHref: "/registration",
  },
  register: {
    eyebrow: "Let us get you started",
    title: "Create your account",
    subtitle:
      "Just your mobile number. No password to remember — we verify you with a code.",
    submit: "Send code",
    footerText: "Already have an account?",
    footerLink: "Log in",
    footerHref: "/login",
  },
} as const;

/** 01712345678 → 017 1234 5678 (শুধু দেখানোর জন্য) */
const prettyPhone = (phone: string) =>
  phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");

export default function OtpAuthForm({
  mode = "login",
}: {
  mode?: "login" | "register";
}) {
  const copy = COPY[mode];
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, isLoggedIn, loading } = useUser();

  // লগইনের পরে যেখানে ফেরত যাবে — ?next=/checkout এভাবে আসে
  const nextUrl = searchParams.get("next") || "/account";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<SendResult | null>(null);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  /* ---------------- ধাপ ১ — কোড পাঠাও ---------------- */
  const sendCode = useCallback(
    async (isResend = false) => {
      if (!phoneValid) {
        setError("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
        return;
      }
      setBusy(true);
      setError("");
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
        setError(msg);
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    },
    [phone, phoneValid],
  );

  /* ---------------- ধাপ ২ — কোড মেলাও ---------------- */
  const verify = useCallback(
    async (value: string) => {
      if (value.length !== CODE_LENGTH) {
        setError(`The code is ${CODE_LENGTH} digits`);
        return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await apiPost<VerifyResult>("/api/v1/users/otp/verify", {
          phone: sent?.phone ?? phone.trim(),
          code: value,
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
        setCode(Array(CODE_LENGTH).fill(""));
        boxRefs.current[0]?.focus();
      } finally {
        setBusy(false);
      }
    },
    [sent, phone, setUser, router, nextUrl],
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

  const backToPhone = () => {
    setStep("phone");
    setSent(null);
    setError("");
    setCode(Array(CODE_LENGTH).fill(""));
  };

  return (
    <div className="site-card mx-auto w-full max-w-[440px] overflow-hidden">
      {/* ---------- হেডার ---------- */}
      <div className="border-b border-border bg-brand-tint px-6 py-7 text-center sm:px-8">
        <span className="site-eyebrow">{copy.eyebrow}</span>
        <h1 className="mt-1 font-display text-[26px] font-bold text-ink sm:text-[30px]">
          {step === "phone" ? copy.title : "Enter the code"}
        </h1>
        <p className="mx-auto mt-2 max-w-[330px] text-[13.5px] leading-relaxed text-ink-soft">
          {step === "phone" ? (
            copy.subtitle
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
        {/* ================= ধাপ ১ — ফোন নম্বর ================= */}
        {step === "phone" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label htmlFor="phone" className="text-[13px] font-bold text-ink">
                Mobile number
              </label>
              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="phone"
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
              {error ? (
                <p className="text-[12.5px] font-semibold text-chili">
                  {error}
                </p>
              ) : (
                <p className="text-[12px] text-ink-faint">
                  Bangladeshi numbers only. Standard SMS rates may apply.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy || !phoneValid}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Sending…
                </>
              ) : (
                copy.submit
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
                    error ? "is-invalid" : ""
                  }`}
                  style={{ height: "52px" }}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-[12.5px] font-semibold text-chili">
                {error}
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
                  <Loader2 size={17} className="animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Verify &amp; continue
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[12.5px]">
              <button
                type="button"
                onClick={backToPhone}
                className="inline-flex items-center gap-1.5 font-semibold text-ink-soft transition-colors hover:text-brand"
              >
                <ArrowLeft size={14} /> Change number
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
        {copy.footerText}{" "}
        <Link
          href={copy.footerHref}
          className="font-bold text-brand hover:underline"
        >
          {copy.footerLink}
        </Link>
      </div>
    </div>
  );
}
