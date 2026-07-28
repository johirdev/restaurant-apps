import { NextRequest } from "next/server";
import { loginStaff } from "@/src/controllers/staff.controller";

export async function POST(req: NextRequest) {
  return loginStaff(req);
}
