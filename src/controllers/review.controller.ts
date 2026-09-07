import { NextRequest } from "next/server";
import { z } from "zod";
import { ReviewService } from "../services/review.service";
import { ok, created } from "../lib/sendResponse";
import {
  catchAsync,
  parseBody,
  splitQuery,
  getQuery,
  assertObjectId,
} from "../lib/apiHandler";
import { BadRequest } from "../lib/apiError";
import { requireUser, optionalUser } from "../middlewares/requireUser";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";

type IdCtx = { params: Promise<{ id: string }> };

const createReviewSchema = z.object({
  food_id: z.string().trim().min(1, "Food id is required"),
  order_id: z.string().trim().optional(),
  rating: z.coerce.number().int().min(1, "Give at least 1 star").max(5),
  message: z.string().trim().max(1000, "Review is too long").optional(),
  images: z
    .array(z.object({ url: z.string().trim(), public_id: z.string().trim().optional() }))
    .max(3, "At most 3 photos")
    .optional(),
});

/* ==========================================================================
   PUBLIC — একটা খাবারের রিভিউ
   GET /api/v1/reviews?food_id=...&page=1&limit=10
   ========================================================================== */
const getFoodReviews = catchAsync(async (req: NextRequest) => {
  const { food_id } = getQuery(req);
  if (!food_id) throw BadRequest("food_id is required");

  const { pagination } = splitQuery(req, []);
  const result = await ReviewService.getFoodReviews(food_id, pagination as never);

  // গড় আর তারকা-ভাগ একই কলে যায়, তাই UI কে দ্বিতীয়বার সার্ভারে আসতে হয় না
  return ok(
    "Reviews fetched successfully",
    {
      reviews: result.data,
      average: result.average,
      breakdown: result.breakdown,
      total: result.meta.total,
    },
    result.meta,
  );
});

/** POST /api/v1/reviews — লগইন করা কাস্টমার নিজের ডেলিভার হওয়া খাবারে রিভিউ দেয় */
const createReview = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const body = await parseBody(req, createReviewSchema);
  const review = await ReviewService.createReview(auth.id, auth.phone, body);
  return created("Thanks for your review!", review);
});

/** GET /api/v1/reviews/mine */
const getMyReviews = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const reviews = await ReviewService.getMyReviews(auth.id);
  return ok("Your reviews", reviews);
});

/** DELETE /api/v1/reviews/:id — নিজের রিভিউ, অথবা অ্যাডমিন যেকোনোটা */
const deleteReview = catchAsync<IdCtx>(async (req, { params }) => {
  const { id } = await params;
  const staff = verifyTokenAndRole(req, ["superadmin", "admin"]);
  const user = staff.success ? null : requireUser(req);

  const review = await ReviewService.deleteReview(
    assertObjectId(id, "review id"),
    user?.id,
  );
  return ok("Review deleted", review);
});

/** কে রিভিউ দিতে পারবে সেটা UI আগেই জানতে চায় (লগইন আছে কিনা) */
const whoAmI = catchAsync(async (req: NextRequest) => {
  const user = optionalUser(req);
  return ok("ok", { logged_in: !!user, id: user?.id ?? null });
});

export const ReviewController = {
  getFoodReviews,
  createReview,
  getMyReviews,
  deleteReview,
  whoAmI,
};
