/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Printer, X, ChefHat, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { apiGet, apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import { useSettingsStore } from "@/src/store/settings.store";
import { DateTimeBd } from "@/src/app/Layout/utils/DateTimeBd";
import {
  buildInvoiceHtml,
  buildKitchenTicketHtml,
  printHtml,
  type InvoiceOrder,
} from "./invoiceHtml";

/* ==========================================================================
   INVOICE VIEWER
   --------------------------------------------------------------------------
   ছাপার সময় হাতছাড়া হয়ে গেলে বিলটা আর দেখাই যেত না — শুধু "Print" বোতাম
   ছিল, যেটা চাপলে সরাসরি প্রিন্ট ডায়ালগ খুলত।

   এখন বিলটা আগে পর্দায় দেখা যায় (হুবহু যেভাবে কাগজে ছাপা হবে), তারপর
   ইচ্ছে হলে ছাপা যায়। যেকোনো পুরোনো অর্ডারের বিলও যেকোনো সময় খোলা যায়।
   ========================================================================== */

export default function InvoiceModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const settings = useSettingsStore((s) => s.settings);

  const [order, setOrder] = useState<(InvoiceOrder & { _id: string }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiGet<InvoiceOrder & { _id: string }>(
          `/api/v1/orders/${orderId}`,
        );
        if (!cancelled) setOrder(res.data);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Could not load the bill"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Esc চাপলে বন্ধ — ব্যস্ত সময়ে মাউস খোঁজার দরকার নেই
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const printInvoice = async () => {
    if (!order) return;
    printHtml(buildInvoiceHtml(order, settings));
    try {
      await apiPost(`/api/v1/orders/${order._id}/invoice`, {});
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              invoice_print_count: (prev as any).invoice_print_count + 1,
              invoice_printed_at: new Date().toISOString(),
            }
          : prev,
      );
    } catch {
      // ছাপা হয়েই গেছে — গোনা না হলেও কাজ আটকানোর কিছু নেই
    }
  };

  const p = order?.pricing;
  const money = (n: number) =>
    `${settings.currency}${Number(n || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    })}`;

  const printCount = (order as any)?.invoice_print_count ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border-default flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- হেডার ---------- */}
        <div className="border-default-b flex items-center justify-between px-5 py-4">
          <div>
            <h2 className="text-primary text-[16px] font-medium">Invoice</h2>
            {order && (
              <p className="text-secondary mt-0.5 text-[12px]">
                {printCount > 0
                  ? `Printed ${printCount} time${printCount === 1 ? "" : "s"}${
                      order.invoice_printed_at
                        ? ` · last ${DateTimeBd(order.invoice_printed_at as any)}`
                        : ""
                    }`
                  : "Not printed yet"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-secondary hover:text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* ---------- বিল ---------- */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={24} className="text-highlight animate-spin" />
            </div>
          ) : error || !order ? (
            <p className="text-danger py-12 text-center text-[13.5px]">
              {error || "Bill not found"}
            </p>
          ) : (
            /* কাগজের মতো দেখতে — সাদা জমিনে কালো লেখা, ঠিক যা ছাপা হবে */
            <div className="mx-auto max-w-[320px] rounded-lg bg-white px-5 py-6 font-mono text-[12px] leading-relaxed text-black">
              <div className="text-center">
                <p className="text-[15px] font-bold">
                  {settings.restaurant_name}
                </p>
                {settings.address && <p>{settings.address}</p>}
                {settings.phone && <p>{settings.phone}</p>}
                {settings.vat_reg_no && <p>VAT/BIN: {settings.vat_reg_no}</p>}
              </div>

              <div className="my-3 border-t border-dashed border-black" />

              <div>
                <p className="font-bold">{order.order_number}</p>
                <p>{DateTimeBd(order.createdAt)}</p>
                <p>
                  {order.order_type.replace(/_/g, " ")}
                  {order.table_name ? ` · ${order.table_name}` : ""}
                  {order.guests ? ` · ${order.guests} guests` : ""}
                </p>
                <p>
                  {order.customer.name} · {order.customer.phone}
                </p>
                {order.order_type === "delivery" && order.customer.address && (
                  <p>{order.customer.address}</p>
                )}
                {settings.invoice_show_staff &&
                  (order.waiter?.name || order.taken_by?.name) && (
                    <p>Served by {order.waiter?.name || order.taken_by?.name}</p>
                  )}
              </div>

              <div className="my-3 border-t border-dashed border-black" />

              <table className="w-full">
                <thead>
                  <tr className="border-b border-black text-left">
                    <th className="pb-1 font-bold">Qty</th>
                    <th className="pb-1 font-bold">Item</th>
                    <th className="pb-1 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-1 pr-2">{item.quantity}</td>
                      <td className="py-1">
                        {item.name}
                        {item.variation_name && (
                          <span className="text-[11px]">
                            {" "}
                            ({item.variation_name})
                          </span>
                        )}
                        {item.note && (
                          <div className="text-[11px] italic">{item.note}</div>
                        )}
                      </td>
                      <td className="py-1 text-right whitespace-nowrap">
                        {money(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="my-2 border-t border-dashed border-black" />

              <Row label="Subtotal" value={money(p!.subtotal)} />
              {p!.discount > 0 && (
                <Row label="Discount" value={`-${money(p!.discount)}`} />
              )}
              {p!.service_charge > 0 && (
                <Row
                  label={`Service charge (${p!.service_charge_percent}%)`}
                  value={money(p!.service_charge)}
                />
              )}
              {p!.vat > 0 && (
                <Row
                  label={
                    p!.tax_mode === "inclusive"
                      ? `VAT (${p!.vat_percent}% incl.)`
                      : `VAT (${p!.vat_percent}%)`
                  }
                  value={money(p!.vat)}
                />
              )}
              {p!.delivery_fee > 0 && (
                <Row label="Delivery" value={money(p!.delivery_fee)} />
              )}

              <div className="mt-2 flex justify-between border-t border-black pt-2 text-[14px] font-bold">
                <span>Total</span>
                <span>{money(p!.total)}</span>
              </div>

              <div className="my-3 border-t border-dashed border-black" />

              <p>
                Payment: {order.payment_method} ·{" "}
                <span className="font-bold">
                  {order.payment_status === "paid" ? "PAID" : "UNPAID"}
                </span>
              </p>
              {order.customer.note && <p>Note: {order.customer.note}</p>}

              <p className="mt-4 text-center">{settings.invoice_footer}</p>
            </div>
          )}
        </div>

        {/* ---------- বোতাম ---------- */}
        {order && (
          <div className="border-default-t flex gap-2 px-5 py-4">
            <button
              type="button"
              onClick={printInvoice}
              className="btn btn-primary flex-1 px-4 py-2.5 text-[13.5px]"
            >
              <Printer size={15} /> Print bill
            </button>
            <button
              type="button"
              onClick={() =>
                printHtml(buildKitchenTicketHtml(order, settings))
              }
              className="btn btn-outline px-4 py-2.5 text-[13px]"
              title="Reprint the kitchen ticket"
            >
              <ChefHat size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
