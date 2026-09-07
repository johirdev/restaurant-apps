import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — ইনভয়েস ছাপা হয়েছে, গুনে রাখি */
export async function POST(req: NextRequest, ctx: Ctx) {
  return OrderController.markInvoicePrinted(req, ctx);
}
