/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortOrder } from "mongoose";
import OrderModel from "../models/order.model";
import OrderSequenceModel from "../models/orderSequence.model";
import FoodModel from "../models/food.model";
import TableModel from "../models/table.model";
import { StaffModel } from "../models/staff.model";
import { IGenaricRespons } from "../lib/common";
import { IPaginationOpton } from "../lib/pagination";
import { HelperPagination } from "../lib/paginationHelper";
import { ApiError, BadRequest, Conflict, NotFound } from "../lib/apiError";
import { orderDateStamp, startOfBusinessDay } from "../lib/businessTime";
import {
  escapeRegex,
  prefixRegex,
  sanitizeSearchTerm,
  safeSortBy,
} from "../lib/safeQuery";
import { calcOrderPricing } from "../config/business";
import { SettingsService } from "./settings.service";
import { LedgerService } from "./ledger.service";
import { TableService } from "./table.service";
import {
  IOrderDocument,
  IOrderItem,
  IOrderStaffRef,
  OrderStatus,
  ORDER_STATUS_FLOW,
  ACTIVE_ORDER_STATUSES,
  TABLE_HELD_STATUSES,
  KITCHEN_STATUSES,
  REVENUE_STATUSES,
} from "../interfaces/order.interfaces";
import { CreateOrderInput } from "../validations/order.schema";
import { phoneVariants } from "../lib/phone";

/* ==========================================================================
   অর্ডার নম্বর — ORD-260909-0007 (তারিখ + ঐ দিনের ক্রমিক)
   --------------------------------------------------------------------------
   চেকআউটে যে ৪০৯ ("A record with this order_number already exists") আসছিল,
   তার জন্ম এখানেই। আগের কোড ঐ দিনের অর্ডার **গুনে** পরের সংখ্যাটা বসাত।
   দুজন কাস্টমার একই সেকেন্ডে "Place order" চাপলে দুজনেই একই সংখ্যা গুনত,
   দুজনেরই নম্বর হতো `...-0007`, আর দ্বিতীয়জনের অর্ডার `order_number` এর
   unique ইনডেক্সে আটকে যেত। ব্যস্ত সময়ে তাই কাস্টমার হারাত।

   এখন তিনটে স্তর, তিনটেই আলাদা কারণে:

     ১. **পরমাণু কাউন্টার** — গোনা নয়, `$inc`। মঙ্গো নিজে নিশ্চিত করে
        একই মুহূর্তের দুটো ডাক দুটো আলাদা সংখ্যা পায়। এতেই আসল
        সমস্যাটা শেষ, সার্ভার কয়টা ইনস্ট্যান্সে চলুক না কেন।

     ২. **নিজে সেরে ওঠা** — কাউন্টার যদি কোনোভাবে পিছিয়ে থাকে (হাতে
        ডেটা বসানো, পুরোনো অর্ডার ইমপোর্ট, কালেকশন রিসেট), তবু নম্বর
        সংঘর্ষ হতে পারে। তাই সংঘর্ষ হলে ঐ দিনের সবচেয়ে বড় নম্বরটা
        দেখে কাউন্টারকে সেখান থেকে এগিয়ে দেওয়া হয়।

     ৩. **শেষ ভরসা** — কয়েকবার চেষ্টার পরেও না হলে সময় ধরে একটা
        নম্বর বসে। কাস্টমারের অর্ডার কখনোই এররে শেষ হয় না।

   তারিখটা দোকানের টাইমজোনে (Asia/Dhaka), সার্ভারের UTC ঘড়িতে নয় —
   নাহলে রাত ১২টা থেকে ভোর ৬টার অর্ডারে আগের দিনের তারিখ বসত।
   ========================================================================== */

/** ঐ দিনের কাউন্টার এক ধাপ বাড়িয়ে নতুন সংখ্যাটা ফেরত দেয় */
async function nextSequence(key: string): Promise<number> {
  const doc = await OrderSequenceModel.findOneAndUpdate(
    { key },
    { $inc: { value: 1 }, $set: { updated_at: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return doc?.value ?? 1;
}

/**
 * কাউন্টার পিছিয়ে থাকলে ঐ দিনের সবচেয়ে বড় নম্বরের পরে নিয়ে যায়।
 * শুধু সংঘর্ষ হলেই ডাকা হয়, তাই স্বাভাবিক পথে বাড়তি কোনো কোয়েরি নেই।
 */
async function healSequence(key: string, prefix: string, stamp: string) {
  const latest = await OrderModel.findOne({
    order_number: prefixRegex(`${prefix}-${stamp}-`),
  })
    .select("order_number")
    .sort({ order_number: -1 })
    .lean();

  const highest = Number(latest?.order_number?.split("-").pop()) || 0;

  await OrderSequenceModel.updateOne(
    { key },
    { $max: { value: highest }, $set: { updated_at: new Date() } },
    { upsert: true },
  );
}

/** ডুপ্লিকেট `order_number` কিনা — অন্য কোনো unique ফিল্ডের সংঘর্ষ নয় তো */
const isDuplicateOrderNumber = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: number }).code === 11000 &&
  Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern || {}).includes(
    "order_number",
  );

async function generateOrderNumber(prefix: string, attempt = 0): Promise<string> {
  const stamp = orderDateStamp();
  const key = `${prefix}-${stamp}`;

  // তৃতীয় চেষ্টার আগে কাউন্টারকে বাস্তবের সাথে মিলিয়ে নিই
  if (attempt > 0) await healSequence(key, prefix, stamp);

  const sequence = await nextSequence(key);
  return `${prefix}-${stamp}-${String(sequence).padStart(4, "0")}`;
}

/* ==========================================================================
   মেনু থেকে লাইন বানানো
   দাম সবসময় ডাটাবেস থেকে — ক্লায়েন্টের পাঠানো দাম কখনো বিশ্বাস করা হয় না
   ========================================================================== */
