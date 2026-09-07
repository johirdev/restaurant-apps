import { NextRequest } from "next/server";
import { ReportController } from "@/src/controllers/report.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return ReportController.getSales(req);
}
