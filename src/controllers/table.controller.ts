import { NextRequest } from "next/server";
import { TableService } from "../services/table.service";
import { ok, created } from "../lib/sendResponse";
import {
  catchAsync,
  parseBody,
  splitQuery,
  assertObjectId,
} from "../lib/apiHandler";
import {
  requireRole,
  ANY_STAFF,
  MANAGER_UP,
  FLOOR,
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
  requireRole(req, ANY_STAFF);

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

/** POST /api/v1/tables */
const createTable = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const payload = await parseBody(req, createTableSchema);
  const table = await TableService.createTable(payload);
  return created(`Table "${table.name}" created successfully`, table);
});

/** GET /api/v1/tables/:id */
const getTableById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, ANY_STAFF);
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
  requireRole(req, FLOOR);
  const { id } = await params;
  const { status } = await parseBody(req, setTableStatusSchema);
  const table = await TableService.setStatus(
    assertObjectId(id, "table id"),
    status as TableStatus,
  );
  return ok(`Table marked as ${status}`, table);
});

export const TableController = {
  getAllTables,
  createTable,
  getTableById,
  updateTable,
  deleteTable,
  setStatus,
};
