import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST — কাউন্টার / ওয়েটারের তোলা অর্ডার */
export async function POST(req: NextRequest) {
  return OrderController.createPosOrder(req);
}
