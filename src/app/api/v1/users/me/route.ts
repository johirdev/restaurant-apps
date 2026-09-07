import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return UserController.getMe(req);
}

export async function PATCH(req: NextRequest) {
  return UserController.updateMe(req);
}
