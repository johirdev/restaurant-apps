/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost } from "@/src/lib/apiClient";
import { useSettingsStore } from "@/src/store/settings.store";

/* ==========================================================================
   CUSTOMER SESSION
   --------------------------------------------------------------------------
   টোকেনটা httpOnly কুকিতে (`user_token`) থাকে — জাভাস্ক্রিপ্ট সেটা পড়তে
   পারে না, সেটাই নিরাপদ। তাই কে লগইন আছে জানতে হলে একবার
   `GET /api/v1/users/me` ডাকতে হয়। উত্তরটা এখানে ধরে রাখা হয়, যাতে
   প্রতিটা পেজ আলাদা করে একই কল না করে।
   ========================================================================== */

export interface SiteUser {
  _id: string;
  phone: string;
  name?: string;
  email?: string;
  image?: { url?: string; public_id?: string };
  division?: string;
  district?: string;
  village?: string;
  address?: string;
  favorite_dishes: string[];
  status: "active" | "blocked";
  phone_verified: boolean;
  last_login_at?: string | null;
  createdAt?: string;
}

interface UserContextValue {
  user: SiteUser | null;
  /** প্রথম `/me` কলটা এখনো চলছে কিনা — গার্ডে এটা না দেখলে ফ্ল্যাশ হয় */
  loading: boolean;
  isLoggedIn: boolean;
  /** নাম আর জেলা দুটোই থাকলে প্রোফাইল সম্পূর্ণ */
  profileComplete: boolean;
  setUser: (user: SiteUser | null) => void;
  refresh: () => Promise<SiteUser | null>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  isLoggedIn: false,
  profileComplete: false,
  setUser: () => {},
  refresh: async () => null,
  logout: async () => {},
});

export const useUser = () => useContext(UserContext);

export default function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SiteUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiGet<SiteUser>("/api/v1/users/me");
      const next = res.data ?? null;
      setUser(next);
      return next;
    } catch {
      // ৪০১ মানে শুধু "লগইন নেই" — এটা এরর নয়, তাই চুপচাপ null
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // দোকানের নিয়ম (ভ্যাট, সার্ভিস চার্জ, ডেলিভারি ফি) — কার্ট আর চেকআউটের
  // হিসাব এগুলো ছাড়া ডিফল্ট হারে বসে যেত, তাই সাইট খুললেই একবার আনি
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    refresh();
    loadSettings();
  }, [refresh, loadSettings]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/v1/users/logout");
    } finally {
      // সার্ভার ডাকা না গেলেও ব্রাউজারে অন্তত লগআউট দেখাক
      setUser(null);
    }
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      loading,
      isLoggedIn: !!user,
      profileComplete: !!(user?.name && user?.district),
      setUser,
      refresh,
      logout,
    }),
    [user, loading, refresh, logout],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
