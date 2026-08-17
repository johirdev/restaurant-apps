/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { VideoBlogService } from "../services/videoblog.service";


const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const VALID_PLATFORMS = [
  "youtube",
  "facebook",
  "vimeo",
  "tiktok",
  "instagram",
  "dailymotion",
  "other",
];

const validateCreatePayload = (body: any): string | null => {
  if (!body.video_url || !String(body.video_url).trim())
    return "video_url is required";
  if (!body.embed_url || !String(body.embed_url).trim())
    return "embed_url is required";
  if (!body.platform || !VALID_PLATFORMS.includes(body.platform)) {
    return `platform must be one of: ${VALID_PLATFORMS.join(", ")}`;
  }
  return null;
};

const handleError = (err: unknown, fallbackMessage: string) => {
  console.error(fallbackMessage, err);

  if (err instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      { success: false, message: "Validation failed", errors: err.errors },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: err instanceof Error ? err.message : fallbackMessage,
    },
    { status: 500 },
  );
};

// GET /api/v1/video-blogs?status=active&platform=youtube&search=...
const getAllVideos = async (req: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const platform = searchParams.get("platform") || undefined;
    const search = searchParams.get("search") || undefined;

    const videos = await VideoBlogService.getAllVideos({
      status,
      platform,
      search,
    });

    return NextResponse.json({
      success: true,
      message: "Video blogs fetched successfully",
      data: videos,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch video blogs");
  }
};

// GET /api/v1/video-blogs/:id
const getVideoById = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid video id" },
        { status: 400 },
      );
    }

    await connectDB();
    const video = await VideoBlogService.getVideoById(id);

    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video fetched successfully",
      data: video,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch video");
  }
};

// POST /api/v1/video-blogs
const createVideo = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    const validationError = validateCreatePayload(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 },
      );
    }

    const video = await VideoBlogService.createVideo(body);

    return NextResponse.json(
      {
        success: true,
        message: "Video blog created successfully",
        data: video,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to create video blog");
  }
};

// PATCH /api/v1/video-blogs/:id
const updateVideo = async (req: NextRequest, id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid video id" },
        { status: 400 },
      );
    }

    await connectDB();
    const body = await req.json();

    // Partial update — only block required fields being explicitly cleared out.
    for (const field of ["video_url", "embed_url", "platform"]) {
      if (field in body && (body[field] === "" || body[field] === null)) {
        return NextResponse.json(
          { success: false, message: `${field} cannot be empty` },
          { status: 400 },
        );
      }
    }
    if (body.platform && !VALID_PLATFORMS.includes(body.platform)) {
      return NextResponse.json(
        {
          success: false,
          message: `platform must be one of: ${VALID_PLATFORMS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const video = await VideoBlogService.updateVideo(id, body);

    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video blog updated successfully",
      data: video,
    });
  } catch (err) {
    return handleError(err, "Failed to update video blog");
  }
};

// DELETE /api/v1/video-blogs/:id
const deleteVideo = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid video id" },
        { status: 400 },
      );
    }

    await connectDB();
    const video = await VideoBlogService.deleteVideo(id);

    if (!video) {
      return NextResponse.json(
        { success: false, message: "Video not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Video blog deleted successfully",
      data: video,
    });
  } catch (err) {
    return handleError(err, "Failed to delete video blog");
  }
};

export const VideoBlogController = {
  getAllVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
};
