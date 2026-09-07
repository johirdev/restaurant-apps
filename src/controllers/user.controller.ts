import { NextRequest } from "next/server";
import { UserService } from "../services/user.service";
import { sendOtp, verifyOtp, clearBlocks, AUTH_RULES } from "../services/auth.service";
import { ok, sendResponse } from "../lib/sendResponse";
import {
  catchAsync,
  parseBody,
  splitQuery,
  assertObjectId,
} from "../lib/apiHandler";
import { getClientIp } from "../lib/getClientIp";
import { requireRole, ANY_STAFF, CAN_WRITE } from "../middlewares/requireAuth";
import {
  requireUser,
  userCookie,
  clearUserCookie,
} from "../middlewares/requireUser";
import {
  sendOtpSchema,
  verifyOtpSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
} from "../validations/user.schema";
import {
  UserFilterableFields,
  UserPaginationFields,
} from "../interfaces/user.interfaces";

type IdCtx = { params: Promise<{ id: string }> };

/* ==========================================================================
   PUBLIC — ধাপ ১: নম্বরে OTP পাঠাও
   POST /api/v1/users/otp/send   { "phone": "01712345678" }
   ========================================================================== */
const requestOtp = catchAsync(async (req: NextRequest) => {
  const { phone } = await parseBody(req, sendOtpSchema);
  const result = await sendOtp(phone, getClientIp(req));

  return ok(
    result.is_new_user
      ? "We sent a code to your number. Enter it to create your account."
      : "We sent a code to your number.",
    result,
  );
});

/* ==========================================================================
   PUBLIC — ধাপ ২: OTP মিলিয়ে দেখো, তারপর লগইন
   POST /api/v1/users/otp/verify   { "phone": "...", "code": "123456" }
   ========================================================================== */
const confirmOtp = catchAsync(async (req: NextRequest) => {
  const { phone, code } = await parseBody(req, verifyOtpSchema);
  const result = await verifyOtp(phone, code, getClientIp(req));

  // টোকেন httpOnly কুকিতে যায় — XSS হলেও জাভাস্ক্রিপ্ট এটা পড়তে পারবে না
  return sendResponse({
    statusCode: 200,
    success: true,
    message: result.is_new_user
      ? "Welcome! Your account is ready."
      : "Logged in successfully",
    data: {
      user: result.user,
      is_new_user: result.is_new_user,
      profile_complete: result.profile_complete,
      token: result.token,
    },
    headers: { "Set-Cookie": userCookie(result.token) },
  });
});

/** POST /api/v1/users/logout */
const logout = catchAsync(async () =>
  sendResponse({
    statusCode: 200,
    success: true,
    message: "Logged out",
    headers: { "Set-Cookie": clearUserCookie() },
  }),
);

/** GET /api/v1/users/auth-rules — UI তে সীমাগুলো দেখানোর জন্য */
const getAuthRules = catchAsync(async () =>
  ok("Auth rules", {
    ...AUTH_RULES,
    sms_enabled: process.env.SMS_ENABLED === "true",
  }),
);

/* ==========================================================================
   কাস্টমার — নিজের প্রোফাইল
   ========================================================================== */
const getMe = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const user = await UserService.getMe(auth.id);
  return ok("Profile fetched successfully", user);
});

const updateMe = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const payload = await parseBody(req, updateProfileSchema);
  const user = await UserService.updateMe(auth.id, payload);
  return ok("Profile updated successfully", user);
});

const getMyOrders = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const { pagination } = splitQuery(req, [], UserPaginationFields);
  const result = await UserService.getMyOrders(
    auth.id,
    auth.phone,
    pagination as never,
  );
  return ok("Your orders", result.data, result.meta);
});

const getMyDishes = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const dishes = await UserService.getMyDishes(auth.id, auth.phone);
  return ok("Dishes you have ordered", dishes);
});

/* ==========================================================================
   অ্যাডমিন — কাস্টমার ম্যানেজমেন্ট
   ========================================================================== */
const getAllUsers = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);

  const { filters, pagination } = splitQuery(
    req,
    UserFilterableFields,
    UserPaginationFields,
  );
  const result = await UserService.getAllUsers(filters, pagination as never);
  return ok("Customers fetched successfully", result.data, result.meta);
});

const getFavoriteDishOptions = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);
  const options = await UserService.getFavoriteDishOptions();
  return ok("Favourite dishes", options);
});

const getUserById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, ANY_STAFF);
  const { id } = await params;
  const result = await UserService.getUserById(assertObjectId(id, "customer id"));
  return ok("Customer fetched successfully", result);
});

const adminUpdateUser = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CAN_WRITE);
  const { id } = await params;
  const body = await parseBody(req, adminUpdateUserSchema);
  const user = await UserService.adminUpdateUser(
    assertObjectId(id, "customer id"),
    body,
  );
  return ok(
    body.status === "blocked"
      ? "Customer blocked"
      : body.status === "active"
        ? "Customer unblocked"
        : "Customer updated successfully",
    user,
  );
});

/** OTP/লগইন ব্লক তুলে দেওয়া — কাস্টমার আটকে গেলে সাপোর্ট এটাই ব্যবহার করে */
const unblockUser = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CAN_WRITE);
  const { id } = await params;
  const { user } = await UserService.getUserById(assertObjectId(id, "customer id"));
  const result = await clearBlocks(user.phone);
  return ok("Login block removed for this number", result);
});

const deleteUser = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, ["superadmin"]);
  const { id } = await params;
  const user = await UserService.deleteUser(assertObjectId(id, "customer id"));
  return ok("Customer deleted successfully", user);
});

export const UserController = {
  requestOtp,
  confirmOtp,
  logout,
  getAuthRules,
  getMe,
  updateMe,
  getMyOrders,
  getMyDishes,
  getAllUsers,
  getFavoriteDishOptions,
  getUserById,
  adminUpdateUser,
  unblockUser,
  deleteUser,
};
