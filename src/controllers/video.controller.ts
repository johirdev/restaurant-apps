import { NextRequest } from "next/server";
import { VideoService } from "../services/video.service";
import { ok, created } from "../lib/sendResponse";
import { catchAsync, parseBody, assertObjectId } from "../lib/apiHandler";
import { requireRole, MANAGER_UP } from "../middlewares/requireAuth";
import {
  createVideoSchema,
  updateVideoSchema,
} from "../validations/video.schema";

/* ==========================================================================
   কন্ট্রোলার স্তর — রিকোয়েস্ট/রেসপন্স আর অনুমতি।
   ব্যানারের মতোই: পড়া সবার জন্য খোলা, লেখা ম্যানেজমেন্টের হাতে।
   ========================================================================== */

type IdCtx = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/videos
 *   ?status=active  → শুধু চালু ভিডিও (হোম পেজ এটাই ডাকে, পাবলিক)
 *   ডিফল্ট          → সব, ম্যানেজমেন্টের জন্য
 */
const getAllVideos = catchAsync(async (req: NextRequest) => {
  if (new URL(req.url).searchParams.get("status") === "active") {
    const videos = await VideoService.getActiveVideos();
    return ok("Videos fetched successfully", videos);
  }

  requireRole(req, MANAGER_UP);
  const videos = await VideoService.getAllVideos();
  return ok("Videos fetched successfully", videos);
});

/** GET /api/v1/videos/:id */
const getVideoById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const video = await VideoService.getVideoById(assertObjectId(id, "video id"));
  return ok("Video fetched successfully", video);
});

/** POST /api/v1/videos */
const createVideo = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const payload = await parseBody(req, createVideoSchema);
  const video = await VideoService.createVideo(payload);
  return created("Video added successfully", video);
});

/** PATCH /api/v1/videos/:id */
const updateVideo = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const payload = await parseBody(req, updateVideoSchema);
  const video = await VideoService.updateVideo(
    assertObjectId(id, "video id"),
    payload,
  );
  return ok("Video updated successfully", video);
});

/** DELETE /api/v1/videos/:id */
const deleteVideo = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const { id } = await params;
  const video = await VideoService.deleteVideo(assertObjectId(id, "video id"));
  return ok("Video deleted successfully", video);
});

export const VideoController = {
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
};
