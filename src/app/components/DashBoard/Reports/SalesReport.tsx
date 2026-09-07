"use client";

import { formatMoney } from "@/src/config/business";
import ReportShell, { BarChart, StatCard, TableCard } from "./ReportShell";

/* ==========================================================================
   SALES — দিন / মাস / বছরের বিক্রি
   ========================================================================== */

interface SalesData {
  range: { from: string; to: string; group: "day" | "month" | "year" };
  summary: {
    orders: number;
    revenue: number;
    subtotal: number;
    vat: number;
    service_charge: number;
    discount: number;
    delivery_fee: number;
    guests: number;
    average_order: number;
  };
  series: { label: string; orders: number; revenue: number }[];
  by_order_type: { key: string; orders: number; revenue: number }[];
  by_source: { key: string; orders: number; revenue: number }[];
  by_payment_method: { key: string; orders: number; revenue: number }[];
  top_items: { name: string; quantity: number; revenue: number }[];
}

const LABELS: Record<string, string> = {
  dine_in: "Dine in",
  delivery: "Delivery",
  pickup: "Pickup",
  web: "Website",
  pos: "Counter / POS",
  phone: "Phone",
  cod: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
};

const pretty = (key: string) => LABELS[key] || key.replace(/_/g, " ");

export default function SalesReport() {
  return (
    <ReportShell<SalesData>
      title="Sales report"
      subtitle="What the restaurant earned, and where it came from"
      endpoint="/api/v1/reports/sales"
    >
      {(data) => (
        <div className="space-y-5">
          {/* ---------- সারাংশ ---------- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="Revenue"
              value={formatMoney(data.summary.revenue)}
              hint="What customers actually paid"
            />
            <StatCard
              label="Orders"
              value={String(data.summary.orders)}
              hint={`${data.summary.guests} guests seated`}
            />
            <StatCard
              label="Average order"
              value={formatMoney(data.summary.average_order)}
            />
            <StatCard
              label="Food sales"
              value={formatMoney(data.summary.subtotal)}
              hint="Before tax and charges"
            />
          </div>

          {/* ---------- ভ্যাট / চার্জ ---------- */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="VAT collected" value={formatMoney(data.summary.vat)} />
            <StatCard
              label="Service charge"
              value={formatMoney(data.summary.service_charge)}
            />
            <StatCard
              label="Discounts given"
              value={formatMoney(data.summary.discount)}
            />
            <StatCard
              label="Delivery fees"
              value={formatMoney(data.summary.delivery_fee)}
            />
          </div>

          {/* ---------- সময়ের বাঁক ---------- */}
          <div className="bg-card border-default rounded-xl p-5">
            <h2 className="text-primary mb-4 text-[15px] font-medium">
              Revenue over time
            </h2>
            <BarChart
              rows={data.series.map((s) => ({
                label: s.label,
                value: s.revenue,
                caption: `${s.orders} orders`,
              }))}
              valueFormat={formatMoney}
            />
          </div>

          {/* ---------- ভাগে ভাগে ---------- */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Breakdown title="By order type" rows={data.by_order_type} />
            <Breakdown title="By channel" rows={data.by_source} />
            <Breakdown title="By payment" rows={data.by_payment_method} />
          </div>

          {/* ---------- সবচেয়ে বেশি বিক্রি ---------- */}
          <TableCard
            title="Best selling dishes"
            headers={["Dish", "Sold", "Revenue"]}
          >
            {data.top_items.length ? (
              data.top_items.map((item, i) => (
                <tr
                  key={item.name}
                  className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                >
                  <td className="text-primary px-4 py-3 text-[13.5px]">
                    {item.name}
                  </td>
                  <td className="text-secondary px-4 py-3 text-right text-[13px]">
                    {item.quantity}
                  </td>
                  <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                    {formatMoney(item.revenue)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="text-secondary px-4 py-10 text-center text-[13px]"
                >
                  No sales in this period.
                </td>
              </tr>
            )}
          </TableCard>
        </div>
      )}
    </ReportShell>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; orders: number; revenue: number }[];
}) {
  const total = rows.reduce((sum, r) => sum + r.revenue, 0) || 1;

  return (
    <div className="bg-card border-default rounded-xl p-5">
      <h2 className="text-primary mb-3 text-[15px] font-medium">{title}</h2>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-primary text-[13px]">{pretty(row.key)}</span>
                <span className="text-primary text-[13px] font-medium tabular-nums">
                  {formatMoney(row.revenue)}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded"
                style={{ background: "var(--bg-elevated)" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${(row.revenue / total) * 100}%`,
                    background: "var(--accent-primary)",
                  }}
                />
              </div>
              <p className="text-muted mt-1 text-[11.5px]">
                {row.orders} order{row.orders === 1 ? "" : "s"} ·{" "}
                {Math.round((row.revenue / total) * 100)}%
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-secondary py-6 text-center text-[13px]">
          Nothing yet.
        </p>
      )}
    </div>
  );
}
