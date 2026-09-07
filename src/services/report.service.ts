/* eslint-disable @typescript-eslint/no-explicit-any */
import OrderModel from "../models/order.model";
import { REVENUE_STATUSES } from "../interfaces/order.interfaces";

/* ==========================================================================
   REPORTS — বিক্রির হিসাব
   --------------------------------------------------------------------------
   সব হিসাব মঙ্গোর aggregation এ হয়, অ্যাপে নয় — হাজার হাজার অর্ডার হলেও
   ড্যাশবোর্ড ধীর হয় না।

   সময় সবসময় ঢাকার সময় ধরে কাটা হয় ("আজ" মানে ঢাকার আজ), তাই রাত ১২টার
   পর হিসাব হঠাৎ আগের দিনে চলে যায় না।
   ========================================================================== */

const TZ = "Asia/Dhaka";

export type ReportRange = "today" | "week" | "month" | "year" | "custom";
export type ReportGroup = "day" | "month" | "year";

/** বাতিল অর্ডার কখনোই বিক্রির হিসাবে আসে না */
const revenueMatch = (from: Date, to: Date) => ({
  createdAt: { $gte: from, $lte: to },
  status: { $in: REVENUE_STATUSES },
});

/** রেঞ্জ থেকে শুরু-শেষ তারিখ — ঢাকার দিন ধরে */
export function resolveRange(
  range: ReportRange,
  dateFrom?: string,
  dateTo?: string,
): { from: Date; to: Date; group: ReportGroup } {
  const now = new Date();

  if (range === "custom" && (dateFrom || dateTo)) {
    const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), 0, 1);
    const to = dateTo ? new Date(dateTo) : new Date();
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    // রেঞ্জ লম্বা হলে দিন ধরে দেখালে গ্রাফ পড়া যায় না
    const days = (to.getTime() - from.getTime()) / 86_400_000;
    return { from, to, group: days > 365 ? "month" : "day" };
  }

  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  switch (range) {
    case "week":
      from.setDate(from.getDate() - 6);
      return { from, to, group: "day" };
    case "month":
      from.setDate(1);
      return { from, to, group: "day" };
    case "year":
      from.setMonth(0, 1);
      return { from, to, group: "month" };
    case "today":
    default:
      return { from, to, group: "day" };
  }
}

const round = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/* ==========================================================================
   ১. সারাংশ + সময় ধরে বিক্রির বাঁক
   ========================================================================== */
const getSalesReport = async (opts: {
  range: ReportRange;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { from, to, group } = resolveRange(opts.range, opts.dateFrom, opts.dateTo);
  const match = revenueMatch(from, to);

  const format =
    group === "year" ? "%Y" : group === "month" ? "%Y-%m" : "%Y-%m-%d";

  const [summary, series, byType, bySource, byPayment, topItems] =
    await Promise.all([
      OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
            subtotal: { $sum: "$pricing.subtotal" },
            vat: { $sum: "$pricing.vat" },
            service_charge: { $sum: "$pricing.service_charge" },
            discount: { $sum: "$pricing.discount" },
            delivery_fee: { $sum: "$pricing.delivery_fee" },
            guests: { $sum: "$guests" },
          },
        },
      ]),

      OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: {
              $dateToString: { format, date: "$createdAt", timezone: TZ },
            },
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$order_type",
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$source",
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      OrderModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$payment_method",
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
          },
        },
        { $sort: { revenue: -1 } },
      ]),

      // সবচেয়ে বেশি বিক্রি হওয়া পদ
      OrderModel.aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.name",
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.subtotal" },
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: 12 },
      ]),
    ]);

  const s = summary[0] || {};
  const orders = s.orders || 0;

  return {
    range: { from, to, group },
    summary: {
      orders,
      revenue: round(s.revenue),
      subtotal: round(s.subtotal),
      vat: round(s.vat),
      service_charge: round(s.service_charge),
      discount: round(s.discount),
      delivery_fee: round(s.delivery_fee),
      guests: s.guests || 0,
      average_order: orders ? round((s.revenue || 0) / orders) : 0,
    },
    series: series.map((r: any) => ({
      label: r._id,
      orders: r.orders,
      revenue: round(r.revenue),
    })),
    by_order_type: byType.map((r: any) => ({
      key: r._id || "unknown",
      orders: r.orders,
      revenue: round(r.revenue),
    })),
    by_source: bySource.map((r: any) => ({
      key: r._id || "unknown",
      orders: r.orders,
      revenue: round(r.revenue),
    })),
    by_payment_method: byPayment.map((r: any) => ({
      key: r._id || "unknown",
      orders: r.orders,
      revenue: round(r.revenue),
    })),
    top_items: topItems.map((r: any) => ({
      name: r._id,
      quantity: r.quantity,
      revenue: round(r.revenue),
    })),
  };
};

/* ==========================================================================
   ২. কোন টেবিল থেকে কত টাকা এলো
   ========================================================================== */
