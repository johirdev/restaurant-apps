import { NextRequest } from "next/server";
import { TableController } from "@/src/controllers/table.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return TableController.getTableById(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return TableController.updateTable(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return TableController.deleteTable(req, ctx);
}
