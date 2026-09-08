import { NextRequest } from "next/server";
import { BannerController } from "@/src/controllers/banner.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/banners — ?status=active দিলে পাবলিক, নাহলে ম্যানেজমেন্টের তালিকা */
export async function GET(req: NextRequest) {
  return BannerController.getAllBanners(req);
}

/** POST /api/v1/banners */
export async function POST(req: NextRequest) {
  return BannerController.createBanner(req);
}