async function buildItems(
  lines: CreateOrderInput["items"],
  opts: { addedLater?: boolean } = {},
): Promise<IOrderItem[]> {
  // এক কোয়েরিতে সব খাবার আনি — প্রতি আইটেমে আলাদা DB কল নয়
  const foodIds = [...new Set(lines.map((i) => i.food_id))];
  const foods = await FoodModel.find({ _id: { $in: foodIds } }).lean();
  const foodMap = new Map(foods.map((f: any) => [String(f._id), f]));

  return lines.map((line) => {
    const food = foodMap.get(String(line.food_id));
    if (!food) throw NotFound(`One of the items is no longer available`);
    if (food.status === "inactive")
      throw Conflict(`"${food.name}" is currently unavailable`);

    const variation = (food.variations || []).find(
      (v: any) => String(v._id) === String(line.variation_id),
    );
    if (!variation)
      throw NotFound(`The selected size for "${food.name}" is no longer available`);
    if (variation.status === "inactive" || variation.isOpen === false)
      throw Conflict(`"${food.name} — ${variation.name}" is currently unavailable`);

    if (
      typeof variation.stock_quantity === "number" &&
      variation.stock_quantity < line.quantity
    ) {
      throw Conflict(
        `Only ${variation.stock_quantity} left of "${food.name} — ${variation.name}"`,
      );
    }

    const unit_price = Number(variation.salePrice ?? variation.regularPrice);
    const quantity = Number(line.quantity);

    return {
      food_id: food._id,
      variation_id: String(variation._id),
      name: food.name,
      variation_name: variation.name || "",
      image: variation.images?.[0]?.url || food.image || "",
      regular_price: Number(variation.regularPrice),
      unit_price,
      quantity,
      subtotal: Math.round(unit_price * quantity * 100) / 100,
      spice_level: variation.spice_level || "",
      note: line.note || "",
      is_ready: false,
      ready_at: null,
      added_later: !!opts.addedLater,
    };
  });
}

/** স্টাফ আইডি থেকে নাম/রোলের স্ন্যাপশট — বিলে ছাপার জন্য */
async function staffRef(id?: string): Promise<IOrderStaffRef> {
  if (!id) return {};
  const staff = await StaffModel.findById(id);
  if (!staff) return {};
  return {
    id: String(staff._id),
    name: staff.staff_name,
    role: staff.staff_role,
  };
}

/* ==========================================================================
   COOLDOWN — একটা অর্ডারের পরে পরেরটার জন্য অপেক্ষা
   --------------------------------------------------------------------------
   একই কাস্টমার পর পর অর্ডার বসিয়ে দিলে রান্নাঘরে একই খাবারের কয়েকটা
   টিকিট চলে যায় — সাধারণত "বোতামটা কাজ করেনি" ভেবে দুবার চাপার ফল।
   ভুল অর্ডার রান্না হয়ে টাকা আর খাবার দুটোই নষ্ট হয়।

   তাই ওয়েব থেকে আসা অর্ডারে ৩ মিনিটের বিরতি। নিয়মটা ফোন নম্বর ধরে —
   লগইন করা থাকুক বা না থাকুক, একই মানুষ একই নিয়মে পড়ে।

   POS ইচ্ছে করেই এর বাইরে: কাউন্টারে একজন ক্যাশিয়ার পর পর দশজনের
   অর্ডার তোলেন, তাঁকে আটকানো মানে দোকান বন্ধ করে দেওয়া।
   ========================================================================== */
export const ORDER_COOLDOWN_SECONDS = Number(
  process.env.ORDER_COOLDOWN_SECONDS || 180,
);

/** বিরতির মধ্যে গোনা হয় এমন স্ট্যাটাস — বাতিল হয়ে যাওয়া অর্ডার গোনা হয় না */
const COOLDOWN_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "served",
  "out_for_delivery",
];

export interface OrderCooldown {
  /** এখন অর্ডার দেওয়া যাবে কিনা */
  can_order: boolean;
  /** আর কত সেকেন্ড বাকি */
  seconds_remaining: number;
  /** মোট বিরতি কত সেকেন্ডের — UI এর প্রগ্রেস রিং এটা দিয়ে আঁকে */
  cooldown_seconds: number;
  /** আগের অর্ডারটা কোনটা — "আপনার ORD-… এখনো রান্নাঘরে" বলার জন্য */
  last_order_number?: string;
  last_order_id?: string;
  last_order_status?: OrderStatus;
  /** কখন আবার দেওয়া যাবে (ISO) — ক্লায়েন্টের ঘড়ি এগিয়ে/পিছিয়ে থাকলেও কাজ করে */
  next_order_at?: string;
}

/**
 * ঐ ফোন নম্বরের সর্বশেষ ওয়েব-অর্ডার দেখে বিরতির অবস্থা বলে।
 * চেকআউট পেজ এটাই ডেকে লাইভ কাউন্টডাউন দেখায়, আর অর্ডার বসানোর সময়
 * সার্ভার নিজেও এটাই মিলিয়ে দেখে — দুই জায়গায় নিয়ম এক।
 */
