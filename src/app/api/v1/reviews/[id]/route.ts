import { NextRequest } from "next/server";
import { ReviewController } from "@/src/controllers/review.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return ReviewController.deleteReview(req, ctx);
}
