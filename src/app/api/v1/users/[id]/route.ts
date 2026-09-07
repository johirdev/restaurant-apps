import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return UserController.getUserById(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return UserController.adminUpdateUser(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return UserController.deleteUser(req, ctx);
}
