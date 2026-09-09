// src/app/api/v1/orders/cooldown/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/cooldown?phone=01712345678
 * পরের অর্ডার কখন দেওয়া যাবে — চেকআউটের কাউন্টডাউন এটাই পড়ে (public)
 */
export async function GET(req: NextRequest) {
  return OrderController.getCooldown(req);
}
