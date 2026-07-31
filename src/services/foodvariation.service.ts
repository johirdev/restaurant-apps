/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  IFoodVariation,
  IFoodVariationUpdate,
} from "@/src/interfaces/foodvariation.interfaces";
import FoodVariationModel from "../models/foodVariation.model";


/**
 * Service layer — only talks to the database, no NextResponse / HTTP here.
 */

interface ListOptions {
  foodId?: string;
  search?: string; // matches name / sku / barcode via the text index
}

const getAllVariations = async (options: ListOptions = {}) => {
  const { foodId, search } = options;

  const query: Record<string, any> = {};
  if (foodId) query.foodId = foodId;
  if (search) query.$text = { $search: search };

  return FoodVariationModel.find(query).sort({ sort_order: 1, createdAt: -1 });
};

const getVariationById = async (id: string) => {
  return FoodVariationModel.findById(id);
};

const getVariationBySku = async (sku: string) => {
  return FoodVariationModel.findOne({ sku: sku.toUpperCase() });
};

const getVariationByBarcode = async (barcode: string) => {
  return FoodVariationModel.findOne({ barcode });
};

const createVariation = async (payload: IFoodVariation) => {
  return FoodVariationModel.create(payload);
};

const updateVariation = async (id: string, payload: IFoodVariationUpdate) => {
  return FoodVariationModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteVariation = async (id: string) => {
  return FoodVariationModel.findByIdAndDelete(id);
};

export const FoodVariationService = {
  getAllVariations,
  getVariationById,
  getVariationBySku,
  getVariationByBarcode,
  createVariation,
  updateVariation,
  deleteVariation,
};
