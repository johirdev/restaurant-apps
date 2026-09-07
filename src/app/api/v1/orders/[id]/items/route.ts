import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — চলতি অর্ডারে নতুন পদ যোগ */
export async function POST(req: NextRequest, ctx: Ctx) {
  return OrderController.addItems(req, ctx);
}

/** PATCH — একটা লাইনের সংখ্যা বদল (0 দিলে মুছে যায়) */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return OrderController.updateItem(req, ctx);
}
