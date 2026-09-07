"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import {
  Bike,
  ShoppingBag,
  UtensilsCrossed,
  User,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Wallet,
  CreditCard,
  ShieldCheck,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import {
  useCartStore,
  useCartHydrated,
  selectSubtotal,
  useCartPricing,
  selectSavings,
  selectItemCount,
  type OrderType,
} from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";
import { useSettings } from "@/src/store/settings.store";
import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";

/* ==========================================================================
   ফর্ম স্কিমা — সার্ভারের createOrderSchema এর নিয়মগুলোই এখানে মিরর করা,
   তাই ভুল ইনপুট সার্ভারে যাওয়ার আগেই ধরা পড়ে।
   ========================================================================== */
const checkoutSchema = z
  .object({
    order_type: z.enum(["delivery", "pickup", "dine_in"]),
    table_number: z.string().trim().max(20).optional(),
    name: z.string().trim().min(3, "Please enter your full name").max(60),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?88)?01[3-9]\d{8}$/, "Enter a valid number, e.g. 01712345678"),
    email: z.union([z.literal(""), z.email("Enter a valid email address")]).optional(),
    address: z.string().trim().max(300).optional(),
    area: z.string().trim().max(80).optional(),
    note: z.string().trim().max(500).optional(),
    payment_method: z.enum(["cod", "bkash", "nagad", "card"]),
  })
  .refine(
    (v) => v.order_type !== "delivery" || (v.address?.trim().length ?? 0) >= 10,
    { message: "Please give a delivery address (at least 10 characters)", path: ["address"] },
  )
  .refine((v) => v.order_type !== "dine_in" || !!v.table_number?.trim(), {
    message: "Table number is required for dine-in",
    path: ["table_number"],
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;

const ORDER_TYPES: {
  value: OrderType;
  label: string;
  icon: typeof Bike;
}[] = [
  { value: "delivery", label: "Delivery", icon: Bike },
  { value: "pickup", label: "Pickup", icon: ShoppingBag },
  { value: "dine_in", label: "Dine in", icon: UtensilsCrossed },
];

/** রান্নার গড় সময় এখন সেটিংস থেকে আসে, তাই ইঙ্গিতটা রেন্ডারের সময় বসে */
const orderTypeHint = (value: OrderType, prepMinutes: number) => {
  if (value === "delivery") return `~${prepMinutes + 15} min`;
  if (value === "pickup") return `~${prepMinutes} min`;
  return "Book a table";
};

const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on delivery", hint: "Pay when it arrives", icon: Wallet },
  { value: "bkash", label: "bKash", hint: "Mobile wallet", icon: Phone },
  { value: "nagad", label: "Nagad", hint: "Mobile wallet", icon: Phone },
  { value: "card", label: "Card", hint: "Visa / Mastercard", icon: CreditCard },
] as const;

export default function CheckoutClient() {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const [submitting, setSubmitting] = useState(false);

  const lines = useCartStore((s) => s.lines);
  const storeOrderType = useCartStore((s) => s.orderType);
  const setOrderType = useCartStore((s) => s.setOrderType);
  const clear = useCartStore((s) => s.clear);

  const settings = useSettings();
  const subtotal = useCartStore(selectSubtotal);
  const pricing = useCartPricing();
  const savings = useCartStore(selectSavings);
  const itemCount = useCartStore(selectItemCount);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      order_type: storeOrderType,
      payment_method: "cod",
      name: "",
      phone: "",
      email: "",
      address: "",
      area: "",
      note: "",
      table_number: "",
    },
    mode: "onTouched",
  });

  const orderType = watch("order_type");
  const paymentMethod = watch("payment_method");

  const belowMinimum =
    orderType === "delivery" && subtotal < settings.min_order_amount;

  const canSubmit = hydrated && lines.length > 0 && !belowMinimum && !submitting;

  const onSubmit = async (values: CheckoutForm) => {
    if (lines.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{ _id: string; order_number: string }>(
        "/api/v1/orders",
        {
          // সার্ভার দাম নিজে DB থেকে হিসাব করে — তাই শুধু কী আর কতটা পাঠাই
          items: lines.map((l) => ({
            food_id: l.food_id,
            variation_id: l.variation_id,
            quantity: l.quantity,
            note: l.note || undefined,
          })),
          customer: {
            name: values.name,
            phone: values.phone,
            email: values.email || undefined,
            address: values.address || undefined,
            area: values.area || undefined,
            note: values.note || undefined,
          },
          order_type: values.order_type,
          table_number: values.table_number || undefined,
          payment_method: values.payment_method,
        },
      );

      const orderNumber = res.data?.order_number;
      toast.success("Order placed! We are firing up the kitchen 🔥");
      clear();

      // অর্ডার নম্বর ছাড়া ট্র্যাকিং পেজ কিছু খুঁজে পাবে না — তাই তখন
      // খালি ট্র্যাক পেজে পাঠাই, "undefined" নিয়ে নয়।
      router.push(
        orderNumber
          ? `/order-confirmed?order=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(values.phone)}`
          : "/track-order",
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not place your order"));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- খালি কার্ট ---------------- */
  if (hydrated && lines.length === 0) {
    return (
      <div className="aurora-brand min-h-[70vh]">
        <div className="max-width flex flex-col items-center justify-center gap-5 px-4 py-24 text-center">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-surface text-ink-faint shadow-[var(--shadow-float)] float-y">
            <ShoppingBag size={34} />
          </span>
          <h1 className="font-display text-3xl font-bold text-ink">
            Nothing to check out yet
          </h1>
          <p className="max-w-md text-[14px] text-ink-soft">
            Your cart is empty. Add a few dishes and come back — the kitchen is
            waiting.
          </p>
          <Link href="/foods" className="site-btn site-btn-primary h-12 px-8">
            Explore the menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="aurora-brand min-h-screen py-8 sm:py-12">
      <div className="max-width px-4 sm:px-6">
        {/* ---------------- হেডার ---------------- */}
        <div className="mb-7">
          <Link
            href="/foods"
            className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-brand"
          >
            <ChevronLeft size={16} /> Back to menu
          </Link>
          <p className="site-eyebrow">Almost there</p>
          <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
            Checkout
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {itemCount} item{itemCount === 1 ? "" : "s"} · ready in about{" "}
            {settings.avg_prep_minutes} minutes
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="scene-3d grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
        >
          {/* ================= বাম পাশ — ফর্ম ================= */}
          <div className="flex flex-col gap-5">
            {/* ---------- ধাপ ১ — অর্ডারের ধরন ---------- */}
            <FormPanel step={1} title="How would you like it?" delay={0}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {ORDER_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = orderType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setValue("order_type", type.value, { shouldValidate: true });
                        // স্টোরেও জানাই — ডেলিভারি চার্জের হিসাব এর উপর নির্ভর করে
                        setOrderType(type.value);
                      }}
                      className={`card-3d flex flex-col items-center gap-1.5 rounded-md border-2 p-4 text-center transition-all ${
                        active
                          ? "border-brand bg-brand-soft shadow-[var(--shadow-brand)]"
                          : "border-border bg-surface hover:border-brand/40 hover:shadow-[var(--shadow-raised)]"
                      }`}
                      style={active ? { transform: "translateZ(18px) translateY(-3px)" } : undefined}
                    >
                      <Icon size={22} className={active ? "text-brand" : "text-ink-faint"} />
                      <span className={`text-[13px] font-bold ${active ? "text-brand-dark" : "text-ink"}`}>
                        {type.label}
                      </span>
                      <span className="text-[11px] text-ink-faint">{orderTypeHint(type.value, settings.avg_prep_minutes)}</span>
                    </button>
                  );
                })}
              </div>

              {orderType === "dine_in" && (
                <Field
                  className="mt-4"
                  label="Table number"
                  icon={UtensilsCrossed}
                  error={errors.table_number?.message}
                >
                  <input
                    {...register("table_number")}
                    placeholder="e.g. T-12"
                    className={`input-3d h-12 w-full rounded-sm pl-11 pr-4 text-[14px] text-ink outline-none ${
                      errors.table_number ? "is-invalid" : ""
                    }`}
                  />
                </Field>
              )}
            </FormPanel>

            {/* ---------- ধাপ ২ — যোগাযোগ ---------- */}
            <FormPanel step={2} title="Who is it for?" delay={80}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name" icon={User} error={errors.name?.message} required>
                  <input
                    {...register("name")}
                    placeholder="Your name"
                    autoComplete="name"
                    className={`input-3d h-12 w-full rounded-sm pl-11 pr-4 text-[14px] text-ink outline-none ${
                      errors.name ? "is-invalid" : ""
                    }`}
                  />
                </Field>

                <Field label="Mobile number" icon={Phone} error={errors.phone?.message} required>
                  <input
                    {...register("phone")}
                    placeholder="01712345678"
                    inputMode="tel"
                    autoComplete="tel"
                    className={`input-3d h-12 w-full rounded-sm pl-11 pr-4 text-[14px] text-ink outline-none ${
                      errors.phone ? "is-invalid" : ""
                    }`}
                  />
                </Field>

                <Field
                  label="Email (optional)"
                  icon={Mail}
                  error={errors.email?.message}
                  className="sm:col-span-2"
                >
                  <input
                    {...register("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={`input-3d h-12 w-full rounded-sm pl-11 pr-4 text-[14px] text-ink outline-none ${
                      errors.email ? "is-invalid" : ""
                    }`}
                  />
                </Field>

                {orderType === "delivery" && (
                  <>
                    <Field
                      label="Delivery address"
                      icon={MapPin}
                      error={errors.address?.message}
                      required
                      className="sm:col-span-2"
                    >
                      <textarea
                        {...register("address")}
                        rows={3}
                        placeholder="House, road, block — anything that helps the rider find you"
                        className={`input-3d w-full rounded-sm py-3 pl-11 pr-4 text-[14px] leading-relaxed text-ink outline-none ${
                          errors.address ? "is-invalid" : ""
                        }`}
                      />
                    </Field>

                    <Field label="Area (optional)" icon={MapPin} error={errors.area?.message}>
                      <input
                        {...register("area")}
                        placeholder="e.g. Dhanmondi"
                        className="input-3d h-12 w-full rounded-sm pl-11 pr-4 text-[14px] text-ink outline-none"
                      />
                    </Field>
                  </>
                )}

                <Field
                  label="Note for the kitchen (optional)"
                  icon={StickyNote}
                  error={errors.note?.message}
                  className="sm:col-span-2"
                >
                  <textarea
                    {...register("note")}
                    rows={2}
                    placeholder="Less spicy, no onion, extra napkins…"
                    className="input-3d w-full rounded-sm py-3 pl-11 pr-4 text-[14px] leading-relaxed text-ink outline-none"
                  />
                </Field>
              </div>
            </FormPanel>

            {/* ---------- ধাপ ৩ — পেমেন্ট ---------- */}
            <FormPanel step={3} title="How will you pay?" delay={160}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  const active = paymentMethod === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() =>
                        setValue("payment_method", method.value, { shouldValidate: true })
                      }
                      className={`card-3d flex flex-col items-center gap-1 rounded-md border-2 p-3.5 text-center transition-all ${
                        active
                          ? "border-brand bg-brand-soft shadow-[var(--shadow-brand)]"
                          : "border-border bg-surface hover:border-brand/40 hover:shadow-[var(--shadow-raised)]"
                      }`}
                      style={active ? { transform: "translateZ(16px) translateY(-3px)" } : undefined}
                    >
                      <Icon size={19} className={active ? "text-brand" : "text-ink-faint"} />
                      <span className={`text-[12.5px] font-bold ${active ? "text-brand-dark" : "text-ink"}`}>
                        {method.label}
                      </span>
                      <span className="text-[10.5px] text-ink-faint">{method.hint}</span>
                    </button>
                  );
                })}
              </div>

              {paymentMethod !== "cod" && (
                <p className="mt-3 rounded-sm bg-saffron-soft px-3.5 py-2.5 text-[12px] font-medium text-saffron-dark">
                  Online payment is not connected yet — place the order and our team
                  will send you a payment link.
                </p>
              )}
            </FormPanel>
          </div>

          {/* ================= ডান পাশ — সামারি ================= */}
          <aside className="lg:sticky lg:top-6">
            <div
              className="card-3d glass-panel rounded-lg p-5"
              style={{ transform: "rotateX(2deg) rotateY(-2deg)" }}
            >
              <h2 className="font-display text-[18px] font-bold text-ink">
                Order summary
              </h2>

              {/* আইটেম */}
              <ul className="mt-4 max-h-[280px] space-y-3 overflow-y-auto pr-1">
                {lines.map((line) => (
                  <li key={line.key} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-brand-soft text-[12px] font-extrabold text-brand-dark">
                      {line.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="clamp-1 text-[13px] font-semibold text-ink">
                        {line.name}
                      </p>
                      {line.variation_name && (
                        <p className="text-[11px] text-ink-faint">{line.variation_name}</p>
                      )}
                    </div>
                    <span className="text-[13px] font-bold tabular-nums text-ink">
                      {formatMoney(line.unit_price * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <hr className="my-4 border-border" />

              {/* হিসাব */}
              <dl className="space-y-2 text-[13px]">
                <Row label="Subtotal" value={formatMoney(pricing.subtotal)} />
                {savings > 0 && (
                  <Row
                    label="Item savings"
                    value={`− ${formatMoney(savings)}`}
                    tone="text-herb-dark"
                  />
                )}
                <Row
                  label="Delivery"
                  value={
                    orderType !== "delivery"
                      ? "Not applicable"
                      : pricing.delivery_fee === 0
                        ? "FREE"
                        : formatMoney(pricing.delivery_fee)
                  }
                  tone={pricing.delivery_fee === 0 ? "text-herb-dark" : undefined}
                />
                {pricing.service_charge > 0 && (
                  <Row
                    label={`Service charge (${pricing.service_charge_percent}%)`}
                    value={formatMoney(pricing.service_charge)}
                  />
                )}
                {settings.vat_percent > 0 && (
                  <Row
                    label={
                      // দামের ভেতরে ভ্যাট থাকলে সেটা যোগ হচ্ছে না, তাই আলাদা করে বলা দরকার
                      pricing.tax_mode === "inclusive"
                        ? `VAT (${settings.vat_percent}% — included)`
                        : `VAT (${settings.vat_percent}%)`
                    }
                    value={formatMoney(pricing.vat)}
                  />
                )}
              </dl>

              <div className="mt-4 flex items-baseline justify-between rounded-md bg-ink px-4 py-3 text-ink-invert">
                <span className="text-[13px] font-semibold opacity-90">Total</span>
                <span className="font-display text-2xl font-extrabold">
                  {formatMoney(pricing.total)}
                </span>
              </div>

              {belowMinimum && (
                <p className="mt-3 rounded-sm bg-chili-soft px-3.5 py-2.5 text-[12px] font-semibold text-chili-dark">
                  Minimum delivery order is {formatMoney(settings.min_order_amount)}. Add{" "}
                  {formatMoney(settings.min_order_amount - subtotal)} more, or switch to
                  pickup.
                </p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-3d mt-4 flex h-14 w-full items-center justify-center gap-2 py-4 text-[14px] uppercase tracking-wide"
              >
                {submitting ? (
                  <>
                    <Loader2 size={17} className="animate-spin" /> Placing order…
                  </>
                ) : (
                  <>Place order · {formatMoney(pricing.total)}</>
                )}
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-faint">
                <ShieldCheck size={13} /> Your details are only used for this order.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   ছোট প্রেজেন্টেশনাল কম্পোনেন্ট
   ========================================================================== */

function FormPanel({
  step,
  title,
  delay,
  children,
}: {
  step: number;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="card-3d glass-panel rise-in rounded-lg p-5 sm:p-6"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-[13px] font-extrabold text-ink-invert shadow-[var(--shadow-brand)]">
          {step}
        </span>
        <h2 className="font-display text-[18px] font-bold text-ink">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Field({
  label,
  icon: Icon,
  error,
  required,
  className = "",
  children,
}: {
  label: string;
  icon: typeof User;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-ink-soft">
        {label} {required && <span className="text-brand">*</span>}
      </label>
      <div className="relative">
        <Icon
          size={16}
          className="pointer-events-none absolute left-4 top-4 text-ink-faint"
        />
        {children}
      </div>
      {error && <p className="mt-1.5 text-[11.5px] font-semibold text-chili">{error}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`font-semibold tabular-nums ${tone || "text-ink"}`}>{value}</dd>
    </div>
  );
}
