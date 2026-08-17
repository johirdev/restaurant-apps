import { VideoBlogController } from "@/src/controllers/videoBlog.controller";
import { NextRequest } from "next/server";


// Put this file at: src/app/api/v1/video-blogs/[id]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15: `params` is a Promise and must be awaited.
type Params = { params: Promise<{ id: string }> };

// GET /api/v1/video-blogs/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return VideoBlogController.getVideoById(id);
}

// PATCH /api/v1/video-blogs/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return VideoBlogController.updateVideo(req, id);
}

// DELETE /api/v1/video-blogs/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return VideoBlogController.deleteVideo(id);
}
