import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/password/forgot — পাসওয়ার্ড রিসেটের কোড পাঠায় */
export async function POST(req: NextRequest) {
  return UserController.forgotPassword(req);
}
