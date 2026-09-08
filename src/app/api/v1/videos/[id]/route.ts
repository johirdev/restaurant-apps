import { NextRequest } from "next/server";
import { VideoController } from "@/src/controllers/video.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15+ : `params` একটা Promise, তাই await করতে হয়
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  return VideoController.getVideoById(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Params) {
  return VideoController.updateVideo(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Params) {
  return VideoController.deleteVideo(req, ctx);
}