const getCooldown = async (
  phone: string,
  userId?: string,
): Promise<OrderCooldown> => {
  const since = new Date(Date.now() - ORDER_COOLDOWN_SECONDS * 1000);

  // নম্বর যেভাবেই লেখা হোক (01…, 8801…, +8801…) — সব রূপই মেলানো হয়
  const identity: Record<string, unknown>[] = [
    { "customer.phone": { $in: phoneVariants(phone) } },
  ];
  if (userId) identity.push({ user_id: userId });

  const last = await OrderModel.findOne({
    $or: identity,
    source: "web",
    status: { $in: COOLDOWN_STATUSES },
    createdAt: { $gte: since },
  })
    .select("order_number status createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (!last) {
    return {
      can_order: true,
      seconds_remaining: 0,
      cooldown_seconds: ORDER_COOLDOWN_SECONDS,
    };
  }

  const readyAt = new Date(
    new Date(last.createdAt).getTime() + ORDER_COOLDOWN_SECONDS * 1000,
  );
  const remaining = Math.max(0, Math.ceil((readyAt.getTime() - Date.now()) / 1000));

  return {
    can_order: remaining === 0,
    seconds_remaining: remaining,
    cooldown_seconds: ORDER_COOLDOWN_SECONDS,
    last_order_number: last.order_number,
    last_order_id: String(last._id),
    last_order_status: last.status,
    next_order_at: readyAt.toISOString(),
  };
};

/* ==========================================================================
   CREATE
   ========================================================================== */
const createOrder = async (
  payload: CreateOrderInput,
  meta: {
    ip?: string;
    source?: "web" | "pos" | "phone";
    /** লগইন করা কাস্টমার হলে তার আইডি — "My orders" পেজ এটা ধরেই খোঁজে */
    user_id?: string;
    /** POS থেকে হলে যে কর্মী অর্ডারটা তুলেছে */
    taken_by?: IOrderStaffRef;
  } = {},
) => {
  const source = meta.source || "web";
  const settings = await SettingsService.get();

  /* ---- ওয়েব অর্ডারে বিরতি — কাউন্টারের অর্ডার এর বাইরে ---- */
  if (source === "web") {
    const cooldown = await getCooldown(payload.customer.phone, meta.user_id);

    if (!cooldown.can_order) {
      const minutes = Math.floor(cooldown.seconds_remaining / 60);
      const seconds = cooldown.seconds_remaining % 60;
      const wait =
        minutes > 0
          ? `${minutes} minute${minutes === 1 ? "" : "s"}${seconds ? ` ${seconds}s` : ""}`
          : `${seconds} seconds`;

      throw new ApiError(
        429,
        `Your order ${cooldown.last_order_number} is already with us. You can place another one in ${wait}.`,
        [{ path: "cooldown", message: String(cooldown.seconds_remaining) }],
        { "Retry-After": String(cooldown.seconds_remaining) },
      );
    }
  }

  // দোকান যেটা অফার করে না সেটা কেউ যেন সরাসরি API তে পাঠিয়ে বসাতে না পারে —
  // চেকআউটে অপশনটা লুকানো থাকাই যথেষ্ট নয়
  if (!settings.order_types.includes(payload.order_type)) {
    throw BadRequest(
      `We are not taking ${payload.order_type.replace(/_/g, "-")} orders right now`,
    );
  }
  if (!settings.payment_methods.includes(payload.payment_method)) {
    throw BadRequest("That payment method is not accepted here");
  }

  const items = await buildItems(payload.items);
  const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);

  if (payload.order_type === "delivery" && subtotal < settings.min_order_amount) {
    throw BadRequest(
      `Minimum order for delivery is ${settings.currency}${settings.min_order_amount}`,
    );
  }

  /* ==========================================================================
     টেবিল — এখানে শুধু *পছন্দ* হিসেবে জমা হয়, দখল হয় না
     --------------------------------------------------------------------------
     আগে অর্ডার তৈরি হওয়ার সাথে সাথেই টেবিল দখল হয়ে যেত, অথচ অর্ডারটা
     তখনো `pending` — ম্যানেজার দেখেনওনি। ফলে একজন অচেনা কেউ অর্ডার
     বসিয়ে দিলেই টেবিলটা সবার জন্য বন্ধ হয়ে যেত।

     এখন টেবিল দখল হয় কেবল ম্যানেজার কনফার্ম করার সময় (updateStatus →
     confirmed)। তার আগ পর্যন্ত অর্ডারটা অপেক্ষমাণ সারিতে থাকে।

     টেবিল ব্যস্ত থাকলেও অর্ডার আটকাই না — কাস্টমার সারিতে দাঁড়াতে পারে,
     ম্যানেজার পরে খালি টেবিলে বসিয়ে দেবে।
     ========================================================================== */
  let table = null;
  if (payload.table_id) {
    table = await TableModel.findById(payload.table_id);
    if (!table) throw NotFound("That table was not found");
  }

  // ওয়েটার আলাদা করে না দিলে টেবিলের দায়িত্বে থাকা ওয়েটারই ধরে নিই
  const waiter = await staffRef(payload.waiter_id || table?.waiter_id || undefined);

  const pricing = calcOrderPricing(
    {
      subtotal,
      orderType: payload.order_type,
      discount: payload.discount,
    },
    settings,
  );

  const draft = {
    user_id: meta.user_id || "",
    items,
    customer: payload.customer,
    order_type: payload.order_type,

    table_id: table?._id ?? null,
    table_name: table?.name || "",
    table_number: payload.table_number || table?.name || "",
    guests: payload.guests || 0,

    taken_by: meta.taken_by || {},
    waiter,

    payment_method: payload.payment_method,
    payment_status: "unpaid" as const,
    status: "pending" as const,
    pricing,
    coupon_code: payload.coupon_code || "",
    source,
    placed_ip: meta.ip || "",
    scheduled_for: payload.scheduled_for ?? undefined,
    status_history: [
      {
        status: "pending" as const,
        at: new Date(),
        by: meta.taken_by?.name || "customer",
      },
    ],
  };

  /* ==========================================================================
     নম্বর বসিয়ে সেভ — সংঘর্ষ হলে আবার চেষ্টা
     --------------------------------------------------------------------------
     স্বাভাবিক অবস্থায় প্রথম চেষ্টাতেই হয়ে যায়। দ্বিতীয় চেষ্টায় কাউন্টারকে
     বাস্তবের সাথে মিলিয়ে নেওয়া হয় (`healSequence`), তাই দ্বিতীয়বার
     সংঘর্ষ প্রায় অসম্ভব। তবু তিনবারেই না হলে সময় ধরে একটা নম্বর বসে —
     কাস্টমারের অর্ডার কখনোই ৪০৯ এ শেষ হয় না।
     ========================================================================== */
  const MAX_ATTEMPTS = 4;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const order_number =
      attempt < MAX_ATTEMPTS - 1
        ? await generateOrderNumber(settings.order_prefix, attempt)
        : // শেষ ভরসা — মিলিসেকেন্ড + এলোমেলো, দুবার এক হওয়া কার্যত অসম্ভব
          `${settings.order_prefix}-${orderDateStamp()}-${Date.now()
            .toString(36)
            .toUpperCase()
            .slice(-5)}`;

    try {
      // দখল করা হয় না — কনফার্মের সময় হবে
      return await OrderModel.create({ ...draft, order_number });
    } catch (err) {
      if (!isDuplicateOrderNumber(err) || attempt === MAX_ATTEMPTS - 1) throw err;
      console.warn(
        `[order] order_number ${order_number} collided, retrying (${attempt + 1})`,
      );
    }
  }

  // এখানে পৌঁছানোর কোনো পথ নেই, কিন্তু TypeScript কে বলে রাখা দরকার
  throw new ApiError(500, "Could not place the order. Please try again.");
};

