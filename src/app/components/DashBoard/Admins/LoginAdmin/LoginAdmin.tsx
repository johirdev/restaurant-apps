/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  useContext,
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useCallback,
} from "react";
import "@/src/app/globals.css";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Lock,
  Mail,
  UtensilsCrossed,
} from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { toast } from "react-toastify";

interface FormData {
  email: string;
  password: string;
  remember: boolean;
}

interface Errors {
  email?: string;
  password?: string;
  captcha?: string;
}

// Brand tokens — matches the dark indigo/purple theme used across the
// Sidebar and Navbar so the admin panel feels like one cohesive product.
const THEME = {
  "--bg-page-1": "var(--color-admin-sidebar)",
  "--bg-page-2": "var(--color-admin-bg)",
  "--bg-page-3": "var(--color-admin-bg)",
  "--bg-card": "var(--color-admin-bg)",
  "--bg-input": "rgba(255,255,255,0.05)",
  "--brand-indigo": "var(--accent-primary)",
  "--brand-purple": "var(--accent-primary-hover)",
  "--brand-glow": "rgba(99,102,241,0.18)",
  "--brand-glow-strong": "rgba(99,102,241,0.3)",
  "--text-primary": "#ffffff",
  "--text-secondary": "var(--color-admin-ink-soft)",
  "--text-muted": "var(--color-admin-ink-faint)",
  "--border-subtle": "rgba(99,102,241,0.15)",
  "--border-focus": "rgba(99,102,241,0.6)",
  "--shadow-card": "0 20px 60px rgba(0,0,0,0.5)",
  "--shadow-glow": "0 0 30px rgba(99,102,241,0.35)",
  "--shadow-btn": "0 10px 30px rgba(99,102,241,0.35)",
} as React.CSSProperties;

const inputBase =
  "w-full rounded-lg border bg-[var(--bg-input)] py-2.5 text-sm text-[var(--text-primary)] placeholder-gray-500 outline-none transition focus:border-[var(--border-focus)] focus:ring-[3px] focus:ring-[var(--brand-glow)]";

