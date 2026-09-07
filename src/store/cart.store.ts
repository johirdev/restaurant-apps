"use client";

import { useMemo, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { calcOrderPricing } from "../config/business";
import { useSettings, useSettingsStore } from "./settings.store";

/* ==========================================================================
   CART STORE (Zustand + localStorage persist)
   --------------------------------------------------------------------------
   পেজ রিফ্রেশ করলেও কার্ট থাকবে। প্রতিটা লাইন food + variation এর
   জোড়া ধরে আলাদা — একই খাবারের Small আর Large আলাদা লাইন হবে।
   ========================================================================== */

export type OrderType = "delivery" | "pickup" | "dine_in";

export interface CartLine {
  /** `${food_id}::${variation_id}` — লাইনের ইউনিক কী */
  key: string;
  food_id: string;
  variation_id: string;
  name: string;
  variation_name: string;
  image?: string;
  /** কাটা দাম (আসল দাম) — ডিসকাউন্ট দেখানোর জন্য */
  regular_price: number;
  /** এখন যে দামে বিক্রি হচ্ছে */
  unit_price: number;
  quantity: number;
  spice_level?: string;
  note?: string;
  /** স্টক থাকলে সর্বোচ্চ কত নেওয়া যাবে */
  max_quantity?: number;
}

export type AddToCartInput = Omit<CartLine, "key" | "quantity"> & {
  quantity?: number;
};

interface CartState {
  lines: CartLine[];
  orderType: OrderType;
  /** কার্ট ড্রয়ার খোলা আছে কিনা */
  isOpen: boolean;
  /** সর্বশেষ যোগ হওয়া লাইনের key — নেভবারের ব্যাজে অ্যানিমেশন ট্রিগার করে */
  lastAddedKey: string | null;

  addItem: (item: AddToCartInput) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  setNote: (key: string, note: string) => void;
  setOrderType: (type: OrderType) => void;
  clear: () => void;

  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

export const lineKey = (foodId: string, variationId: string) =>
  `${foodId}::${variationId}`;

const clampQty = (qty: number, max?: number) => {
  const n = Math.floor(Number(qty) || 0);
  const upper = typeof max === "number" && max > 0 ? Math.min(max, 50) : 50;
  return Math.max(1, Math.min(n, upper));
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      orderType: "delivery",
      isOpen: false,
      lastAddedKey: null,

      addItem: (item) =>
        set((state) => {
          const key = lineKey(item.food_id, item.variation_id);
          const existing = state.lines.find((l) => l.key === key);
          const addQty = clampQty(item.quantity ?? 1, item.max_quantity);

          const lines = existing
            ? state.lines.map((l) =>
                l.key === key
                  ? {
                      ...l,
                      // দাম সবসময় সর্বশেষ যেটা এল সেটাই — মেনুতে দাম বদলালে কার্টও আপডেট হয়
                      unit_price: item.unit_price,
                      regular_price: item.regular_price,
                      quantity: clampQty(l.quantity + addQty, item.max_quantity),
                    }
                  : l,
              )
            : [...state.lines, { ...item, key, quantity: addQty }];

          return { lines, lastAddedKey: key };
        }),

      removeItem: (key) =>
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),

      setQuantity: (key, quantity) =>
        set((state) => ({
          lines:
            quantity < 1
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) =>
                  l.key === key
                    ? { ...l, quantity: clampQty(quantity, l.max_quantity) }
                    : l,
                ),
        })),

      increment: (key) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.key === key
              ? { ...l, quantity: clampQty(l.quantity + 1, l.max_quantity) }
              : l,
          ),
        })),

      decrement: (key) =>
        set((state) => ({
          lines: state.lines.flatMap((l) => {
            if (l.key !== key) return [l];
            // ১ থেকে কমালে লাইনটাই কার্ট থেকে চলে যাবে
            return l.quantity <= 1 ? [] : [{ ...l, quantity: l.quantity - 1 }];
          }),
        })),

      setNote: (key, note) =>
        set((state) => ({
          lines: state.lines.map((l) =>
            l.key === key ? { ...l, note: note.slice(0, 200) } : l,
          ),
        })),

      setOrderType: (orderType) => set({ orderType }),

      clear: () => set({ lines: [], lastAddedKey: null }),

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "restaurant-cart",
      storage: createJSONStorage(() => localStorage),
      // ড্রয়ার খোলা/বন্ধ অবস্থা সেভ করার দরকার নেই
      partialize: (state) => ({ lines: state.lines, orderType: state.orderType }),
    },
  ),
);

