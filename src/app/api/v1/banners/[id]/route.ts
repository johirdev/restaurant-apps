import { NextRequest } from "next/server";
import { BannerController } from "@/src/controllers/banner.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15+ : `params` একটা Promise, তাই await করতে হয়
type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  return BannerController.getBannerById(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Params) {
  return BannerController.updateBanner(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Params) {
  return BannerController.deleteBanner(req, ctx);
}
