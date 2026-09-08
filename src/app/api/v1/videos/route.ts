import { NextRequest } from "next/server";
import { VideoController } from "@/src/controllers/video.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/videos — ?status=active দিলে পাবলিক, নাহলে ম্যানেজমেন্টের তালিকা */
export async function GET(req: NextRequest) {
  return VideoController.getAllVideos(req);
}

/** POST /api/v1/videos */
export async function POST(req: NextRequest) {
  return VideoController.createVideo(req);
}
