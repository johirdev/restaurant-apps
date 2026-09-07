"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Trash2, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import {
  useCartStore,
  useCartHydrated,
  selectItemCount,
  selectSubtotal,
  selectSavings,
  useAmountToFreeDelivery,
} from "@/src/store/cart.store";
import { formatMoney } from "@/src/config/business";
import { useSettingsStore } from "@/src/store/settings.store";

/* ==========================================================================
   CART DRAWER — ডানপাশ থেকে স্লাইড করে আসে (foodpanda স্টাইল)
   (site)/layout.tsx এ একবার মাউন্ট করা আছে, তাই যেকোনো পেজ থেকে
   `useCartStore.getState().openCart()` ডাকলেই খুলবে।
   ========================================================================== */
export default function CartDrawer() {
  const router = useRouter();
  const hydrated = useCartHydrated();

  const isOpen = useCartStore((s) => s.isOpen);
  const lines = useCartStore((s) => s.lines);
  const closeCart = useCartStore((s) => s.closeCart);
  const increment = useCartStore((s) => s.increment);
  const decrement = useCartStore((s) => s.decrement);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  const count = useCartStore(selectItemCount);
  const subtotal = useCartStore(selectSubtotal);
  const savings = useCartStore(selectSavings);
  const toFreeDelivery = useAmountToFreeDelivery();
  const freeDeliveryAbove = useSettingsStore((s) => s.settings.free_delivery_above);

  // ড্রয়ার খোলা থাকলে পেছনের পেজ স্ক্রল হবে না
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Esc চাপলে বন্ধ
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  if (!isOpen) return null;

  const freeDeliveryProgress = Math.min(
    100,
    (subtotal / freeDeliveryAbove) * 100,
  );

  const goToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-modal="true">
      {/* ব্যাকড্রপ */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeCart}
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
      />

      {/* প্যানেল */}
      <aside className="relative slide-in-right flex h-full w-full max-w-[420px] flex-col bg-surface shadow-[var(--shadow-lifted)]">
        {/* ---------- হেডার ---------- */}
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand">
              <ShoppingBag size={17} />
            </span>
            <div>
              <h2 className="font-display text-[17px] font-bold leading-tight text-ink">
                Your Cart
              </h2>
              <p className="text-[11.5px] text-ink-faint">
                {hydrated ? `${count} item${count === 1 ? "" : "s"}` : "Loading…"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="grid h-9 w-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-soft hover:text-ink"
          >
            <X size={18} />
          </button>
        </header>

        {/* ---------- ফ্রি ডেলিভারি প্রগ্রেস ---------- */}
        {hydrated && lines.length > 0 && (
          <div className="border-b border-border bg-brand-tint px-5 py-3">
            <p className="text-[12px] font-semibold text-ink">
              {toFreeDelivery > 0 ? (
                <>
                  Add <span className="text-brand">{formatMoney(toFreeDelivery)}</span> more
                  for <span className="text-brand">free delivery</span>
                </>
              ) : (
                <span className="text-herb-dark">🎉 You have unlocked free delivery!</span>
              )}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-500"
                style={{ width: `${freeDeliveryProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ---------- আইটেম লিস্ট ---------- */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!hydrated ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-20 rounded-md" />
              ))}
            </div>
          ) : lines.length === 0 ? (
            <EmptyCart onBrowse={closeCart} />
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={line.key}
                  className="pop-in flex gap-3 rounded-md border border-border bg-surface p-2.5"
                >
                  {/* ছবি */}
                  <div className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-sm bg-surface-soft">
                    {line.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={line.image}
                        alt={line.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[10px] text-ink-faint">
                        No image
                      </div>
                    )}
                  </div>

                  {/* বিবরণ */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="clamp-1 text-[13px] font-bold text-ink">
                          {line.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => removeItem(line.key)}
                          aria-label={`Remove ${line.name}`}
                          className="shrink-0 text-ink-faint transition-colors hover:text-chili"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {line.variation_name && (
                        <p className="text-[11.5px] text-ink-faint">{line.variation_name}</p>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      {/* কোয়ান্টিটি স্টেপার */}
                      <div className="flex items-center gap-1 rounded-full border border-border">
                        <button
                          type="button"
                          onClick={() => decrement(line.key)}
                          aria-label="Decrease quantity"
                          className="grid h-7 w-7 place-items-center rounded-full text-ink-soft transition-colors hover:bg-surface-soft"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-5 text-center text-[12.5px] font-bold tabular-nums text-ink">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => increment(line.key)}
                          aria-label="Increase quantity"
                          className="grid h-7 w-7 place-items-center rounded-full text-brand transition-colors hover:bg-brand-soft"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="text-right">
                        {line.regular_price > line.unit_price && (
                          <span className="mr-1.5 text-[11px] text-ink-faint line-through">
                            {formatMoney(line.regular_price * line.quantity)}
                          </span>
                        )}
                        <span className="text-[13.5px] font-extrabold text-ink">
                          {formatMoney(line.unit_price * line.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ---------- ফুটার ---------- */}
        {hydrated && lines.length > 0 && (
          <footer className="border-t border-border bg-surface px-5 py-4">
            {savings > 0 && (
              <p className="mb-2 text-center text-[12px] font-semibold text-herb-dark">
                You are saving {formatMoney(savings)} on this order
              </p>
            )}

            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] text-ink-soft">Subtotal</span>
              <span className="font-display text-[19px] font-extrabold text-ink">
                {formatMoney(subtotal)}
              </span>
            </div>
            <p className="mb-3 text-[11px] text-ink-faint">
              Delivery charge and VAT are calculated at checkout.
            </p>

            <button
              type="button"
              onClick={goToCheckout}
              className="site-btn site-btn-primary h-12 w-full text-[13.5px] uppercase tracking-wide"
            >
              Checkout <ArrowRight size={16} />
            </button>

            <div className="mt-2 flex items-center justify-between">
              <Link
                href="/cart"
                onClick={closeCart}
                className="text-[12px] font-semibold text-ink-soft underline-offset-2 hover:text-brand hover:underline"
              >
                View full cart
              </Link>
              <button
                type="button"
                onClick={clear}
                className="text-[12px] font-semibold text-ink-faint hover:text-chili"
              >
                Clear cart
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}

function EmptyCart({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-surface-soft text-ink-faint float-y">
        <ShoppingBag size={30} />
      </span>
      <div>
        <h3 className="font-display text-[17px] font-bold text-ink">
          Your cart is empty
        </h3>
        <p className="mt-1 text-[13px] text-ink-soft">
          Looks like you have not added anything yet. Let&apos;s fix that.
        </p>
      </div>
      <Link
        href="/foods"
        onClick={onBrowse}
        className="site-btn site-btn-primary h-11 px-6 text-[13px]"
      >
        Browse the menu
      </Link>
    </div>
  );
}
