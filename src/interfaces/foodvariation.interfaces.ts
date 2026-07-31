import { Document, Types } from "mongoose";

export type DiscountType = "none" | "percentage" | "flat";
export type SpiceLevel = "" | "Mild" | "Medium" | "Hot";
export type VariationStatus = "active" | "inactive";

/** Plain shape of a Food Variation — used for create/update payloads. */
export interface IFoodVariation {
  foodId?: string; // parent food item this variation belongs to

  // required
  name: string;
  sku: string;
  barcode: string;
  regularPrice: number;
  salePrice: number;

  // category (denormalized for fast reads)
  category_id?: string;
  category_name?: string;

  // optional
  preparationTime?: number;
  discountType?: DiscountType;
  discountValue?: number;
  quantityLabel?: string;
  image?: string;
  image_public_id?: string;
  isOpen?: boolean;
  kitchen_chef?: string;
  spice_level?: SpiceLevel;
  stock_quantity?: number;
  is_default?: boolean;
  sort_order?: number;
  status?: VariationStatus;
}

/** Mongoose document shape (adds _id, timestamps). */
export interface IFoodVariationDocument extends IFoodVariation, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Payload accepted by PATCH /api/v1/food-variations/:id — partial update. */
export type IFoodVariationUpdate = Partial<IFoodVariation>;
