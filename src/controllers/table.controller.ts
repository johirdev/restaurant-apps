import { NextRequest } from "next/server";
import { TableService } from "../services/table.service";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";
import { ok, created } from "../lib/sendResponse";
import {
  catchAsync,
  parseBody,
  splitQuery,
  assertObjectId,
} from "../lib/apiHandler";
import {
  requireRole,
  CASHIER_UP,
  MANAGER_UP,
  ANY_STAFF,

} from "../middlewares/requireAuth";
import {
  createTableSchema,
  updateTableSchema,
  setTableStatusSchema,
} from "../validations/table.schema";
import {
  TableFilterableFields,
  TablePaginationFields,
  type TableStatus,
  type ITable,
} from "../interfaces/table.interface";

type IdCtx = { params: Promise<{ id: string }> };

/** GET /api/v1/tables — তালিকা (?view=floor দিলে ফ্লোর ম্যাপ) */
const getAllTables = catchAsync(async (req: NextRequest) => {
  requireRole(req, CASHIER_UP);

  if (new URL(req.url).searchParams.get("view") === "floor") {
    const tables = await TableService.getFloorMap();
    return ok("Floor map fetched successfully", tables);
  }

  const { filters, pagination } = splitQuery(
    req,
    TableFilterableFields,
    TablePaginationFields,
  );
  const result = await TableService.getAllTables(filters, pagination as never);
  return ok("Tables fetched successfully", result.data, result.meta);
});

/**
 * GET /api/v1/tables/available — চেকআউটের জন্য, লগইন ছাড়াই
 * শুধু নাম/আসন/জোন যায়, কর্মী বা বিলের কোনো তথ্য নয়
 */
const getAvailableTables = catchAsync(async () => {
  const tables = await TableService.getAvailableTables();
  return ok("Tables fetched successfully", tables);
});

/**
 * GET /api/v1/tables/waitlist — কতজন অপেক্ষায়, কত সময় লাগবে
 * কাস্টমার চেকআউটে দেখে, তাই লগইন লাগে না। শুধু সংখ্যা যায় —
 * কে অপেক্ষা করছে সেই নাম/ফোন কেবল কর্মীরাই দেখে।
 */
const getWaitlist = catchAsync(async (req: NextRequest) => {
  const staff = verifyTokenAndRole(req, ANY_STAFF as unknown as string[]);
  const data = await TableService.getWaitlist();

  if (!staff.success) {
    const { queue: _queue, ...publicView } = data;
    return ok("Waitlist fetched successfully", publicView);
  }

  return ok("Waitlist fetched successfully", data);
});

/** POST /api/v1/tables */
const createTable = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const payload = await parseBody(req, createTableSchema);
  const table = await TableService.createTable(payload);
  return created(`Table "${table.name}" created successfully`, table);
});

/** GET /api/v1/tables/:id */
const getTableById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CASHIER_UP);
  const { id } = await params;
  const result = await TableService.getTableById(assertObjectId(id, "table id"));
  return ok("Table fetched successfully", result);
});

/** PATCH /api/v1/tables/:id */
const updateTable = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const payload = await parseBody(req, updateTableSchema);
  const table = await TableService.updateTable(
    assertObjectId(id, "table id"),
    payload as Partial<ITable>,
  );
  return ok("Table updated successfully", table);
});

/** DELETE /api/v1/tables/:id */
const deleteTable = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const table = await TableService.deleteTable(assertObjectId(id, "table id"));
  return ok("Table deleted successfully", table);
});

/**
 * PATCH /api/v1/tables/:id/status
 * ওয়েটারও টেবিল "cleaning" বা "reserved" করতে পারে — ফ্লোরের কাজ,
 * এর জন্য ম্যানেজারকে ডাকার দরকার নেই
 */
const setStatus = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CASHIER_UP);
  const { id } = await params;
  const { status } = await parseBody(req, setTableStatusSchema);
  const table = await TableService.setStatus(
    assertObjectId(id, "table id"),
    status as TableStatus,
  );
  return ok(`Table marked as ${status}`, table);
});

export const TableController = {
  getWaitlist,
  getAvailableTables,
  getAllTables,
  createTable,
  getTableById,
  updateTable,
  deleteTable,
  setStatus,
};
