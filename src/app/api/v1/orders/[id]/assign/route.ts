import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — ওয়েটার / শেফ / টেবিল বসানো */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.assign(req, ctx);
}
