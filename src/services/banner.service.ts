import BannerModel from "@/src/models/banner.model";
import { IBanner, IBannerUpdate } from "../interfaces/banner.interfaces";


const getAllBanners = async () => {
  return BannerModel.find().sort({ sort_order: 1, createdAt: -1 });
};

const getActiveBanners = async () => {
  return BannerModel.find({ status: "active" }).sort({ sort_order: 1 });
};

const getBannerById = async (id: string) => {
  return BannerModel.findById(id);
};

const createBanner = async (payload: IBanner) => {
  return BannerModel.create(payload);
};

const updateBanner = async (id: string, payload: IBannerUpdate) => {
  return BannerModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteBanner = async (id: string) => {
  return BannerModel.findByIdAndDelete(id);
};

export const BannerService = {
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
