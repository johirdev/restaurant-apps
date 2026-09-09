// src/app/api/v1/reviews/bulk-delete/route.ts
import { NextRequest } from "next/server";
import { ReviewController } from "@/src/controllers/review.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/reviews/bulk-delete   { "ids": ["...", "..."] }
 * মডারেশন তালিকা থেকে বাছা রিভিউগুলো একসাথে মোছে (superadmin / admin)।
 */
export async function POST(req: NextRequest) {
  return ReviewController.bulkDeleteReviews(req);
}

export async function DELETE(req: NextRequest) {
  return ReviewController.bulkDeleteReviews(req);
}
