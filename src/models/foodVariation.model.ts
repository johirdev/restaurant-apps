import mongoose, { Schema, Model } from "mongoose";
import { IFoodVariationDocument } from "@/src/interfaces/foodvariation.interfaces";

const foodVariationSchema = new Schema<IFoodVariationDocument>(
  {
    foodId: { type: Schema.Types.ObjectId, ref: "Food" },

    // ---- required ----
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, required: true, trim: true },
    regularPrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, required: true, min: 0 },

    // ---- category (denormalized for fast reads) ----
    category_id: { type: Schema.Types.ObjectId, ref: "Category" },
    category_name: { type: String, trim: true, default: "" },

    // ---- optional ----
    preparationTime: { type: Number, min: 0 }, // minutes
    discountType: {
      type: String,
      enum: ["none", "percentage", "flat"],
      default: "none",
    },
    discountValue: { type: Number, default: 0, min: 0 },
    quantityLabel: { type: String, trim: true, default: "" },

    image: { type: String, default: "" },
    image_public_id: { type: String, default: "" },

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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

// ---------------- Indexes ----------------
foodVariationSchema.index({ sku: 1 }, { unique: true });
foodVariationSchema.index({ barcode: 1 }, { unique: true });
foodVariationSchema.index({ name: 1 });
foodVariationSchema.index({ name: "text", sku: "text", barcode: "text" });
foodVariationSchema.index({ foodId: 1, sort_order: 1 });
// Fast "all variations under this category" lookups.
foodVariationSchema.index({ category_id: 1 });

const FoodVariationModel: Model<IFoodVariationDocument> =
  (mongoose.models.FoodVariation as Model<IFoodVariationDocument>) ||
  mongoose.model<IFoodVariationDocument>("FoodVariation", foodVariationSchema);

export default FoodVariationModel;
