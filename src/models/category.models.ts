import mongoose, { Schema, Model } from "mongoose";
import { ICategoryDocument } from "../interfaces/category.interfaces";

const categorySchema = new Schema<ICategoryDocument>(
  {
    image: { type: String, default: "" },
    image_public_id: { type: String, default: "" },

    name: { type: String, required: true, trim: true },

    sub_title: {
      type: String,
      enum: ["", "New", "Hot", "Popular"],
      default: "",
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    sort_order: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Useful for the public menu page: active categories, in display order.
categorySchema.index({ status: 1, sort_order: 1 });

// Prevent model overwrite errors in Next.js dev (hot reload).
const CategoryModel: Model<ICategoryDocument> =
  (mongoose.models.Category as Model<ICategoryDocument>) ||
  mongoose.model<ICategoryDocument>("Category", categorySchema);

export default CategoryModel;
