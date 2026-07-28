import { NextRequest } from "next/server";
import { createStaff, getStaffs } from "@/src/controllers/staff.controller";

export async function GET(req: NextRequest) {
  return getStaffs(req);
}

export async function POST(req: NextRequest) {
  return createStaff(req);
}
