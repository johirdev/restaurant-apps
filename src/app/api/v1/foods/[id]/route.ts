// src/app/api/v1/foods/[id]/route.ts
import { NextRequest } from "next/server";
import { FoodController } from "@/src/controllers/food.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return FoodController.getFoodById(id);
}
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return FoodController.updateFood(req, id);
}
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return FoodController.deleteFood(req, id);
}
