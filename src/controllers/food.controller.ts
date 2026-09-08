// src/controllers/food.controller.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { FoodService } from "../services/food.service";
import { queryPick } from "../lib/queryPick";
import { ItemsFilterableFields, ItemsPaginationFields } from "../interfaces/food.interfaces";

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const handleError = (err: unknown, fallback: string) => {
  console.error(fallback, err);
  if (err instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      { success: false, message: "Validation failed", errors: err.errors },
      { status: 400 },
    );
  }
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
    { success: false, message: err instanceof Error ? err.message : fallback },
    { status: 400 },
  );
};

const validateVariation = (v: any): string | null => {
  if (!v.name || !String(v.name).trim()) return "Each variation needs a name";
  if (!v.regularPrice || Number(v.regularPrice) <= 0)
    return `Regular price is required for variation "${v.name || ""}"`;
  if (!Array.isArray(v.images) || v.images.length === 0)
    return `At least 1 image is required for variation "${v.name || ""}"`;
  if (v.images.length > 3)
    return `Maximum 3 images allowed for variation "${v.name || ""}"`;
  return null;
};

const validateCreatePayload = (body: any): string | null => {
  if (!body.name || !String(body.name).trim()) return "Food name is required";
  if (!Array.isArray(body.variations) || body.variations.length === 0)
    return "At least one variation is required";
  for (const v of body.variations) {
    const err = validateVariation(v);
    if (err) return err;
  }
  return null;
};

// src/controllers/food.controller.ts — শুধু getAllFoods ফাংশনটা replace করুন
const getAllFoods = async (req: NextRequest) => {
  try {
    await connectDB();

    // NextRequest-এ req.query নেই (এটা Express-এর জিনিস) —
    // searchParams থেকে ম্যানুয়ালি plain object বানাতে হবে
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const filtering = queryPick(queryObj, ItemsFilterableFields);
    const paginationOption = queryPick(queryObj, ItemsPaginationFields);

    const result = await FoodService.getAllFoods(filtering, paginationOption as any);

    return NextResponse.json({
      success: true,
      message: "Foods fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch foods");
  }
};

const getFoodById = async (id: string) => {
  try {
    if (!isValidObjectId(id))
      return NextResponse.json(
        { success: false, message: "Invalid food id" },
        { status: 400 },
      );
    await connectDB();
    const food = await FoodService.getFoodById(id);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "Food fetched successfully",
      data: food,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch food");
  }
};

/**
 * POST /api/v1/foods/:id/view — কেউ ডিটেইল পেজে ঢুকলে ভিউ একধাপ বাড়ে।
 * উত্তরে নতুন সংখ্যাটাই ফেরে, তাই পেজটা রিলোড ছাড়াই আপডেট দেখাতে পারে।
 */
const incrementView = async (id: string) => {
  try {
    if (!isValidObjectId(id))
      return NextResponse.json(
        { success: false, message: "Invalid food id" },
        { status: 400 },
      );
    await connectDB();
    const food = await FoodService.incrementView(id);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "View counted",
      data: { view: food.view },
    });
  } catch (err) {
    return handleError(err, "Failed to count view");
  }
};

// POST /api/v1/foods — creates the Food row WITH its variations embedded (one table)
const createFood = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();
    const validationError = validateCreatePayload(body);
    if (validationError)
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 },
      );

    const food = await FoodService.createFood(body);
    return NextResponse.json(
      { success: true, message: "Food item created successfully", data: food },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to create food item");
  }
};

const updateFood = async (req: NextRequest, id: string) => {
  try {
    if (!isValidObjectId(id))
      return NextResponse.json(
        { success: false, message: "Invalid food id" },
        { status: 400 },
      );
    await connectDB();
    const body = await req.json();
    const food = await FoodService.updateFood(id, body);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "Food updated successfully",
      data: food,
    });
  } catch (err) {
    return handleError(err, "Failed to update food");
  }
};

const deleteFood = async (id: string) => {
  try {
    if (!isValidObjectId(id))
      return NextResponse.json(
        { success: false, message: "Invalid food id" },
        { status: 400 },
      );
    await connectDB();
    const food = await FoodService.deleteFood(id);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "Food deleted successfully",
      data: food,
    });
  } catch (err) {
    return handleError(err, "Failed to delete food");
  }
};

// ---- variation-level (still same table, just nested) ----

const addVariation = async (req: NextRequest, foodId: string) => {
  try {
    if (!isValidObjectId(foodId))
      return NextResponse.json(
        { success: false, message: "Invalid food id" },
        { status: 400 },
      );
    await connectDB();
    const body = await req.json();
    const validationError = validateVariation(body);
    if (validationError)
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400 },
      );

    const food = await FoodService.addVariation(foodId, body);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json(
      { success: true, message: "Variation added successfully", data: food },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to add variation");
  }
};

const updateVariation = async (
  req: NextRequest,
  foodId: string,
  variationId: string,
) => {
  try {
    if (!isValidObjectId(foodId) || !isValidObjectId(variationId))
      return NextResponse.json(
        { success: false, message: "Invalid id" },
        { status: 400 },
      );
    await connectDB();
    const body = await req.json();
    const food = await FoodService.updateVariation(foodId, variationId, body);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food or variation not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "Variation updated successfully",
      data: food,
    });
  } catch (err) {
    return handleError(err, "Failed to update variation");
  }
};

const deleteVariation = async (foodId: string, variationId: string) => {
  try {
    if (!isValidObjectId(foodId) || !isValidObjectId(variationId))
      return NextResponse.json(
        { success: false, message: "Invalid id" },
        { status: 400 },
      );
    await connectDB();
    const food = await FoodService.deleteVariation(foodId, variationId);
    if (!food)
      return NextResponse.json(
        { success: false, message: "Food not found" },
        { status: 404 },
      );
    return NextResponse.json({
      success: true,
      message: "Variation deleted successfully",
      data: food,
    });
  } catch (err) {
    return handleError(err, "Failed to delete variation");
  }
};

export const FoodController = {
  getAllFoods,
  getFoodById,
  incrementView,
  createFood,
  updateFood,
  deleteFood,
  addVariation,
  updateVariation,
  deleteVariation,
};
