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
import "@/app/globals.css";
import { Eye, EyeOff, RefreshCw, Lock, Mail } from "lucide-react";
import axios from "axios";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/app/dashboard/AuthProvider";
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

// Brand tokens — lifted straight from the site's palette so this page
// stays visually consistent with the rest of the admin panel.
const THEME = {
  "--bg-base": "#ffffff",
  "--bg-surface": "#fafafa",
  "--bg-card": "#ffffff",
  "--bg-card-hover": "#fff5f9",
  "--brand-cyan": "#d63384",
  "--brand-cyan-dim": "#b5176b",
  "--brand-cyan-glow": "rgba(214,51,132,.12)",
  "--brand-cyan-glow-strong": "rgba(214,51,132,.24)",
  "--text-primary": "#111111",
  "--text-secondary": "#444444",
  "--text-muted": "#777777",
  "--text-on-brand": "#ffffff",
  "--border-subtle": "rgba(0,0,0,.08)",
  "--border-card": "rgba(214,51,132,.15)",
  "--border-focus": "rgba(214,51,132,.45)",
  "--shadow-card": "0 10px 30px rgba(0,0,0,.08)",
  "--shadow-glow": "0 0 30px rgba(214,51,132,.18)",
  "--shadow-btn": "0 10px 30px rgba(214,51,132,.30)",
} as React.CSSProperties;

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

  const router = useRouter();

  // CAPTCHA GENERATOR
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

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCaptchaChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCaptchaInput(e.target.value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const validationErrors: Errors = {};

    if (!formData.email) validationErrors.email = "Email is required";
    if (!formData.password) validationErrors.password = "Password is required";
    if (captchaInput !== captcha)
      validationErrors.captcha = "Captcha does not match";

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      generateCaptcha();
      setCaptchaInput("");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post("/api/v1/admins/login", {
        admin_email: formData.email,
        admin_password: formData.password,
      });

      const data = res.data;

      if (data.success) {
        loginAdmin(data.data.access_token);

        Swal.fire({
          title: "Login Success",
          text: data.message || "Login successful!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        router.push("/admins");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Login failed");

      Swal.fire({
        title: "Login Failed!",
        text: err?.response?.data?.message || "Login Error",
        icon: "error",
        timer: 1500,
        showConfirmButton: false,
      });
    } finally {
      setLoading(false);
      generateCaptcha();
      setCaptchaInput("");
    }
  };

  return (
    <div
      style={THEME}
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-[var(--bg-surface)] px-4 py-10"
    >
      {/* Ambient brand glow behind the card */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl sm:h-96 sm:w-96"
        style={{ background: "var(--brand-cyan-glow-strong)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "var(--brand-cyan-glow)" }}
      />

      <div className="relative w-full max-w-[25rem]">
        <div
          className="rounded-2xl border bg-[var(--bg-card)] px-6 py-8 sm:px-9 sm:py-10"
          style={{
            borderColor: "var(--border-card)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-[var(--text-on-brand)]"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand-cyan), var(--brand-cyan-dim))",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              JT
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
              Jannatul Taspi
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Sign in to the admin panel
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
                  className="w-full rounded-lg border bg-[var(--bg-base)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:ring-[3px]"
                  style={{
                    borderColor:
                      submitted && errors.email
                        ? "#dc2626"
                        : "var(--border-subtle)",
                    boxShadow: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                    e.currentTarget.style.boxShadow = `0 0 0 3px var(--brand-cyan-glow)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      submitted && errors.email
                        ? "#dc2626"
                        : "var(--border-subtle)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
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
                  className="w-full rounded-lg border bg-[var(--bg-base)] py-2.5 pl-9 pr-10 text-sm text-[var(--text-primary)] outline-none transition focus:ring-[3px]"
                  style={{
                    borderColor:
                      submitted && errors.password
                        ? "#dc2626"
                        : "var(--border-subtle)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                    e.currentTarget.style.boxShadow = `0 0 0 3px var(--brand-cyan-glow)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor =
                      submitted && errors.password
                        ? "#dc2626"
                        : "var(--border-subtle)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition hover:text-[var(--brand-cyan)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Captcha */}
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
                    background: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  {captcha}
                </div>

                <button
                  type="button"
                  onClick={generateCaptcha}
                  aria-label="Refresh captcha"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-[var(--text-muted)] transition hover:border-[var(--border-focus)] hover:text-[var(--brand-cyan)]"
                  style={{ borderColor: "var(--border-subtle)" }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>

              <input
                id="captcha"
                type="text"
                value={captchaInput}
                onChange={handleCaptchaChange}
                placeholder="Enter the code above"
                autoComplete="off"
                className="mt-2 w-full rounded-lg border bg-[var(--bg-base)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:ring-[3px]"
                style={{
                  borderColor:
                    submitted && errors.captcha
                      ? "#dc2626"
                      : "var(--border-subtle)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.boxShadow = `0 0 0 3px var(--brand-cyan-glow)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    submitted && errors.captcha
                      ? "#dc2626"
                      : "var(--border-subtle)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              {errors.captcha && (
                <p className="mt-1 text-xs text-red-500">{errors.captcha}</p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                name="remember"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 cursor-pointer rounded border-[var(--border-subtle)] accent-[var(--brand-cyan)]"
              />
              Remember me
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[var(--text-on-brand)] transition disabled:cursor-not-allowed disabled:opacity-70"
              style={{
                background: loading
                  ? "var(--brand-cyan-dim)"
                  : "linear-gradient(135deg, var(--brand-cyan), var(--brand-cyan-dim))",
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
          anamulhasannafi.com
        </p>
      </div>
    </div>
  );
}
