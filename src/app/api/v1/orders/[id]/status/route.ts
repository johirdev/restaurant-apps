// src/app/api/v1/orders/[id]/status/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — pending → confirmed → preparing → ready → out_for_delivery → delivered */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.updateStatus(req, ctx);
}
