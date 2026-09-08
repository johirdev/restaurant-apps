import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/password/reset — কোড মিললে নতুন পাসওয়ার্ড বসে */
export async function POST(req: NextRequest) {
  return UserController.resetPassword(req);
}
