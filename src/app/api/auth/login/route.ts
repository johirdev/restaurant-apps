// src/app/api/auth/login/route.ts
import { NextRequest } from "next/server";
import { authController } from "@/controllers/auth.controller";

// POST /api/auth/login
export async function POST(req: NextRequest) {
  return authController.login(req);
}
