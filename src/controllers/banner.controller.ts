 
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { BannerService } from "../services/banner.service";


const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

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

// GET /api/v1/banners
const getAllBanners = async () => {
  try {
    await connectDB();
    const banners = await BannerService.getAllBanners();
    return NextResponse.json({
      success: true,
      message: "Banners fetched successfully",
      data: banners,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch banners");
  }
};

// GET /api/v1/banners/:id
const getBannerById = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const banner = await BannerService.getBannerById(id);

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Banner fetched successfully",
      data: banner,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch banner");
  }
};

// POST /api/v1/banners
const createBanner = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    const banner = await BannerService.createBanner(body);

    return NextResponse.json(
      {
        success: true,
        message: "Banner created successfully",
        data: banner,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to create banner");
  }
};

// PATCH /api/v1/banners/:id
const updateBanner = async (req: NextRequest, id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const body = await req.json();

    const banner = await BannerService.updateBanner(id, body);

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (err) {
    return handleError(err, "Failed to update banner");
  }
};

// DELETE /api/v1/banners/:id
const deleteBanner = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const banner = await BannerService.deleteBanner(id);

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Banner deleted successfully",
      data: banner,
    });
  } catch (err) {
    return handleError(err, "Failed to delete banner");
  }
};

export const BannerController = {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
};
