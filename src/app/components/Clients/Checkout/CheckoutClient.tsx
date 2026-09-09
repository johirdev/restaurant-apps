"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  Check,
  Clock,
  ArrowRight,
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
import { apiGet, apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { useUser } from "@/src/app/components/Clients/Auth/UserProvider";

/* ==========================================================================
   ফর্ম স্কিমা — সার্ভারের createOrderSchema এর নিয়মগুলোই এখানে মিরর করা,
   তাই ভুল ইনপুট সার্ভারে যাওয়ার আগেই ধরা পড়ে।
   ========================================================================== */
const checkoutSchema = z
  .object({
    order_type: z.enum(["delivery", "pickup", "dine_in"]),
    table_id: z.string().trim().optional(),
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
    (v) => v.order_type !== "delivery" || (v.address?.trim().length ?? 0) >= 5,
    { message: "Please give a delivery address (at least 5 characters)", path: ["address"] },
  )
  // ডাইন-ইনে টেবিল লাগবেই — তালিকা থেকে বাছা হোক বা হাতে লেখা হোক
  .refine(
    (v) =>
      v.order_type !== "dine_in" ||
      !!v.table_id?.trim() ||
      !!v.table_number?.trim(),
    {
      message: "Please choose your table",
      path: ["table_id"],
    },
  );

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

/** সার্ভারের `/orders/cooldown` যা ফেরত দেয় */
type Cooldown = {
  can_order: boolean;
  seconds_remaining: number;
  cooldown_seconds: number;
  last_order_number?: string;
  last_order_status?: string;
  next_order_at?: string;
};

/** ৯৫ → "1:35" */
const mmss = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

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
      table_id: "",
    },
    mode: "onTouched",
  });

  const orderType = watch("order_type");
  const paymentMethod = watch("payment_method");
  const phone = watch("phone");

  /* ==========================================================================
     দোকান যা যা অফার করে, শুধু সেগুলোই দেখাই
     ========================================================================== */
  const orderTypes = ORDER_TYPES.filter((t) =>
    settings.order_types.includes(t.value),
  );
  const paymentMethods = PAYMENT_METHODS.filter((m) =>
    settings.payment_methods.includes(m.value),
  );

  // বাছা অপশনটা বন্ধ করে দেওয়া হলে প্রথম চালু অপশনে সরিয়ে আনি,
  // নাহলে ফর্ম এমন একটা মান নিয়ে বসে থাকত যেটা সার্ভার নেবে না
  useEffect(() => {
    if (orderTypes.length && !settings.order_types.includes(orderType)) {
      setValue("order_type", orderTypes[0].value, { shouldValidate: true });
      setOrderType(orderTypes[0].value);
    }
  }, [orderType, orderTypes, settings.order_types, setValue, setOrderType]);

  useEffect(() => {
    if (paymentMethods.length && !settings.payment_methods.includes(paymentMethod)) {
      setValue("payment_method", paymentMethods[0].value, {
        shouldValidate: true,
      });
    }
  }, [paymentMethod, paymentMethods, settings.payment_methods, setValue]);

  /* ==========================================================================
     লগ-ইন করা কাস্টমারের সেভ করা তথ্য বসিয়ে দিই
     --------------------------------------------------------------------------
     প্রোফাইল পেজে লেখাই আছে "একবার দিলে চেকআউট নিজেই ভরে যাবে" — এটা
     সেই প্রতিশ্রুতিটা রাখে। ব্যবহারকারী নিজে কিছু লিখে ফেললে সেটা আর
     বদলানো হয় না, তাই টাইপ করার মাঝপথে লেখা মুছে যায় না।
     ========================================================================== */
  const { user } = useUser();
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (!user || prefilled) return;

    const fill = (field: keyof CheckoutForm, value?: string) => {
      if (value && !watch(field)) setValue(field, value);
    };

    fill("name", user.name);
    fill("phone", user.phone);
    fill("email", user.email);
    fill("address", user.address);
    fill("area", user.district);
    setPrefilled(true);
  }, [user, prefilled, setValue, watch]);

  /* ==========================================================================
     আগের অর্ডারের পরে বিরতি — লাইভ কাউন্টডাউন
     --------------------------------------------------------------------------
     একই নম্বর থেকে পর পর দুটো অর্ডার এলে রান্নাঘরে একই খাবারের দুটো
     টিকিট চলে যায় — প্রায় সবসময়ই "বোতামটা কাজ করেনি" ভেবে দুবার চাপার
     ফল। সার্ভার তাই ৩ মিনিটের বিরতি রাখে।

     কিন্তু সার্ভার ৪২৯ ফেরত দেওয়া মানে কাস্টমার পুরো ফর্ম ভরে, বোতাম
     চেপে, তারপর এররটা দেখল — সবচেয়ে বিরক্তিকর জায়গায় বাধা। তাই নম্বরটা
     লেখা হয়ে যাওয়ার সাথে সাথেই একবার জিজ্ঞেস করে নিই, আর বাকি সময়টা
     পর্দায় সেকেন্ড ধরে নেমে আসে। শেষ হলে বোতাম নিজে থেকেই খুলে যায় —
     পাতা রিফ্রেশ করতে হয় না।

     সময়টা সার্ভারের পাঠানো সেকেন্ড থেকেই গোনা হয়, ফোনের ঘড়ি থেকে নয় —
     ঘড়ি এগিয়ে/পিছিয়ে থাকলেও হিসাব মেলে।
     ========================================================================== */
  const [cooldown, setCooldown] = useState<Cooldown | null>(null);
  const [remaining, setRemaining] = useState(0);
  const checkedFor = useRef<string>("");

  const checkCooldown = useCallback(async (value: string) => {
    try {
      const res = await apiGet<Cooldown>("/api/v1/orders/cooldown", {
        phone: value,
      });
      setCooldown(res.data ?? null);
      setRemaining(res.data?.seconds_remaining ?? 0);
    } catch {
      // জানতে না পারলে কাস্টমারকে আটকাই না — সার্ভার তো পাহারায় আছেই
      setCooldown(null);
      setRemaining(0);
    }
  }, []);

  // নম্বরটা পুরো হলেই একবার দেখে নিই (প্রতি কি-স্ট্রোকে নয়)
  useEffect(() => {
    const value = (phone || "").trim();
    if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(value)) {
      checkedFor.current = "";
      setCooldown(null);
      setRemaining(0);
      return;
    }
    if (checkedFor.current === value) return;

    checkedFor.current = value;
    checkCooldown(value);
  }, [phone, checkCooldown]);

  // সেকেন্ড ধরে নেমে আসা
  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const waiting = remaining > 0;

  /* ==========================================================================
     আসল টেবিলের তালিকা — ডাইন-ইন বাছলে তবেই আনি
     ========================================================================== */
  const [tables, setTables] = useState<
    { _id: string; name: string; capacity: number; zone: string; is_free: boolean }[]
  >([]);

  /** সব টেবিল ভরা থাকলে সারির অবস্থা — কতজন আগে, কত অপেক্ষা */
  const [waitlist, setWaitlist] = useState<{
    waiting: number;
    next_position: number;
    next_wait_minutes: number;
    average_dining_minutes: number;
    measured_from_orders: number;
    can_seat_now: boolean;
  } | null>(null);

  useEffect(() => {
    if (orderType !== "dine_in") return;
    let cancelled = false;

    Promise.all([
      apiGet<typeof tables>("/api/v1/tables/available"),
      apiGet<NonNullable<typeof waitlist>>("/api/v1/tables/waitlist"),
    ])
      .then(([tableRes, waitRes]) => {
        if (cancelled) return;
        setTables(tableRes.data ?? []);
        setWaitlist(waitRes.data ?? null);
      })
      .catch(() => {
        // আনতে না পারলে হাতে লেখা ঘরটাই দেখানো হবে
        if (!cancelled) setTables([]);
      });

    return () => {
      cancelled = true;
    };
  }, [orderType]);

  const belowMinimum =
    orderType === "delivery" && subtotal < settings.min_order_amount;

  const canSubmit =
    hydrated && lines.length > 0 && !belowMinimum && !submitting && !waiting;

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
          // তালিকা থেকে বাছা হলে আইডি যায় (তখন টেবিলটা সত্যিই দখল হয়),
          // টেবিল তৈরি না থাকলে হাতে লেখা নম্বরটাই যায়
          table_id: values.table_id || undefined,
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
      // সার্ভার বিরতির কথা বললে (৪২৯) কাউন্টডাউনটা সাথে সাথে মিলিয়ে নিই
      checkedFor.current = "";
      checkCooldown(values.phone);
      toast.error(getApiErrorMessage(err, "Could not place your order"));
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------------- খালি কার্ট ---------------- */
  if (hydrated && lines.length === 0) {
    return (
      <div className="max-width flex flex-col items-center gap-5 px-4 py-24 text-center sm:px-6">
        <span className="float-y grid h-24 w-24 place-items-center rounded-full bg-surface-soft text-ink-faint shadow-[var(--shadow-float)]">
          <ShoppingBag size={34} />
        </span>
        <h1 className="font-display text-3xl font-extrabold text-ink">
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
    );
  }

  return (
    <div className="max-width px-4 py-10 sm:px-6 sm:py-14">
      {/* ---------------- হেডার ---------------- */}
      <header className="mb-7">
        <Link
          href="/cart"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-brand"
        >
          <ChevronLeft size={16} /> Back to cart
        </Link>
        <p className="site-eyebrow">Almost there</p>
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Checkout
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {itemCount} item{itemCount === 1 ? "" : "s"} · ready in about{" "}
          {settings.avg_prep_minutes} minutes
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
      >
        {/* ================= বাম পাশ — ফর্ম ================= */}
        <div className="flex flex-col gap-5">
          {/* ---------- ধাপ ১ — অর্ডারের ধরন ---------- */}
          <FormPanel step={1} title="How would you like it?">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {orderTypes.map((type) => {
                const Icon = type.icon;
                const active = orderType === type.value;
                return (
                  <ChoiceCard
                    key={type.value}
                    active={active}
                    onClick={() => {
                      setValue("order_type", type.value, { shouldValidate: true });
                      // স্টোরেও জানাই — ডেলিভারি চার্জের হিসাব এর উপর নির্ভর করে
                      setOrderType(type.value);
                    }}
                    icon={<Icon size={20} />}
                    label={type.label}
                    hint={orderTypeHint(type.value, settings.avg_prep_minutes)}
                  />
                );
              })}
            </div>

            {/* ---------- সব টেবিল ভরা — সারিতে দাঁড়ানোর কথা ---------- */}
            {orderType === "dine_in" && waitlist && !waitlist.can_seat_now && (
              <div className="mt-4 rounded-md border border-saffron-dark/30 bg-saffron-soft px-4 py-3.5">
                <p className="text-[13.5px] font-bold text-ink">
                  All tables are full right now
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-ink">
                  <span>
                    <span className="font-extrabold">{waitlist.waiting}</span>{" "}
                    {waitlist.waiting === 1 ? "party" : "parties"} ahead of you
                  </span>
                  <span>
                    Your number:{" "}
                    <span className="font-extrabold">#{waitlist.next_position}</span>
                  </span>
                  <span>
                    About{" "}
                    <span className="font-extrabold">
                      {waitlist.next_wait_minutes} min
                    </span>{" "}
                    wait
                  </span>
                </div>

                <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">
                  Place your order now and we will seat you as soon as a table
                  frees up — the kitchen only starts once you are seated.
                  {waitlist.measured_from_orders > 0 && (
                    <>
                      {" "}
                      (Based on an average of {waitlist.average_dining_minutes} min
                      per table today.)
                    </>
                  )}
                </p>
              </div>
            )}

            {orderType === "dine_in" &&
              (tables.length > 0 ? (
                <Field
                  className="mt-4"
                  label="Which table are you at?"
                  icon={UtensilsCrossed}
                  error={errors.table_id?.message}
                >
                  <select
                    {...register("table_id")}
                    className={`site-input h-12 pl-11 pr-4 text-[14px] ${
                      errors.table_id ? "is-invalid" : ""
                    }`}
                  >
                    <option value="">Choose your table</option>
                    {tables.map((t) => (
                      <option key={t._id} value={t._id} disabled={!t.is_free}>
                        {t.name}
                        {t.zone ? ` — ${t.zone}` : ""} · {t.capacity} seats
                        {t.is_free ? "" : " (in use)"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                /* টেবিল এখনো তৈরি হয়নি — তখন হাতে লেখাই একমাত্র উপায় */
                <Field
                  className="mt-4"
                  label="Table number"
                  icon={UtensilsCrossed}
                  error={errors.table_number?.message}
                >
                  <input
                    {...register("table_number")}
                    placeholder="e.g. T-12"
                    className={`site-input h-12 pl-11 pr-4 text-[14px] ${
                      errors.table_number ? "is-invalid" : ""
                    }`}
                  />
                </Field>
              ))}
          </FormPanel>

          {/* ---------- ধাপ ২ — যোগাযোগ ---------- */}
          <FormPanel step={2} title="Who is it for?">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name" icon={User} error={errors.name?.message} required>
                <input
                  {...register("name")}
                  placeholder="Your name"
                  autoComplete="name"
                  className={`site-input h-12 pl-11 pr-4 text-[14px] ${
                    errors.name ? "is-invalid" : ""
                  }`}
                />
              </Field>

              <Field
                label="Mobile number"
                icon={Phone}
                error={errors.phone?.message}
                required
              >
                <input
                  {...register("phone")}
                  placeholder="01712345678"
                  inputMode="tel"
                  autoComplete="tel"
                  className={`site-input h-12 pl-11 pr-4 text-[14px] ${
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
                  className={`site-input h-12 pl-11 pr-4 text-[14px] ${
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
                      className={`site-input py-3 pl-11 pr-4 text-[14px] leading-relaxed ${
                        errors.address ? "is-invalid" : ""
                      }`}
                    />
                  </Field>

                  <Field label="Area (optional)" icon={MapPin} error={errors.area?.message}>
                    <input
                      {...register("area")}
                      placeholder="e.g. Dhanmondi"
                      className="site-input h-12 pl-11 pr-4 text-[14px]"
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
                  className="site-input py-3 pl-11 pr-4 text-[14px] leading-relaxed"
                />
              </Field>
            </div>
          </FormPanel>

          {/* ---------- ধাপ ৩ — পেমেন্ট ---------- */}
          <FormPanel step={3} title="How will you pay?">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <ChoiceCard
                    key={method.value}
                    active={paymentMethod === method.value}
                    onClick={() =>
                      setValue("payment_method", method.value, {
                        shouldValidate: true,
                      })
                    }
                    icon={<Icon size={18} />}
                    label={method.label}
                    hint={method.hint}
                    compact
                  />
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
          <div className="site-card p-5 shadow-[var(--shadow-float)]">
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
            <dl className="space-y-2.5 text-[13.5px]">
              <Row label="Subtotal" value={formatMoney(pricing.subtotal)} />
              {savings > 0 && (
                <Row
                  label="You save"
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
                tone={
                  orderType === "delivery" && pricing.delivery_fee === 0
                    ? "text-herb-dark"
                    : undefined
                }
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

            {/* ---------- আগের অর্ডারের বিরতি ---------- */}
            {waiting && (
              <div className="mt-3 rounded-md border border-border bg-surface-soft px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-dark">
                    <Clock size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-ink">
                      We already have your order
                    </p>
                    <p className="text-[12px] text-ink-soft">
                      {cooldown?.last_order_number ? (
                        <>
                          {cooldown.last_order_number} is in the kitchen. You can
                          order again in{" "}
                        </>
                      ) : (
                        <>You can order again in </>
                      )}
                      <span className="font-bold tabular-nums text-brand">
                        {mmss(remaining)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* সময়ের সাথে ভরে ওঠা রেখা — কতটা বাকি এক নজরেই বোঝা যায় */}
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-pill bg-border">
                  <div
                    className="h-full rounded-pill bg-brand transition-[width] duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          100 -
                            (remaining / (cooldown?.cooldown_seconds || 180)) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>

                <Link
                  href="/track-order"
                  className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-bold text-brand hover:underline"
                >
                  Track that order <ArrowRight size={13} />
                </Link>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="site-btn site-btn-primary mt-4 h-12 w-full text-[13.5px] uppercase tracking-wide"
            >
              {submitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Placing order…
                </>
              ) : waiting ? (
                <>
                  <Clock size={16} /> Available in {mmss(remaining)}
                </>
              ) : (
                <>Place order · {formatMoney(pricing.total)}</>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-faint">
              <ShieldCheck size={13} /> Your details are only used for this order.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ==========================================================================
   ছোট প্রেজেন্টেশনাল কম্পোনেন্ট
   --------------------------------------------------------------------------
   পুরো সাইট `site-card` / `site-input` / `site-btn` ব্যবহার করে, তাই
   চেকআউটও তাই করে। আগে এই পাতাটা একাই আলাদা একটা "3D" ভাষায় কথা বলত —
   কাচের প্যানেল, কাত হয়ে থাকা কার্ড, নিচে মোটা ছায়াওয়ালা বোতাম আর
   পেছনে তিন রঙের গ্রেডিয়েন্ট। কার্ট থেকে চেকআউটে এলে মনে হতো অন্য
   কোনো সাইটে চলে এসেছি, আর টাকা দেওয়ার ঠিক আগের মুহূর্তে সেই খটকাটাই
   সবচেয়ে ক্ষতিকর।
   ========================================================================== */

function FormPanel({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="site-card p-5 sm:p-6">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-[12.5px] font-extrabold text-ink-invert">
          {step}
        </span>
        <h2 className="font-display text-[17px] font-bold text-ink">{title}</h2>
      </header>
      {children}
    </section>
  );
}

/**
 * বাছাইয়ের কার্ড — অর্ডারের ধরন আর পেমেন্ট, দুটোতেই একই চেহারা।
 * বাছা হয়েছে কিনা সেটা বোঝানো হয় রঙ আর একটা ছোট টিক দিয়ে; কার্ড
 * সামনে ভেসে ওঠার দরকার নেই।
 */
function ChoiceCard({
  active,
  onClick,
  icon,
  label,
  hint,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col items-center gap-1 rounded-md border text-center transition-colors ${
        compact ? "p-3.5" : "p-4"
      } ${
        active
          ? "border-brand bg-brand-tint"
          : "border-border bg-surface hover:border-brand/40 hover:bg-brand-tint/50"
      }`}
    >
      {active && (
        <span className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-brand text-ink-invert">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
      <span className={active ? "text-brand" : "text-ink-faint"}>{icon}</span>
      <span
        className={`text-[12.5px] font-bold ${active ? "text-brand-dark" : "text-ink"}`}
      >
        {label}
      </span>
      <span className="text-[11px] text-ink-faint">{hint}</span>
    </button>
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
