import { NextRequest } from "next/server";
import { loginAdmin } from "@/src/controllers/admin.controller";

export async function POST(req: NextRequest) {
  return loginAdmin(req);
}