export default function LoginAdmin() {
  const { loginAdmin } = useContext(AuthContext);

  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    remember: true,
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState("");

  /**
   * ব্যস্ত সময়ে ওয়েটার/শেফকে প্রতিবার ক্যাপচা লেখানো বাড়াবাড়ি — তাই
   * দুইবার ভুল হওয়ার পরেই কেবল ক্যাপচা দেখানো হয়। ব্রুট-ফোর্স ঠেকানোর
   * কাজটা তখনো হয়, কিন্তু স্বাভাবিক লগইন এক সেকেন্ডেই শেষ।
   */
  const [failedAttempts, setFailedAttempts] = useState(0);
  const captchaRequired = failedAttempts >= 2;

  const router = useRouter();

  const generateCaptcha = useCallback(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(code);
  }, []);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (serverError) setServerError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError("");

    const validationErrors: Errors = {};
    if (!formData.email) validationErrors.email = "Email is required";
    if (!formData.password) validationErrors.password = "Password is required";
    if (captchaRequired && captchaInput !== captcha)
      validationErrors.captcha = "Captcha does not match";

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      generateCaptcha();
      setCaptchaInput("");
      return;
    }

    setLoading(true);

    /**
     * একটাই লগইন ফর্ম, দুই রকম অ্যাকাউন্ট:
     *   Admin  → superadmin / admin / viewOnly
     *   Staff  → manager / chef / waiter / cashier / cleaner
     * দুটো এন্ডপয়েন্ট একই আকারের টোকেন দেয়, তাই কে কোনটা সেটা কর্মীকে
     * জিজ্ঞেস না করে আমরা নিজেরাই মিলিয়ে নিই।
     */
    const attempts: { url: string; body: Record<string, string> }[] = [
      {
        url: "/api/v1/admins/login",
        body: { admin_email: formData.email, admin_password: formData.password },
      },
      {
        url: "/api/v1/staffs/login",
        body: { staff_email: formData.email, staff_password: formData.password },
      },
    ];

    let lastMessage = "Email or password is not correct";

    try {
      for (const attempt of attempts) {
        try {
          const res = await axios.post(attempt.url, attempt.body);
          if (res.data?.success && res.data?.data?.access_token) {
            loginAdmin(res.data.data.access_token);
            setFailedAttempts(0);
            toast.success(res.data.message || "Login successful!");
            router.push("/dashboard");
            return;
          }
        } catch (err: any) {
          const status = err?.response?.status;
          const message = err?.response?.data?.message;

          // ৪০১ মানে অ্যাকাউন্টটা পাওয়া গেছে কিন্তু পাসওয়ার্ড ভুল —
          // তখন অন্য টেবিলে খোঁজার আর মানে নেই
          if (status === 401 && /password/i.test(message || "")) {
            lastMessage = message;
            break;
          }
          // ব্লক / নিষ্ক্রিয় অ্যাকাউন্টের বার্তাও হুবহু দেখানো দরকার
          if (status === 403 || status === 429) {
            lastMessage = message || lastMessage;
            break;
          }
          if (message) lastMessage = message;
        }
      }

      setServerError(lastMessage);
      setFailedAttempts((n) => n + 1);
    } finally {
      setLoading(false);
      generateCaptcha();
      setCaptchaInput("");
    }
  };

  return (
    <div
      style={{
        ...THEME,
        background:
          "linear-gradient(180deg, var(--bg-page-1) 0%, var(--bg-page-2) 60%, var(--bg-page-3) 100%)",
      }}
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-10"
    >
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96"
        style={{ background: "var(--brand-glow-strong)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "var(--brand-glow)" }}
      />

      <div className="relative w-full max-w-[25rem]">
        <div
          className="rounded-2xl border px-5 py-8 xs:px-6 sm:px-9 sm:py-10"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-subtle)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-indigo), var(--brand-purple))",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <UtensilsCrossed size={24} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              Restaurant Admin
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Managers, chefs and waiters sign in here too
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="email"
                  type="text"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`${inputBase} pl-9 pr-3 ${
                    submitted && errors.email
                      ? "border-red-500"
                      : "border-[var(--border-subtle)]"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`${inputBase} pl-9 pr-10 ${
                    submitted && errors.password
                      ? "border-red-500"
                      : "border-[var(--border-subtle)]"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition hover:text-[var(--brand-indigo)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Captcha — শুধু বারবার ভুল হলে */}
            {captchaRequired && (
            <div>
              <label
                htmlFor="captcha"
                className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
              >
                Captcha
              </label>

              <div className="flex items-center gap-2">
                <div
                  className="select-none rounded-lg border px-4 py-2 font-mono text-base font-bold tracking-[0.3em] text-[var(--text-primary)]"
                  style={{
                    background: "var(--bg-input)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  {captcha}
                </div>

                <button
                  type="button"
                  onClick={generateCaptcha}
                  aria-label="Refresh captcha"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[var(--text-muted)] transition hover:border-[var(--border-focus)] hover:text-[var(--brand-indigo)]"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <input
                id="captcha"
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Enter the code above"
                autoComplete="off"
                className={`${inputBase} mt-2 px-3 ${
                  submitted && errors.captcha
                    ? "border-red-500"
                    : "border-[var(--border-subtle)]"
                }`}
              />
              {errors.captcha && (
                <p className="mt-1 text-xs text-red-400">{errors.captcha}</p>
              )}
            </div>
            )}

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--brand-indigo)]"
              />
              Remember me
            </label>

            {/* Server error */}
            {serverError && (
              <p className="text-center text-sm text-red-400">{serverError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading
                  ? "var(--brand-indigo)"
                  : "linear-gradient(135deg, var(--brand-indigo), var(--brand-purple))",
                boxShadow: "var(--shadow-btn)",
              }}
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          Restaurant Admin Panel
        </p>
      </div>
    </div>
  );
}
