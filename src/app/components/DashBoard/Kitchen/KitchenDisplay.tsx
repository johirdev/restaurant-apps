/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { toast } from "react-toastify";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import { can, MANAGEMENT } from "@/src/app/dashboard/roles";
import type { OrderStatus } from "@/src/interfaces/order.interfaces";

/* ==========================================================================
   KITCHEN DISPLAY — শেফের স্ক্রিন
   --------------------------------------------------------------------------
   ম্যানেজার কনফার্ম করলেই টিকিট এখানে চলে আসে। শেফ একেকটা পদে টিক দেয়;
   সব পদ হয়ে গেলে অর্ডার নিজে থেকেই "Ready" হয়ে ম্যানেজারের কাছে ফেরত যায়।

   রান্নাঘরের বাস্তবতা মাথায় রেখে:
     • ১০ সেকেন্ড পরপর নিজে থেকেই নতুন টিকিট আসে — কেউ রিফ্রেশ চাপে না
     • নতুন টিকিট এলে শব্দ হয় — শেফ চুলার দিকে তাকিয়ে থাকে, স্ক্রিনে নয়
     • বোতামগুলো বড়, কারণ হাত ভেজা/তেলতেলে থাকে
   ========================================================================== */

interface KitchenItem {
  name: string;
  variation_name?: string;
  quantity: number;
  note?: string;
  spice_level?: string;
  is_ready: boolean;
  added_later: boolean;
}

interface KitchenOrder {
  _id: string;
  order_number: string;
  status: OrderStatus;
  order_type: "delivery" | "pickup" | "dine_in";
  table_name?: string;
  guests?: number;
  createdAt: string;
  confirmed_at?: string | null;
  kitchen_started_at?: string | null;
  items: KitchenItem[];
  customer: { name: string };
  waiter?: { name?: string };
}

interface RecentOrder {
  _id: string;
  order_number: string;
  table_name?: string;
  order_type: string;
  kitchen_ready_at: string;
  items: { name: string; quantity: number }[];
}

interface KitchenPayload {
  orders: KitchenOrder[];
  waiting_confirmation: number;
  recent: RecentOrder[];
  today: { dishes: number; orders: number };
}

const REFRESH_MS = 10_000;
const SOUND_KEY = "kitchen-sound";

/** কত মিনিট আগে রান্নাঘরে এসেছে — দেরি হলে টিকিটের রং বদলায় */
const minutesSince = (iso?: string | null) => {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
};

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  dine_in: "Dine in",
};

