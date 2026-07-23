// src/app/api/admins/route.ts
import { NextRequest } from "next/server";
import { adminController } from "@/controllers/admin.controller";

// POST /api/admins            -> create a new admin
export async function POST(req: NextRequest) {
  return adminController.create(req);
}

// GET /api/admins?page=1&limit=10&search=rafi&admin_role=admin&sort=admin_name&order=asc
export async function GET(req: NextRequest) {
  return adminController.getAll(req);
}
