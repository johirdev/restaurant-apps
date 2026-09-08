"use client";

import { useId, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

/* ==========================================================================
   পাসওয়ার্ডের ইনপুট — লগইন, সাইনআপ আর পাসওয়ার্ড বদল তিন জায়গাতেই একই।
   চোখের আইকনে চাপলে লেখাটা দেখা যায়, তাই মোবাইলে টাইপো কম হয়।
   ========================================================================== */

export default function PasswordField({
  label,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "current-password",
  autoFocus = false,
  disabled = false,
  error = "",
  hint = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-bold text-ink">
        {label}
      </label>

      <div className="relative">
        <Lock
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint"
        />
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`site-input h-12 pl-10 pr-11 text-[15px] ${
            error ? "is-invalid" : ""
          }`}
        />
        <button
          type="button"
          // tabIndex={-1} — কীবোর্ডে ট্যাব চাপলে ফোকাসটা যেন সরাসরি পরের ঘরে যায়
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-ink-faint transition-colors hover:text-ink"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>

      {error ? (
        <p className="text-[12.5px] font-semibold text-chili">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}
