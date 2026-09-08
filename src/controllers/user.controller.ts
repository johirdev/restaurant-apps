import { NextRequest } from "next/server";
import { UserService } from "../services/user.service";
import {
  sendRegisterOtp,
  registerWithOtp,
  loginWithPassword,
  changePassword,
  clearBlocks,
  AUTH_RULES,
} from "../services/auth.service";
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
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
} from "../validations/user.schema";
import {
  UserFilterableFields,
  UserPaginationFields,
} from "../interfaces/user.interfaces";

type IdCtx = { params: Promise<{ id: string }> };

/* ==========================================================================
   PUBLIC — সাইনআপ ধাপ ১: নম্বরে OTP পাঠাও
   POST /api/v1/users/otp/send   { "phone": "01712345678" }
   ========================================================================== */
const requestOtp = catchAsync(async (req: NextRequest) => {
  const { phone } = await parseBody(req, sendOtpSchema);
  const result = await sendRegisterOtp(phone, getClientIp(req));

  return ok("We sent a code to your number. Enter it to finish signing up.", result);
});

/* ==========================================================================
   PUBLIC — সাইনআপ ধাপ ২: কোড + পাসওয়ার্ড = অ্যাকাউন্ট
   POST /api/v1/users/register  { "phone", "code", "password", "name"? }
   ========================================================================== */
const register = catchAsync(async (req: NextRequest) => {
  const payload = await parseBody(req, registerSchema);
  const result = await registerWithOtp(payload, getClientIp(req));

  // টোকেন httpOnly কুকিতে যায় — XSS হলেও জাভাস্ক্রিপ্ট এটা পড়তে পারবে না
  return sendResponse({
    statusCode: 201,
    success: true,
    message: "Welcome! Your account is ready.",
    data: {
      user: result.user,
      is_new_user: result.is_new_user,
      profile_complete: result.profile_complete,
      token: result.token,
    },
    headers: { "Set-Cookie": userCookie(result.token) },
  });
});

/* ==========================================================================
   PUBLIC — লগইন: নম্বর + পাসওয়ার্ড
   POST /api/v1/users/login   { "phone": "...", "password": "..." }
   ========================================================================== */
const login = catchAsync(async (req: NextRequest) => {
  const { phone, password } = await parseBody(req, loginSchema);
  const result = await loginWithPassword(phone, password, getClientIp(req));

  return sendResponse({
    statusCode: 200,
    success: true,
    message: "Logged in successfully",
    data: {
      user: result.user,
      profile_complete: result.profile_complete,
      token: result.token,
    },
    headers: { "Set-Cookie": userCookie(result.token) },
  });
});

/* ==========================================================================
   কাস্টমার — পাসওয়ার্ড বদল
   PATCH /api/v1/users/me/password  { "current_password", "new_password" }
   ========================================================================== */
const updateMyPassword = catchAsync(async (req: NextRequest) => {
  const auth = requireUser(req);
  const { current_password, new_password } = await parseBody(
    req,
    changePasswordSchema,
  );
  const result = await changePassword(auth.id, current_password, new_password);
  return ok("Password updated successfully", result);
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

/* --------------------------------------------------------------------------
   যাচাই-না-হওয়া অ্যাকাউন্ট
   GET    /api/v1/users/unverified  → কয়টা আছে (বাটনে সংখ্যাটা দেখানোর জন্য)
   DELETE /api/v1/users/unverified  → সবগুলো একসাথে মুছে দেয়
   -------------------------------------------------------------------------- */
const getUnverifiedCount = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);
  const result = await UserService.countUnverifiedUsers();
  return ok("Unverified customers counted", result);
});

const deleteUnverifiedUsers = catchAsync(async (req: NextRequest) => {
  requireRole(req, ["superadmin"]);
  const result = await UserService.purgeUnverifiedUsers();
  return ok(
    result.deleted
      ? `${result.deleted} unverified customer${result.deleted === 1 ? "" : "s"} deleted`
      : "No unverified customers to delete",
    result,
  );
});

const deleteUser = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, ["superadmin"]);
  const { id } = await params;
  const user = await UserService.deleteUser(assertObjectId(id, "customer id"));
  return ok("Customer deleted successfully", user);
});

export const UserController = {
  requestOtp,
  register,
  login,
  updateMyPassword,
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
  getUnverifiedCount,
  deleteUnverifiedUsers,
  deleteUser,
};
