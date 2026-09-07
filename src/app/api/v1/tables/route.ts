import { NextRequest } from "next/server";
import { TableController } from "@/src/controllers/table.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return TableController.getAllTables(req);
}

export async function POST(req: NextRequest) {
  return TableController.createTable(req);
}
