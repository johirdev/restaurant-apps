import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * যাচাই-না-হওয়া কাস্টমার।
 * `unverified` স্ট্যাটিক সেগমেন্ট, তাই পাশের `[id]` রুটের আগেই এটা ম্যাচ করে —
 * "unverified" কখনো ObjectId হিসেবে ধরা পড়ে না।
 */

/** GET /api/v1/users/unverified — কয়টা আছে */
export async function GET(req: NextRequest) {
  return UserController.getUnverifiedCount(req);
}

/** DELETE /api/v1/users/unverified — সবগুলো এক ক্লিকে মুছে দেয় (superadmin) */
export async function DELETE(req: NextRequest) {
  return UserController.deleteUnverifiedUsers(req);
}
