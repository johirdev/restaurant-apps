"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { PASSWORD_MIN, PASSWORD_MAX } from "@/src/validations/user.schema";
import PasswordField from "./PasswordField";
import { useUser } from "./UserProvider";

/* ==========================================================================
   পাসওয়ার্ড ভুলে গেছি — নম্বর → কোড → নতুন পাসওয়ার্ড
   --------------------------------------------------------------------------
   তিনটে ধাপ, একটাই পাতা:

     ধাপ ১  নম্বর দাও          → POST /users/password/forgot
     ধাপ ২  SMS এর ৬ ডিজিট     → POST /users/password/verify
     ধাপ ৩  নতুন পাসওয়ার্ড     → POST /users/password/reset (টিকিট সহ)

   ৬ ডিজিটের কোডটা ধাপ ২ তেই সার্ভারে যায় আর ওখানেই পুড়ে যায়; বদলে
   অল্প সময়ের একটা `reset_token` আসে, ধাপ ৩ এ সেটাই নতুন পাসওয়ার্ডের
   সাথে যায়। ফলে ভুল কোড দিলে গ্রাহক তখনই জানতে পারে — পুরো পাসওয়ার্ড
   ফর্ম ভরে ফেলার পরে নয় — আর কোডটা দ্বিতীয়বার তারে পাঠাতেও হয় না।

   সীমা সার্ভারই ঠিক করে: ৩ ঘণ্টায় ৩টা কোড, তারপর নম্বর ৬ ঘণ্টা ব্লক।
   ভুল কোড ৫ বার দিলে নম্বর আর ডিভাইস দুটোই ৬ ঘণ্টা ব্লক।
   ========================================================================== */

type SendResult = {
  phone: string;
  expires_in: number;
  resend_after: number;
  attempts_left: number;
  /** SMS বন্ধ থাকা লোকাল ডেভেই কেবল আসে */
  dev_otp?: string;
};

type VerifyResult = {
  phone: string;
  /** এক-বারের টিকিট — এটা দিয়েই নতুন পাসওয়ার্ড বসে */
  reset_token: string;
  expires_in: number;
};

const CODE_LENGTH = 6;

/** 01712345678 → 017 1234 5678 (শুধু দেখানোর জন্য) */
const prettyPhone = (phone: string) =>
  phone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1 $2 $3");

