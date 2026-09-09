/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { CategoryService } from "../services/category.service";
import { connectDB } from "../config/db";
import { ApiError } from "../lib/apiError";
import { requireRole, MANAGER_UP } from "../middlewares/requireAuth";

/**
 * Controller layer — request/response handling only.
 * Business logic + DB access lives in CategoryService.
 */

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

/* ==========================================================================
   ক্যাটাগরি বদলানোর অধিকার
   --------------------------------------------------------------------------
   খাবারের মতোই — create/update/delete তিনটেই আগে টোকেন ছাড়াই কাজ করত,
   অর্থাৎ বাইরের যে কেউ মেনুর ক্যাটাগরি মুছে দিতে পারত।
   ========================================================================== */
const requireMenuAccess = (req: NextRequest) => requireRole(req, MANAGER_UP);

const handleError = (err: unknown, fallbackMessage: string) => {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.statusCode, headers: err.headers },
    );
  }
  console.error(fallbackMessage, err);

  if (err instanceof mongoose.Error.ValidationError) {
    return NextResponse.json(
      { success: false, message: "Validation failed", errors: err.errors },
      { status: 400 },
    );
  }

  // Duplicate slug (unique index) -> Mongo error code 11000
  if (typeof err === "object" && err !== null && (err as any).code === 11000) {
    return NextResponse.json(
      { success: false, message: "A category with this slug already exists" },
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

// GET /api/v1/categories
const getAllCategories = async () => {
  try {
    await connectDB();
    const categories = await CategoryService.getAllCategories();
    return NextResponse.json({
      success: true,
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch categories");
  }
};

// GET /api/v1/categories/:id
const getCategoryById = async (id: string) => {
  try {
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category id" },
        { status: 400 },
      );
    }

    await connectDB();
    const category = await CategoryService.getCategoryById(id);

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category fetched successfully",
      data: category,
    });
  } catch (err) {
    return handleError(err, "Failed to fetch category");
  }
};

// POST /api/v1/categories
const createCategory = async (req: NextRequest) => {
  try {
    requireMenuAccess(req);
    await connectDB();
    const body = await req.json();

    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 },
      );
    }

    const category = await CategoryService.createCategory(body);

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully",
        data: category,
      },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err, "Failed to create category");
  }
};

// PATCH /api/v1/categories/:id
const updateCategory = async (req: NextRequest, id: string) => {
  try {
    requireMenuAccess(req);
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category id" },
        { status: 400 },
      );
    }

    await connectDB();
    const body = await req.json();

    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json(
        { success: false, message: "Category name cannot be empty" },
        { status: 400 },
      );
    }

    const category = await CategoryService.updateCategory(id, body);

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (err) {
    return handleError(err, "Failed to update category");
  }
};

// DELETE /api/v1/categories/:id
const deleteCategory = async (req: NextRequest, id: string) => {
  try {
    requireMenuAccess(req);
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid category id" },
        { status: 400 },
      );
    }

    await connectDB();
    const category = await CategoryService.deleteCategory(id);

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
      data: category,
    });
  } catch (err) {
    return handleError(err, "Failed to delete category");
  }
};

export const CategoryController = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
