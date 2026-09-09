/* eslint-disable @typescript-eslint/no-explicit-any */
import SalesLedgerModel from "../models/salesLedger.model";
import OrderArchiveModel from "../models/orderArchive.model";
import OrderModel from "../models/order.model";
import { businessDayKey, startOfBusinessDay } from "../lib/businessTime";
import { IOrderDocument, OrderStatus } from "../interfaces/order.interfaces";

/** শেষ হয়ে যাওয়া অর্ডার — এদেরই হিসাব বসে আর এদেরই সরানো যায় */
const CLOSED_STATUSES: OrderStatus[] = ["delivered", "cancelled"];

/* ==========================================================================
   হিসাবের খাতা আর আর্কাইভ — একসাথে সামলানো
   --------------------------------------------------------------------------
   একটা অর্ডার শেষ হওয়ার মুহূর্তে দুটো কাজ হয়:

     ১. তার অঙ্কগুলো ঐ দিনের খাতায় (`SalesLedger`) যোগ হয়
     ২. তার একটা হালকা কপি আর্কাইভে (`OrderArchive`) জমা হয়

   দুটোই **একবারই** হয়। একই অর্ডার দুবার গোনা হলে হিসাব ভুল হয়ে যেত,
   তাই অর্ডারের গায়ে `ledger_day` বসিয়ে চিহ্ন রাখা হয় — চিহ্ন থাকলে
   আর গোনা হয় না। স্ট্যাটাস বদলের মাঝপথে সার্ভার রিস্টার্ট হলেও তাই
   হিসাব দুবার বসে না।

   হিসাব লেখা কখনোই অর্ডারের পথ আটকায় না: খাতায় লিখতে গিয়ে কিছু ভুল
   হলে সেটা লগে যায়, কিন্তু কাস্টমারের অর্ডার আটকে থাকে না। খাতা পরে
   `rebuildDay()` দিয়ে আবার বানিয়ে নেওয়া যায়।
   ========================================================================== */

const money = (n: unknown) => Math.round((Number(n) || 0) * 100) / 100;

/** ভাগের হিসাবের জন্য `$inc` পাথ — "by_type.delivery.orders" */
const bucketInc = (
  group: string,
  key: string | undefined,
  amount: number,
  into: Record<string, number>,
) => {
  const safe = String(key || "unknown").replace(/[.$]/g, "_");
  into[`${group}.${safe}.orders`] = 1;
  into[`${group}.${safe}.total`] = amount;
};

/* ==========================================================================
   ১. খাতায় লেখা
   ========================================================================== */

/**
 * শেষ হওয়া একটা অর্ডার দিনের খাতায় যোগ করে।
 * `delivered` হলে বিক্রি, `cancelled` হলে হাতছাড়া হওয়া ব্যবসা — দুটোই
 * আলাদা করে গোনা হয়, কারণ "কত বাতিল হচ্ছে" নিজেই একটা দরকারি সংখ্যা।
 */
export const recordToLedger = async (order: IOrderDocument): Promise<void> => {
  // ইতিমধ্যেই গোনা হয়ে গেছে — দুবার গোনার সুযোগ নেই
  if ((order as any).ledger_day) return;

  const placedAt = order.createdAt || new Date();
  const day = businessDayKey(placedAt);
  const cancelled = order.status === "cancelled";
  const pricing = order.pricing || ({} as IOrderDocument["pricing"]);
  const total = money(pricing.total);

  const inc: Record<string, number> = {};

  if (cancelled) {
    inc.cancelled_orders = 1;
    inc.cancelled_value = total;
  } else {
    inc.orders = 1;
    inc.gross = money(pricing.subtotal);
    inc.discount = money(pricing.discount);
    inc.service_charge = money(pricing.service_charge);
    inc.vat = money(pricing.vat);
    inc.delivery_fee = money(pricing.delivery_fee);
    inc.net = total;
    inc.items_sold = order.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    bucketInc("by_type", order.order_type, total, inc);
    bucketInc("by_payment", order.payment_method, total, inc);
    bucketInc("by_source", order.source, total, inc);

    // কোন পদ কতটা — মাসের "সবচেয়ে বেশি বিক্রি" এখান থেকেই আসে
    for (const item of order.items) {
      const key = `${String(item.food_id)}_${item.variation_id}`.replace(/[.$]/g, "_");
      inc[`items.${key}.quantity`] = (inc[`items.${key}.quantity`] || 0) + item.quantity;
      inc[`items.${key}.revenue`] =
        money((inc[`items.${key}.revenue`] || 0) + item.subtotal);
    }
  }

  const [year, month] = day.split("-");

  // পদের নামটা সংখ্যা নয়, তাই `$inc` দিয়ে বসানো যায় না — `$set` এ যায়।
  // পাথগুলো আলাদা (`.name` বনাম `.quantity`), তাই `$inc` এর সাথে সংঘর্ষ নেই।
  const setNames: Record<string, string> = {};
  if (!cancelled) {
    for (const item of order.items) {
      const key = `${String(item.food_id)}_${item.variation_id}`.replace(/[.$]/g, "_");
      setNames[`items.${key}.name`] = item.name;
    }
  }

  await SalesLedgerModel.updateOne(
    { day },
    {
      $inc: inc,
      $setOnInsert: {
        day,
        month: `${year}-${month}`,
        year: Number(year),
        first_order_at: placedAt,
      },
      $set: { last_order_at: order.completed_at || new Date(), ...setNames },
    },
    { upsert: true },
  );

  // চিহ্ন বসিয়ে দিই — এই অর্ডার আর কখনো গোনা হবে না
  await OrderModel.updateOne({ _id: order._id }, { $set: { ledger_day: day } });
};

