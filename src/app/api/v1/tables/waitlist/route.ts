import { NextRequest } from "next/server";
import { TableController } from "@/src/controllers/table.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — সারিতে কতজন, কত সময় লাগবে (কাস্টমারও দেখে) */
export async function GET(req: NextRequest) {
  return TableController.getWaitlist(req);
}
