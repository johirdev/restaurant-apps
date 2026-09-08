import { NextRequest } from "next/server";
import { LegalController } from "@/src/controllers/legal.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/legal — তিনটে আইনি পাতা একসাথে (ম্যানেজমেন্ট) */
export async function GET(req: NextRequest) {
  return LegalController.getAllPages(req);
}
