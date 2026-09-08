/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortOrder } from "mongoose";
import TableModel from "../models/table.model";
import OrderModel from "../models/order.model";
import { StaffModel } from "../models/staff.model";
import { IPaginationOpton } from "../lib/pagination";
import { HelperPagination } from "../lib/paginationHelper";
import { BadRequest, Conflict, NotFound } from "../lib/apiError";
import {
  TABLE_HELD_STATUSES,
  REVENUE_STATUSES,
} from "../interfaces/order.interfaces";
import type { ITable, TableStatus } from "../interfaces/table.interface";

/* ==========================================================================
   টেবিল — তৈরি, তালিকা, ওয়েটার বসানো, দখল/খালি করা
   ========================================================================== */

/**
 * ম্যানেজার হাতে যে অবস্থাগুলো বসান — এগুলোতে টেবিল বাছা যায় না।
 * `occupied` এখানে নেই: টেবিল দখলে আছে কিনা সেটা চলতি অর্ডার দেখেই
 * ঠিক হয়, ফিল্ডের মান দেখে নয়।
 */
const MANUALLY_BLOCKED = new Set(["reserved", "cleaning"]);

const createTable = async (payload: Partial<ITable>) => {
  const exists = await TableModel.findOne({ name: payload.name?.trim() });
  if (exists) throw Conflict(`A table named "${payload.name}" already exists`);

  // ওয়েটার দেওয়া থাকলে নামটা এখানেই বসিয়ে রাখি, প্রতি লিস্টে join করতে হয় না
  const waiter = payload.waiter_id
    ? await StaffModel.findById(payload.waiter_id)
    : null;

  return TableModel.create({
    ...payload,
    name: payload.name?.trim(),
    waiter_id: waiter ? String(waiter._id) : "",
    waiter_name: waiter?.staff_name || "",
  });
};

const getAllTables = async (
  filtering: Record<string, any>,
  paginationOption: IPaginationOpton,
) => {
  const { searchTerm, ...filtersData } = filtering;
  const andConditions: Record<string, any>[] = [];

  const term = typeof searchTerm === "string" ? searchTerm.trim() : "";
  if (term) {
    andConditions.push({
      $or: ["name", "zone", "waiter_name"].map((field) => ({
        [field]: { $regex: term, $options: "i" },
      })),
    });
  }

  const exact = Object.entries(filtersData)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([field, value]) => {
      if (field === "is_active") return { is_active: String(value) === "true" };
      const values = String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return values.length > 1
        ? { [field]: { $in: values } }
        : { [field]: values[0] ?? value };
    });
  if (exact.length) andConditions.push({ $and: exact });

  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination({
      // ফ্লোর ম্যাপ নামের ক্রমে সাজানোই স্বাভাবিক, তারিখের ক্রমে নয়
      sortBy: paginationOption.sortBy || "sort_order",
      sortOrder: paginationOption.sortOrder || "asc",
      limit: paginationOption.limit || 200,
      page: paginationOption.page,
    });

  const sort: Record<string, SortOrder> = { [sortBy]: sortOrder, name: 1 };
  const where = andConditions.length ? { $and: andConditions } : {};

  const [data, total] = await Promise.all([
    TableModel.find(where).sort(sort).skip(skip).limit(limit),
    TableModel.countDocuments(where),
  ]);

  return { meta: { page, limit, total }, data };
};

/** ফ্লোর ম্যাপ — প্রতিটা টেবিলের সাথে এখনকার অর্ডারের অবস্থাও লাগে */
const getFloorMap = async () => {
  const tables = await TableModel.find({ is_active: true })
    .sort({ sort_order: 1, name: 1 })
    .lean();

  const openOrders = await OrderModel.find({
    table_id: { $ne: null },
    status: { $in: TABLE_HELD_STATUSES },
  })
    .select("table_id order_number status pricing.total createdAt items waiter")
    .lean();

  const byTable = new Map(
    openOrders.map((o: any) => [String(o.table_id), o]),
  );

  return tables.map((t: any) => {
    const order = byTable.get(String(t._id));
    return {
      ...t,
      // টেবিলে চালু অর্ডার থাকলে সেটাই আসল অবস্থা — ফিল্ড দুটো আলাদা হয়ে
      // গেলেও (সার্ভার রিস্টার্ট, ম্যানুয়াল এডিট) ম্যাপে ভুল দেখাবে না
      status: order ? "occupied" : t.status === "occupied" ? "free" : t.status,
      current_order: order
        ? {
            _id: String(order._id),
            order_number: order.order_number,
            status: order.status,
            total: order.pricing?.total ?? 0,
            items_count: (order.items || []).length,
            createdAt: order.createdAt,
          }
        : null,
    };
  });
};

