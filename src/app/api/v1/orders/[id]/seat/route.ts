import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — অপেক্ষমাণ অর্ডারকে টেবিলে বসিয়ে কনফার্ম করে */
export async function POST(req: NextRequest, ctx: Ctx) {
  return OrderController.seatOrder(req, ctx);
}
