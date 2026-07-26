import { NextRequest } from "next/server";
import { createAdmin, getAdmins } from "@/src/controllers/admin.controller";

export async function GET(req: NextRequest) {
  return getAdmins(req);
}

export async function POST(req: NextRequest) {
  return createAdmin(req);
}