/* ==========================================================================
   ITEMS — চলতি অর্ডারে পরে আরও খাবার যোগ হয় (টেবিলে বসে আবার অর্ডার)
   ========================================================================== */
const addItems = async (
  id: string,
  lines: CreateOrderInput["items"],
  by?: IOrderStaffRef,
) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");

  if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
    throw BadRequest(
      `This order is already ${order.status.replace(/_/g, " ")} — start a new order instead`,
    );
  }

  const settings = await SettingsService.get();
  // অর্ডার একবার কনফার্ম হয়ে গেলে নতুন পদগুলো রান্নাঘরে "নতুন" চিহ্ন পায়
  const addedLater = order.status !== "pending";
  const fresh = await buildItems(lines, { addedLater });

  fresh.forEach((line) => {
    const existing = order.items.find(
      (i) =>
        String(i.food_id) === String(line.food_id) &&
        i.variation_id === line.variation_id &&
        // রান্না হয়ে যাওয়া পদের সাথে মেলানো যাবে না — ওটা আলাদা লাইনই থাক
        !i.is_ready &&
        i.added_later === line.added_later,
    );

    if (existing) {
      existing.quantity += line.quantity;
      existing.subtotal =
        Math.round(existing.unit_price * existing.quantity * 100) / 100;
    } else {
      order.items.push(line);
    }
  });

  const subtotal = order.items.reduce((sum, i) => sum + i.subtotal, 0);
  order.pricing = calcOrderPricing(
    {
      subtotal,
      orderType: order.order_type,
      discount: order.pricing?.discount || 0,
    },
    settings,
  );

  // রান্না শেষ হয়ে যাওয়ার পরে নতুন পদ এলে অর্ডার আবার রান্নাঘরে ফেরত যায়
  if (addedLater && order.status === "ready") {
    order.status = "preparing";
    order.kitchen_ready_at = null;
    order.status_history.push({
      status: "preparing",
      at: new Date(),
      by: by?.name || "manager",
      note: "New items added after the order was ready",
    });
  }

  await order.save();
  return order;
};

/** একটা লাইন সরানো / সংখ্যা বদলানো — POS এ ভুল হলে ম্যানেজার ঠিক করে */
const updateItem = async (
  id: string,
  index: number,
  quantity: number,
  by?: IOrderStaffRef,
) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");

  if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
    throw BadRequest("This order is already closed");
  }
  if (index < 0 || index >= order.items.length) {
    throw BadRequest("That item is not on this order");
  }

  if (quantity <= 0) {
    if (order.items.length === 1) {
      throw BadRequest("An order must keep at least one item — cancel it instead");
    }
    order.items.splice(index, 1);
  } else {
    const item = order.items[index];
    item.quantity = quantity;
    item.subtotal = Math.round(item.unit_price * quantity * 100) / 100;
  }

  const settings = await SettingsService.get();
  order.pricing = calcOrderPricing(
    {
      subtotal: order.items.reduce((sum, i) => sum + i.subtotal, 0),
      orderType: order.order_type,
      discount: order.pricing?.discount || 0,
    },
    settings,
  );

  order.status_history.push({
    status: order.status,
    at: new Date(),
    by: by?.name || "manager",
    note: "Items edited",
  });

  await order.save();
  return order;
};

/** ম্যানেজার হাতে ছাড় দেয় — টাকার অঙ্কে */
const setDiscount = async (id: string, discount: number, by?: IOrderStaffRef) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");
  if (!ACTIVE_ORDER_STATUSES.includes(order.status)) {
    throw BadRequest("This order is already closed");
  }

  const settings = await SettingsService.get();
  order.pricing = calcOrderPricing(
    {
      subtotal: order.items.reduce((sum, i) => sum + i.subtotal, 0),
      orderType: order.order_type,
      discount,
    },
    settings,
  );

  order.status_history.push({
    status: order.status,
    at: new Date(),
    by: by?.name || "manager",
    note: `Discount set to ${settings.currency}${order.pricing.discount}`,
  });

  await order.save();
  return order;
};

/* ==========================================================================
   LIST — সার্চ + ফিল্টার + তারিখ রেঞ্জ + পেজিনেশন + মোট বিক্রির যোগফল
   ========================================================================== */

