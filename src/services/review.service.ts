/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import ReviewModel from "../models/review.model";
import OrderModel from "../models/order.model";
import FoodModel from "../models/food.model";
import UserModel from "../models/user.model";
import cloudinary from "../config/cloudinary";
import { BadRequest, Forbidden, NotFound } from "../lib/apiError";
import { HelperPagination } from "../lib/paginationHelper";
import { IPaginationOpton } from "../lib/pagination";

/**
 * রিভিউ যোগ/বদল হলে খাবারের গড় রেটিং আবার হিসাব হয়।
 * FoodCard, ডিটেইল পেজ সবাই এই দুটো ফিল্ডই পড়ে, তাই আলাদা কোয়েরি লাগে না।
 */
async function recomputeFoodRating(foodId: string) {
  const [agg] = await ReviewModel.aggregate([
    {
      $match: {
        food_id: new mongoose.Types.ObjectId(foodId),
        status: "visible",
      },
    },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await FoodModel.findByIdAndUpdate(foodId, {
    $set: {
      review_rating: Math.round((agg?.avg || 0) * 10) / 10,
      total_review: agg?.count || 0,
    },
  });
}

/* ==========================================================================
   কাস্টমার রিভিউ দেয় — শুধু নিজের ডেলিভার হওয়া অর্ডারের খাবারে
   ========================================================================== */
const createReview = async (
  userId: string,
  phone: string,
  payload: {
    food_id: string;
    order_id?: string;
    rating: number;
    message?: string;
    images?: { url: string; public_id?: string }[];
  },
) => {
  const order = await OrderModel.findOne({
    $or: [{ user_id: userId }, { "customer.phone": phone }],
    status: "delivered",
    "items.food_id": payload.food_id,
    ...(payload.order_id ? { _id: payload.order_id } : {}),
  }).sort({ createdAt: -1 });

  if (!order) {
    throw Forbidden(
      "You can only review a dish after one of your orders with it has been delivered.",
    );
  }

  const user = await UserModel.findById(userId).lean();
  if (!user) throw NotFound("Your account was not found");

  const review = await ReviewModel.findOneAndUpdate(
    { user_id: userId, food_id: payload.food_id, order_id: String(order._id) },
    {
      $set: {
        user_id: userId,
        user_name: user.name || "Customer",
        user_image: user.image?.url || "",
        food_id: payload.food_id,
        order_id: String(order._id),
        order_number: order.order_number,
        rating: payload.rating,
        message: payload.message || "",
        images: (payload.images || []).slice(0, 3).map((i) => ({
          url: i.url,
          public_id: i.public_id || "",
        })),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  );

  await recomputeFoodRating(payload.food_id);
  return review;
};

/** একটা খাবারের রিভিউ — পাবলিক */
const getFoodReviews = async (foodId: string, paginationOption: IPaginationOpton) => {
  if (!mongoose.Types.ObjectId.isValid(foodId)) throw BadRequest("Invalid food id");

  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const where = { food_id: foodId, status: "visible" as const };

  const [data, total, summary] = await Promise.all([
    ReviewModel.find(where)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    ReviewModel.countDocuments(where),
    ReviewModel.aggregate([
      { $match: { food_id: new mongoose.Types.ObjectId(foodId), status: "visible" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown: Record<string, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const row of summary as any[]) {
    breakdown[String(row._id)] = row.count;
    sum += row._id * row.count;
  }

  return {
    meta: { page, limit, total },
    data,
    average: total ? Math.round((sum / total) * 10) / 10 : 0,
    breakdown,
  };
};

/* ==========================================================================
   ড্যাশবোর্ডের মডারেশন তালিকা — সব খাবারের রিভিউ একসাথে
   ========================================================================== */
const getAllReviews = async (
  filters: {
    searchTerm?: string;
    food_id?: string;
    rating?: string | number;
    status?: string;
  },
  paginationOption: IPaginationOpton,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    HelperPagination.calculationPagination(paginationOption);

  const and: Record<string, any>[] = [];

  if (filters.searchTerm) {
    // সার্চ বাক্সের লেখা সরাসরি RegExp এ বসালে "(" এর মতো অক্ষরে কোয়েরিটাই
    // ভেঙে যেত — তাই বিশেষ অক্ষরগুলো আগে নিরীহ করে নিই
    const safe = filters.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    and.push({
      $or: [{ user_name: rx }, { message: rx }, { order_number: rx }],
    });
  }
  if (filters.food_id && mongoose.Types.ObjectId.isValid(filters.food_id)) {
    and.push({ food_id: new mongoose.Types.ObjectId(filters.food_id) });
  }
  if (filters.rating) and.push({ rating: Number(filters.rating) });
  if (filters.status) and.push({ status: filters.status });

  const where = and.length ? { $and: and } : {};

  const [data, total] = await Promise.all([
    ReviewModel.find(where)
      // কোন খাবারের রিভিউ সেটা তালিকাতেই দরকার — নইলে প্রতি সারিতে আলাদা কল
      .populate({ path: "food_id", select: "name image" })
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments(where),
  ]);

  return { meta: { page, limit, total }, data };
};

/** নিজের দেওয়া সব রিভিউ */
const getMyReviews = async (userId: string) =>
  ReviewModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(100);

const deleteReview = async (id: string, userId?: string) => {
  const review = await ReviewModel.findById(id);
  if (!review) throw NotFound("Review not found");
  // userId দেওয়া থাকলে সেটা নিজের রিভিউ কিনা দেখি; অ্যাডমিন হলে userId আসে না
  if (userId && review.user_id !== userId) {
    throw Forbidden("You can only delete your own review");
  }

  await review.deleteOne();

  // ছবিগুলো Cloudinary তে পড়ে থাকলে শুধু জায়গা খায় — মুছে দিই।
  // এটা ব্যর্থ হলেও রিভিউ মোছা আটকায় না, তাই চুপচাপ চেষ্টা।
  await Promise.all(
    (review.images || [])
      .filter((img) => img.public_id)
      .map((img) =>
        cloudinary.uploader
          .destroy(img.public_id)
          .catch(() =>
            console.warn("Could not remove review image", img.public_id),
          ),
      ),
  );

  await recomputeFoodRating(String(review.food_id));
  return review;
};

export const ReviewService = {
  createReview,
  getFoodReviews,
  getAllReviews,
  getMyReviews,
  deleteReview,
};
