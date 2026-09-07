// src/app/api/v1/orders/[id]/payment/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — { payment_status: "paid" | "unpaid" | "refunded" } */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.updatePayment(req, ctx);
}