/** যেসব ফিল্ডে সাজানো নিরাপদ — সবকটাই ইনডেক্স করা */
const ORDER_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "order_number",
  "status",
  "confirmed_at",
  "completed_at",
  "pricing.total",
] as const;

const getAllOrders = async (
  filtering: Record<string, any>,
  paginationOption: IPaginationOpton,
): Promise<IGenaricRespons<IOrderDocument[]> & { totalAmount: number }> => {
  const { searchTerm, dateFrom, dateTo, ...filtersData } = filtering;

  const andConditions: Record<string, any>[] = [];

  /* ==========================================================================
     সার্চ — দুটো জিনিস ইচ্ছে করেই বদলানো
     --------------------------------------------------------------------------
     ১. **অক্ষরগুলো আক্ষরিক ধরা হয়।** আগে টার্মটা সরাসরি `$regex` এ বসত,
        তাই কেউ `.*` লিখলেই ফিল্টার অর্থহীন হয়ে যেত, আর `(a+)+$` জাতীয়
        একটা ছোট স্ট্রিং পাঠিয়ে ডাটাবেসের CPU ঘণ্টার পর ঘণ্টা আটকে রেখে
        পুরো সাইট বসিয়ে দেওয়া যেত (ReDoS)।

     ২. **শুরু থেকে মেলানো (`^`)।** মাঝখানে মেলানো রেজেক্স কখনো ইনডেক্স
        ব্যবহার করতে পারে না — প্রতিটা সার্চে পুরো কালেকশন স্ক্যান হতো।
        এক বছরের অর্ডার জমার পরে ড্যাশবোর্ডের একটামাত্র সার্চেই সাইট
        ধীর হয়ে যেত। এখন অর্ডার নম্বর আর ফোন নম্বর ইনডেক্স ধরে চলে।

     ঠিকানা আর নাম ইনডেক্সে নেই বলে সেগুলো তালিকা থেকে বাদ — অর্ডার
     নম্বর বা ফোন দিয়েই খোঁজা হয়, আর দুটোই দ্রুত।
     ========================================================================== */
  const term = sanitizeSearchTerm(searchTerm);
  if (term) {
    const or: Record<string, unknown>[] = [
      // অর্ডার নম্বর সবসময় বড় হাতের অক্ষরে জমা হয়, তাই বড় হাতে মিলিয়ে
      // case-sensitive রেজেক্স চালাই — এটাই unique ইনডেক্স ব্যবহার করতে পারে
      { order_number: new RegExp(`^${escapeRegex(term.toUpperCase())}`) },
    ];

    if (/^[\d+]/.test(term)) {
      // সংখ্যা দিয়ে শুরু মানে ফোন নম্বর খোঁজা হচ্ছে — `customer.phone` ইনডেক্সে বসে
      or.push({ "customer.phone": new RegExp(`^${escapeRegex(term)}`) });
    } else {
      or.push({ "customer.name": prefixRegex(term) });
      or.push({ table_name: prefixRegex(term) });
    }

    andConditions.push({ $or: or });
  }

  // status=pending,confirmed এভাবে কমা দিয়ে একাধিক মান পাঠানো যায় — ড্যাশবোর্ডের
  // "Online orders" পেজ একসাথে কয়েকটা স্ট্যাটাস দেখায়, তাই গোনা আর পেজিনেশন
  // দুটোই সার্ভারেই ঠিক হয়ে আসে।
  const exact = Object.entries(filtersData)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([field, value]) => {
      const values = String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return values.length > 1
        ? { [field]: { $in: values } }
        : { [field]: values[0] ?? value };
    });
  if (exact.length) {
    andConditions.push({ $and: exact });
  }

  if (dateFrom || dateTo) {
    const range: Record<string, Date> = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999); // পুরো দিনটা ধরার জন্য
      range.$lte = end;
    }
    andConditions.push({ createdAt: range });
  }

  const { page, limit, skip, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  /**
   * সাজানোর ফিল্ডও কোয়েরি স্ট্রিং থেকে আসে। অচেনা ফিল্ডে সাজাতে গেলে
   * মঙ্গো ইনডেক্স ছাড়াই মেমোরিতে সাজায় — বড় কালেকশনে সেটা হয় ভয়ানক
   * ধীর, নয়তো সরাসরি "Sort exceeded memory limit" এরর। তাই শুধু
   * ইনডেক্স করা ফিল্ডগুলোতেই সাজানো যায়।
   */
  const sortBy = safeSortBy(paginationOption.sortBy, ORDER_SORT_FIELDS);
  const sortConditions: Record<string, SortOrder> = { [sortBy]: sortOrder };
  const where = andConditions.length ? { $and: andConditions } : {};

  const [data, total, sum] = await Promise.all([
    OrderModel.find(where).sort(sortConditions).skip(skip).limit(limit).lean(),
    /**
     * এক বছরের অর্ডার জমার পরে `countDocuments` প্রতিবার পুরো ম্যাচিং সেট
     * গোনে। ফিল্টার ছাড়া তালিকায় সেটা অর্থহীনভাবে দামি, অথচ পেজিনেশনের
     * জন্য নিখুঁত সংখ্যাটা দরকারও নয় — তাই ফিল্টার না থাকলে মেটাডেটা
     * থেকে আনুমানিক সংখ্যাটাই নেওয়া হয়।
     */
    andConditions.length
      ? OrderModel.countDocuments(where)
      : OrderModel.estimatedDocumentCount(),
    OrderModel.aggregate([
      { $match: where },
      { $group: { _id: null, totalAmount: { $sum: "$pricing.total" } } },
    ]),
  ]);

  return {
    meta: { page, limit, total },
    data: data as unknown as IOrderDocument[],
    totalAmount: Math.round((sum[0]?.totalAmount || 0) * 100) / 100,
  };
};

const getOrderById = async (id: string) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");
  return order;
};