/**
 * নতুন টিকিটের ঘণ্টা।
 * কোনো অডিও ফাইল রাখতে হয় না — ব্রাউজারই দুটো ছোট বিপ বাজিয়ে দেয়,
 * তাই কিছু ডাউনলোডেরও দরকার নেই।
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;

    const ctx = new Ctx();
    [0, 0.18].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = i === 0 ? 880 : 1174;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + offset + 0.16,
      );
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.18);
    });

    setTimeout(() => ctx.close(), 800);
  } catch {
    // শব্দ না বাজলেও রান্না থেমে থাকবে না
  }
}

export default function KitchenDisplay() {
  const { token, adminData } = useContext(AuthContext);
  const isManager = can(adminData?.role, MANAGEMENT);

  const [data, setData] = useState<KitchenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  // সেকেন্ডে সেকেন্ডে "কত মিনিট হলো" হালনাগাদ রাখার জন্য
  const [, setTick] = useState(0);

  // আগের বার কোন টিকিটগুলো ছিল — নতুন কিছু এলে তবেই ঘণ্টা বাজে
  const knownIds = useRef<Set<string> | null>(null);

  const authHeader = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setSoundOn(localStorage.getItem(SOUND_KEY) === "on");
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    // চালু করার সময় একবার বাজিয়ে দিই — ব্রাউজার তখনই অডিও চালানোর
    // অনুমতি দেয় (ব্যবহারকারীর ক্লিকের ভেতরে), আর শেফও শুনে নিশ্চিত হয়
    if (next) playChime();
  };

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/v1/orders/kitchen", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: KitchenPayload = res.data.data;
      setData(payload);

      /* ---- নতুন টিকিট এসেছে কিনা ---- */
      const ids = new Set(payload.orders.map((o) => o._id));
      if (knownIds.current) {
        const fresh = [...ids].filter((id) => !knownIds.current!.has(id));
        if (fresh.length && localStorage.getItem(SOUND_KEY) === "on") {
          playChime();
        }
      }
      knownIds.current = ids;
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Could not load the kitchen queue",
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const poll = setInterval(load, REFRESH_MS);
    const clock = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  const orders = data?.orders ?? [];

  /* ---------------- একটা পদ হয়ে গেছে ---------------- */
  const toggleItem = async (
    order: KitchenOrder,
    index: number,
    isReady: boolean,
  ) => {
    const key = `${order._id}:${index}`;
    setBusy(key);

    // টিক দেওয়ার সাথে সাথেই স্ক্রিনে দেখাই — সার্ভারের উত্তরের অপেক্ষায়
    // শেফকে দাঁড় করিয়ে রাখলে ব্যস্ত রান্নাঘরে কাজ আটকে যায়
    setData((prev) =>
      prev
        ? {
            ...prev,
            orders: prev.orders.map((o) =>
              o._id === order._id
                ? {
                    ...o,
                    items: o.items.map((it, i) =>
                      i === index ? { ...it, is_ready: isReady } : it,
                    ),
                  }
                : o,
            ),
          }
        : prev,
    );

    try {
      await axios.patch(
        `/api/v1/orders/${order._id}/items/ready`,
        { index, is_ready: isReady },
        { headers: authHeader },
      );
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not update that item");
      load(); // সার্ভারই সত্যি — ভুল হলে আসল অবস্থাটা ফিরিয়ে আনি
    } finally {
      setBusy(null);
    }
  };

  /* ---------------- পুরো অর্ডার হয়ে গেছে ---------------- */
  const markOrderReady = async (order: KitchenOrder) => {
    setBusy(order._id);
    try {
      const res = await axios.patch(
        `/api/v1/orders/${order._id}/status`,
        { status: "ready" },
        { headers: authHeader },
      );
      toast.success(res.data.message);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not mark it ready");
    } finally {
      setBusy(null);
    }
  };

  /* ---------------- গোনাগুনতি ---------------- */
  const cooking = orders.filter((o) => o.status !== "ready").length;
  const readyToSend = orders.filter((o) => o.status === "ready").length;
  const waiting = data?.waiting_confirmation ?? 0;

  if (loading) {
    return (
      <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel bg-app text-primary min-h-screen p-4 md:p-6">
      {/* ================= হেডার ================= */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-primary text-[20px] font-semibold">Kitchen</h1>
          <p className="text-secondary mt-0.5 text-[13px]">
            {cooking} cooking · {readyToSend} ready to send
            {data?.today.dishes
              ? ` · you cooked ${data.today.dishes} dishes today`
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className={`btn px-4 py-2 text-[13px] ${
              soundOn ? "btn-green" : "btn-outline"
            }`}
            title="Ring a bell when a new ticket arrives"
          >
            {soundOn ? "🔔 Sound on" : "🔕 Sound off"}
          </button>
          <button
            type="button"
            onClick={load}
            className="btn btn-outline px-4 py-2 text-[13px]"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ================= টিকিট ================= */}
      {!orders.length ? (
        <div className="bg-card border-default rounded-xl px-6 py-16 text-center">
          <p className="text-primary text-[17px] font-medium">
            Nothing to cook right now
          </p>

          {waiting > 0 ? (
            <>
              {/* খালি স্ক্রিন দেখে শেফ যেন ভুল না বোঝে — খাবার আসছে,
                  শুধু ম্যানেজার এখনো কনফার্ম করেননি */}
              <p className="text-secondary mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed">
                {waiting} order{waiting === 1 ? " is" : "s are"} waiting for a
                manager to confirm. Tickets land here the moment that happens —
                nothing for you to do yet.
              </p>
              {isManager && (
                <Link
                  href="/dashboard/orders/online"
                  className="btn btn-primary mt-5 inline-flex px-5 py-2.5 text-[13px]"
                >
                  Confirm {waiting === 1 ? "it" : "them"} now
                </Link>
              )}
            </>
          ) : (
            <p className="text-secondary mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed">
              No orders in the restaurant at the moment. This screen refreshes
              itself, so leave it open — new tickets appear on their own.
            </p>
          )}

          <p className="text-muted mt-5 text-[12px]">
            Checking every {REFRESH_MS / 1000} seconds
            {soundOn ? " · bell is on" : ""}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((order) => {
            const waitedFor = minutesSince(order.confirmed_at || order.createdAt);
            // ২০ মিনিটের বেশি বসে থাকলে টিকিটটা চোখে পড়া দরকার
            const late = waitedFor >= 20;
            const warm = waitedFor >= 10 && !late;

            const doneCount = order.items.filter((i) => i.is_ready).length;
            const allDone = doneCount === order.items.length;

            return (
              <article
                key={order._id}
                className="bg-card border-default flex flex-col overflow-hidden rounded-xl"
                style={{
                  borderColor: late
                    ? "var(--accent-red)"
                    : warm
                      ? "var(--accent-orange)"
                      : undefined,
                  borderWidth: late || warm ? 2 : undefined,
                }}
              >
                {/* ---------- টিকিটের মাথা ---------- */}
                <header
                  className="border-default-b px-4 py-3"
                  style={{
                    background: late
                      ? "var(--accent-red-soft)"
                      : warm
                        ? "var(--accent-orange-soft)"
                        : "var(--bg-elevated)",
                  }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-primary text-[16px] font-semibold">
                      {order.table_name ||
                        ORDER_TYPE_LABEL[order.order_type] ||
                        order.order_type}
                    </span>
                    <span
                      className="text-[14px] font-semibold"
                      style={{
                        color: late
                          ? "var(--accent-red)"
                          : warm
                            ? "var(--accent-orange)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {waitedFor} min
                    </span>
                  </div>
                  <p className="text-secondary mt-0.5 text-[12px]">
                    {order.order_number}
                    {order.guests ? ` · ${order.guests} guests` : ""}
                    {order.waiter?.name ? ` · ${order.waiter.name}` : ""}
                  </p>
                </header>

                {/* ---------- পদগুলো ---------- */}
                <ul className="flex-1 divide-y divide-[var(--border-color)]">
                  {order.items.map((item, index) => {
                    const key = `${order._id}:${index}`;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => toggleItem(order, index, !item.is_ready)}
                          disabled={busy === key}
                          className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-hover)]"
                        >
                          {/* বড় চেকবক্স — ভেজা হাতেও মিস হয় না */}
                          <span
                            className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 text-[14px] font-bold"
                            style={{
                              borderColor: item.is_ready
                                ? "var(--accent-green)"
                                : "var(--border-color-strong)",
                              background: item.is_ready
                                ? "var(--accent-green)"
                                : "transparent",
                              color: item.is_ready ? "#fff" : "transparent",
                            }}
                          >
                            ✓
                          </span>

                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-[15px] font-medium ${
                                item.is_ready
                                  ? "text-muted line-through"
                                  : "text-primary"
                              }`}
                            >
                              {item.quantity} × {item.name}
                              {item.variation_name && (
                                <span className="text-secondary font-normal">
                                  {" "}
                                  ({item.variation_name})
                                </span>
                              )}
                            </span>

                            {/* রান্নাঘরের জন্য জরুরি তথ্য — বড় করে দেখানো দরকার */}
                            {(item.note || item.spice_level) && (
                              <span className="text-highlight mt-1 block text-[13px] font-medium">
                                {[item.spice_level, item.note]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            )}

                            {item.added_later && !item.is_ready && (
                              <span className="chip chip-pending mt-1.5 inline-block px-2 py-0.5 text-[11px]">
                                Added later
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* ---------- নিচের বার ---------- */}
                <footer className="border-default-t flex items-center gap-3 px-4 py-3">
                  <span className="text-secondary text-[13px]">
                    {doneCount}/{order.items.length} done
                  </span>
                  <button
                    type="button"
                    onClick={() => markOrderReady(order)}
                    disabled={busy === order._id || order.status === "ready"}
                    className={`btn ml-auto px-5 py-2.5 text-[13.5px] ${
                      allDone || order.status === "ready"
                        ? "btn-green"
                        : "btn-outline"
                    }`}
                  >
                    {order.status === "ready" ? "Ready ✓" : "All ready"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* ================= একটু আগে যা গেছে ================= */}
      {!!data?.recent.length && (
        <section className="mt-6">
          <h2 className="text-secondary mb-2.5 text-[13px] font-medium">
            Just sent out
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.recent.map((order) => (
              <span
                key={order._id}
                className="bg-card border-default rounded-lg px-3.5 py-2"
              >
                <span className="text-primary text-[12.5px] font-medium">
                  {order.table_name ||
                    ORDER_TYPE_LABEL[order.order_type] ||
                    order.order_type}
                </span>
                <span className="text-muted ml-2 text-[11.5px]">
                  {minutesSince(order.kitchen_ready_at)} min ago ·{" "}
                  {order.items.reduce((n, i) => n + i.quantity, 0)} dishes
                </span>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
