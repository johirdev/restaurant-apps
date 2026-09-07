import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — নম্বরের OTP/লগইন ব্লক তুলে দেয় */
export async function POST(req: NextRequest, ctx: Ctx) {
  return UserController.unblockUser(req, ctx);
}
