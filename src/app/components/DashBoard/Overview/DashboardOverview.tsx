"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Clock,
  ChefHat,
  Bike,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Wallet,
  RefreshCw,
  ArrowRight,
  Plus,
} from "lucide-react";
import { apiGet, getApiErrorMessage } from "@/src/lib/apiClient";
import { formatMoney } from "@/src/config/business";
import type { OrderStatus } from "@/src/interfaces/order.interfaces";

interface RecentOrder {
  _id: string;
  order_number: string;
  status: OrderStatus;
  order_type: string;
  createdAt: string;
  customer: { name: string; phone: string };
  items: { name: string; quantity: number }[];
  pricing: { total: number };
}

interface Stats {
  statusCounts: Partial<Record<OrderStatus, number>>;
  tables: {
    total: number;
    free: number;
    occupied: number;
    reserved: number;
    cleaning: number;
  };
  today: { orders: number; revenue: number };
  allTime: { orders: number; revenue: number };
  recent: RecentOrder[];
}

/* ==========================================================================
   ড্যাশবোর্ড হোম — আজকের বিক্রি, স্ট্যাটাস অনুযায়ী অর্ডার আর সাম্প্রতিক অর্ডার
   ========================================================================== */
export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // রিফ্রেশ বোতাম এই কী বাড়ায় → ইফেক্ট আবার চলে
  const [reloadKey, setReloadKey] = useState(0);

  // ফেচ ইফেক্টের ভেতরেই, await এর পরে state বসে — কম্পোনেন্ট আনমাউন্ট
  // হয়ে গেলে cancelled ফ্ল্যাগ সেটাকে আটকে দেয়।
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiGet<Stats>("/api/v1/orders/stats");
        if (cancelled) return;
        setStats(res.data);
        setError("");
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load dashboard stats"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const refresh = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const counts = stats?.statusCounts ?? {};

  const statusCards = [
    {
      label: "Pending",
      value: counts.pending ?? 0,
      icon: Clock,
      tone: "var(--accent-orange)",
      href: "/dashboard/orders/new",
    },
    {
      label: "In kitchen",
      value: (counts.confirmed ?? 0) + (counts.preparing ?? 0),
      icon: ChefHat,
      tone: "var(--accent-blue)",
      href: "/dashboard/orders/cooking",
    },
    {
      // রান্না শেষ, ম্যানেজারের হাতে — এখান থেকেই টেবিলে বা রাইডারের কাছে যায়
      label: "Ready to send",
      value: counts.ready ?? 0,
      icon: CheckCircle2,
      tone: "var(--accent-green)",
      href: "/dashboard/orders/ready",
    },
    {
      label: "On the way",
      value: (counts.served ?? 0) + (counts.out_for_delivery ?? 0),
      icon: Bike,
      tone: "var(--accent-primary)",
      href: "/dashboard/orders/billing",
    },
    {
      label: "Delivered",
      value: counts.delivered ?? 0,
      icon: CheckCircle2,
      tone: "var(--accent-green)",
      href: "/dashboard/orders/completed",
    },
    {
      label: "Cancelled",
      value: counts.cancelled ?? 0,
      icon: XCircle,
      tone: "var(--accent-red)",
      href: "/dashboard/orders/cancelled",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- হেডার ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-primary text-[22px] font-bold">Dashboard</h1>
          <p className="text-secondary text-[13px]">
            Everything happening in your restaurant right now.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ব্যস্ত সময়ে ম্যানেজার সবচেয়ে বেশি যে দুটো বোতামে চাপ দেয় */}
          <Link href="/dashboard/pos" className="btn btn-primary h-9 px-4 text-[12.5px]">
            <Plus size={14} /> New order
          </Link>
          <Link
            href="/dashboard/kitchen"
            className="btn btn-outline h-9 px-4 text-[12.5px]"
          >
            <ChefHat size={14} /> Kitchen
          </Link>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="btn btn-outline h-9 px-4 text-[12.5px]"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* ---------- টেবিলের অবস্থা ---------- */}
      {!loading && (stats?.tables?.total ?? 0) > 0 && (
        <Link
          href="/dashboard/tables"
          className="admin-card admin-card-hover flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3.5"
        >
          <span className="text-primary text-[13.5px] font-bold">Tables</span>
          <TableStat
            label="Free"
            value={stats?.tables.free ?? 0}
            tone="var(--accent-green)"
          />
          <TableStat
            label="Occupied"
            value={stats?.tables.occupied ?? 0}
            tone="var(--accent-orange)"
          />
          <TableStat
            label="Reserved"
            value={stats?.tables.reserved ?? 0}
            tone="var(--accent-blue)"
          />
          <TableStat
            label="Cleaning"
            value={stats?.tables.cleaning ?? 0}
            tone="var(--text-muted)"
          />
          <span className="text-accent ml-auto flex items-center gap-1 text-[12.5px] font-semibold">
            Floor map <ArrowRight size={13} />
          </span>
        </Link>
      )}

      {error && (
        <p
          className="rounded-md px-4 py-3 text-[13px] font-semibold"
          style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)" }}
        >
          {error}
        </p>
      )}

      {/* ---------- আয়ের কার্ড ---------- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueCard
          label="Today's revenue"
          value={loading ? null : formatMoney(stats?.today.revenue ?? 0)}
          sub={`${stats?.today.orders ?? 0} orders today`}
          icon={TrendingUp}
          tone="var(--accent-green)"
        />
        <RevenueCard
          label="Today's orders"
          value={loading ? null : String(stats?.today.orders ?? 0)}
          sub="Placed since midnight"
          icon={ShoppingBag}
          tone="var(--accent-primary)"
        />
        <RevenueCard
          label="Lifetime revenue"
          value={loading ? null : formatMoney(stats?.allTime.revenue ?? 0)}
          sub="From delivered orders"
          icon={Wallet}
          tone="var(--accent-blue)"
        />
        <RevenueCard
          label="Lifetime orders"
          value={loading ? null : String(stats?.allTime.orders ?? 0)}
          sub="Successfully delivered"
          icon={CheckCircle2}
          tone="var(--accent-orange)"
        />
      </div>

      {/* ---------- স্ট্যাটাস অনুযায়ী ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statusCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="admin-card admin-card-hover flex items-center gap-3 p-3.5"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
                style={{
                  background: `color-mix(in srgb, ${card.tone} 15%, transparent)`,
                  color: card.tone,
                }}
              >
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-primary text-[19px] font-bold leading-none">
                  {loading ? "—" : card.value}
                </p>
                <p className="text-secondary truncate text-[11.5px]">{card.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ---------- সাম্প্রতিক অর্ডার ---------- */}
      <section className="admin-card overflow-hidden">
        <header className="border-default-b flex items-center justify-between px-4 py-3.5">
          <h2 className="text-primary text-[15px] font-bold">Recent orders</h2>
          <Link
            href="/dashboard/orders/all"
            className="text-accent flex items-center gap-1 text-[12.5px] font-semibold hover:underline"
          >
            View all <ArrowRight size={13} />
          </Link>
        </header>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="admin-skeleton h-11" />
              ))}
            </div>
          ) : !stats?.recent.length ? (
            <p className="text-muted py-14 text-center text-[13px]">
              No orders yet. They will appear here the moment one comes in.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <Link
                        href={`/dashboard/orders/all?q=${order.order_number}`}
                        className="text-primary font-bold hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      <p className="text-muted text-[11px]">
                        {new Date(order.createdAt).toLocaleString("en-GB", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </td>
                    <td>
                      <p className="text-primary font-semibold">{order.customer.name}</p>
                      <p className="text-muted text-[11px]">{order.customer.phone}</p>
                    </td>
                    <td className="text-secondary">
                      {order.items.reduce((n, i) => n + i.quantity, 0)} item
                      {order.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"}
                    </td>
                    <td className="text-secondary capitalize">
                      {order.order_type.replace(/_/g, " ")}
                    </td>
                    <td>
                      <span className={`chip chip-${order.status}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-primary text-right font-bold tabular-nums">
                      {formatMoney(order.pricing.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function RevenueCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | null;
  sub: string;
  icon: typeof TrendingUp;
  tone: string;
}) {
  return (
    <article className="admin-card admin-card-hover relative overflow-hidden p-4">
      {/* কোণায় হালকা রঙের আভা */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: tone }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-secondary text-[12px] font-semibold uppercase tracking-wide">
            {label}
          </p>
          {value === null ? (
            <div className="admin-skeleton mt-2 h-7 w-28" />
          ) : (
            <p className="text-primary mt-1.5 text-[24px] font-extrabold leading-none">
              {value}
            </p>
          )}
          <p className="text-muted mt-1.5 text-[11.5px]">{sub}</p>
        </div>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${tone} 15%, transparent)`,
            color: tone,
          }}
        >
          <Icon size={19} />
        </span>
      </div>
    </article>
  );
}

/** টেবিলের অবস্থার ছোট সংখ্যা — ফ্লোরের এক নজরের ছবি */
function TableStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[17px] font-bold leading-none" style={{ color: tone }}>
        {value}
      </span>
      <span className="text-secondary text-[12px]">{label}</span>
    </span>
  );
}
