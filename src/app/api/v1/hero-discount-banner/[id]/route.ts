import { NextRequest } from "next/server";
import { HeroDiscountBannerController } from "@/src/controllers/heroDiscountBanner.controller";

interface RouteParams {
  params: { id: string };
}

export const GET = async (_req: NextRequest, { params }: RouteParams) => {
  return HeroDiscountBannerController.getHeroDiscountBannerById(params.id);
};

export const PATCH = async (req: NextRequest, { params }: RouteParams) => {
  return HeroDiscountBannerController.updateHeroDiscountBanner(req, params.id);
};

export const DELETE = async (_req: NextRequest, { params }: RouteParams) => {
  return HeroDiscountBannerController.deleteHeroDiscountBanner(params.id);
};
