import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/register — OTP মিললে পাসওয়ার্ড সহ অ্যাকাউন্ট তৈরি হয় */
export async function POST(req: NextRequest) {
  return UserController.register(req);
}