/**
 * কাস্টমার চেকআউটে যে তালিকাটা দেখে।
 * ইচ্ছে করেই খুব কম তথ্য — ওয়েটারের নাম, চলতি বিল, আয় কিছুই যায় না,
 * শুধু কোন টেবিলে বসা যাবে সেটুকু।
 */
const getAvailableTables = async () => {
  const [tables, busy] = await Promise.all([
    TableModel.find({ is_active: true, status: { $ne: "cleaning" } })
      .select("name capacity zone status")
      .sort({ sort_order: 1, name: 1 })
      .lean(),
    OrderModel.find({
      table_id: { $ne: null },
      status: { $in: TABLE_HELD_STATUSES },
    })
      .select("table_id")
      .lean(),
  ]);

  const taken = new Set(busy.map((o: any) => String(o.table_id)));

  return tables.map((t: any) => ({
    _id: String(t._id),
    name: t.name,
    capacity: t.capacity,
    zone: t.zone || "",
    // দখল করা টেবিল তালিকায় থাকে কিন্তু বাছা যায় না — কাস্টমার বুঝতে পারে
    // টেবিলটা আছে, এখন খালি নেই।
    //
    // টেবিলের নিজের `status` ফিল্ডটাকে "দখল" প্রমাণ হিসেবে ধরি না — চলতি
    // অর্ডারই একমাত্র সত্য। পুরোনো কোনো কারণে ফিল্ডটা "occupied" হয়ে
    // আটকে থাকলে টেবিলটা চিরকাল বন্ধ দেখাত। ম্যানেজার হাতে বসানো
    // reserved / cleaning অবশ্যই মানা হয়।
    is_free: !taken.has(String(t._id)) && !MANUALLY_BLOCKED.has(t.status),
  }));
};

/* ==========================================================================
   WAITLIST — টেবিল ভরা থাকলে কাস্টমার সারিতে দাঁড়ায়
   --------------------------------------------------------------------------
   সারিটা আলাদা কোনো টেবিলে রাখা হয় না। যে ডাইন-ইন অর্ডারগুলো এখনো
   `pending` (ম্যানেজার কনফার্ম করেননি), সেগুলোই সারি — আসার ক্রমে।
   কনফার্ম হলেই অর্ডারটা সারি থেকে বেরিয়ে টেবিলে বসে যায়।

   এতে সারি আর অর্ডার কখনো আলাদা হয়ে যেতে পারে না, আর ভবিষ্যতে সময়
   ধরে বুকিং (slot reservation) যোগ করলেও এই অংশটা অক্ষত থাকবে।

   অপেক্ষার সময় আন্দাজে বসানো হয় না — নিজেদের ইতিহাস থেকে মাপা হয়।
   ========================================================================== */

