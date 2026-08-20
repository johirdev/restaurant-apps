// src/interfaces/food.interfaces.ts
import { Document, Types } from "mongoose";

export type DiscountType = "none" | "percentage" | "flat";
export type SpiceLevel = "" | "Mild" | "Medium" | "Hot";
export type Status = "active" | "inactive";

export interface IVariationImage {
  url: string;
  public_id: string;
}

export interface IFoodVariation {
  _id?: Types.ObjectId;
  name: string;
  regularPrice: number;
  images: IVariationImage[];
  sku?: string;
  barcode?: string;
  salePrice?: number;
  preparationTime?: number;
  discountType?: DiscountType;
  discountValue?: number;
  quantityLabel?: string;
  isOpen?: boolean;
  kitchen_chef?: string;
  spice_level?: SpiceLevel;
  stock_quantity?: number;
  is_default?: boolean;
  sort_order?: number;
  status?: Status;
}

export interface IFood {
  name: string;
  category_id?: string;
  category_name?: string;
  description?: string;
  view?: number;
  total_review?: number;
  review_rating?: number;
  branch_id?: string;
  branch_name?: string;
  image?: string;
  image_public_id?: string;
  status?: Status;
  variations: IFoodVariation[];
}

export interface IFoodDocument extends IFood, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ---- search ----
export type ISearch = {
  name?: string;
};

// text-search এ যেসব field regex দিয়ে চেক হবে — food name + nested variation name/sku/barcode
export const ItemsSearchableFields = [
  "name",
  "variations.name",
  "variations.sku",
  "variations.barcode",
];

// ---- filter (exact match) fields the frontend is allowed to send ----
export const ItemsFilterableFields = ["searchTerm", "category_id", "status"];

// ---- range-filter fields — handled separately from exact-match filters ----
export const ItemsRangeFilterableFields = ["minPrice", "maxPrice"];

export const ItemsPaginationFields = ["page", "limit", "sortBy", "sortOrder"];

export type IFoodUpdate = Partial<Omit<IFood, "variations">>;
export type IFoodVariationUpdate = Partial<IFoodVariation>;
