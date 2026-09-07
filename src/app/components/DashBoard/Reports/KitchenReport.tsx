"use client";

import ReportShell, { BarChart, StatCard, TableCard } from "./ReportShell";

/* ==========================================================================
   রান্নাঘরের হিসাব — শেফ কী কী রান্না করল
   ========================================================================== */

interface KitchenData {
  range: { from: string; to: string };
  total_dishes: number;
  cook_time: {
    average_minutes: number;
    longest_minutes: number;
    measured_orders: number;
  };
  by_chef: {
    staff_id: string;
    name: string;
    dishes: number;
    orders: number;
  }[];
  dishes: { name: string; variation: string; quantity: number }[];
}

export default function KitchenReport() {
  return (
    <ReportShell<KitchenData>
      title="Kitchen output"
      subtitle="How many dishes went out, who cooked them, and how long it took"
      endpoint="/api/v1/reports/chef"
    >
      {(data) => {
        const topChef = data.by_chef[0];

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Dishes cooked"
                value={String(data.total_dishes)}
                hint="Counted by quantity, not by order"
              />
              <StatCard
                label="Average cook time"
                value={
                  data.cook_time.measured_orders
                    ? `${data.cook_time.average_minutes} min`
                    : "—"
                }
                hint={
                  data.cook_time.measured_orders
                    ? `across ${data.cook_time.measured_orders} orders`
                    : "no timed orders yet"
                }
              />
              <StatCard
                label="Slowest order"
                value={
                  data.cook_time.measured_orders
                    ? `${data.cook_time.longest_minutes} min`
                    : "—"
                }
              />
              <StatCard
                label="Busiest chef"
                value={topChef?.name || "—"}
                hint={topChef ? `${topChef.dishes} dishes` : undefined}
              />
            </div>

            {/* ---------- শেফ অনুযায়ী ---------- */}
            <div className="bg-card border-default rounded-xl p-5">
              <h2 className="text-primary mb-1 text-[15px] font-medium">
                Dishes per chef
              </h2>
              <p className="text-secondary mb-4 text-[12.5px]">
                A chef is credited when they tick items off on the kitchen screen
              </p>
              <BarChart
                rows={data.by_chef.map((c) => ({
                  label: c.name,
                  value: c.dishes,
                }))}
                valueFormat={(n) => `${n} dishes`}
              />
            </div>

            <TableCard title="Chef detail" headers={["Chef", "Orders", "Dishes"]}>
              {data.by_chef.length ? (
                data.by_chef.map((c, i) => (
                  <tr
                    key={c.staff_id}
                    className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                  >
                    <td className="text-primary px-4 py-3 text-[13.5px] font-medium">
                      {c.name}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {c.orders}
                    </td>
                    <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                      {c.dishes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="text-secondary px-4 py-10 text-center text-[13px]"
                  >
                    No chef has been credited yet — chefs get credited when they
                    tick items off on the Kitchen screen.
                  </td>
                </tr>
              )}
            </TableCard>

            {/* ---------- কোন পদ কতবার ---------- */}
            <TableCard
              title="What the kitchen cooked"
              headers={["Dish", "Size", "Cooked"]}
            >
              {data.dishes.length ? (
                data.dishes.map((d, i) => (
                  <tr
                    key={`${d.name}-${d.variation}`}
                    className={`table-row-hover ${i % 2 ? "table-row-alt" : ""}`}
                  >
                    <td className="text-primary px-4 py-3 text-[13.5px]">
                      {d.name}
                    </td>
                    <td className="text-secondary px-4 py-3 text-right text-[13px]">
                      {d.variation || "—"}
                    </td>
                    <td className="text-primary px-4 py-3 text-right text-[13px] font-medium">
                      {d.quantity}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    className="text-secondary px-4 py-10 text-center text-[13px]"
                  >
                    Nothing cooked in this period.
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
