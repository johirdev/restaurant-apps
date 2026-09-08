import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/otp/send — সাইনআপের সময় নম্বরে ৬ ডিজিটের কোড পাঠায় */
export async function POST(req: NextRequest) {
  return UserController.requestOtp(req);
}
