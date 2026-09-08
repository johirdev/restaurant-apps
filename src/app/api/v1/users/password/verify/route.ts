import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/users/password/verify — রিসেটের কোডটা মিলিয়ে দেখে।
 * মিলে গেলে কোডটা পুড়ে যায় আর অল্প সময়ের একটা `reset_token` ফেরত আসে,
 * যেটা দিয়ে পরের ধাপে নতুন পাসওয়ার্ড বসানো হয়।
 */
export async function POST(req: NextRequest) {
  return UserController.verifyResetCode(req);
}
