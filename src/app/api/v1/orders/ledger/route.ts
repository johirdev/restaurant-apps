// src/app/api/v1/orders/ledger/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/ledger?from=2026-01-01&to=2026-12-31
 * দিনের খাতা থেকে বিক্রির হিসাব — পুরোনো অর্ডার মুছে ফেলার পরেও অক্ষত
 */
export async function GET(req: NextRequest) {
  return OrderController.getLedger(req);
}
