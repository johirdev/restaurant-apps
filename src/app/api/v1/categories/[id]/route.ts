import { CategoryController } from "@/src/controllers/category.controller";
import { NextRequest } from "next/server";

// Put this file at: src/app/api/v1/categories/[id]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15: `params` is a Promise and must be awaited.
type Params = { params: Promise<{ id: string }> };

// GET /api/v1/categories/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return CategoryController.getCategoryById(id);
}

// PATCH /api/v1/categories/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return CategoryController.updateCategory(req, id);
}

// DELETE /api/v1/categories/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return CategoryController.deleteCategory(id);
}
