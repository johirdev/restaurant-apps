import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/v1/users/login — ফোন নম্বর + পাসওয়ার্ড */
export async function POST(req: NextRequest) {
  return UserController.login(req);
}
