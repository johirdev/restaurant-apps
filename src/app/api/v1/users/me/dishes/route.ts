import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/users/me/dishes — যেসব খাবার আগে অর্ডার করা হয়েছে */
export async function GET(req: NextRequest) {
  return UserController.getMyDishes(req);
}
