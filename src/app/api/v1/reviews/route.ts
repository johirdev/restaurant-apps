import { NextRequest } from "next/server";
import { ReviewController } from "@/src/controllers/review.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/reviews?food_id=… (public) · POST (লগইন লাগবে) */
export async function GET(req: NextRequest) {
  return ReviewController.getFoodReviews(req);
}

export async function POST(req: NextRequest) {
  return ReviewController.createReview(req);
}
