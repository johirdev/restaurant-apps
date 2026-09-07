/* eslint-disable @next/next/no-img-element */
"use client";

import { Fragment, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {
  Search,
  RefreshCw,
  ChevronDown,
  Phone,
  MapPin,
  Loader2,
  Printer,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Pagination } from "@/src/app/Layout/Admin/Pagination/Pagination";
import { AuthContext } from "@/src/app/dashboard/AuthProvider";
import {
  apiDelete,
  apiPost,
  apiGet,
  apiPatch,
  getApiErrorMessage,
} from "@/src/lib/apiClient";
import { formatMoney } from "@/src/config/business";
import { useSettingsStore } from "@/src/store/settings.store";
import {
  buildInvoiceHtml,
  buildKitchenTicketHtml,
  printHtml,
} from "../Invoice/invoiceHtml";
import {
  ORDER_STATUS_FLOW,
  type OrderStatus,
} from "@/src/interfaces/order.interfaces";

/* ==========================================================================
   ORDERS MANAGER — ড্যাশবোর্ডের সব অর্ডার পেজ এই একটা কম্পোনেন্টই চালায়।
   প্রতিটা পেজ শুধু আলাদা `statuses` আর `title` পাঠায়।
   ========================================================================== */

export interface AdminOrder {
  _id: string;
  order_number: string;
  status: OrderStatus;
  order_type: "delivery" | "pickup" | "dine_in";
  table_number?: string;
  payment_method: string;
  payment_status: string;
  createdAt: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    area?: string;
    note?: string;
  };
  items: {
    name: string;
    variation_name?: string;
    quantity: number;
    unit_price: number;
    image?: string;
    note?: string;
  }[];
  pricing: {
    subtotal: number;
    delivery_fee: number;
    discount: number;
    service_charge: number;
    vat: number;
    total: number;
    vat_percent: number;
    service_charge_percent: number;
    tax_mode: "exclusive" | "inclusive";
  };
  table_name?: string;
  guests?: number;
  waiter?: { id?: string; name?: string; role?: string };
  chef?: { id?: string; name?: string; role?: string };
  taken_by?: { id?: string; name?: string; role?: string };
  source?: string;
  cancelled_reason?: string;
  status_history?: { status: OrderStatus; at: string; by?: string; note?: string }[];
}

interface OrdersManagerProps {
  title: string;
  subtitle?: string;
  /** এই স্ট্যাটাসগুলোর অর্ডার দেখানো হবে। খালি রাখলে সব দেখাবে। */
  statuses?: OrderStatus[];
  /** ডেলিভারি/পিকআপ ইত্যাদি দিয়ে আলাদা করতে চাইলে */
  orderType?: "delivery" | "pickup" | "dine_in";
}

