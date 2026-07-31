
import {
  ICategory,
  ICategoryUpdate,
} from "@/src/interfaces/category.interfaces";
import CategoryModel from "../models/category.models";

/**
 * Service layer — only talks to the database, no NextResponse / HTTP here.
 */

const getAllCategories = async () => {
  return CategoryModel.find().sort({ sort_order: 1, createdAt: -1 });
};

const getActiveCategories = async () => {
  return CategoryModel.find({ status: "active" }).sort({ sort_order: 1 });
};

const getCategoryById = async (id: string) => {
  return CategoryModel.findById(id);
};

const getCategoryBySlug = async (slug: string) => {
  return CategoryModel.findOne({ slug });
};

const createCategory = async (payload: ICategory) => {
  return CategoryModel.create(payload);
};

const updateCategory = async (id: string, payload: ICategoryUpdate) => {
  return CategoryModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
};

const deleteCategory = async (id: string) => {
  return CategoryModel.findByIdAndDelete(id);
};

export const CategoryService = {
  getAllCategories,
  getActiveCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
