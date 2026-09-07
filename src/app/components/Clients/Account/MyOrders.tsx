/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Receipt,
  ShoppingBag,
} from "lucide-react";
import { apiGet, getApiErrorMessage, type ApiMeta } from "@/src/lib/apiClient";
import { formatMoney } from "@/src/config/business";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";

/* ==========================================================================
   নিজের অর্ডার — GET /api/v1/users/me/orders
   --------------------------------------------------------------------------
   সার্ভার user_id আর ফোন নম্বর দুটো দিয়েই খোঁজে, তাই লগইন করার আগে
   একই নম্বরে দেওয়া গেস্ট অর্ডারগুলোও এখানে দেখা যায়।
   ========================================================================== */

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface MyOrder {
  _id: string;
  order_number: string;
  status: OrderStatus;
  order_type: "delivery" | "pickup" | "dine_in";
  payment_method: string;
  payment_status: "unpaid" | "paid" | "refunded";
  createdAt: string;
  customer: { name: string; phone: string; address?: string; area?: string };
  items: {
    name: string;
    variation_name?: string;
    quantity: number;
    unit_price: number;
    image?: string;
  }[];
  pricing: { total: number };
}

const STATUS_BADGE: Record<OrderStatus, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "site-badge-muted" },
  confirmed: { label: "Confirmed", cls: "site-badge-brand" },
  preparing: { label: "In the kitchen", cls: "site-badge-saffron" },
  ready: { label: "Ready", cls: "site-badge-saffron" },
  out_for_delivery: { label: "On the way", cls: "site-badge-brand" },
  delivered: { label: "Delivered", cls: "site-badge-herb" },
  cancelled: { label: "Cancelled", cls: "site-badge-chili" },
};

const ORDER_TYPE_LABEL = {
  delivery: "Delivery",
  pickup: "Pickup",
  dine_in: "Dine in",
} as const;

const PAGE_SIZE = 8;

export default function MyOrders() {
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<MyOrder[]>("/api/v1/users/me/orders", {
        page,
        limit: PAGE_SIZE,
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setOrders(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPage = meta?.totalPage ?? 1;

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-[150px] rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="site-card px-6 py-12 text-center">
        <p className="text-[14px] font-semibold text-chili">{error}</p>
        <button
          type="button"
          onClick={load}
          className="site-btn site-btn-outline mt-4 h-10 px-5 text-[13px]"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="site-card px-6 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand-dark">
          <ShoppingBag size={26} />
        </div>
        <h2 className="mt-4 text-[18px] font-bold text-ink">No orders yet</h2>
        <p className="mx-auto mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-ink-soft">
          Once you place an order it will show up here — with live status and a
          one-tap reorder.
        </p>
        <Link
          href="/foods"
          className="site-btn site-btn-primary mt-6 h-11 px-6 text-[14px]"
        >
          Browse the menu
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.pending;
        const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);

        return (
          <article key={order._id} className="site-card overflow-hidden">
            {/* ---------- হেডার ---------- */}
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-canvas px-5 py-3.5">
              <span className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-ink">
                <Receipt size={15} className="text-brand" />
                {order.order_number}
              </span>
              <span className={`site-badge ${badge.cls}`}>{badge.label}</span>
              <span className="site-badge site-badge-muted">
                {ORDER_TYPE_LABEL[order.order_type]}
              </span>
              <span className="ml-auto text-[12px] text-ink-soft">
                {DateTimeBd(order.createdAt)}
              </span>
            </div>

            {/* ---------- আইটেম ---------- */}
            <div className="px-5 py-4">
              <ul className="space-y-2">
                {order.items.slice(0, 3).map((item, i) => (
                  <li
                    key={`${order._id}-${i}`}
                    className="flex items-center gap-3 text-[13.5px]"
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-xs bg-surface-soft text-[11px] font-bold text-ink-soft">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        `${item.quantity}x`
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {item.quantity} × {item.name}
                      {item.variation_name && (
                        <span className="text-ink-faint">
                          {" "}
                          ({item.variation_name})
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-ink-soft">
                      {formatMoney(item.unit_price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.items.length > 3 && (
                <p className="mt-2 text-[12.5px] text-ink-faint">
                  + {order.items.length - 3} more item
                  {order.items.length - 3 === 1 ? "" : "s"}
                </p>
              )}

              {order.order_type === "delivery" && order.customer.address && (
                <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-ink-soft">
                  <MapPin size={13} className="mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{order.customer.address}</span>
                </p>
              )}
            </div>

            {/* ---------- ফুটার ---------- */}
            <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3.5">
              <div>
                <p className="text-[11.5px] text-ink-faint">
                  {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                  {order.payment_status === "paid" ? "Paid" : "Unpaid"}
                </p>
                <p className="text-[16px] font-extrabold text-ink">
                  {formatMoney(order.pricing.total)}
                </p>
              </div>

              <Link
                href={`/track-order?order=${encodeURIComponent(
                  order.order_number,
                )}&phone=${encodeURIComponent(order.customer.phone)}`}
                className="site-btn site-btn-outline ml-auto h-9 px-4 text-[13px]"
              >
                Track order
              </Link>
            </div>
          </article>
        );
      })}

      {/* ---------- পেজিনেশন ---------- */}
      {totalPage > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="site-btn site-btn-outline h-9 px-3 text-[13px]"
          >
            <ChevronLeft size={15} /> Prev
          </button>
          <span className="text-[13px] font-semibold text-ink-soft">
            Page {page} of {totalPage}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage || loading}
            className="site-btn site-btn-outline h-9 px-3 text-[13px]"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-3">
          <Loader2 size={18} className="animate-spin text-brand" />
        </div>
      )}
    </div>
  );
}
