import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return UserController.logout(req);
}
