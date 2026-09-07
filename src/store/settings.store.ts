"use client";

import { create } from "zustand";
import {
  DEFAULT_SETTINGS,
  type IRestaurantSettings,
} from "../interfaces/settings.interface";
import { setActiveCurrency } from "../config/business";

/* ==========================================================================
   RESTAURANT SETTINGS (client cache)
   --------------------------------------------------------------------------
   ভ্যাট, সার্ভিস চার্জ, ডেলিভারি ফি — সব ম্যানেজার ড্যাশবোর্ড থেকে বদলায়।
   পুরো অ্যাপে একবারই `/api/v1/settings` ডাকা হয়, উত্তরটা এখানে থাকে।

   কার্টের সিলেক্টরগুলো হুকের বাইরে থেকে (সরাসরি `getSettings()` দিয়ে) মান
   পড়ে, তাই স্টোরটা zustand — কনটেক্সট নয়।
   ========================================================================== */

interface SettingsState {
  settings: IRestaurantSettings;
  /** সার্ভার থেকে একবার লোড হয়েছে কিনা */
  loaded: boolean;
  loading: boolean;
  load: (force?: boolean) => Promise<void>;
  /** সেটিংস পেজ সেভ করার পর সাথে সাথে সবখানে নতুন মান বসাতে */
  setSettings: (settings: Partial<IRestaurantSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  loading: false,

  load: async (force = false) => {
    const { loaded, loading } = get();
    if ((loaded && !force) || loading) return;

    set({ loading: true });
    try {
      const res = await fetch("/api/v1/settings", { credentials: "include" });
      const body = await res.json();
      if (body?.data) {
        // সার্ভার শুধু পাবলিক ফিল্ডগুলো পাঠায়; বাকিগুলো ডিফল্ট থেকেই আসে
        const settings = { ...DEFAULT_SETTINGS, ...body.data };
        setActiveCurrency(settings.currency);
        set({ settings, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      // সেটিংস না এলে ডিফল্ট দিয়েই চলুক — দোকান বন্ধ হয়ে যাওয়ার দরকার নেই
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  setSettings: (patch) =>
    set((s) => {
      const settings = { ...s.settings, ...patch };
      setActiveCurrency(settings.currency);
      return { settings, loaded: true };
    }),
}));

/** কম্পোনেন্টের ভেতরে */
export const useSettings = () => useSettingsStore((s) => s.settings);

/** হুকের বাইরে (কার্ট সিলেক্টর, ইভেন্ট হ্যান্ডলার) */
export const getSettings = () => useSettingsStore.getState().settings;

/** টাকার চিহ্ন সেটিংস থেকে নিয়ে ফরম্যাট করে */
export const useMoney = () => {
  const currency = useSettingsStore((s) => s.settings.currency);
  return (amount: number) =>
    `${currency}${Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
};