/**
 * localStorage পড়া শেষ হয়েছে কিনা।
 * সার্ভারে কার্ট সবসময় খালি, ব্রাউজারে হয়তো ৩টা আইটেম — তাই hydration
 * শেষ হওয়ার আগে সংখ্যা দেখালে React "hydration mismatch" এরর দেয়।
 * নেভবারের ব্যাজ / কার্ট পেজ এই হুক দিয়ে অপেক্ষা করে।
 */
export function useCartHydrated() {
  return useSyncExternalStore(
    (onChange) => useCartStore.persist.onFinishHydration(onChange),
    () => useCartStore.persist.hasHydrated(),
    () => false, // সার্ভারে কখনোই hydrate হয়নি
  );
}

/* ==========================================================================
   SELECTORS — কম্পোনেন্ট শুধু যেটা দরকার সেটাই সাবস্ক্রাইব করে,
   ফলে অপ্রয়োজনীয় রি-রেন্ডার হয় না।
   ========================================================================== */

/** কার্টে মোট কয়টা আইটেম (quantity সহ) */
export const selectItemCount = (s: CartState) =>
  s.lines.reduce((sum, l) => sum + l.quantity, 0);

/** পণ্যের মোট দাম (ডেলিভারি/ভ্যাট ছাড়া) */
export const selectSubtotal = (s: CartState) =>
  Math.round(s.lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0) * 100) /
  100;

/** মোট কত টাকা সাশ্রয় হলো */
export const selectSavings = (s: CartState) =>
  Math.round(
    s.lines.reduce(
      (sum, l) => sum + Math.max(0, l.regular_price - l.unit_price) * l.quantity,
      0,
    ) * 100,
  ) / 100;

/**
 * চূড়ান্ত হিসাব — সার্ভারের `calcOrderPricing` ঠিক এই ফাংশনটাই ব্যবহার করে,
 * তাই চেকআউটে দেখানো টোটাল আর ইনভয়েসের টোটাল সবসময় এক।
 *
 * হারগুলো (ভ্যাট, সার্ভিস চার্জ) এখন সেটিংস স্টোর থেকে আসে। সেটিংস সার্ভার
 * থেকে আসতে একটু দেরি হয়, তাই হুকটা দুটো স্টোরেই সাবস্ক্রাইব করে — নাহলে
 * প্রথম রেন্ডারে ডিফল্ট হারে হিসাব বসে গিয়ে আর কখনো আপডেট হতো না।
 */
export const useCartPricing = () => {
  const subtotal = useCartStore(selectSubtotal);
  const orderType = useCartStore((s) => s.orderType);
  const settings = useSettings();

  return useMemo(
    () => calcOrderPricing({ subtotal, orderType }, settings),
    [subtotal, orderType, settings],
  );
};

/** ডেলিভারি ফ্রি হতে আর কত টাকা বাকি (০ হলে ইতিমধ্যেই ফ্রি) */
export const useAmountToFreeDelivery = () => {
  const subtotal = useCartStore(selectSubtotal);
  const freeAbove = useSettingsStore((s) => s.settings.free_delivery_above);
  return Math.max(0, freeAbove - subtotal);
};

/** ডেলিভারির সর্বনিম্ন অর্ডার পূরণ হয়েছে কিনা */
export const useMeetsMinimum = () => {
  const subtotal = useCartStore(selectSubtotal);
  const orderType = useCartStore((s) => s.orderType);
  const minOrder = useSettingsStore((s) => s.settings.min_order_amount);
  return orderType !== "delivery" || subtotal >= minOrder;
};
