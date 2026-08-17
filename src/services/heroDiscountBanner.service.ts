import {
  IHeroDiscountBanner,
  IHeroDiscountBannerUpdate,
} from "@/src/interfaces/heroDiscountBanner.interfaces";
import HeroDiscountBannerModel from "../models/heroDiscountBanner.model";

/**
 * Service layer — only talks to the database, no NextResponse / HTTP here.
 * Supports multiple banners (create / list / update / delete).
 */

const getAllHeroDiscountBanners = async () => {
  return HeroDiscountBannerModel.find().sort({ sort_order: 1, createdAt: -1 });
};

const getHeroDiscountBannerById = async (id: string) => {
  return HeroDiscountBannerModel.findById(id);
};

const createHeroDiscountBanner = async (payload: IHeroDiscountBanner) => {
  return HeroDiscountBannerModel.create(payload);
};

const updateHeroDiscountBanner = async (
  id: string,
  payload: IHeroDiscountBannerUpdate,
) => {
  return HeroDiscountBannerModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteHeroDiscountBanner = async (id: string) => {
  return HeroDiscountBannerModel.findByIdAndDelete(id);
};

export const HeroDiscountBannerService = {
  getAllHeroDiscountBanners,
  getHeroDiscountBannerById,
  createHeroDiscountBanner,
  updateHeroDiscountBanner,
  deleteHeroDiscountBanner,
};
