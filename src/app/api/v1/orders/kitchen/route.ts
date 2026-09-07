import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — রান্নাঘরের স্ক্রিনে যেসব অর্ডার এখন আছে */
export async function GET(req: NextRequest) {
  return OrderController.getKitchenQueue(req);
}
