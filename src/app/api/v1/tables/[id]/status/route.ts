import { NextRequest } from "next/server";
import { TableController } from "@/src/controllers/table.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — free / reserved / cleaning */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return TableController.setStatus(req, ctx);
}
