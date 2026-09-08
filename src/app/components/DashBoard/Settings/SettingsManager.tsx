/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { useSettingsStore } from "@/src/store/settings.store";
import {
  DEFAULT_SETTINGS,
  type IRestaurantSettings,
} from "@/src/interfaces/settings.interface";
import { calcOrderPricing } from "@/src/config/business";
import { getApiErrorMessage } from "@/src/lib/apiClient";
import { deleteImage, replaceImage, validateImage } from "@/src/lib/upload";

/* ==========================================================================
   RESTAURANT SETTINGS — ম্যানেজারের নিয়ন্ত্রণ প্যানেল
   --------------------------------------------------------------------------
   ভ্যাট/সার্ভিস চার্জ বদলালে ডানপাশে সাথে সাথে একটা নমুনা বিল দেখা যায়,
   তাই সেভ করার আগেই বোঝা যায় কাস্টমার কত টাকা দেবে।
   ========================================================================== */

const MAX_LOGO_MB = 2;
/** নমুনা বিলের জন্য একটা গোল অঙ্ক */
const PREVIEW_SUBTOTAL = 1000;

export default function SettingsManager() {
  const { token } = useContext(AuthContext);
  const applySettings = useSettingsStore((s) => s.setSettings);

  const [form, setForm] = useState<IRestaurantSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/v1/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setForm({ ...DEFAULT_SETTINGS, ...(res.data.data || {}) });
      setDirty(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not load settings");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof IRestaurantSettings>(
    key: K,
    value: IRestaurantSettings[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  /**
   * অফার করা ধরন / পেমেন্ট চালু-বন্ধ করা।
   * শেষ একটা কখনো বন্ধ করতে দিই না — সব বন্ধ হলে কেউ অর্ডারই দিতে পারত না।
   */
  const toggleInList = <
    K extends "order_types" | "payment_methods",
  >(
    key: K,
    value: IRestaurantSettings[K][number],
  ) => {
    setForm((prev) => {
      const list = prev[key] as IRestaurantSettings[K][number][];
      const on = list.includes(value);

      if (on && list.length === 1) {
        toast.error(
          key === "order_types"
            ? "Keep at least one way of taking orders"
            : "Keep at least one payment method",
        );
        return prev;
      }

      return {
        ...prev,
        [key]: on ? list.filter((v) => v !== value) : [...list, value],
      };
    });
    setDirty(true);
  };

  /* ---------------- লোগো ---------------- */
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = validateImage(file, MAX_LOGO_MB);
    if (problem) {
      toast.error(problem);
      return;
    }

    setUploading(true);
    try {
      // Cloudinary তে যায় → URL ফেরত আসে → পুরোনো লোগোটা মুছে যায়
      const uploaded = await replaceImage(file, "restaurant", {
        url: form.logo || "",
        public_id: form.logo_public_id || "",
      });
      setForm((prev) => ({
        ...prev,
        logo: uploaded.url,
        logo_public_id: uploaded.public_id,
      }));
      setDirty(true);
      toast.success("Logo uploaded — press Save to keep it");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Logo upload failed"));
    } finally {
      setUploading(false);
    }
  };

  /** লোগো সরানো — Cloudinary থেকেও যাক */
  const removeLogo = async () => {
    const publicId = form.logo_public_id;
    setForm((prev) => ({ ...prev, logo: "", logo_public_id: "" }));
    setDirty(true);
    await deleteImage(publicId);
  };

  /* ---------------- সেভ ---------------- */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { key: _key, ...payload } = form;
      const res = await axios.patch("/api/v1/settings", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const saved = { ...DEFAULT_SETTINGS, ...(res.data.data || {}) };
      setForm(saved);
      // POS, কার্ট আর ইনভয়েস সবাই এই স্টোর থেকেই হার নেয় — সাথে সাথে বদলে যায়
      applySettings(saved);
      setDirty(false);
      toast.success(res.data.message || "Settings saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- নমুনা বিল ---------------- */
  const preview = calcOrderPricing(
    { subtotal: PREVIEW_SUBTOTAL, orderType: "dine_in" },
    form,
  );

  if (loading) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen space-y-3 p-4 md:p-6">
        <div className="admin-skeleton h-24 rounded-xl" />
        <div className="admin-skeleton h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <form
      onSubmit={save}
      className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6"
    >
      <div className="mb-5">
        <h1 className="text-primary text-[20px] font-semibold">
          Restaurant settings
        </h1>
        <p className="text-secondary mt-0.5 text-[13px]">
          VAT, service charge, delivery and everything printed on the bill —
          change it here, no code needed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px] xl:items-start">
        {/* ================= বাঁ পাশ ================= */}
        <div className="space-y-5">
          {/* ---------- পরিচয় ---------- */}
          <Card
            title="Restaurant details"
            hint="Printed at the top of every invoice"
          >
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="border-default flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl"
                style={{ background: "var(--accent-blue-soft)" }}
              >
                {form.logo ? (
                  <img
                    src={form.logo}
                    alt="Logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-muted text-[11px]">No logo</span>
                )}
              </div>
              <div>
                <label className="btn btn-outline cursor-pointer px-4 py-2 text-[13px]">
                  {uploading
                    ? "Uploading…"
                    : form.logo
                      ? "Change logo"
                      : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={uploadLogo}
                    className="hidden"
                  />
                </label>
                {form.logo && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="btn btn-ghost ml-2 px-3 py-2 text-[13px]"
                  >
                    Remove
                  </button>
                )}
                <p className="text-muted mt-1.5 text-[11.5px]">
                  Max {MAX_LOGO_MB}MB, square works best
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Restaurant name" required>
                <input
                  value={form.restaurant_name}
                  onChange={(e) => set("restaurant_name", e.target.value)}
                  maxLength={80}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="01712345678"
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => set("email", e.target.value)}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="VAT / BIN registration no." hint="Shown on the bill">
                <input
                  value={form.vat_reg_no || ""}
                  onChange={(e) => set("vat_reg_no", e.target.value)}
                  maxLength={40}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Address">
                  <textarea
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    rows={2}
                    maxLength={300}
                    className="input-field w-full resize-none px-3 py-2.5 text-[14px]"
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* ---------- ট্যাক্স ---------- */}
          <Card
            title="Tax & service charge"
            hint="This is what changes the customer's total"
          >
            <div className="space-y-4">
              <div>
                <p className="text-primary mb-2 text-[13px] font-medium">
                  Are menu prices with or without VAT?
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <TaxModeCard
                    active={form.tax_mode === "exclusive"}
                    onClick={() => set("tax_mode", "exclusive")}
                    title="VAT added on top"
                    body="Menu shows ৳1000, customer pays ৳1000 + VAT. The usual restaurant bill."
                  />
                  <TaxModeCard
                    active={form.tax_mode === "inclusive"}
                    onClick={() => set("tax_mode", "inclusive")}
                    title="VAT already inside"
                    body="Menu shows ৳1000, customer pays ৳1000. The bill just breaks out the VAT portion."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="VAT %" hint="0 turns VAT off completely">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.vat_percent}
                    onChange={(e) => set("vat_percent", Number(e.target.value))}
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </Field>
                <Field label="Service charge %" hint="0 turns it off">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={form.service_charge_percent}
                    onChange={(e) =>
                      set("service_charge_percent", Number(e.target.value))
                    }
                    className="input-field h-10 w-full px-3 text-[14px]"
                  />
                </Field>
              </div>

              <Toggle
                checked={form.service_charge_dine_in_only}
                onChange={(v) => set("service_charge_dine_in_only", v)}
                label="Service charge only for dine-in"
                hint="Turn off to also charge it on delivery and pickup"
              />
            </div>
          </Card>

          {/* ---------- কী কী অফার করা হয় ---------- */}
          <Card
            title="What you offer"
            hint="Unticked options disappear from checkout and POS — and the server refuses them too"
          >
            <div className="space-y-5">
              <div>
                <p className="text-primary mb-2 text-[13px] font-medium">
                  Ways of taking orders
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "dine_in", label: "Dine in" },
                      { value: "delivery", label: "Delivery" },
                      { value: "pickup", label: "Pickup" },
                    ] as const
                  ).map((opt) => (
                    <Pill
                      key={opt.value}
                      label={opt.label}
                      active={form.order_types.includes(opt.value)}
                      onClick={() => toggleInList("order_types", opt.value)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-primary mb-2 text-[13px] font-medium">
                  Payment methods
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { value: "cod", label: "Cash" },
                      { value: "bkash", label: "bKash" },
                      { value: "nagad", label: "Nagad" },
                      { value: "card", label: "Card" },
                    ] as const
                  ).map((opt) => (
                    <Pill
                      key={opt.value}
                      label={opt.label}
                      active={form.payment_methods.includes(opt.value)}
                      onClick={() => toggleInList("payment_methods", opt.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* ---------- ডেলিভারি ---------- */}
          <Card title="Delivery & orders">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label={`Delivery fee (${form.currency})`}>
                <input
                  type="number"
                  min={0}
                  value={form.delivery_fee}
                  onChange={(e) => set("delivery_fee", Number(e.target.value))}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Free delivery above" hint="Order value">
                <input
                  type="number"
                  min={0}
                  value={form.free_delivery_above}
                  onChange={(e) =>
                    set("free_delivery_above", Number(e.target.value))
                  }
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Minimum delivery order">
                <input
                  type="number"
                  min={0}
                  value={form.min_order_amount}
                  onChange={(e) =>
                    set("min_order_amount", Number(e.target.value))
                  }
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Average prep time" hint="Minutes, shown to customers">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={form.avg_prep_minutes}
                  onChange={(e) =>
                    set("avg_prep_minutes", Number(e.target.value))
                  }
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Currency symbol">
                <input
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                  maxLength={4}
                  className="input-field h-10 w-full px-3 text-[14px]"
                />
              </Field>
              <Field label="Order number prefix" hint="e.g. ORD-260907-0001">
                <input
                  value={form.order_prefix}
                  onChange={(e) =>
                    set("order_prefix", e.target.value.toUpperCase())
                  }
                  maxLength={6}
                  className="input-field h-10 w-full px-3 text-[14px] uppercase"
                />
              </Field>
            </div>
          </Card>

          {/* ---------- ইনভয়েস ---------- */}
          <Card title="Invoice">
            <Field label="Footer line" hint="Printed at the bottom of the bill">
              <input
                value={form.invoice_footer}
                onChange={(e) => set("invoice_footer", e.target.value)}
                maxLength={200}
                className="input-field h-10 w-full px-3 text-[14px]"
              />
            </Field>
            <div className="mt-4">
              <Toggle
                checked={form.invoice_show_staff}
                onChange={(v) => set("invoice_show_staff", v)}
                label="Print the waiter's name on the bill"
                hint="Helps customers know who served them"
              />
            </div>
          </Card>
        </div>

        {/* ================= ডান পাশ — নমুনা বিল ================= */}
        <div className="xl:sticky xl:top-4">
          <Card title="Sample bill" hint="Updates as you type">
            <dl className="space-y-2 text-[13.5px]">
              <Line label="Food subtotal" value={preview.subtotal} form={form} />
              {preview.service_charge > 0 && (
                <Line
                  label={`Service charge (${preview.service_charge_percent}%)`}
                  value={preview.service_charge}
                  form={form}
                />
              )}
              {form.vat_percent > 0 && (
                <Line
                  label={
                    form.tax_mode === "inclusive"
                      ? `VAT (${form.vat_percent}% — included)`
                      : `VAT (${form.vat_percent}%)`
                  }
                  value={preview.vat}
                  form={form}
                />
              )}
            </dl>

            <div className="border-default-t mt-3 flex items-baseline justify-between pt-3">
              <span className="text-primary text-[14px] font-medium">
                Customer pays
              </span>
              <span className="text-primary text-[22px] font-semibold">
                {form.currency}
                {preview.total.toLocaleString("en-BD")}
              </span>
            </div>

            <p className="text-muted mt-3 text-[11.5px] leading-relaxed">
              {form.tax_mode === "inclusive"
                ? `On a ${form.currency}${PREVIEW_SUBTOTAL} dine-in order the customer pays ${form.currency}${preview.total.toLocaleString("en-BD")} — VAT is already inside the menu price.`
                : `On a ${form.currency}${PREVIEW_SUBTOTAL} dine-in order the customer pays ${form.currency}${preview.total.toLocaleString("en-BD")} — ${form.currency}${(preview.total - preview.subtotal).toLocaleString("en-BD")} on top of the food.`}
            </p>
          </Card>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || uploading || !dirty}
              className="btn btn-primary flex-1 px-5 py-2.5 text-[14px]"
            >
              {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </button>
            {dirty && (
              <button
                type="button"
                onClick={load}
                className="btn btn-outline px-4 py-2.5 text-[13px]"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

/* ==========================================================================
   ছোট প্রেজেন্টেশন হেল্পার
   ========================================================================== */
function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border-default rounded-xl p-5 md:p-6">
      <h2 className="text-primary text-[15px] font-medium">{title}</h2>
      {hint && <p className="text-secondary mt-0.5 text-[12.5px]">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-primary text-[13px] font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
        {hint && <span className="text-muted text-[11.5px]">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function TaxModeCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-default rounded-xl px-4 py-3.5 text-left transition-colors"
      style={
        active
          ? {
              background: "var(--accent-blue-soft)",
              borderColor: "var(--accent-blue)",
            }
          : undefined
      }
    >
      <span
        className={`text-[13.5px] font-medium ${active ? "text-highlight" : "text-primary"}`}
      >
        {title}
      </span>
      <span className="text-secondary mt-1 block text-[12px] leading-relaxed">
        {body}
      </span>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer"
      />
      <span>
        <span className="text-primary block text-[13px] font-medium">
          {label}
        </span>
        {hint && (
          <span className="text-secondary block text-[12px]">{hint}</span>
        )}
      </span>
    </label>
  );
}

function Line({
  label,
  value,
  form,
}: {
  label: string;
  value: number;
  form: IRestaurantSettings;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-secondary">{label}</dt>
      <dd className="text-primary font-medium tabular-nums">
        {form.currency}
        {value.toLocaleString("en-BD")}
      </dd>
    </div>
  );
}

/** চালু/বন্ধ করার ছোট বোতাম — কোনটা অফার করা হচ্ছে সেটা এক নজরে বোঝা যায় */
function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`role-pill px-4 py-1.5 text-[13px] font-medium ${
        active ? "active-admin" : ""
      }`}
    >
      {active ? "✓ " : ""}
      {label}
    </button>
  );
}
