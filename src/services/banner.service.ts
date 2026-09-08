import BannerModel from "../models/banner.model";
import { NotFound } from "../lib/apiError";
import type { IBanner, IBannerUpdate } from "../interfaces/banner.interface";

/* ==========================================================================
   সার্ভিস স্তর — শুধু ডাটাবেসের সাথে কথা বলে।
   এখানে কোনো NextResponse / HTTP এর কিছু নেই।
   ========================================================================== */

/** ড্যাশবোর্ডের তালিকা — নিষ্ক্রিয় ব্যানারগুলোও দেখা যায় */
const getAllBanners = async () => {
  return BannerModel.find().sort({ sort_order: 1, createdAt: -1 });
};

/** হোম পেজের স্লাইডার — শুধু চালু ব্যানার, সাজানো ক্রমে */
const getActiveBanners = async () => {
  return BannerModel.find({ status: "active" }).sort({
    sort_order: 1,
    createdAt: -1,
  });
};

const getBannerById = async (id: string) => {
  const banner = await BannerModel.findById(id);
  if (!banner) throw NotFound("Banner not found");
  return banner;
};

const createBanner = async (payload: IBanner) => {
  return BannerModel.create(payload);
};

const updateBanner = async (id: string, payload: IBannerUpdate) => {
  const banner = await BannerModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!banner) throw NotFound("Banner not found");
  return banner;
};

const deleteBanner = async (id: string) => {
  const banner = await BannerModel.findByIdAndDelete(id);
  if (!banner) throw NotFound("Banner not found");
  return banner;
};

export const BannerService = {
  getAllBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