/** কাস্টমার ট্র্যাকিং — অর্ডার নম্বর + ফোন মিললে তবেই দেখা যায় */
const trackOrder = async (orderNumber: string, phone: string) => {
  // নম্বর যেভাবেই লেখা হোক (01…, 8801…, +8801…) — সব রকমই মিলিয়ে দেখি
  const order = await OrderModel.findOne({
    order_number: orderNumber.trim().toUpperCase(),
    "customer.phone": { $in: phoneVariants(phone) },
  });
  if (!order) throw NotFound("No order found with that number and phone");
  return order;
};

/* ==========================================================================
   KITCHEN — শেফের স্ক্রিন
   --------------------------------------------------------------------------
   টিকিটের পাশাপাশি আরও তিনটে জিনিস পাঠাই, কারণ রান্নাঘরের স্ক্রিন ছাড়া
   শেফের আর কোনো জানালা নেই:

     waiting_confirmation — কয়টা অর্ডার ম্যানেজারের টেবিলে আটকে আছে।
                            স্ক্রিন খালি থাকলে শেফ অন্তত জানে খাবার আসছে।
     recent               — একটু আগে যেগুলো পাঠানো হয়েছে (দেখার জন্য)
     today                — এই শেফ আজ কয়টা পদ নামিয়েছে
   ========================================================================== */
const getKitchenQueue = async (chefId?: string) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // শেষ আধ ঘণ্টায় যা রান্নাঘর থেকে বেরিয়েছে
  const recentSince = new Date(Date.now() - 30 * 60 * 1000);

  const [orders, waitingConfirmation, recent, mine] = await Promise.all([
    OrderModel.find({ status: { $in: KITCHEN_STATUSES } })
      .sort({ confirmed_at: 1, createdAt: 1 })
      .limit(60),

    OrderModel.countDocuments({ status: "pending" }),

    OrderModel.find({
      status: { $in: ["served", "out_for_delivery", "delivered"] },
      kitchen_ready_at: { $gte: recentSince },
    })
      .select("order_number table_name order_type kitchen_ready_at items")
      .sort({ kitchen_ready_at: -1 })
      .limit(6),

    chefId
      ? OrderModel.aggregate([
          {
            $match: {
              "chef.id": chefId,
              kitchen_ready_at: { $gte: startOfToday },
            },
          },
          { $unwind: "$items" },
          {
            $group: {
              _id: null,
              dishes: { $sum: "$items.quantity" },
              orders: { $addToSet: "$_id" },
            },
          },
          { $project: { dishes: 1, orders: { $size: "$orders" } } },
        ])
      : Promise.resolve([]),
  ]);

  return {
    orders,
    waiting_confirmation: waitingConfirmation,
    recent,
    today: {
      dishes: mine[0]?.dishes || 0,
      orders: mine[0]?.orders || 0,
    },
  };
};

/** শেফ একটা পদ "হয়ে গেছে" চিহ্ন দেয়; সব পদ হয়ে গেলে অর্ডারই ready */
const setItemReady = async (
  id: string,
  index: number,
  isReady: boolean,
  by?: IOrderStaffRef,
) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");
  if (!KITCHEN_STATUSES.includes(order.status)) {
    throw BadRequest("This order is not in the kitchen right now");
  }
  if (index < 0 || index >= order.items.length) {
    throw BadRequest("That item is not on this order");
  }

  order.items[index].is_ready = isReady;
  order.items[index].ready_at = isReady ? new Date() : null;

  // প্রথম পদে হাত দেওয়ার সাথে সাথেই অর্ডার "রান্না হচ্ছে"
  if (isReady && order.status === "confirmed") {
    order.status = "preparing";
    order.kitchen_started_at = new Date();
    if (by?.id) order.chef = by;
    order.status_history.push({
      status: "preparing",
      at: new Date(),
      by: by?.name || "kitchen",
    });
  }

  const allReady = order.items.every((i) => i.is_ready);

  if (allReady && order.status === "preparing") {
    order.status = "ready";
    order.kitchen_ready_at = new Date();
    if (by?.id) order.chef = by;
    order.status_history.push({
      status: "ready",
      at: new Date(),
      by: by?.name || "kitchen",
      note: "All items cooked",
    });
  } else if (!allReady && order.status === "ready") {
    // চিহ্ন তুলে নিলে অর্ডার আবার রান্নাঘরে ফেরত যায়
    order.status = "preparing";
    order.kitchen_ready_at = null;
    order.status_history.push({
      status: "preparing",
      at: new Date(),
      by: by?.name || "kitchen",
    });
  }

  await order.save();
  return order;
};

/* ==========================================================================
   STATUS — শুধু বৈধ ট্রানজিশন গ্রহণ করা হয়
   ========================================================================== */
