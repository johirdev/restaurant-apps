import { NextRequest } from "next/server";
import { FoodVariationController } from "@/src/controllers/foodVariation.controller";

// Put this file at: src/app/api/v1/food-variations/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/food-variations?foodId=...&search=...
export async function GET(req: NextRequest) {
  return FoodVariationController.getAllVariations(req);
}

// POST /api/v1/food-variations
export async function POST(req: NextRequest) {
  return FoodVariationController.createVariation(req);
}
