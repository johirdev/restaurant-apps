import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/users/me/orders — নিজের অর্ডারের তালিকা */
export async function GET(req: NextRequest) {
  return UserController.getMyOrders(req);
}
