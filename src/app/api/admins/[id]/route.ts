// src/app/api/admins/[id]/route.ts
import { NextRequest } from "next/server";
import { adminController } from "@/controllers/admin.controller";

interface RouteContext {
  params: { id: string };
}

// GET /api/admins/:id
export async function GET(req: NextRequest, { params }: RouteContext) {
  return adminController.getById(req, params.id);
}

// PATCH /api/admins/:id
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  return adminController.update(req, params.id);
}

// DELETE /api/admins/:id           -> soft delete (default)
// DELETE /api/admins/:id?hard=true -> permanent delete
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  return adminController.delete(req, params.id);
}