const getTableReport = async (opts: {
  range: ReportRange;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { from, to } = resolveRange(opts.range, opts.dateFrom, opts.dateTo);

  const rows = await OrderModel.aggregate([
    { $match: { ...revenueMatch(from, to), table_id: { $ne: null } } },
    {
      $group: {
        _id: "$table_id",
        table_name: { $first: "$table_name" },
        orders: { $sum: 1 },
        revenue: { $sum: "$pricing.total" },
        guests: { $sum: "$guests" },
        items: { $sum: { $size: "$items" } },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return {
    range: { from, to },
    tables: rows.map((r: any) => ({
      table_id: String(r._id),
      table_name: r.table_name || "Unnamed table",
      orders: r.orders,
      revenue: round(r.revenue),
      guests: r.guests || 0,
      items: r.items || 0,
      average_order: r.orders ? round(r.revenue / r.orders) : 0,
    })),
  };
};

/* ==========================================================================
   ৩. কোন কর্মী কত বিক্রি করল
   --------------------------------------------------------------------------
   ওয়েটার হিসেবে যতগুলো অর্ডার তার নামে বসানো, আর POS এ নিজে হাতে যতগুলো
   তুলেছে — দুটোই আলাদা করে দেখানো হয়।
   ========================================================================== */
const getStaffReport = async (opts: {
  range: ReportRange;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { from, to } = resolveRange(opts.range, opts.dateFrom, opts.dateTo);
  const match = revenueMatch(from, to);

  const [served, taken] = await Promise.all([
    OrderModel.aggregate([
      { $match: { ...match, "waiter.id": { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$waiter.id",
          name: { $first: "$waiter.name" },
          role: { $first: "$waiter.role" },
          orders: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
          guests: { $sum: "$guests" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),

    OrderModel.aggregate([
      { $match: { ...match, "taken_by.id": { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$taken_by.id",
          name: { $first: "$taken_by.name" },
          role: { $first: "$taken_by.role" },
          orders: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  return {
    range: { from, to },
    /** টেবিলের দায়িত্বে থেকে যত বিক্রি */
    served_by: served.map((r: any) => ({
      staff_id: String(r._id),
      name: r.name || "Unknown",
      role: r.role || "waiter",
      orders: r.orders,
      revenue: round(r.revenue),
      guests: r.guests || 0,
      average_order: r.orders ? round(r.revenue / r.orders) : 0,
    })),
    /** POS এ নিজে হাতে তোলা অর্ডার */
    taken_by: taken.map((r: any) => ({
      staff_id: String(r._id),
      name: r.name || "Unknown",
      role: r.role || "staff",
      orders: r.orders,
      revenue: round(r.revenue),
    })),
  };
};

/* ==========================================================================
   ৪. শেফ আজ কী কী রান্না করল
   ========================================================================== */
const getChefReport = async (opts: {
  range: ReportRange;
  dateFrom?: string;
  dateTo?: string;
}) => {
  const { from, to } = resolveRange(opts.range, opts.dateFrom, opts.dateTo);

  // রান্না হয়েছে মানে অন্তত `ready` পর্যন্ত পৌঁছেছে
  const match = {
    createdAt: { $gte: from, $lte: to },
    status: { $in: ["ready", "served", "out_for_delivery", "delivered"] },
  };

  const [byChef, dishes, timing] = await Promise.all([
    OrderModel.aggregate([
      { $match: { ...match, "chef.id": { $nin: [null, ""] } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$chef.id",
          name: { $first: "$chef.name" },
          dishes: { $sum: "$items.quantity" },
          orders: { $addToSet: "$_id" },
        },
      },
      {
        $project: {
          name: 1,
          dishes: 1,
          orders: { $size: "$orders" },
        },
      },
      { $sort: { dishes: -1 } },
    ]),

    // পুরো রান্নাঘরে কোন পদ কতবার রান্না হলো
    OrderModel.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: { name: "$items.name", variation: "$items.variation_name" },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 40 },
    ]),

    // রান্নায় গড়ে কত মিনিট লাগছে — রান্নাঘর কত চাপে আছে বোঝা যায়
    OrderModel.aggregate([
      {
        $match: {
          ...match,
          kitchen_started_at: { $ne: null },
          kitchen_ready_at: { $ne: null },
        },
      },
      {
        $project: {
          minutes: {
            $divide: [
              { $subtract: ["$kitchen_ready_at", "$kitchen_started_at"] },
              60_000,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          avg_minutes: { $avg: "$minutes" },
          max_minutes: { $max: "$minutes" },
          measured: { $sum: 1 },
        },
      },
    ]),

  ]);

  const totalDishes = dishes.reduce((sum: number, r: any) => sum + r.quantity, 0);

  return {
    range: { from, to },
    total_dishes: totalDishes,
    cook_time: {
      average_minutes: round(timing[0]?.avg_minutes || 0),
      longest_minutes: round(timing[0]?.max_minutes || 0),
      measured_orders: timing[0]?.measured || 0,
    },
    by_chef: byChef.map((r: any) => ({
      staff_id: String(r._id),
      name: r.name || "Unknown",
      dishes: r.dishes,
      orders: r.orders,
    })),
    dishes: dishes.map((r: any) => ({
      name: r._id.name,
      variation: r._id.variation || "",
      quantity: r.quantity,
    })),
  };
};

export const ReportService = {
  getSalesReport,
  getTableReport,
  getStaffReport,
  getChefReport,
};
