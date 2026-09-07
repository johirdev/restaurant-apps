import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/users — অ্যাডমিন কাস্টমার লিস্ট */
export async function GET(req: NextRequest) {
  return UserController.getAllUsers(req);
}
