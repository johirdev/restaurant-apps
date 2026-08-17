import { NextRequest } from "next/server";
import { HeroDiscountBannerController } from "@/src/controllers/heroDiscountBanner.controller";

export const GET = async () => {
  return HeroDiscountBannerController.getAllHeroDiscountBanners();
};

export const POST = async (req: NextRequest) => {
  return HeroDiscountBannerController.createHeroDiscountBanner(req);
};