/* ==========================================================================
   ২. আর্কাইভে কপি
   ========================================================================== */
export const archiveOrder = async (order: IOrderDocument): Promise<void> => {
  const placedAt = order.createdAt || new Date();

  await OrderArchiveModel.updateOne(
    { order_number: order.order_number },
    {
      $setOnInsert: {
        order_number: order.order_number,
        original_id: order._id,
        day: businessDayKey(placedAt),

        customer: {
          name: order.customer?.name || "",
          phone: order.customer?.phone || "",
          email: order.customer?.email || "",
          address: order.customer?.address || "",
          area: order.customer?.area || "",
        },
        user_id: order.user_id || "",

        // ছবি আর রান্নাঘরের টিক বাদ — ওগুলোই সবচেয়ে বেশি জায়গা নেয়
        items: order.items.map((i) => ({
          food_id: i.food_id,
          variation_id: i.variation_id,
          name: i.name,
          variation_name: i.variation_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),

        order_type: order.order_type,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        source: order.source,

        table_name: order.table_name || "",
        waiter_name: order.waiter?.name || "",
        chef_name: order.chef?.name || "",

        pricing: order.pricing,
        cancelled_reason: order.cancelled_reason || "",

        placed_at: placedAt,
        completed_at: order.completed_at || null,
        archived_at: new Date(),
      },
    },
    { upsert: true },
  );
};

/**
 * অর্ডার শেষ — খাতা আর আর্কাইভ দুটোই সেরে ফেলা।
 * কোনোটা ব্যর্থ হলে লগে যায়, কিন্তু অর্ডারের পথ আটকায় না।
 */
export const closeOrder = async (order: IOrderDocument): Promise<void> => {
  try {
    await Promise.all([recordToLedger(order), archiveOrder(order)]);
  } catch (err) {
    console.error(`[ledger] could not close ${order.order_number}:`, err);
  }
};

/* ==========================================================================
   ৩. পুরোনো অর্ডার সরানো
   --------------------------------------------------------------------------
   মূল `orders` কালেকশনটা "চলতি কাজের টেবিল" — যত ছোট থাকে, ড্যাশবোর্ড
   তত দ্রুত। শেষ হওয়া অর্ডার কয়েক মাস পরে সেখানে পড়ে থেকে শুধু জায়গা
   আর ইনডেক্স ভারী করে।

   মোছার আগে দুটো জিনিস নিশ্চিত করা হয়:
     • খাতায় হিসাব বসেছে (`ledger_day` আছে)
     • আর্কাইভে কপি আছে

   দুটোর একটাও না থাকলে সেই অর্ডারটা মোছা হয় না — বরং আগে সেই কাজটা
   সেরে নেওয়া হয়। তাই "মুছে ফেললে হিসাব হারিয়ে যাবে" — এই ভয়টা এখানে
   নেই।
   ========================================================================== */
export interface PurgeResult {
  scanned: number;
  repaired: number;
  deleted: number;
  older_than_days: number;
  cutoff: string;
}

export const purgeOldOrders = async (
  olderThanDays = 90,
  opts: { dryRun?: boolean; batch?: number } = {},
): Promise<PurgeResult> => {
  const days = Math.max(30, Math.min(3650, Math.trunc(olderThanDays)));
  const cutoff = startOfBusinessDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
  const batch = Math.max(1, Math.min(5000, opts.batch ?? 1000));

  // শেষ হয়ে যাওয়া অর্ডার — চলতি কোনো অর্ডার কখনোই এর ভেতরে পড়ে না
  const where = {
    status: { $in: CLOSED_STATUSES },
    createdAt: { $lt: cutoff },
  };

  const candidates = await OrderModel.find(where).limit(batch);

  let repaired = 0;
  const deletable: any[] = [];

  for (const order of candidates) {
    // খাতায় বা আর্কাইভে না থাকলে আগে সেটা সেরে নিই, তারপরই মোছা
    const archived = await OrderArchiveModel.exists({
      order_number: order.order_number,
    });

    if (!(order as any).ledger_day || !archived) {
      await closeOrder(order);
      repaired++;
    }

    const ok = await OrderArchiveModel.exists({ order_number: order.order_number });
    if (ok) deletable.push(order._id);
  }

  let deleted = 0;
  if (!opts.dryRun && deletable.length) {
    const res = await OrderModel.deleteMany({ _id: { $in: deletable } });
    deleted = res.deletedCount || 0;
  }

  return {
    scanned: candidates.length,
    repaired,
    deleted: opts.dryRun ? 0 : deleted,
    older_than_days: days,
    cutoff: cutoff.toISOString(),
  };
};

/* ==========================================================================
   ৪. খাতা থেকে রিপোর্ট
   ========================================================================== */

/** একটা রেঞ্জের যোগফল — বছরের হিসাবও এতে ৩৬৫টা সারির যোগ মাত্র */
export const summarize = async (fromDay: string, toDay: string) => {
  const rows = await SalesLedgerModel.aggregate([
    { $match: { day: { $gte: fromDay, $lte: toDay } } },
    {
      $group: {
        _id: null,
        orders: { $sum: "$orders" },
        cancelled_orders: { $sum: "$cancelled_orders" },
        items_sold: { $sum: "$items_sold" },
        gross: { $sum: "$gross" },
        discount: { $sum: "$discount" },
        service_charge: { $sum: "$service_charge" },
        vat: { $sum: "$vat" },
        delivery_fee: { $sum: "$delivery_fee" },
        net: { $sum: "$net" },
        cancelled_value: { $sum: "$cancelled_value" },
        days: { $sum: 1 },
      },
    },
  ]);

  const row = rows[0] || {};

  return {
    from: fromDay,
    to: toDay,
    days: row.days || 0,
    orders: row.orders || 0,
    cancelled_orders: row.cancelled_orders || 0,
    items_sold: row.items_sold || 0,
    gross: money(row.gross),
    discount: money(row.discount),
    service_charge: money(row.service_charge),
    vat: money(row.vat),
    delivery_fee: money(row.delivery_fee),
    net: money(row.net),
    cancelled_value: money(row.cancelled_value),
    average_order_value: row.orders ? money(row.net / row.orders) : 0,
  };
};

/** দিনে দিনে — চার্টের লাইন এখান থেকেই আঁকা হয় */
export const dailySeries = async (fromDay: string, toDay: string) =>
  SalesLedgerModel.find({ day: { $gte: fromDay, $lte: toDay } })
    .select("day orders net items_sold cancelled_orders")
    .sort({ day: 1 })
    .lean();

/**
 * সারা জীবনের হিসাব — খাতার সব সারি যোগ।
 * আগে এটা প্রতিবার পুরো `orders` কালেকশন স্ক্যান করত, তাই এক বছরের
 * ডেটা জমার পর ড্যাশবোর্ড খুললেই ডাটাবেস হাঁপিয়ে যেত।
 */
export const allTimeTotals = async () => {
  const rows = await SalesLedgerModel.aggregate([
    {
      $group: {
        _id: null,
        orders: { $sum: "$orders" },
        net: { $sum: "$net" },
      },
    },
  ]);

  return {
    orders: rows[0]?.orders || 0,
    revenue: money(rows[0]?.net),
  };
};

/**
 * একটা দিনের খাতা আবার গোড়া থেকে বানানো।
 * হাতে ডেটা বদলানো হলে বা পুরোনো অর্ডার ইমপোর্ট করা হলে এটাই ভরসা।
 */
export const rebuildDay = async (day: string) => {
  const start = startOfBusinessDay(new Date(`${day}T12:00:00Z`));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  await SalesLedgerModel.deleteOne({ day });
  await OrderModel.updateMany(
    { createdAt: { $gte: start, $lt: end } },
    { $unset: { ledger_day: "" } },
  );

  const orders = await OrderModel.find({
    createdAt: { $gte: start, $lt: end },
    status: { $in: CLOSED_STATUSES },
  });

  for (const order of orders) await recordToLedger(order);

  return { day, rebuilt_from: orders.length };
};

export const LedgerService = {
  recordToLedger,
  archiveOrder,
  closeOrder,
  purgeOldOrders,
  summarize,
  dailySeries,
  allTimeTotals,
  rebuildDay,
};
