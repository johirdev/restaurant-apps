import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/users/auth-rules — OTP/লগইনের সীমাগুলো UI কে জানায় */
export async function GET(req: NextRequest) {
  return UserController.getAuthRules(req);
}
