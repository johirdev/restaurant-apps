import { CategoryController } from "@/src/controllers/category.controller";
import { NextRequest } from "next/server";

// Put this file at: src/app/api/v1/categories/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/categories
export async function GET() {
  return CategoryController.getAllCategories();
}

// POST /api/v1/categories
export async function POST(req: NextRequest) {
  return CategoryController.createCategory(req);
}
