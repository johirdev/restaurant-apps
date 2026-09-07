"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChefHat,
  Bike,
  PackageCheck,
  Clock,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { apiGet, getApiErrorMessage } from "@/src/lib/apiClient";
import { formatMoney } from "@/src/config/business";

/* ==========================================================================
   ORDER TRACKER — অর্ডার দেওয়ার পরের পেজ + যেকোনো সময় অর্ডার খোঁজার পেজ
   ========================================================================== */

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface TrackedOrder {
  _id: string;
  order_number: string;
  status: OrderStatus;
  order_type: "delivery" | "pickup" | "dine_in";
  payment_method: string;
  payment_status: string;
  createdAt: string;
  customer: { name: string; phone: string; address?: string; area?: string };
  items: {
    name: string;
    variation_name?: string;
    quantity: number;
    unit_price: number;
    image?: string;
  }[];
  pricing: {
    subtotal: number;
    delivery_fee: number;
    discount: number;
    vat: number;
    total: number;
  };
}

/** ডেলিভারি অর্ডারের ধাপগুলো — কাস্টমার যা দেখে */
const STEPS: { status: OrderStatus; label: string; icon: typeof Clock }[] = [
  { status: "pending", label: "Order placed", icon: Clock },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { status: "preparing", label: "In the kitchen", icon: ChefHat },
  { status: "out_for_delivery", label: "On the way", icon: Bike },
  { status: "delivered", label: "Delivered", icon: PackageCheck },
];

