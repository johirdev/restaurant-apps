// src/app/api/v1/foods/[id]/variations/[variationId]/route.ts
import { NextRequest } from "next/server";
import { FoodController } from "@/src/controllers/food.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; variationId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, variationId } = await params;
  return FoodController.updateVariation(req, id, variationId);
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, variationId } = await params;
  return FoodController.deleteVariation(req, id, variationId);
}