/** URL এর ?q= — ড্যাশবোর্ড হোমের অর্ডার লিংক এভাবেই সার্চ নিয়ে আসে */
const initialSearch = () =>
  typeof window === "undefined"
    ? ""
    : (new URLSearchParams(window.location.search).get("q") ?? "");

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrdersManager({
  title,
  subtitle,
  statuses,
  orderType,
}: OrdersManagerProps) {
  // অর্ডার মোছা শুধু superadmin পারে — API ও ঠিক এই রোলটাই যাচাই করে
  const { adminData } = useContext(AuthContext);
  const canDelete = adminData?.role === "superadmin";
  const settings = useSettingsStore((s) => s.settings);

  /** বিল ছাপা — সাথে সাথে সার্ভারে গুনেও রাখি, কতবার ছাপা হলো */
  const printInvoice = (order: AdminOrder) => {
    printHtml(buildInvoiceHtml(order as never, settings));
    apiPost(`/api/v1/orders/${order._id}/invoice`, {}).catch(() => {
      // ছাপা হয়েই গেছে — গোনা না হলেও কাজ আটকানোর কিছু নেই
    });
  };

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPage, setTotalPage] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);

  // ড্যাশবোর্ড হোম থেকে ?q=ORD-… দিয়ে এলে সার্চ বক্সে সেটাই বসানো থাকে।
  // (এই কম্পোনেন্ট শুধু লগ-ইনের পরে ক্লায়েন্টে মাউন্ট হয়, তাই window পড়া নিরাপদ)
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // বাড়লেই ফেচ ইফেক্ট আবার চলে
  const [reloadKey, setReloadKey] = useState(0);

  // এই পেজে কোন স্ট্যাটাসগুলো দেখানো যাবে
  const allowedStatuses = useMemo(() => statuses ?? [], [statuses]);

  /* ---------- সার্চ ডিবাউন্স ---------- */
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      setSearchTerm(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* ---------- ডেটা আনা ---------- */
  // ফেচ ইফেক্টের ভেতরেই — state শুধু await এর পরে বসে, আর ফিল্টার দ্রুত
  // বদলালে পুরনো রিকোয়েস্টের উত্তর cancelled ফ্ল্যাগে বাদ পড়ে।
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params: Record<string, unknown> = {
          page,
          limit,
          sortBy: "createdAt",
          sortOrder: "desc",
        };
        if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
        if (orderType) params.order_type = orderType;

        // একাধিক স্ট্যাটাস কমা দিয়ে পাঠানো যায় — তাই গোনা, টাকার যোগফল আর
        // পেজিনেশন সবই সার্ভারে ঠিকঠাক হিসাব হয়ে আসে।
        if (statusFilter) params.status = statusFilter;
        else if (allowedStatuses.length) params.status = allowedStatuses.join(",");

        const res = await apiGet<AdminOrder[]>("/api/v1/orders", params);
        if (cancelled) return;

        const rows = res.data ?? [];

        setOrders(rows);
        setTotal(res.meta?.total ?? rows.length);
        setTotalPage(res.meta?.totalPage ?? 1);
        setTotalAmount(res.meta?.totalAmount ?? 0);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load orders"));
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, limit, searchTerm, statusFilter, allowedStatuses, orderType, reloadKey]);

  /** নতুন করে তালিকা আনতে বলি — স্ট্যাটাস বদল আর রিফ্রেশ বোতাম এটাই ডাকে */
  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  /* ---------- স্ট্যাটাস বদল ---------- */
  const changeStatus = async (order: AdminOrder, next: OrderStatus) => {
    let cancelled_reason = "";

    // বাতিল করার আগে কারণ জিজ্ঞেস করি — পরে ইতিহাসে দেখা যায় কেন বাতিল হয়েছিল
    if (next === "cancelled") {
      const asked = await Swal.fire({
        title: `Cancel ${order.order_number}?`,
        input: "text",
        inputLabel: "Reason (optional)",
        inputPlaceholder: "Customer changed their mind…",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Cancel order",
        cancelButtonText: "Keep it",
        confirmButtonColor: "#d33",
      });
      if (!asked.isConfirmed) return;
      cancelled_reason = String(asked.value || "").slice(0, 300);
    }

    setUpdatingId(order._id);
    try {
      await apiPatch(`/api/v1/orders/${order._id}/status`, {
        status: next,
        ...(cancelled_reason ? { cancelled_reason } : {}),
      });
      toast.success(`${order.order_number} → ${STATUS_LABEL[next]}`);
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the order"));
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------- পেমেন্ট স্ট্যাটাস ---------- */
  const changePayment = async (
    order: AdminOrder,
    payment_status: "paid" | "unpaid" | "refunded",
  ) => {
    setUpdatingId(order._id);
    try {
      await apiPatch(`/api/v1/orders/${order._id}/payment`, { payment_status });
      toast.success(`${order.order_number} marked ${payment_status}`);
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the payment"));
    } finally {
      setUpdatingId(null);
    }
  };

  /* ---------- অর্ডার মুছে ফেলা ---------- */
  const deleteOrder = async (order: AdminOrder) => {
    const confirmed = await Swal.fire({
      title: `Delete ${order.order_number}?`,
      text: "This removes the order and its history for good. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
    });
    if (!confirmed.isConfirmed) return;

    setDeletingId(order._id);
    try {
      await apiDelete(`/api/v1/orders/${order._id}`);
      toast.success(`${order.order_number} deleted`);
      // শেষ পাতার শেষ অর্ডারটা মুছলে খালি পাতায় আটকে না থেকে আগের পাতায় ফিরি
      if (orders.length === 1 && page > 1) setPage((p) => p - 1);
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not delete the order"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- হেডার ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-primary text-[22px] font-bold">{title}</h1>
          <p className="text-secondary text-[13px]">
            {subtitle ??
              `${total} order${total === 1 ? "" : "s"} · ${formatMoney(totalAmount)} total value`}
          </p>
        </div>

        <button
          type="button"
          onClick={reload}
          disabled={loading}
          className="btn btn-outline h-9 px-4 text-[12.5px]"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* ---------- ফিল্টার বার ---------- */}
      <div className="admin-card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={15}
            className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by order number, name, phone or address…"
            className="input-field h-10 w-full pl-9 pr-9 text-[13px]"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
              className="text-muted hover:text-primary absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {allowedStatuses.length !== 1 && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value as OrderStatus | "");
              setPage(1);
            }}
            className="input-field h-10 min-w-[170px] px-3 text-[13px]"
          >
            <option value="">All statuses</option>
            {(allowedStatuses.length ? allowedStatuses : (Object.keys(STATUS_LABEL) as OrderStatus[])).map(
              (s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ),
            )}
          </select>
        )}
      </div>

      {error && (
        <p
          className="rounded-md px-4 py-3 text-[13px] font-semibold"
          style={{ background: "var(--accent-red-soft)", color: "var(--accent-red)" }}
        >
          {error}
        </p>
      )}

      {/* ---------- টেবিল ---------- */}
      <section className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="admin-skeleton h-12" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-muted py-16 text-center text-[13.5px]">
              No orders here yet.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 34 }} />
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const expanded = expandedId === order._id;
                  const nextStatuses = ORDER_STATUS_FLOW[order.status] ?? [];
                  const busy = updatingId === order._id;

                  return (
                    <Fragment key={order._id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : order._id)}
                            aria-label={expanded ? "Hide details" : "Show details"}
                            className="text-muted hover:text-primary grid h-7 w-7 place-items-center rounded-sm"
                          >
                            <ChevronDown
                              size={15}
                              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </td>

                        <td>
                          <p className="text-primary font-bold">{order.order_number}</p>
                          <p className="text-muted text-[11px]">
                            {new Date(order.createdAt).toLocaleString("en-GB", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </p>
                        </td>

                        <td>
                          <p className="text-primary font-semibold">{order.customer.name}</p>
                          <a
                            href={`tel:${order.customer.phone}`}
                            className="text-secondary flex items-center gap-1 text-[11.5px] hover:underline"
                          >
                            <Phone size={11} /> {order.customer.phone}
                          </a>
                        </td>

                        <td className="text-secondary capitalize">
                          {order.order_type.replace(/_/g, " ")}
                          {order.table_number && (
                            <span className="text-muted block text-[11px]">
                              Table {order.table_number}
                            </span>
                          )}
                        </td>

                        <td>
                          <span className="text-secondary uppercase">
                            {order.payment_method}
                          </span>
                          {/* চিপে ক্লিক করলেই paid ↔ unpaid — ক্যাশ নেওয়ার পর
                              আলাদা কোনো স্ক্রিনে যেতে হয় না */}
                          <button
                            type="button"
                            disabled={busy || order.payment_status === "refunded"}
                            title={
                              order.payment_status === "refunded"
                                ? "Refunded"
                                : order.payment_status === "paid"
                                  ? "Mark as unpaid"
                                  : "Mark as paid"
                            }
                            onClick={() =>
                              changePayment(
                                order,
                                order.payment_status === "paid" ? "unpaid" : "paid",
                              )
                            }
                            className={`chip ml-1.5 cursor-pointer ${
                              order.payment_status === "paid" ? "chip-delivered" : "chip-muted"
                            }`}
                          >
                            <Wallet size={10} />
                            {order.payment_status}
                          </button>
                        </td>

                        <td>
                          <span className={`chip chip-${order.status}`}>
                            {STATUS_LABEL[order.status]}
                          </span>
                        </td>

                        <td className="text-primary text-right font-bold tabular-nums">
                          {formatMoney(order.pricing.total)}
                        </td>

                        <td className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {nextStatuses.length === 0 ? (
                              <span className="text-muted text-[11.5px]">Final</span>
                            ) : (
                              nextStatuses.map((next) => (
                                <button
                                  key={next}
                                  type="button"
                                  disabled={busy}
                                  onClick={() => changeStatus(order, next)}
                                  className={`btn h-7 px-2.5 text-[11px] ${
                                    next === "cancelled" ? "btn-danger" : "btn-primary"
                                  }`}
                                >
                                  {busy ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    STATUS_LABEL[next]
                                  )}
                                </button>
                              ))
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                disabled={deletingId === order._id}
                                onClick={() => deleteOrder(order)}
                                aria-label={`Delete ${order.order_number}`}
                                title="Delete order"
                                className="btn btn-outline h-7 w-7 !p-0 text-[11px]"
                              >
                                {deletingId === order._id ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* ---------- বিস্তারিত সারি ---------- */}
                      {expanded && (
                        <tr className="table-row-alt">
                          <td colSpan={8}>
                            <div className="grid gap-5 p-2 md:grid-cols-[minmax(0,1fr)_280px]">
                              {/* আইটেম */}
                              <div>
                                <h3 className="text-primary mb-2 text-[13px] font-bold">
                                  Items
                                </h3>
                                <ul className="flex flex-col gap-2">
                                  {order.items.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                      <span
                                        className="text-primary grid h-7 w-7 shrink-0 place-items-center rounded-sm text-[11.5px] font-bold"
                                        style={{ background: "var(--bg-hover)" }}
                                      >
                                        {item.quantity}
                                      </span>
                                      {item.image && (
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="h-9 w-9 rounded-sm object-cover"
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-primary text-[12.5px] font-semibold">
                                          {item.name}
                                        </p>
                                        <p className="text-muted text-[11px]">
                                          {item.variation_name}
                                          {item.note ? ` · ${item.note}` : ""}
                                        </p>
                                      </div>
                                      <span className="text-secondary text-[12.5px] tabular-nums">
                                        {formatMoney(item.unit_price * item.quantity)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>

                                {order.customer.note && (
                                  <p
                                    className="mt-3 rounded-sm px-3 py-2 text-[12px]"
                                    style={{
                                      background: "var(--accent-orange-soft)",
                                      color: "var(--accent-orange)",
                                    }}
                                  >
                                    <strong>Customer note:</strong> {order.customer.note}
                                  </p>
                                )}
                              </div>

                              {/* ঠিকানা + হিসাব */}
                              <div className="flex flex-col gap-3">
                                {order.customer.address && (
                                  <div>
                                    <h3 className="text-primary mb-1 text-[13px] font-bold">
                                      Delivery address
                                    </h3>
                                    <p className="text-secondary flex items-start gap-1.5 text-[12px] leading-relaxed">
                                      <MapPin size={13} className="mt-0.5 shrink-0" />
                                      <span>
                                        {order.customer.address}
                                        {order.customer.area ? `, ${order.customer.area}` : ""}
                                      </span>
                                    </p>
                                  </div>
                                )}

                                <dl className="text-secondary flex flex-col gap-1 text-[12px]">
                                  <SummaryRow
                                    label="Subtotal"
                                    value={formatMoney(order.pricing.subtotal)}
                                  />
                                  <SummaryRow
                                    label="Delivery"
                                    value={formatMoney(order.pricing.delivery_fee)}
                                  />
                                  <SummaryRow
                                    label="VAT"
                                    value={formatMoney(order.pricing.vat)}
                                  />
                                  {order.pricing.discount > 0 && (
                                    <SummaryRow
                                      label="Discount"
                                      value={`− ${formatMoney(order.pricing.discount)}`}
                                    />
                                  )}
                                  <div className="border-default-t text-primary mt-1 flex justify-between pt-2 text-[14px] font-bold">
                                    <dt>Total</dt>
                                    <dd className="tabular-nums">
                                      {formatMoney(order.pricing.total)}
                                    </dd>
                                  </div>
                                </dl>

                                {/* কে কখন স্ট্যাটাস বদলেছে — অভিযোগ এলে এখানেই উত্তর মেলে */}
                                {!!order.status_history?.length && (
                                  <div>
                                    <h3 className="text-primary mb-1 text-[13px] font-bold">
                                      History
                                    </h3>
                                    <ol className="flex flex-col gap-1">
                                      {order.status_history.map((entry, i) => (
                                        <li
                                          key={`${entry.status}-${i}`}
                                          className="text-muted flex items-center justify-between gap-2 text-[11.5px]"
                                        >
                                          <span className={`chip chip-${entry.status}`}>
                                            {STATUS_LABEL[entry.status]}
                                          </span>
                                          <span className="text-right">
                                            {new Date(entry.at).toLocaleString("en-GB", {
                                              dateStyle: "short",
                                              timeStyle: "short",
                                            })}
                                            {entry.by ? ` · ${entry.by}` : ""}
                                          </span>
                                        </li>
                                      ))}
                                    </ol>
                                  </div>
                                )}

                                {order.status === "cancelled" && order.cancelled_reason && (
                                  <p
                                    className="rounded-sm px-3 py-2 text-[12px]"
                                    style={{
                                      background: "var(--accent-red-soft)",
                                      color: "var(--accent-red)",
                                    }}
                                  >
                                    <strong>Cancelled:</strong> {order.cancelled_reason}
                                  </p>
                                )}

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => printInvoice(order)}
                                    className="btn btn-outline h-8 text-[12px]"
                                  >
                                    <Printer size={13} /> Print invoice
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      printHtml(
                                        buildKitchenTicketHtml(
                                          order as never,
                                          settings,
                                        ),
                                      )
                                    }
                                    className="btn btn-ghost h-8 text-[12px]"
                                  >
                                    <Printer size={13} /> Kitchen ticket
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ---------- পেজিনেশন ---------- */}
      {!loading && orders.length > 0 && (
        <Pagination
          page={page}
          totalPages={totalPage}
          onPageChange={(p) => {
            setLoading(true);
            setPage(p);
          }}
          total={total}
          limit={limit}
          limitOptions={[10, 20, 50, 100]}
          onLimitChange={(l) => {
            setLoading(true);
            setLimit(l);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
