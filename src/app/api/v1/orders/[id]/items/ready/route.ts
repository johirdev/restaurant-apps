import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — শেফ একটা পদ "হয়ে গেছে" চিহ্ন দেয় */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.setItemReady(req, ctx);
}
