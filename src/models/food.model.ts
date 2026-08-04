/* eslint-disable @typescript-eslint/no-explicit-any */
// src/models/food.model.ts
import mongoose, { Schema, Model } from "mongoose";
import { IFoodDocument } from "@/src/interfaces/food.interfaces";

const imageSchema = new Schema(
  {
    url: { type: String, required: true },
    public_id: { type: String, default: "" }, // no longer required — some providers may not return it
  },
  { _id: false },
);

const variationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, required: true, trim: true },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },

    images: {
      type: [imageSchema],
      validate: {
        validator: (arr: unknown[]) =>
          Array.isArray(arr) &&
          arr.length >= 1 &&
          arr.length <= 3 &&
          arr.every((img: any) => !!img?.url),
        message:
          "At least 1 and at most 3 images (each with a url) are required per variation",
      },
      required: true,
    },

    preparationTime: { type: Number, min: 0 },
    discountType: {
      type: String,
      enum: ["none", "percentage", "flat"],
      default: "none",
    },
    discountValue: { type: Number, default: 0, min: 0 },
    quantityLabel: { type: String, trim: true, default: "" },

    isOpen: { type: Boolean, default: true },
    kitchen_chef: { type: String, trim: true, default: "" },
    spice_level: {
      type: String,
      enum: ["", "Mild", "Medium", "Hot"],
      default: "",
    },
    stock_quantity: { type: Number, min: 0 },
    is_default: { type: Boolean, default: false },
    sort_order: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

const foodSchema = new Schema<IFoodDocument>(
  {
    name: { type: String, required: true, trim: true },
    category_id: { type: Schema.Types.ObjectId, ref: "Category" },
    category_name: { type: String, trim: true, default: "" },

    image: { type: String, default: "" },
    image_public_id: { type: String, default: "" },

    status: { type: String, enum: ["active", "inactive"], default: "active" },

    variations: {
      type: [variationSchema],
      validate: {
        validator: (arr: unknown[]) => Array.isArray(arr) && arr.length >= 1,
        message: "At least one variation is required",
      },
      required: true,
    },
  },
  { timestamps: true },
);

foodSchema.index({ name: "text" });
foodSchema.index({ category_id: 1 });
foodSchema.index({ "variations.sku": 1 }, { unique: true, sparse: true });
foodSchema.index({ "variations.barcode": 1 }, { unique: true, sparse: true });

const FoodModel: Model<IFoodDocument> =
  (mongoose.models.Food as Model<IFoodDocument>) ||
  mongoose.model<IFoodDocument>("Food", foodSchema);

export default FoodModel;
