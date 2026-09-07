import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — ম্যানেজারের দেওয়া ছাড় */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.setDiscount(req, ctx);
}
