"use client";

import { formatMoney } from "@/src/config/business";
import ReportShell, { BarChart, StatCard, TableCard } from "./ReportShell";

/* ==========================================================================
   কোন টেবিল থেকে কত টাকা এলো
   ========================================================================== */

interface TableData {
  range: { from: string; to: string };
  tables: {
    table_id: string;
    table_name: string;
    orders: number;
    revenue: number;
    guests: number;
    items: number;
    average_order: number;
  }[];
}

export default function TableReport() {
  return (
    <ReportShell<TableData>
      title="Sales by table"
      subtitle="Which tables bring in the money — and which ones sit empty"
      endpoint="/api/v1/reports/tables"
    >
      {(data) => {
        const totalRevenue = data.tables.reduce((s, t) => s + t.revenue, 0);
        const totalOrders = data.tables.reduce((s, t) => s + t.orders, 0);
        const busiest = data.tables[0];

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Dine-in revenue"
                value={formatMoney(totalRevenue)}
              />
              <StatCard label="Table orders" value={String(totalOrders)} />
              <StatCard
                label="Tables used"
                value={String(data.tables.length)}
              />
              <StatCard
                label="Best table"
                value={busiest?.table_name || "—"}
                hint={busiest ? formatMoney(busiest.revenue) : undefined}
              />
            </div>

            <div className="bg-card border-default rounded-xl p-5">
              <h2 className="text-primary mb-4 text-[15px] font-medium">
                Revenue per table
              </h2>
              <BarChart
                rows={data.tables.map((t) => ({
                  label: t.table_name,
                  value: t.revenue,
                }))}
                valueFormat={formatMoney}
              />
            </div>

            <TableCard
              title="Table detail"
              headers={["Table", "Orders", "Guests", "Items", "Avg. bill", "Revenue"]}
            >
              {data.tables.length ? (
                data.tables.map((t, i) => (
                  <tr
                    key={t.table_id}
                    className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                  >
                    <td className="text-primary px-4 py-3 text-[13.5px] font-medium">
                      {t.table_name}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {t.orders}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {t.guests || "—"}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {t.items}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {formatMoney(t.average_order)}
                    </td>
                    <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                      {formatMoney(t.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-secondary px-4 py-10 text-center text-[13px]"
                  >
                    No dine-in orders in this period.
                  </td>
                </tr>
              )}
            </TableCard>
          </div>
        );
      }}
    </ReportShell>
  );
}
