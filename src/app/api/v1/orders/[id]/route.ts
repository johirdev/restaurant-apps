// src/app/api/v1/orders/[id]/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return OrderController.getOrderById(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return OrderController.deleteOrder(req, ctx);
}
