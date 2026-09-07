// src/app/api/v1/orders/track/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/orders/track?order_number=ORD-260907-0001&phone=01712345678
 * পাবলিক — অর্ডার নম্বর আর ফোন দুটোই মিললে তবেই অর্ডার দেখা যায়।
 */
export async function GET(req: NextRequest) {
  return OrderController.trackOrder(req);
}
