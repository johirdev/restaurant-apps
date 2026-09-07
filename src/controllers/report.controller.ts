import { NextRequest } from "next/server";
import {
  ReportService,
  type ReportRange,
} from "../services/report.service";
import { ok } from "../lib/sendResponse";
import { catchAsync, getQuery } from "../lib/apiHandler";
import { requireRole, MANAGER_UP, KITCHEN } from "../middlewares/requireAuth";

const RANGES: ReportRange[] = ["today", "week", "month", "year", "custom"];

/** ?range=month&dateFrom=…&dateTo=… — ভুল মান এলে চুপচাপ "today" ধরা হয় */
function readRange(req: NextRequest) {
  const { range, dateFrom, dateTo } = getQuery(req);
  const safe = RANGES.includes(range as ReportRange)
    ? (range as ReportRange)
    : dateFrom || dateTo
      ? "custom"
      : "today";
  return { range: safe, dateFrom, dateTo };
}

/** GET /api/v1/reports/sales — দিন/মাস/বছরের বিক্রি */
const getSales = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const data = await ReportService.getSalesReport(readRange(req));
  return ok("Sales report generated", data);
});

/** GET /api/v1/reports/tables — কোন টেবিল থেকে কত টাকা */
const getTables = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const data = await ReportService.getTableReport(readRange(req));
  return ok("Table report generated", data);
});

/** GET /api/v1/reports/staff — কোন কর্মী কত বিক্রি করল */
const getStaff = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const data = await ReportService.getStaffReport(readRange(req));
  return ok("Staff report generated", data);
});

/**
 * GET /api/v1/reports/chef — শেফ কী কী রান্না করল
 * শেফ নিজেও দেখতে পারে, তাই রোল গ্রুপটা আলাদা
 */
const getChef = catchAsync(async (req: NextRequest) => {
  requireRole(req, KITCHEN);
  const data = await ReportService.getChefReport(readRange(req));
  return ok("Kitchen report generated", data);
});

export const ReportController = { getSales, getTables, getStaff, getChef };
