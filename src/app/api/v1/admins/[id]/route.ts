import { NextRequest } from "next/server";
import {
  getSingleAdmin,
  updateAdmin,
  deleteAdmin,
} from "@/src/controllers/admin.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return getSingleAdmin(req, id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return updateAdmin(req, id);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return deleteAdmin(req, id);
}
