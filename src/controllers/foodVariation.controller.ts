/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { FoodVariationService } from "../services/foodvariation.service";
// 👈 adjust to your actual DB connect util path

/**
 * Controller layer — request/response handling only.
 * Business logic + DB access lives in FoodVariationService.
 */

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const REQUIRED_FIELDS = [
  "name",
  "sku",
  "barcode",
  "regularPrice",
  "salePrice",
] as const;

const validateRequiredFields = (body: any): string | null => {
  for (const field of REQUIRED_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      return `${field} is required`;
    }
  }
  if (Number(body.regularPrice) <= 0)
    return "regularPrice must be greater than 0";
  if (Number(body.salePrice) < 0) return "salePrice cannot be negative";
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

  // Duplicate sku / barcode (unique index) -> Mongo error code 11000
  if (typeof err === "object" && err !== null && (err as any).code === 11000) {
    const key = Object.keys((err as any).keyPattern || {})[0] || "field";
    return NextResponse.json(
      {
        success: false,
        message: `A variation with this ${key} already exists`,
      },
      { status: 409 },
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

// GET /api/v1/food-variations?foodId=...&search=...
const getAllVariations = async (req: NextRequest) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const foodId = searchParams.get("foodId") || undefined;
    const search = searchParams.get("search") || undefined;

    const variations = await FoodVariationService.getAllVariations({
      foodId,
      search,
    });

    return NextResponse.json({
      success: true,
      message: "Food variations fetched successfully",
      data: variations,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch food variations");
  }
};

// GET /api/v1/food-variations/:id
const getVariationById = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid variation id" },
        { status: 400 },
      );
    }

    await connectDB();
    const variation = await FoodVariationService.getVariationById(id);

    if (!variation) {
      return NextResponse.json(
        { success: false, message: "Variation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Variation fetched successfully",
      data: variation,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch variation");
  }
};

// POST /api/v1/food-variations
const createVariation = async (req: NextRequest) => {
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

    const variation = await FoodVariationService.createVariation(body);

    return NextResponse.json(
      {
        success: true,
        message: "Variation created successfully",
        data: variation,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to create variation");
  }
};

// PATCH /api/v1/food-variations/:id
const updateVariation = async (req: NextRequest, id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid variation id" },
        { status: 400 },
      );
    }

    await connectDB();
    const body = await req.json();

    // Partial update — only block a field being explicitly cleared out.
    for (const field of REQUIRED_FIELDS) {
      if (field in body && (body[field] === "" || body[field] === null)) {
        return NextResponse.json(
          { success: false, message: `${field} cannot be empty` },
          { status: 400 },
        );
      }
    }

    const variation = await FoodVariationService.updateVariation(id, body);

    if (!variation) {
      return NextResponse.json(
        { success: false, message: "Variation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Variation updated successfully",
      data: variation,
    });
  } catch (err) {
    return handleError(err, "Failed to update variation");
  }
};

// DELETE /api/v1/food-variations/:id
const deleteVariation = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid variation id" },
        { status: 400 },
      );
    }

    await connectDB();
    const variation = await FoodVariationService.deleteVariation(id);

    if (!variation) {
      return NextResponse.json(
        { success: false, message: "Variation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Variation deleted successfully",
      data: variation,
    });
  } catch (err) {
    return handleError(err, "Failed to delete variation");
  }
};

export const FoodVariationController = {
  getAllVariations,
  getVariationById,
  createVariation,
  updateVariation,
  deleteVariation,
};
