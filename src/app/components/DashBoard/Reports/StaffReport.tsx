"use client";

import { formatMoney } from "@/src/config/business";
import ReportShell, { BarChart, StatCard, TableCard } from "./ReportShell";

/* ==========================================================================
   কোন কর্মী কত বিক্রি করল
   --------------------------------------------------------------------------
   দুই ভাবে গোনা হয়:
     served_by — টেবিলের দায়িত্বে থেকে যত বিক্রি (ওয়েটারের আসল হিসাব)
     taken_by  — POS এ নিজে হাতে যত অর্ডার তুলেছে
   ========================================================================== */

interface StaffData {
  range: { from: string; to: string };
  served_by: {
    staff_id: string;
    name: string;
    role: string;
    orders: number;
    revenue: number;
    guests: number;
    average_order: number;
  }[];
  taken_by: {
    staff_id: string;
    name: string;
    role: string;
    orders: number;
    revenue: number;
  }[];
}

export default function StaffReport() {
  return (
    <ReportShell<StaffData>
      title="Sales by staff"
      subtitle="Who served how much — daily, monthly or yearly"
      endpoint="/api/v1/reports/staff"
    >
      {(data) => {
        const total = data.served_by.reduce((s, r) => s + r.revenue, 0);
        const top = data.served_by[0];

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Attributed revenue" value={formatMoney(total)} />
              <StatCard
                label="Staff with sales"
                value={String(data.served_by.length)}
              />
              <StatCard
                label="Top performer"
                value={top?.name || "—"}
                hint={top ? formatMoney(top.revenue) : undefined}
              />
              <StatCard
                label="Orders served"
                value={String(data.served_by.reduce((s, r) => s + r.orders, 0))}
              />
            </div>

            <div className="bg-card border-default rounded-xl p-5">
              <h2 className="text-primary mb-1 text-[15px] font-medium">
                Revenue by waiter
              </h2>
              <p className="text-secondary mb-4 text-[12.5px]">
                Counted from the tables each person was responsible for
              </p>
              <BarChart
                rows={data.served_by.map((r) => ({
                  label: r.name,
                  value: r.revenue,
                }))}
                valueFormat={formatMoney}
              />
            </div>

            <TableCard
              title="Served by"
              headers={["Staff", "Role", "Orders", "Guests", "Avg. bill", "Revenue"]}
            >
              {data.served_by.length ? (
                data.served_by.map((r, i) => (
                  <tr
                    key={r.staff_id}
                    className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                  >
                    <td className="text-primary px-4 py-3 text-[13.5px] font-medium">
                      {r.name}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px] capitalize">
                      {r.role}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {r.orders}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {r.guests || "—"}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {formatMoney(r.average_order)}
                    </td>
                    <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                      {formatMoney(r.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="text-secondary px-4 py-10 text-center text-[13px]"
                  >
                    No orders were tied to a waiter in this period. Assign a
                    waiter to each table so this fills in.
                  </td>
                </tr>
              )}
            </TableCard>

            <TableCard
              title="Orders taken at the counter"
              headers={["Staff", "Role", "Orders", "Revenue"]}
            >
              {data.taken_by.length ? (
                data.taken_by.map((r, i) => (
                  <tr
                    key={r.staff_id}
                    className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                  >
                    <td className="text-primary px-4 py-3 text-[13.5px] font-medium">
                      {r.name}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px] capitalize">
                      {r.role}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {r.orders}
                    </td>
                    <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                      {formatMoney(r.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="text-secondary px-4 py-10 text-center text-[13px]"
                  >
                    Nothing taken at the counter in this period.
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
