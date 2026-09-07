/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortOrder } from "mongoose";
import TableModel from "../models/table.model";
import OrderModel from "../models/order.model";
import { StaffModel } from "../models/staff.model";
import { IPaginationOpton } from "../lib/pagination";
import { HelperPagination } from "../lib/paginationHelper";
import { BadRequest, Conflict, NotFound } from "../lib/apiError";
import {
  ACTIVE_ORDER_STATUSES,
  REVENUE_STATUSES,
} from "../interfaces/order.interfaces";
import type { ITable, TableStatus } from "../interfaces/table.interface";

/* ==========================================================================
   টেবিল — তৈরি, তালিকা, ওয়েটার বসানো, দখল/খালি করা
   ========================================================================== */

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
    status: { $in: ACTIVE_ORDER_STATUSES },
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

const getTableById = async (id: string) => {
  const table = await TableModel.findById(id);
  if (!table) throw NotFound("Table not found");

  const [openOrder, todayStats] = await Promise.all([
    OrderModel.findOne({
      table_id: id,
      status: { $in: ACTIVE_ORDER_STATUSES },
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
    status: { $in: ACTIVE_ORDER_STATUSES },
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
      status: { $in: ACTIVE_ORDER_STATUSES },
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
