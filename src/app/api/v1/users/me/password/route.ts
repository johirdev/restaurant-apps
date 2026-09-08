import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PATCH /api/v1/users/me/password — নিজের পাসওয়ার্ড বদল */
export async function PATCH(req: NextRequest) {
  return UserController.updateMyPassword(req);
}
