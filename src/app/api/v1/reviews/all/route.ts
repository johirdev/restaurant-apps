// src/app/api/v1/reviews/all/route.ts
import { NextRequest } from "next/server";
import { ReviewController } from "@/src/controllers/review.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/reviews/all — ড্যাশবোর্ডের মডারেশন তালিকা (মালিকদের জন্য) */
export async function GET(req: NextRequest) {
  return ReviewController.getAllReviews(req);
}
