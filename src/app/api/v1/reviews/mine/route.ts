import { NextRequest } from "next/server";
import { ReviewController } from "@/src/controllers/review.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return ReviewController.getMyReviews(req);
}
