import { VideoBlogController } from "@/src/controllers/videoBlog.controller";
import { NextRequest } from "next/server";

// Put this file at: src/app/api/v1/video-blogs/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/v1/video-blogs?status=active&platform=youtube&search=...
export async function GET(req: NextRequest) {
  return VideoBlogController.getAllVideos(req);
}

// POST /api/v1/video-blogs
export async function POST(req: NextRequest) {
  return VideoBlogController.createVideo(req);
}
