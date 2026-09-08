import { NextRequest } from "next/server";
import { TableController } from "@/src/controllers/table.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — কাস্টমার চেকআউটে টেবিল বাছার তালিকা (পাবলিক) */
export async function GET(req: NextRequest) {
  return TableController.getAvailableTables(req);
}
