// src/services/food.service.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortOrder } from "mongoose";
import { containsRegex, sanitizeSearchTerm } from "../lib/safeQuery";
import { IGenaricRespons } from "../lib/common";
import { IPaginationOpton } from "../lib/pagination";
import { HelperPagination } from "../lib/paginationHelper";
import FoodModel from "../models/food.model";
import {
  IFood,
  IFoodDocument,
  IFoodUpdate,
  IFoodVariation,
  IFoodVariationUpdate,
  ItemsSearchableFields,
} from "@/src/interfaces/food.interfaces";

// --------- helpers ---------
function generateSku(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return base ? `${base}-${rand}` : `ITEM-${rand}`;
}

function ean13CheckDigit(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++)
    sum += i % 2 === 0 ? Number(digits12[i]) : Number(digits12[i]) * 3;
  return (10 - (sum % 10)) % 10;
}

function generateBarcode(): string {
  let body = "880";
  for (let i = 0; i < 9; i++) body += Math.floor(Math.random() * 10);
  return body + ean13CheckDigit(body);
}

function calcSalePrice(
  regularPrice: number,
  discountType?: string,
  discountValue?: number,
) {
  const dv = discountValue || 0;
  if (discountType === "percentage")
    return Math.max(0, regularPrice - (regularPrice * dv) / 100);
  if (discountType === "flat") return Math.max(0, regularPrice - dv);
  return regularPrice;
}

function prepareVariation(v: IFoodVariation, idx: number): IFoodVariation {
  const regularPrice = Number(v.regularPrice);
  const salePrice =
    v.salePrice !== undefined && v.salePrice !== null
      ? Number(v.salePrice)
      : calcSalePrice(regularPrice, v.discountType, v.discountValue);

  return {
    ...v,
    sku: v.sku?.trim() ? v.sku.trim().toUpperCase() : generateSku(v.name),
    barcode: v.barcode?.trim() ? v.barcode.trim() : generateBarcode(),
    regularPrice,
    salePrice,
    is_default: v.is_default ?? idx === 0,
    sort_order: v.sort_order ?? idx,
  };
}

// ---------------- GET ALL — filter + search + pagination ----------------
const getAllFoods = async (
  filtering: Record<string, any>,
  paginationOption: IPaginationOpton,
): Promise<IGenaricRespons<IFoodDocument[]>> => {
  const { searchTerm, minPrice, maxPrice, ...filtersData } = filtering;

  const andConditions: Record<string, any>[] = [];

  /**
   * নাম / ভ্যারিয়েশন / SKU ধরে খোঁজা।
   *
   * টার্মটা আগে সরাসরি `$regex` এ বসত। ফলে কেউ `.*` লিখলেই ফিল্টার
   * অর্থহীন হয়ে যেত, আর `(a+)+$` জাতীয় একটা ছোট স্ট্রিং পাঠিয়ে মঙ্গোর
   * রেজেক্স ইঞ্জিনকে দীর্ঘক্ষণ আটকে রেখে (ReDoS) পুরো সাইট ধীর করে
   * দেওয়া যেত। এখন প্রতিটা অক্ষর আক্ষরিক হিসেবেই ধরা হয়।
   */
  const searchTermString = sanitizeSearchTerm(searchTerm);
  if (searchTermString) {
    const pattern = containsRegex(searchTermString);
    andConditions.push({
      $or: ItemsSearchableFields.map((field) => ({ [field]: pattern })),
    });
  }

  // exact-match filters — e.g. category_id, status
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData)
        .filter(([, value]) => value !== undefined && value !== "")
        .map(([field, value]) => ({ [field]: value })),
    });
  }

  // price range filter — matched against any variation's salePrice
  const min =
    minPrice !== undefined && minPrice !== "" ? Number(minPrice) : undefined;
  const max =
    maxPrice !== undefined && maxPrice !== "" ? Number(maxPrice) : undefined;

  if (min !== undefined || max !== undefined) {
    const priceRange: Record<string, number> = {};
    if (min !== undefined && !Number.isNaN(min)) priceRange.$gte = min;
    if (max !== undefined && !Number.isNaN(max)) priceRange.$lte = max;

    if (Object.keys(priceRange).length) {
      andConditions.push({
        variations: { $elemMatch: { salePrice: priceRange } },
      });
    }
  }

  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const sortConditions: Record<string, SortOrder> = { [sortBy]: sortOrder };

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const [result, total] = await Promise.all([
    FoodModel.find(whereConditions)
      .sort(sortConditions)
      .skip(skip)
      .limit(limit),
    FoodModel.countDocuments(whereConditions),
  ]);

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getFoodById = async (id: string) => {
  return FoodModel.findById(id);
};

/**
 * ডিটেইল পেজে একবার ঢুকলে ভিউ একবার বাড়ে।
 * একই ভিজিটে বারবার যেন না গোনে সেই পাহারাটা ক্লায়েন্টে (sessionStorage);
 * এখানে শুধু গোনাটা বসে, তাই যেখান থেকেই ডাকা হোক হিসাব এক থাকে।
 */
const incrementView = async (id: string) => {
  return FoodModel.findByIdAndUpdate(
    id,
    { $inc: { view: 1 } },
    { new: true, projection: { view: 1 } },
  );
};

/** Creates a Food document with all its variations embedded — single insert, single table. */
const createFood = async (payload: IFood) => {
  const preparedVariations = payload.variations.map(prepareVariation);
  const firstImage = preparedVariations[0]?.images?.[0];

  return FoodModel.create({
    ...payload,
    variations: preparedVariations,
    image: firstImage?.url || "",
    image_public_id: firstImage?.public_id || "",
  });
};

const updateFood = async (id: string, payload: IFoodUpdate) => {
  return FoodModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteFood = async (id: string) => {
  return FoodModel.findByIdAndDelete(id);
};

// ---------- Variation-level operations (still inside the same table) ----------

const addVariation = async (foodId: string, variation: IFoodVariation) => {
  const food = await FoodModel.findById(foodId);
  if (!food) return null;

  const prepared = prepareVariation(variation, food.variations.length);
  food.variations.push(prepared as any);

  // if this is the very first variation, also set it as the food's default image
  if (food.variations.length === 1 && prepared.images?.[0]) {
    food.image = prepared.images[0].url;
    food.image_public_id = prepared.images[0].public_id;
  }

  await food.save();
  return food;
};

const updateVariation = async (
  foodId: string,
  variationId: string,
  payload: IFoodVariationUpdate,
) => {
  const setFields: Record<string, any> = {};
  for (const [key, value] of Object.entries(payload)) {
    setFields[`variations.$.${key}`] = value;
  }

  return FoodModel.findOneAndUpdate(
    { _id: foodId, "variations._id": variationId },
    { $set: setFields },
    { new: true, runValidators: true },
  );
};

const deleteVariation = async (foodId: string, variationId: string) => {
  const food = await FoodModel.findById(foodId);
  if (!food) return null;

  if (food.variations.length <= 1) {
    throw new Error(
      "A food item must have at least one variation — delete the whole item instead",
    );
  }

  food.variations = food.variations.filter(
    (v: any) => String(v._id) !== variationId,
  ) as any;
  await food.save();
  return food;
};

export const FoodService = {
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
