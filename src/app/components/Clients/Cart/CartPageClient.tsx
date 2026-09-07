"use client";

import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Tag } from "lucide-react";
import {
  useCartStore,
  useCartHydrated,
  selectSubtotal,
  useCartPricing,
  selectSavings,
  selectItemCount,
  useAmountToFreeDelivery,
} from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";
import { useSettings } from "@/src/store/settings.store";

/* ==========================================================================
   পুরো কার্ট পেজ — ড্রয়ারের বড় ভার্সন, প্রতিটা আইটেমে নোট লেখার সুযোগ সহ
   ========================================================================== */
export default function CartPageClient() {
  const hydrated = useCartHydrated();

  const lines = useCartStore((s) => s.lines);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const removeItem = useCartStore((s) => s.removeItem);
  const setNote = useCartStore((s) => s.setNote);
  const clear = useCartStore((s) => s.clear);

  const subtotal = useCartStore(selectSubtotal);
  const pricing = useCartPricing();
  const savings = useCartStore(selectSavings);
  const count = useCartStore(selectItemCount);
  const toFreeDelivery = useAmountToFreeDelivery();
  const settings = useSettings();

  /* ---------- লোডিং ---------- */
  if (!hydrated) {
    return (
      <div className="max-width px-4 py-14 sm:px-6">
        <div className="skeleton mb-6 h-9 w-52 rounded-sm" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-28 rounded-md" />
            ))}
          </div>
          <div className="skeleton h-72 rounded-md" />
        </div>
      </div>
    );
  }

  /* ---------- খালি কার্ট ---------- */
  if (lines.length === 0) {
    return (
      <div className="aurora-brand">
        <div className="max-width flex flex-col items-center gap-5 px-4 py-24 text-center sm:px-6">
          <span className="float-y grid h-24 w-24 place-items-center rounded-full bg-surface text-ink-faint shadow-[var(--shadow-float)]">
            <ShoppingBag size={34} />
          </span>
          <h1 className="font-display text-3xl font-extrabold text-ink">
            Your cart is empty
          </h1>
          <p className="max-w-md text-[14px] text-ink-soft">
            Hungry? Browse the menu and add a few dishes — they will show up right
            here.
          </p>
          <Link href="/foods" className="site-btn site-btn-primary h-12 px-8">
            Browse the menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-width px-4 py-10 sm:px-6 sm:py-14">
      {/* ---------- হেডার ---------- */}
      <header className="mb-7">
        <p className="site-eyebrow">Your order</p>
        <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Shopping cart
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          {count} item{count === 1 ? "" : "s"} in your cart
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ================= আইটেম লিস্ট ================= */}
        <section className="flex flex-col gap-4">
          {/* ফ্রি ডেলিভারি প্রগ্রেস */}
          {toFreeDelivery > 0 ? (
            <div className="flex items-center gap-3 rounded-md border border-brand/20 bg-brand-tint px-4 py-3">
              <Tag size={17} className="shrink-0 text-brand" />
              <p className="text-[13px] font-semibold text-ink">
                Add <span className="text-brand">{formatMoney(toFreeDelivery)}</span> more
                and delivery is on us.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-herb/20 bg-herb-soft px-4 py-3">
              <Tag size={17} className="shrink-0 text-herb-dark" />
              <p className="text-[13px] font-semibold text-herb-dark">
                Free delivery unlocked on this order 🎉
              </p>
            </div>
          )}

          {lines.map((line) => (
            <article
              key={line.key}
              className="site-card flex flex-col gap-3 p-3.5 sm:flex-row sm:gap-4"
            >
              {/* ছবি */}
              <div className="h-28 w-full shrink-0 overflow-hidden rounded-sm bg-surface-soft sm:h-24 sm:w-24">
                {line.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={line.image}
                    alt={line.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[11px] text-ink-faint">
                    No image
                  </div>
                )}
              </div>

              {/* বিবরণ */}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[15px] font-bold text-ink">
                      {line.name}
                    </h2>
                    {line.variation_name && (
                      <p className="text-[12px] text-ink-faint">{line.variation_name}</p>
                    )}
                    <p className="mt-0.5 text-[12.5px] text-ink-soft">
                      {formatMoney(line.unit_price)} each
                      {line.regular_price > line.unit_price && (
                        <span className="ml-1.5 text-ink-faint line-through">
                          {formatMoney(line.regular_price)}
                        </span>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(line.key)}
                    aria-label={`Remove ${line.name}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint transition-colors hover:bg-chili-soft hover:text-chili"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* রান্নাঘরের জন্য নোট */}
                <input
                  value={line.note || ""}
                  onChange={(e) => setNote(line.key, e.target.value)}
                  placeholder="Add a note for this item (optional)"
                  className="site-input h-9 px-3 text-[12.5px]"
                />

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-pill border border-border">
                    <button
                      type="button"
                      onClick={() => decrement(line.key)}
                      aria-label="Decrease quantity"
                      className="grid h-9 w-9 place-items-center rounded-pill text-ink-soft transition-colors hover:bg-surface-soft"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-7 text-center text-[13px] font-bold tabular-nums text-ink">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increment(line.key)}
                      aria-label="Increase quantity"
                      className="grid h-9 w-9 place-items-center rounded-pill text-brand transition-colors hover:bg-brand-soft"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <span className="font-display text-[18px] font-extrabold text-ink">
                    {formatMoney(line.unit_price * line.quantity)}
                  </span>
                </div>
              </div>
            </article>
          ))}

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/foods"
              className="text-[13px] font-bold text-brand underline-offset-2 hover:underline"
            >
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={clear}
              className="text-[13px] font-semibold text-ink-faint transition-colors hover:text-chili"
            >
              Clear cart
            </button>
          </div>
        </section>

        {/* ================= সামারি ================= */}
        <aside className="lg:sticky lg:top-6">
          <div className="site-card p-5 shadow-[var(--shadow-float)]">
            <h2 className="font-display text-[18px] font-bold text-ink">
              Order total
            </h2>

            <dl className="mt-4 space-y-2.5 text-[13.5px]">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold tabular-nums text-ink">
                  {formatMoney(pricing.subtotal)}
                </dd>
              </div>

              {savings > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">You save</dt>
                  <dd className="font-semibold tabular-nums text-herb-dark">
                    − {formatMoney(savings)}
                  </dd>
                </div>
              )}

              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd
                  className={`font-semibold tabular-nums ${
                    pricing.delivery_fee === 0 ? "text-herb-dark" : "text-ink"
                  }`}
                >
                  {pricing.delivery_fee === 0 ? "FREE" : formatMoney(pricing.delivery_fee)}
                </dd>
              </div>

              {pricing.service_charge > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">
                    Service charge ({pricing.service_charge_percent}%)
                  </dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatMoney(pricing.service_charge)}
                  </dd>
                </div>
              )}

              {settings.vat_percent > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-ink-soft">
                    VAT ({settings.vat_percent}%
                    {/* দামের ভেতরে ভ্যাট থাকলে বাড়তি কিছু যোগ হচ্ছে না */}
                    {pricing.tax_mode === "inclusive" ? " — included" : ""})
                  </dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatMoney(pricing.vat)}
                  </dd>
                </div>
              )}
            </dl>

            <div className="mt-4 flex items-baseline justify-between rounded-md bg-ink px-4 py-3 text-ink-invert">
              <span className="text-[13px] font-semibold opacity-90">Total</span>
              <span className="font-display text-2xl font-extrabold">
                {formatMoney(pricing.total)}
              </span>
            </div>

            {subtotal < settings.min_order_amount && (
              <p className="mt-3 rounded-sm bg-chili-soft px-3.5 py-2.5 text-[12px] font-semibold text-chili-dark">
                Minimum delivery order is {formatMoney(settings.min_order_amount)}. You can
                still choose pickup at checkout.
              </p>
            )}

            <Link
              href="/checkout"
              className="site-btn site-btn-primary mt-4 h-12 w-full text-[13.5px] uppercase tracking-wide"
            >
              Checkout <ArrowRight size={16} />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
