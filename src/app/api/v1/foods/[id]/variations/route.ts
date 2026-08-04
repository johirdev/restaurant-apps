// src/app/api/v1/foods/[id]/variations/route.ts
import { NextRequest } from "next/server";
import { FoodController } from "@/src/controllers/food.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/v1/foods/:id/variations — add a new variation to an existing food
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return FoodController.addVariation(req, id);
}
