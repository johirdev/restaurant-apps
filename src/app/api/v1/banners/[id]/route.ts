import { NextRequest } from "next/server";
import { BannerController } from "@/src/controllers/banner.controller";

// Put this file at: src/app/api/v1/banners/[id]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15: `params` is now a Promise and must be awaited.
type Params = { params: Promise<{ id: string }> };

// GET /api/v1/banners/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return BannerController.getBannerById(id);
}

// PATCH /api/v1/banners/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  return BannerController.updateBanner(req, id);
}

// DELETE /api/v1/banners/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  return BannerController.deleteBanner(id);
}