export default function ForgotPasswordForm() {
  const router = useRouter();
  const { isLoggedIn, loading } = useUser();

  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState<SendResult | null>(null);
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  /** ধাপ ২ পার হওয়ার পর হাতে আসা এক-বারের টিকিট */
  const [ticket, setTicket] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [expiresIn, setExpiresIn] = useState(0);

  const boxRefs = useRef<(HTMLInputElement | null)[]>([]);

  // লগইন থাকা অবস্থায় পাসওয়ার্ড বদলানোর জায়গা /account — সেখানে পাঠাই
  useEffect(() => {
    if (!loading && isLoggedIn) router.replace("/account");
  }, [loading, isLoggedIn, router]);

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
        setFormError("Enter a valid Bangladeshi mobile number (e.g. 01712345678)");
        return;
      }

      setBusy(true);
      setFormError("");
      try {
        const res = await apiPost<SendResult>("/api/v1/users/password/forgot", {
          phone: phone.trim(),
        });
        const data = res.data;
        setSent(data);
        setStep("code");
        setCode(Array(CODE_LENGTH).fill(""));
        setTicket("");
        setCooldown(data.resend_after ?? 60);
        setExpiresIn(data.expires_in ?? 300);
        toast.success(isResend ? "New code sent" : res.message);
        // কোডের ঘরে ফোকাস — মোবাইলে কীবোর্ড সাথে সাথে খুলে যায়
        setTimeout(() => boxRefs.current[0]?.focus(), 60);
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setFormError(msg);
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    },
    [phone, phoneValid],
  );

  /* ---------------- ধাপ ২ — কোডটা সার্ভারে মিলিয়ে নেওয়া ----------------
     মিলে গেলে কোডটা ওখানেই পুড়ে যায় আর হাতে আসে এক-বারের টিকিট। */
  const verifyCode = useCallback(
    async (value: string) => {
      if (value.length !== CODE_LENGTH) return;

      setBusy(true);
      setFormError("");
      try {
        const res = await apiPost<VerifyResult>("/api/v1/users/password/verify", {
          phone: sent?.phone ?? phone.trim(),
          code: value,
        });
        setTicket(res.data.reset_token);
        // টিকিটের মেয়াদটাই এখন থেকে গোনা হয় — কোডের নয়
        setExpiresIn(res.data.expires_in ?? 600);
        setStep("password");
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setFormError(msg);
        toast.error(msg);
        // ভুল কোড — ঘরগুলো খালি করে আবার প্রথম ঘরে ফোকাস
        setCode(Array(CODE_LENGTH).fill(""));
        setTimeout(() => boxRefs.current[0]?.focus(), 60);
      } finally {
        setBusy(false);
      }
    },
    [sent, phone],
  );

  /* ---------------- ধাপ ৩ — টিকিট + নতুন পাসওয়ার্ড ---------------- */
  const resetPassword = useCallback(async () => {
    // টিকিট ছাড়া এই ধাপে পৌঁছানোর কথা নয়, তবু হাতে না থাকলে
    // সার্ভারে না গিয়ে সোজা শুরুতে ফিরিয়ে দিই
    if (!ticket) {
      setStep("phone");
      setFormError("Please ask for a new code and try again.");
      return;
    }

    let bad = false;

    if (password.length < PASSWORD_MIN) {
      setPasswordError(`Password must be at least ${PASSWORD_MIN} characters long`);
      bad = true;
    } else if (password.length > PASSWORD_MAX) {
      setPasswordError("Password is too long");
      bad = true;
    }
    if (confirm !== password) {
      setConfirmError("Both passwords must match");
      bad = true;
    }
    if (bad) return;

    setBusy(true);
    setFormError("");
    try {
      const res = await apiPost("/api/v1/users/password/reset", {
        phone: sent?.phone ?? phone.trim(),
        reset_token: ticket,
        password,
      });
      toast.success(res.message);

      // নতুন পাসওয়ার্ড দিয়ে একবার লগইন করলেই কাজ শেষ
      router.replace("/login?reset=1");
    } catch (err) {
      const msg = getApiErrorMessage(err);
      setFormError(msg);
      toast.error(msg);

      // টিকিটের মেয়াদ ফুরিয়েছে বা সেটা ইতিমধ্যেই ব্যবহার হয়ে গেছে —
      // নতুন একটা কোড ছাড়া আর এগোনোর উপায় নেই, তাই একদম শুরুতে পাঠাই
      if (/reset link/i.test(msg)) {
        setTicket("");
        setStep("phone");
        setSent(null);
        setCode(Array(CODE_LENGTH).fill(""));
      }
    } finally {
      setBusy(false);
    }
  }, [password, confirm, sent, phone, ticket, router]);

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
    setFormError("");

    const filled = next.join("");
    if (filled.length === CODE_LENGTH) {
      // পুরো কোড বসে গেছে — সাথে সাথেই সার্ভারে মিলিয়ে নিই
      boxRefs.current[CODE_LENGTH - 1]?.blur();
      verifyCode(filled);
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

  const headings = {
    phone: "Forgot your password?",
    code: "Enter the code",
    password: "Set a new password",
  } as const;

  return (
    <div className="site-card mx-auto w-full max-w-[440px] overflow-hidden">
      {/* ---------- হেডার ---------- */}
      <div className="border-b border-border bg-brand-tint px-6 py-7 text-center sm:px-8">
        <span className="site-eyebrow">Account recovery</span>
        <h1 className="mt-1 font-display text-[26px] font-bold text-ink sm:text-[30px]">
          {headings[step]}
        </h1>
        <p className="mx-auto mt-2 max-w-[330px] text-[13.5px] leading-relaxed text-ink-soft">
          {step === "phone" && (
            <>
              Give us the number on your account and we will text you a{" "}
              {CODE_LENGTH}-digit code.
            </>
          )}
          {step === "code" && (
            <>
              We sent a {CODE_LENGTH}-digit code to{" "}
              <span className="font-bold text-ink">
                {prettyPhone(sent?.phone ?? phone)}
              </span>
            </>
          )}
          {step === "password" && "Pick something you will remember this time."}
        </p>
      </div>

      <div className="px-6 py-7 sm:px-8">
        {/* ================= ধাপ ১ — নম্বর ================= */}
        {step === "phone" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendCode();
            }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-phone"
                className="text-[13px] font-bold text-ink"
              >
                Mobile number
              </label>
              <div className="relative">
                <Phone
                  size={17}
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="forgot-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  autoFocus
                  placeholder="01712345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setFormError("");
                  }}
                  className={`site-input h-12 pr-4 pl-10 text-[15px] font-semibold tracking-wide ${
                    formError ? "is-invalid" : ""
                  }`}
                />
              </div>
              {formError ? (
                <p className="text-[12.5px] font-semibold text-chili">
                  {formError}
                </p>
              ) : (
                <p className="text-[12px] text-ink-faint">
                  You can ask for 3 codes in 3 hours. After that the number is
                  locked for 6 hours.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={busy || !phone.trim()}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <ShieldCheck size={17} /> Send reset code
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
              onClick={() => verifyCode(codeValue)}
              disabled={busy || codeValue.length !== CODE_LENGTH}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <KeyRound size={17} /> Continue
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-[12.5px]">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setSent(null);
                  setTicket("");
                  setFormError("");
                  setCode(Array(CODE_LENGTH).fill(""));
                }}
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

        {/* ================= ধাপ ৩ — নতুন পাসওয়ার্ড ================= */}
        {step === "password" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              resetPassword();
            }}
            className="space-y-5"
          >
            <div className="flex items-center gap-2 rounded-sm bg-herb-soft px-4 py-2.5 text-[12.5px] font-semibold text-herb-dark">
              <CheckCircle2 size={15} />
              {prettyPhone(sent?.phone ?? phone)} verified
              {expiresIn > 0 && <span className="ml-auto">Finish in {mmss}</span>}
            </div>

            <PasswordField
              label="New password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                setPasswordError("");
                setConfirmError("");
                setFormError("");
              }}
              autoComplete="new-password"
              disabled={busy}
              error={passwordError}
              hint={`At least ${PASSWORD_MIN} characters`}
            />

            <PasswordField
              label="Confirm new password"
              value={confirm}
              onChange={(v) => {
                setConfirm(v);
                setConfirmError("");
              }}
              autoComplete="new-password"
              disabled={busy}
              error={confirmError}
            />

            {formError && (
              <p className="text-[12.5px] font-semibold text-chili">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy || !password || !confirm || !ticket}
              className="site-btn site-btn-primary h-12 w-full text-[15px]"
            >
              {busy ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <KeyRound size={17} /> Change password
                </>
              )}
            </button>

            {/* কোডটা যাচাইয়ের সময়েই পুড়ে গেছে, তাই "কোডে ফিরে যাই" বলে
                কিছু নেই — ফিরতে হলে একদম গোড়া থেকে নতুন কোড নিতে হবে */}
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setSent(null);
                setTicket("");
                setCode(Array(CODE_LENGTH).fill(""));
                setPassword("");
                setConfirm("");
                setFormError("");
              }}
              className="mx-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:text-brand"
            >
              <ArrowLeft size={14} /> Start over
            </button>
          </form>
        )}
      </div>

      {/* ---------- ফুটার ---------- */}
      <div className="border-t border-border bg-canvas px-6 py-4 text-center text-[13px] text-ink-soft">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Back to log in
        </Link>
      </div>
    </div>
  );
}