export default function OrderTracker() {
  const params = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(params.get("order") ?? "");
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  // URL এ order+phone থাকলে মাউন্টেই লোড শুরু হবে, তাই লোডিং সত্য দিয়ে শুরু
  const [loading, setLoading] = useState(
    () => !!(params.get("order") && params.get("phone")),
  );
  const [error, setError] = useState("");

  // যে অর্ডারটা দেখাতে হবে — ফর্ম সাবমিট / রিফ্রেশ এই query বদলায়,
  // আর ইফেক্ট সেটা দেখে ডেটা আনে। nonce একই নম্বরে বারবার রিফ্রেশ করতে দেয়।
  const [query, setQuery] = useState(() => ({
    orderNo: params.get("order") ?? "",
    mobile: params.get("phone") ?? "",
    nonce: 0,
  }));

  useEffect(() => {
    const { orderNo, mobile } = query;
    if (!orderNo.trim() || !mobile.trim()) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<TrackedOrder>("/api/v1/orders/track", {
          order_number: orderNo.trim(),
          phone: mobile.trim(),
        });
        if (cancelled) return;
        setOrder(res.data);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setOrder(null);
          setError(getApiErrorMessage(err, "Could not find that order"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  /** নতুন করে খোঁজা শুরু করি */
  const lookup = (orderNo: string, mobile: string) => {
    if (!orderNo.trim() || !mobile.trim()) return;
    setLoading(true);
    setQuery((q) => ({ orderNo, mobile, nonce: q.nonce + 1 }));
  };

  const justPlaced = !!params.get("order");
  const currentIndex = order ? STEPS.findIndex((s) => s.status === order.status) : -1;

  return (
    <div className="aurora-brand min-h-[80vh] py-10 sm:py-14">
      <div className="max-width px-4 sm:px-6">
        {/* ---------- সফলতার বার্তা ---------- */}
        {justPlaced && order && order.status !== "cancelled" && (
          <div className="pop-in mb-7 flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-herb-soft text-herb-dark shadow-[var(--shadow-float)]">
              <CheckCircle2 size={38} />
            </span>
            <p className="site-eyebrow mt-4">Thank you</p>
            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Your order is in!
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-soft">
              We sent it straight to the kitchen. Keep this order number handy:
            </p>
            <span className="mt-3 rounded-pill bg-ink px-5 py-2 font-display text-[16px] font-extrabold tracking-wide text-ink-invert">
              {order.order_number}
            </span>
          </div>
        )}

        {!justPlaced && (
          <header className="mb-7 text-center">
            <p className="site-eyebrow">Where is my food?</p>
            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Track your order
            </h1>
          </header>
        )}

        {/* ---------- খোঁজার ফর্ম ---------- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            lookup(orderNumber, phone);
          }}
          className="mx-auto mb-7 grid max-w-2xl grid-cols-1 gap-3 rounded-md border border-border bg-surface p-4 shadow-[var(--shadow-raised)] sm:grid-cols-[1fr_1fr_auto]"
        >
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order number (ORD-…)"
            className="site-input h-11 px-3.5 text-[13.5px]"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Mobile number"
            inputMode="tel"
            className="site-input h-11 px-3.5 text-[13.5px]"
          />
          <button
            type="submit"
            disabled={loading}
            className="site-btn site-btn-primary h-11 px-6 text-[13px]"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Track
          </button>
        </form>

        {error && (
          <p className="mx-auto mb-6 max-w-2xl rounded-md bg-chili-soft px-4 py-3 text-center text-[13px] font-semibold text-chili-dark">
            {error}
          </p>
        )}

        {/* ---------- অর্ডারের বিবরণ ---------- */}
        {order && (
          <div className="mx-auto grid max-w-4xl gap-5">
            {/* স্ট্যাটাস টাইমলাইন */}
            <section className="site-card p-5 shadow-[var(--shadow-float)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-ink">
                    Order {order.order_number}
                  </h2>
                  <p className="text-[12.5px] text-ink-faint">
                    Placed on{" "}
                    {new Date(order.createdAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => lookup(order.order_number, order.customer.phone)}
                  className="site-btn site-btn-outline h-9 px-4 text-[12px]"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>

              {order.status === "cancelled" ? (
                <div className="flex items-center gap-3 rounded-md bg-chili-soft px-4 py-4">
                  <XCircle size={26} className="shrink-0 text-chili-dark" />
                  <div>
                    <p className="text-[14px] font-bold text-chili-dark">
                      This order was cancelled
                    </p>
                    <p className="text-[12.5px] text-ink-soft">
                      If this was a mistake, please call us and we will sort it out.
                    </p>
                  </div>
                </div>
              ) : (
                <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = currentIndex >= i;
                    const active = currentIndex === i;
                    return (
                      <li
                        key={step.status}
                        className="relative flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
                      >
                        {/* সংযোগ রেখা */}
                        {i > 0 && (
                          <span
                            className={`absolute left-[19px] top-0 h-1/2 w-0.5 -translate-y-full sm:left-0 sm:top-[19px] sm:h-0.5 sm:w-1/2 sm:translate-y-0 ${
                              done ? "bg-brand" : "bg-border"
                            }`}
                          />
                        )}
                        <span
                          className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors ${
                            done
                              ? "bg-brand text-ink-invert shadow-[var(--shadow-brand)]"
                              : "bg-surface-soft text-ink-faint"
                          } ${active ? "ring-4 ring-brand-soft" : ""}`}
                        >
                          <Icon size={18} />
                        </span>
                        <span
                          className={`py-3 text-[12.5px] font-bold sm:py-0 ${
                            done ? "text-ink" : "text-ink-faint"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            {/* আইটেম + হিসাব */}
            <section className="site-card p-5 sm:p-6">
              <h3 className="mb-4 font-display text-[17px] font-bold text-ink">
                What you ordered
              </h3>

              <ul className="space-y-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-brand-soft text-[12px] font-extrabold text-brand-dark">
                      {item.quantity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-ink">{item.name}</p>
                      {item.variation_name && (
                        <p className="text-[11.5px] text-ink-faint">{item.variation_name}</p>
                      )}
                    </div>
                    <span className="text-[13.5px] font-bold tabular-nums text-ink">
                      {formatMoney(item.unit_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <hr className="my-4 border-border" />

              <dl className="space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Subtotal</dt>
                  <dd className="font-semibold text-ink">
                    {formatMoney(order.pricing.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Delivery</dt>
                  <dd className="font-semibold text-ink">
                    {order.pricing.delivery_fee === 0
                      ? "FREE"
                      : formatMoney(order.pricing.delivery_fee)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ink-soft">VAT</dt>
                  <dd className="font-semibold text-ink">{formatMoney(order.pricing.vat)}</dd>
                </div>
              </dl>

              <div className="mt-4 flex items-baseline justify-between rounded-md bg-ink px-4 py-3 text-ink-invert">
                <span className="text-[13px] font-semibold opacity-90">
                  Total ({order.payment_method.toUpperCase()} ·{" "}
                  {order.payment_status})
                </span>
                <span className="font-display text-2xl font-extrabold">
                  {formatMoney(order.pricing.total)}
                </span>
              </div>

              {order.customer.address && (
                <p className="mt-4 text-[12.5px] text-ink-soft">
                  <span className="font-bold text-ink">Delivering to:</span>{" "}
                  {order.customer.address}
                  {order.customer.area ? `, ${order.customer.area}` : ""}
                </p>
              )}
            </section>

            <div className="text-center">
              <Link href="/foods" className="site-btn site-btn-outline h-11 px-7 text-[13px]">
                Order something else
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
