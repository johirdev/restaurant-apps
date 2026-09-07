// src/app/api/v1/orders/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/orders — অ্যাডমিন লিস্ট (auth লাগবে) */
export async function GET(req: NextRequest) {
  return OrderController.getAllOrders(req);
}

/** POST /api/v1/orders — কাস্টমার অর্ডার প্লেস করে (public) */
export async function POST(req: NextRequest) {
  return OrderController.createOrder(req);
}
