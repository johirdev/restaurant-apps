"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { apiPatch, getApiErrorMessage } from "@/src/lib/apiClient";
import { PASSWORD_MIN, PASSWORD_MAX } from "@/src/validations/user.schema";
import PasswordField from "@/src/app/components/Clients/Auth/PasswordField";

/* ==========================================================================
   পাসওয়ার্ড বদল — PATCH /api/v1/users/me/password
   --------------------------------------------------------------------------
   প্রোফাইল ফর্মের ভেতরে না রেখে আলাদা কার্ড, কারণ একটা <form> এর ভেতরে
   আরেকটা <form> বসানো যায় না — আর পাসওয়ার্ড ভুল হলে প্রোফাইলের বাকি
   পরিবর্তনগুলোও আটকে যেত।
   ========================================================================== */

type FieldErrors = {
  current?: string;
  next?: string;
  confirm?: string;
};

export default function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrors({});
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // সার্ভারও একই নিয়ম দেখে; এখানেরটা শুধু আগেভাগে ভুলটা ধরিয়ে দেয়
    const found: FieldErrors = {};
    if (!current) found.current = "Enter your current password";
    if (next.length < PASSWORD_MIN) {
      found.next = `Password must be at least ${PASSWORD_MIN} characters long`;
    } else if (next.length > PASSWORD_MAX) {
      found.next = "Password is too long";
    } else if (next === current) {
      found.next = "The new password must be different from the current one";
    }
    if (confirm !== next) found.confirm = "Both passwords must match";

    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    try {
      const res = await apiPatch("/api/v1/users/me/password", {
        current_password: current,
        new_password: next,
      });
      toast.success(res.message);
      reset();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      // "current password is not correct" — ঠিক যে ঘরে ভুল, সেখানেই দেখাই
      setErrors(
        msg.toLowerCase().includes("current password") ? { current: msg } : {},
      );
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="site-card mt-5 px-5 py-6 sm:px-7">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <KeyRound size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">Change password</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            This is the password you use with your number{" "}
            <span className="whitespace-nowrap">to log in</span>. No SMS code is
            needed.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <PasswordField
            label="Current password"
            value={current}
            onChange={(v) => {
              setCurrent(v);
              setErrors((p) => ({ ...p, current: "" }));
            }}
            autoComplete="current-password"
            disabled={saving}
            error={errors.current}
          />
        </div>

        <PasswordField
          label="New password"
          value={next}
          onChange={(v) => {
            setNext(v);
            setErrors((p) => ({ ...p, next: "", confirm: "" }));
          }}
          autoComplete="new-password"
          disabled={saving}
          error={errors.next}
          hint={`At least ${PASSWORD_MIN} characters`}
        />

        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={(v) => {
            setConfirm(v);
            setErrors((p) => ({ ...p, confirm: "" }));
          }}
          autoComplete="new-password"
          disabled={saving}
          error={errors.confirm}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[12px] text-ink-faint">
          <ShieldCheck size={13} className="text-brand" />
          You stay logged in on this device after changing it.
        </p>
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="site-btn site-btn-primary h-11 px-6 text-[14px]"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Updating…
            </>
          ) : (
            <>
              <KeyRound size={16} /> Update password
            </>
          )}
        </button>
      </div>
    </form>
  );
}