const updateStatus = async (
  id: string,
  next: OrderStatus,
  opts: { by?: string; note?: string; cancelled_reason?: string; staff?: IOrderStaffRef } = {},
) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");

  const current = order.status;
  if (current === next) return order;

  const allowed = ORDER_STATUS_FLOW[current] || [];
  if (!allowed.includes(next)) {
    throw BadRequest(
      `An order that is "${current}" cannot move to "${next}"` +
        (allowed.length ? ` — allowed: ${allowed.join(", ")}` : " — it is final"),
    );
  }

  const now = new Date();

  /* ==========================================================================
     কনফার্মেই টেবিল দখল হয় — তার আগে নয়
     --------------------------------------------------------------------------
     অর্ডার তৈরির সময় টেবিলটা শুধু "পছন্দ" হিসেবে বসানো ছিল। এতক্ষণে অন্য
     কেউ ঐ টেবিলে বসে পড়তে পারে, তাই এখানে আরেকবার দেখে নেওয়া হয়।
     ========================================================================== */
  if (next === "confirmed" && order.table_id) {
    const busy = await OrderModel.findOne({
      table_id: order.table_id,
      status: { $in: TABLE_HELD_STATUSES },
      _id: { $ne: order._id },
    });

    if (busy) {
      throw Conflict(
        `${order.table_name || "That table"} is taken by ${busy.order_number}. Seat this party at another table first.`,
      );
    }

    await TableService.occupy(String(order.table_id), order);
  }

  order.status = next;

  /* ---- ধাপে ধাপে সময়ের ছাপ — রিপোর্ট এগুলো ধরেই হিসাব করে ---- */
  if (next === "confirmed") order.confirmed_at = now;
  if (next === "preparing" && !order.kitchen_started_at) {
    order.kitchen_started_at = now;
  }
  if (next === "ready") {
    order.kitchen_ready_at = now;
    // ম্যানেজার হাতে ready করলে বাকি পদগুলোও রান্না হয়ে গেছে ধরে নিই
    order.items.forEach((i) => {
      if (!i.is_ready) {
        i.is_ready = true;
        i.ready_at = now;
      }
    });
  }
  if (next === "served") order.served_at = now;

  if (next === "cancelled") {
    order.cancelled_reason = opts.cancelled_reason || opts.note || "";
  }

  // অর্ডার শেষ — টেবিল খালি হয়ে যায়, ক্যাশ-অন-ডেলিভারি পরিশোধিত ধরা হয়
  if (next === "delivered") {
    order.completed_at = now;
    if (order.payment_method === "cod") order.payment_status = "paid";
  }

  if ((next === "delivered" || next === "cancelled") && order.table_id) {
    await TableService.release(String(order.table_id));
  }

  if (opts.staff?.id && (next === "preparing" || next === "ready")) {
    order.chef = opts.staff;
  }

  order.status_history.push({
    status: next,
    at: now,
    by: opts.by || "admin",
    note: opts.note || "",
  });

  await order.save();

  /* ==========================================================================
     অর্ডার শেষ — হিসাব খাতায় বসে যায়, আর একটা হালকা কপি আর্কাইভে জমে
     --------------------------------------------------------------------------
     এই এক লাইনটার কারণেই পরে নিশ্চিন্তে পুরোনো অর্ডার মুছে ফেলা যায়:
     টাকার হিসাব দিনের খাতায়, অর্ডারের বিবরণ আর্কাইভে — দুটোই আলাদা
     জায়গায় নিরাপদ। খাতায় লিখতে গিয়ে কিছু আটকালে সেটা লগে যায়,
     কাস্টমারের অর্ডার আটকায় না।
     ========================================================================== */
  if (next === "delivered" || next === "cancelled") {
    await LedgerService.closeOrder(order);
  }

  return order;
};

const updatePayment = async (
  id: string,
  payload: { payment_status: string; payment_method?: string },
) => {
  const order = await OrderModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!order) throw NotFound("Order not found");
  return order;
};

/** ওয়েটার / শেফ / টেবিল বসানো বা বদলানো */
const assign = async (
  id: string,
  payload: { waiter_id?: string; chef_id?: string; table_id?: string },
) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");

  if (payload.waiter_id !== undefined) {
    order.waiter = await staffRef(payload.waiter_id);
  }
  if (payload.chef_id !== undefined) {
    order.chef = await staffRef(payload.chef_id);
  }

  if (payload.table_id !== undefined) {
    const previous = order.table_id ? String(order.table_id) : null;

    if (payload.table_id) {
      const table = await TableModel.findById(payload.table_id);
      if (!table) throw NotFound("That table was not found");

      const busy = await OrderModel.findOne({
        table_id: table._id,
        status: { $in: TABLE_HELD_STATUSES },
        _id: { $ne: order._id },
      });
      if (busy) {
        throw Conflict(`${table.name} already has a running order`);
      }

      order.table_id = table._id;
      order.table_name = table.name;
      order.table_number = table.name;
      await TableService.occupy(String(table._id), order);
    } else {
      order.table_id = null;
      order.table_name = "";
      order.table_number = "";
    }

    // আগের টেবিলটা ছেড়ে দিতে হবে, নাহলে চিরকাল দখলে দেখাবে
    if (previous && previous !== payload.table_id) {
      await TableService.release(previous);
    }
  }

  await order.save();
  return order;
};

/**
 * সারি থেকে একজনকে টেবিলে বসানো — টেবিল বসানো আর কনফার্ম একসাথে।
 * ম্যানেজারের কাছে ব্যস্ত সময়ে এটাই সবচেয়ে বেশি ব্যবহৃত বোতাম, তাই
 * দুই ধাপ এক করে দেওয়া হয়েছে।
 */
const seatOrder = async (id: string, tableId: string, by?: IOrderStaffRef) => {
  const order = await OrderModel.findById(id);
  if (!order) throw NotFound("Order not found");

  if (order.status !== "pending") {
    throw BadRequest(
      `This order is already ${order.status.split("_").join(" ")} — it is not waiting for a table`,
    );
  }

  const table = await TableService.assertTableFree(tableId, String(order._id));

  order.table_id = table._id;
  order.table_name = table.name;
  order.table_number = table.name;

  // টেবিলের দায়িত্বে থাকা ওয়েটার আগে বসানো না থাকলে এখন বসে যাক
  if (!order.waiter?.id && table.waiter_id) {
    order.waiter = await staffRef(table.waiter_id);
  }

  await order.save();

  // কনফার্ম করলেই টেবিল দখল হয় আর রান্নাঘরে টিকিট চলে যায়
  return updateStatus(String(order._id), "confirmed", {
    by: by?.name || "manager",
    note: `Seated at ${table.name}`,
    staff: by,
  });
};

