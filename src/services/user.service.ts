/* eslint-disable @typescript-eslint/no-explicit-any */
import { SortOrder } from "mongoose";
import UserModel from "../models/user.model";
import OrderModel from "../models/order.model";
import AuthBlockModel from "../models/authBlock.model";
import { IGenaricRespons } from "../lib/common";
import { IPaginationOpton } from "../lib/pagination";
import { HelperPagination } from "../lib/paginationHelper";
import { NotFound } from "../lib/apiError";
import { DISTRICT_TO_DIVISION } from "../config/bd-locations";
import {
  IUserDocument,
  UserSearchableFields,
} from "../interfaces/user.interfaces";
import { UpdateProfileInput } from "../validations/user.schema";

/* ==========================================================================
   নিজের প্রোফাইল
   ========================================================================== */
const getMe = async (id: string) => {
  const user = await UserModel.findById(id);
  if (!user) throw NotFound("Your account was not found");
  return user;
};

const updateMe = async (id: string, payload: UpdateProfileInput) => {
  const $set: Record<string, unknown> = { ...payload };

  // জেলা দিলে বিভাগটা আমরাই বসিয়ে দিই — কাস্টমারকে দুবার বাছতে হয় না
  if (payload.district && !payload.division) {
    $set.division = DISTRICT_TO_DIVISION[payload.district] || "";
  }

  if (payload.favorite_dishes) {
    // একই পদ দুবার, বা ফাঁকা নাম — কোনোটাই রাখি না
    $set.favorite_dishes = [
      ...new Set(payload.favorite_dishes.map((d) => d.trim()).filter(Boolean)),
    ];
  }

  const user = await UserModel.findByIdAndUpdate(
    id,
    { $set },
    { new: true, runValidators: true },
  );
  if (!user) throw NotFound("Your account was not found");
  return user;
};

/** নিজের অর্ডার — লগইনের আগে একই নম্বরে দেওয়া অর্ডারগুলোও দেখা যায় */
const getMyOrders = async (
  id: string,
  phone: string,
  paginationOption: IPaginationOpton,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const where = { $or: [{ user_id: id }, { "customer.phone": phone }] };
  const sort: Record<string, SortOrder> = { [sortBy]: sortOrder };

  const [data, total] = await Promise.all([
    OrderModel.find(where).sort(sort).skip(skip).limit(limit),
    OrderModel.countDocuments(where),
  ]);

  return { meta: { page, limit, total }, data };
};

/** কাস্টমার কী কী খেয়েছে — রিভিউ দেওয়ার সময় এই তালিকাটাই কাজে লাগে */
const getMyDishes = async (id: string, phone: string) => {
  const rows = await OrderModel.aggregate([
    { $match: { $or: [{ user_id: id }, { "customer.phone": phone }] } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.food_id",
        name: { $first: "$items.name" },
        image: { $first: "$items.image" },
        times: { $sum: "$items.quantity" },
        last_ordered: { $max: "$createdAt" },
        last_order_id: { $last: "$_id" },
        delivered: {
          $max: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
      },
    },
    { $sort: { last_ordered: -1 } },
    { $limit: 50 },
  ]);

  return rows.map((r: any) => ({
    food_id: String(r._id),
    name: r.name,
    image: r.image,
    times: r.times,
    last_ordered: r.last_ordered,
    last_order_id: String(r.last_order_id),
    can_review: r.delivered === 1,
  }));
};

/* ==========================================================================
   অ্যাডমিন — সব কাস্টমারের তালিকা
   ========================================================================== */
const getAllUsers = async (
  filtering: Record<string, any>,
  paginationOption: IPaginationOpton,
): Promise<IGenaricRespons<IUserDocument[]>> => {
  const { searchTerm, favorite_dish, ...filtersData } = filtering;

  const andConditions: Record<string, any>[] = [];

  const term = typeof searchTerm === "string" ? searchTerm.trim() : "";
  if (term) {
    andConditions.push({
      $or: UserSearchableFields.map((field) => ({
        [field]: { $regex: term, $options: "i" },
      })),
    });
  }

  // প্রিয় খাবার — অ্যারের যেকোনো একটার সাথে মিললেই হলো
  if (favorite_dish && String(favorite_dish).trim()) {
    andConditions.push({
      favorite_dishes: { $regex: String(favorite_dish).trim(), $options: "i" },
    });
  }

  const exact = Object.entries(filtersData)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([field, value]) => {
      const values = String(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      return values.length > 1
        ? { [field]: { $in: values } }
        : { [field]: values[0] ?? value };
    });
  if (exact.length) andConditions.push({ $and: exact });

  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const sort: Record<string, SortOrder> = { [sortBy]: sortOrder };
  const where = andConditions.length ? { $and: andConditions } : {};

  const [data, total] = await Promise.all([
    UserModel.find(where).sort(sort).skip(skip).limit(limit),
    UserModel.countDocuments(where),
  ]);

  return { meta: { page, limit, total }, data };
};

/** একজন কাস্টমারের বিস্তারিত — কয়টা অর্ডার, কত টাকা, ব্লক আছে কিনা */
const getUserById = async (id: string) => {
  const user = await UserModel.findById(id);
  if (!user) throw NotFound("Customer not found");

  const [stats, blocks, recentOrders] = await Promise.all([
    OrderModel.aggregate([
      {
        $match: {
          $or: [{ user_id: String(user._id) }, { "customer.phone": user.phone }],
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          spent: { $sum: "$pricing.total" },
        },
      },
    ]),
    AuthBlockModel.find({
      key: user.phone,
      blocked_until: { $gt: new Date() },
    }).lean(),
    OrderModel.find({
      $or: [{ user_id: String(user._id) }, { "customer.phone": user.phone }],
    })
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  return {
    user,
    stats: {
      orders: stats[0]?.orders || 0,
      spent: Math.round((stats[0]?.spent || 0) * 100) / 100,
    },
    blocks,
    recentOrders,
  };
};

const adminUpdateUser = async (
  id: string,
  payload: { status?: string; notes?: string },
) => {
  const user = await UserModel.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true },
  );
  if (!user) throw NotFound("Customer not found");
  return user;
};

const deleteUser = async (id: string) => {
  const user = await UserModel.findByIdAndDelete(id);
  if (!user) throw NotFound("Customer not found");
  return user;
};

/** ফিল্টার ড্রপডাউনে যেসব প্রিয় খাবার দেখানো হবে */
const getFavoriteDishOptions = async () => {
  const rows = await UserModel.aggregate([
    { $unwind: "$favorite_dishes" },
    { $group: { _id: "$favorite_dishes", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 60 },
  ]);
  return rows.map((r: any) => ({ dish: r._id, count: r.count }));
};

export const UserService = {
  getMe,
  updateMe,
  getMyOrders,
  getMyDishes,
  getAllUsers,
  getUserById,
  adminUpdateUser,
  deleteUser,
  getFavoriteDishOptions,
};
