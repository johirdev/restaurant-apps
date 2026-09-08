import { NextRequest } from "next/server";
import { BannerService } from "../services/banner.service";
import { ok, created } from "../lib/sendResponse";
import { catchAsync, parseBody, assertObjectId } from "../lib/apiHandler";
import { requireRole, MANAGER_UP } from "../middlewares/requireAuth";
import {
  createBannerSchema,
  updateBannerSchema,
} from "../validations/banner.schema";

/* ==========================================================================
   কন্ট্রোলার স্তর — রিকোয়েস্ট/রেসপন্স আর অনুমতি যাচাই।
   ব্যবসার নিয়ম আর ডাটাবেস BannerService এ।

   পড়া সবার জন্য খোলা (হোম পেজের ব্যানার লগইন ছাড়াই দেখা যায়),
   লেখা কেবল ম্যানেজমেন্টের হাতে।
   ========================================================================== */

type IdCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/banners
 *   ?status=active  → শুধু চালু ব্যানার (হোম পেজ এটাই ডাকে, পাবলিক)
 *   ডিফল্ট          → সব ব্যানার, ম্যানেজমেন্টের জন্য
 */
const getAllBanners = catchAsync(async (req: NextRequest) => {
  if (new URL(req.url).searchParams.get("status") === "active") {
    const banners = await BannerService.getActiveBanners();
    return ok("Banners fetched successfully", banners);
  }

  requireRole(req, MANAGER_UP);
  const banners = await BannerService.getAllBanners();
  return ok("Banners fetched successfully", banners);
});

/** GET /api/v1/banners/:id */
const getBannerById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const banner = await BannerService.getBannerById(
    assertObjectId(id, "banner id"),
  );
  return ok("Banner fetched successfully", banner);
});

/** POST /api/v1/banners */
const createBanner = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const payload = await parseBody(req, createBannerSchema);
  const banner = await BannerService.createBanner(payload);
  return created("Banner created successfully", banner);
});

/** PATCH /api/v1/banners/:id */
const updateBanner = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const payload = await parseBody(req, updateBannerSchema);
  const banner = await BannerService.updateBanner(
    assertObjectId(id, "banner id"),
    payload,
  );
  return ok("Banner updated successfully", banner);
});

/** DELETE /api/v1/banners/:id */
const deleteBanner = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const banner = await BannerService.deleteBanner(
    assertObjectId(id, "banner id"),
  );
  return ok("Banner deleted successfully", banner);
});

export const BannerController = {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