/** সাম্প্রতিক ডাইন-ইন অর্ডারে গড়ে কতক্ষণ টেবিল দখলে থাকে (মিনিটে) */
const measureDiningMinutes = async (): Promise<{
  minutes: number;
  measured_from: number;
}> => {
  const rows = await OrderModel.aggregate([
    {
      $match: {
        order_type: "dine_in",
        confirmed_at: { $ne: null },
        completed_at: { $ne: null },
      },
    },
    { $sort: { completed_at: -1 } },
    { $limit: 30 },
    {
      $project: {
        minutes: {
          $divide: [{ $subtract: ["$completed_at", "$confirmed_at"] }, 60_000],
        },
      },
    },
    // অস্বাভাবিক লম্বা/ছোট রেকর্ড বাদ — ভুলে খোলা থেকে যাওয়া বিল গড় নষ্ট করে
    { $match: { minutes: { $gte: 5, $lte: 240 } } },
    { $group: { _id: null, avg: { $avg: "$minutes" }, n: { $sum: 1 } } },
  ]);

  // যথেষ্ট ইতিহাস না থাকলে একটা যুক্তিসঙ্গত ধরে নেওয়া মান
  const DEFAULT_MINUTES = 45;

  return {
    minutes: Math.round(rows[0]?.avg || DEFAULT_MINUTES),
    measured_from: rows[0]?.n || 0,
  };
};

/**
 * এখনকার সারির অবস্থা।
 * `orderId` দিলে ঐ অর্ডারটা কত নম্বরে আছে সেটাও বলে।
 */
const getWaitlist = async (orderId?: string) => {
  const [tables, openOrders, waiting, dining] = await Promise.all([
    TableModel.find({ is_active: true }).select("_id status").lean(),
    OrderModel.find({
      table_id: { $ne: null },
      status: { $in: TABLE_HELD_STATUSES },
    })
      .select("table_id")
      .lean(),
    OrderModel.find({ order_type: "dine_in", status: "pending" })
      .select("order_number customer guests createdAt table_id table_name")
      .sort({ createdAt: 1 })
      .lean(),
    measureDiningMinutes(),
  ]);

  const takenIds = new Set(openOrders.map((o: any) => String(o.table_id)));
  const total = tables.length;
  const free = tables.filter(
    (t: any) =>
      !takenIds.has(String(t._id)) && !MANUALLY_BLOCKED.has(t.status),
  ).length;

  /**
   * কত মিনিট পরে বসা যাবে।
   * সারিতে যত জন সামনে আছে, তত বার টেবিল খালি হতে হবে। খালি টেবিল
   * থাকলে সাথে সাথেই বসা যায়।
   */
  const waitFor = (position: number): number => {
    if (position <= free) return 0;
    if (total === 0) return dining.minutes;

    const ahead = position - free;
    const rounds = Math.ceil(ahead / total);
    return rounds * dining.minutes;
  };

  const queue = waiting.map((o: any, i) => ({
    _id: String(o._id),
    order_number: o.order_number,
    name: o.customer?.name || "Guest",
    phone: o.customer?.phone || "",
    guests: o.guests || 0,
    table_name: o.table_name || "",
    position: i + 1,
    waiting_minutes: Math.max(
      0,
      Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60_000),
    ),
    estimated_wait_minutes: waitFor(i + 1),
  }));

  const mine = orderId ? queue.find((q) => q._id === String(orderId)) : undefined;

  return {
    /** সারিতে কতজন অপেক্ষা করছে */
    waiting: queue.length,
    free_tables: free,
    total_tables: total,
    /** নিজেদের ইতিহাস থেকে মাপা — কোথাও হাতে বসানো নয় */
    average_dining_minutes: dining.minutes,
    measured_from_orders: dining.measured_from,
    /** এখন কেউ অর্ডার দিলে সে কত নম্বরে দাঁড়াবে */
    next_position: queue.length + 1,
    next_wait_minutes: waitFor(queue.length + 1),
    can_seat_now: free > 0,
    queue,
    my_place: mine ?? null,
  };
};

/**
 * সারি থেকে একজনকে টেবিলে বসানো — এক ক্লিকে টেবিল বসানো + কনফার্ম।
 * অর্ডার সার্ভিস এটাকেই ডাকে।
 */
const assertTableFree = async (tableId: string, exceptOrderId?: string) => {
  const table = await TableModel.findById(tableId);
  if (!table) throw NotFound("That table was not found");

  const busy = await OrderModel.findOne({
    table_id: table._id,
    status: { $in: TABLE_HELD_STATUSES },
    ...(exceptOrderId ? { _id: { $ne: exceptOrderId } } : {}),
  });
  if (busy) {
    throw Conflict(`${table.name} already has a running order (${busy.order_number})`);
  }

  return table;
};

