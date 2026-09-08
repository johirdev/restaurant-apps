// src/app/api/v1/foods/[id]/view/route.ts
import { NextRequest } from "next/server";
import { FoodController } from "@/src/controllers/food.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/v1/foods/:id/view — ডিটেইল পেজ খুললে ভিউ গোনা হয় (পাবলিক) */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return FoodController.incrementView(id);
}
