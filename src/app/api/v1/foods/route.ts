// src/app/api/v1/foods/route.ts
import { NextRequest } from "next/server";
import { FoodController } from "@/src/controllers/food.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return FoodController.getAllFoods(req);
}
export async function POST(req: NextRequest) {
  return FoodController.createFood(req);
}
