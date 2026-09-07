import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/otp/verify — কোড মিললে লগইন/রেজিস্ট্রেশন হয়ে যায় */
export async function POST(req: NextRequest) {
  return UserController.confirmOtp(req);
}