/** ইনভয়েস ছাপা হলে গোনা হয় — কতবার ছাপা হয়েছে সেটা হিসাবের কাজে লাগে */
const markInvoicePrinted = async (id: string) => {
  const order = await OrderModel.findByIdAndUpdate(
    id,
    { $set: { invoice_printed_at: new Date() }, $inc: { invoice_print_count: 1 } },
    { new: true },
  );
  if (!order) throw NotFound("Order not found");
  return order;
};

const deleteOrder = async (id: string) => {
  const order = await OrderModel.findByIdAndDelete(id);
  if (!order) throw NotFound("Order not found");
  if (order.table_id) await TableService.release(String(order.table_id));
  return order;
};

/**
 * তালিকা থেকে চেকবক্সে বেছে নেওয়া অর্ডারগুলো একসাথে মোছা।
 *
 * মোছার আগে টেবিলগুলো তুলে রাখি — একটা করে মোছার সময় `deleteOrder`
 * যেমন টেবিল ছেড়ে দেয়, এখানেও ঠিক তেমনটাই হওয়া চাই। নাহলে ১০টা
 * ডাইন-ইন অর্ডার মুছে ফেলার পর ১০টা টেবিল চিরকাল "occupied" দেখাত,
 * অথচ সেখানে কেউ বসে নেই।
 *
 * একই টেবিলে পরপর দুটো অর্ডার থাকতে পারে, তাই `Set` — একই টেবিল
 * দুবার ছাড়ানোর দরকার নেই।
 */
const deleteManyOrders = async (ids: string[]) => {
  const doomed = await OrderModel.find({ _id: { $in: ids } })
    .select("_id order_number table_id")
    .lean();

  if (!doomed.length) {
    return { requested: ids.length, deleted: 0, missing: ids.length, order_numbers: [] };
  }

  const res = await OrderModel.deleteMany({ _id: { $in: doomed.map((o) => o._id) } });
  const deleted = res.deletedCount ?? 0;

  const tableIds = [
    ...new Set(doomed.filter((o: any) => o.table_id).map((o: any) => String(o.table_id))),
  ];
  // একটা টেবিল ছাড়াতে না পারলেও বাকিগুলো ছাড়ানো আটকায় না — অর্ডার
  // তো ইতিমধ্যেই মুছে গেছে, এখানে থেমে গেলে অবস্থা আরও খারাপ হতো
  await Promise.all(
    tableIds.map((tableId) =>
      TableService.release(tableId).catch(() =>
        console.warn("Could not free table after bulk delete", tableId),
      ),
    ),
  );

  return {
    requested: ids.length,
    deleted,
    missing: ids.length - deleted,
    // কোন কোন অর্ডার গেল — টোস্টে আর অডিটে দুই জায়গাতেই কাজে লাগে
    order_numbers: doomed.map((o: any) => o.order_number).filter(Boolean),
  };
};

/* ==========================================================================
   STATS — ড্যাশবোর্ডের উপরের কার্ডগুলোর ডেটা
   ========================================================================== */
const getStats = async () => {
  // দিনের সীমা দোকানের ঘড়িতে — সার্ভারের UTC ঘড়িতে নয়। নাহলে "আজকের
  // বিক্রি" বাংলাদেশ সময় ভোর ৬টায় রিসেট হতো, রাত ১২টায় নয়।
  const startOfToday = startOfBusinessDay();

  const [byStatus, todayAgg, allTime, recent, tables] = await Promise.all([
    /**
     * স্ট্যাটাসের গোনা — চলতি অর্ডারগুলোতেই সীমাবদ্ধ। আগে পুরো কালেকশন
     * গ্রুপ করা হতো, তাই এক বছরের অর্ডার জমার পরে ড্যাশবোর্ড খুললেই
     * লক্ষ লক্ষ ডকুমেন্ট পড়তে হতো। "কয়টা delivered হয়েছে" এখন খাতা
     * থেকে আসে, আর ড্যাশবোর্ডের কার্ডে দরকার শুধু চলতিগুলোই।
     */
    OrderModel.aggregate([
      { $match: { status: { $in: ACTIVE_ORDER_STATUSES } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday },
          status: { $in: REVENUE_STATUSES },
        },
      },
      { $group: { _id: null, revenue: { $sum: "$pricing.total" }, count: { $sum: 1 } } },
    ]),
    // সারা জীবনের হিসাব দিনের খাতা থেকে — ৩৬৫টা সারির যোগ, অর্ডার স্ক্যান নয়
    LedgerService.allTimeTotals(),
    OrderModel.find().sort({ createdAt: -1 }).limit(8).lean(),
    TableModel.aggregate([
      { $match: { is_active: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const statusCounts = Object.fromEntries(
    byStatus.map((row: any) => [row._id, row.count]),
  ) as Record<OrderStatus, number>;

  const tableCounts = Object.fromEntries(
    tables.map((row: any) => [row._id, row.count]),
  ) as Record<string, number>;

  return {
    statusCounts,
    tables: {
      total: Object.values(tableCounts).reduce((a, b) => a + b, 0),
      free: tableCounts.free || 0,
      occupied: tableCounts.occupied || 0,
      reserved: tableCounts.reserved || 0,
      cleaning: tableCounts.cleaning || 0,
    },
    today: {
      orders: todayAgg[0]?.count || 0,
      revenue: Math.round((todayAgg[0]?.revenue || 0) * 100) / 100,
    },
    allTime,
    recent,
  };
};

export const OrderService = {
  seatOrder,
  createOrder,
  getCooldown,
  addItems,
  updateItem,
  setDiscount,
  getAllOrders,
  getOrderById,
  trackOrder,
  getKitchenQueue,
  setItemReady,
  updateStatus,
  updatePayment,
  assign,
  markInvoicePrinted,
  deleteOrder,
  deleteManyOrders,
  getStats,
};
