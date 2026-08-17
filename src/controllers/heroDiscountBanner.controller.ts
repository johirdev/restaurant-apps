/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { HeroDiscountBannerService } from "../services/heroDiscountBanner.service";

/**
 * Controller layer — request/response handling only.
 * Business logic + DB access lives in HeroDiscountBannerService.
 */

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const REQUIRED_FIELDS = ["line1", "line2", "buttonText", "image"] as const;

const isBase64Image = (value: unknown) =>
  typeof value === "string" && value.trim().startsWith("data:image");

const validateRequiredFields = (body: any): string | null => {
  for (const field of REQUIRED_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      return `${field} is required`;
    }
  }
  if (
    body.discountPercent !== undefined &&
    (Number(body.discountPercent) < 0 || Number(body.discountPercent) > 100)
  ) {
    return "discountPercent must be between 0 and 100";
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

// GET /api/v1/hero-discount-banner
const getAllHeroDiscountBanners = async () => {
  try {
    await connectDB();
    const banners = await HeroDiscountBannerService.getAllHeroDiscountBanners();

    return NextResponse.json({
      success: true,
      message: "Hero discount banners fetched successfully",
      data: banners,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch hero discount banners");
  }
};

// GET /api/v1/hero-discount-banner/:id
const getHeroDiscountBannerById = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const banner =
      await HeroDiscountBannerService.getHeroDiscountBannerById(id);

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

// POST /api/v1/hero-discount-banner
const createHeroDiscountBanner = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    const validationError = validateRequiredFields(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 },
      );
    }

    const banner =
      await HeroDiscountBannerService.createHeroDiscountBanner(body);

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

// PATCH /api/v1/hero-discount-banner/:id
const updateHeroDiscountBanner = async (req: NextRequest, id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const body = await req.json();

    // Allow base64/data-URL images here so the admin UI can use the upload
    // fallback when Cloudinary isn't configured. Storing data URLs increases
    // payload size; consider configuring Cloudinary for production.

    // Partial update — only block a required field being explicitly cleared out.
    for (const field of REQUIRED_FIELDS) {
      if (field in body && (body[field] === "" || body[field] === null)) {
        return NextResponse.json(
          { success: false, message: `${field} cannot be empty` },
          { status: 400 },
        );
      }
    }

    const banner = await HeroDiscountBannerService.updateHeroDiscountBanner(
      id,
      body,
    );

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

// DELETE /api/v1/hero-discount-banner/:id
const deleteHeroDiscountBanner = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid banner id" },
        { status: 400 },
      );
    }

    await connectDB();
    const banner = await HeroDiscountBannerService.deleteHeroDiscountBanner(id);

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

export const HeroDiscountBannerController = {
  getAllHeroDiscountBanners,
  getHeroDiscountBannerById,
  createHeroDiscountBanner,
  updateHeroDiscountBanner,
  deleteHeroDiscountBanner,
};
