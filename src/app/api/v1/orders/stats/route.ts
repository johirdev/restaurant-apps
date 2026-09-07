// src/app/api/v1/orders/stats/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/orders/stats — ড্যাশবোর্ডের কার্ড + সাম্প্রতিক অর্ডার */
export async function GET(req: NextRequest) {
  return OrderController.getStats(req);
}