const getTableById = async (id: string) => {
  const table = await TableModel.findById(id);
  if (!table) throw NotFound("Table not found");

  const [openOrder, todayStats] = await Promise.all([
    OrderModel.findOne({
      table_id: id,
      status: { $in: TABLE_HELD_STATUSES },
    }).sort({ createdAt: -1 }),
    OrderModel.aggregate([
      {
        $match: {
          table_id: table._id,
          status: { $in: REVENUE_STATUSES },
          createdAt: { $gte: startOfToday() },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
          guests: { $sum: "$guests" },
        },
      },
    ]),
  ]);

  return {
    table,
    current_order: openOrder,
    today: {
      orders: todayStats[0]?.orders || 0,
      revenue: Math.round((todayStats[0]?.revenue || 0) * 100) / 100,
      guests: todayStats[0]?.guests || 0,
    },
  };
};

const updateTable = async (id: string, payload: Partial<ITable>) => {
  const $set: Record<string, unknown> = { ...payload };

  if (payload.name) {
    const clash = await TableModel.findOne({
      name: payload.name.trim(),
      _id: { $ne: id },
    });
    if (clash) throw Conflict(`A table named "${payload.name}" already exists`);
    $set.name = payload.name.trim();
  }

  // ওয়েটার বদলালে নামের স্ন্যাপশটও বদলাতে হবে
  if (payload.waiter_id !== undefined) {
    const waiter = payload.waiter_id
      ? await StaffModel.findById(payload.waiter_id)
      : null;
    if (payload.waiter_id && !waiter) throw NotFound("That staff member was not found");
    $set.waiter_id = waiter ? String(waiter._id) : "";
    $set.waiter_name = waiter?.staff_name || "";
  }

  const table = await TableModel.findByIdAndUpdate(
    id,
    { $set },
    { new: true, runValidators: true },
  );
  if (!table) throw NotFound("Table not found");
  return table;
};

const deleteTable = async (id: string) => {
  const open = await OrderModel.exists({
    table_id: id,
    status: { $in: TABLE_HELD_STATUSES },
  });
  if (open) {
    throw Conflict("This table has a running order — settle the bill first");
  }

  const table = await TableModel.findByIdAndDelete(id);
  if (!table) throw NotFound("Table not found");
  return table;
};

/** ম্যানেজার হাতে অবস্থা বদলায় (reserved / cleaning / free) */
const setStatus = async (id: string, status: TableStatus) => {
  const table = await TableModel.findById(id);
  if (!table) throw NotFound("Table not found");

  if (status !== "occupied") {
    const open = await OrderModel.exists({
      table_id: id,
      status: { $in: TABLE_HELD_STATUSES },
    });
    if (open) {
      throw BadRequest(
        "This table has a running order, so it cannot be marked free or reserved yet",
      );
    }
    table.current_order_id = null;
    table.current_order_number = "";
    table.occupied_since = null;
  }

  table.status = status;
  await table.save();
  return table;
};

/* ==========================================================================
   অর্ডার সার্ভিস এই দুটো ডাকে — টেবিল নিজে থেকেই দখল/খালি হয়
   ========================================================================== */
const occupy = async (
  tableId: string,
  order: { _id: unknown; order_number: string },
) => {
  await TableModel.findByIdAndUpdate(tableId, {
    $set: {
      status: "occupied",
      current_order_id: order._id,
      current_order_number: order.order_number,
      occupied_since: new Date(),
    },
  });
};

const release = async (tableId: string) => {
  await TableModel.findByIdAndUpdate(tableId, {
    $set: {
      status: "free",
      current_order_id: null,
      current_order_number: "",
      occupied_since: null,
    },
  });
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export const TableService = {
  getWaitlist,
  assertTableFree,
  measureDiningMinutes,
  getAvailableTables,
  createTable,
  getAllTables,
  getFloorMap,
  getTableById,
  updateTable,
  deleteTable,
  setStatus,
  occupy,
  release,
};
