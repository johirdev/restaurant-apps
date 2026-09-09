import { NextRequest } from "next/server";
import { UserService } from "../services/user.service";
import {
  sendRegisterOtp,
  registerWithOtp,
  loginWithPassword,
  changePassword,
  sendResetOtp,
  verifyResetOtp,
  resetPasswordWithTicket,
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
import { limitByIp, RATE_RULES } from "../lib/rateLimit";
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
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  adminUpdateUserSchema,
} from "../validations/user.schema";
import { bulkDeleteSchema } from "../validations/bulkDelete.schema";
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
  // প্রতিটা OTP তে টাকা লাগে। নম্বর-ভিত্তিক সীমা `auth.service` এ আগে
  // থেকেই আছে, কিন্তু এক IP থেকে হাজারটা ভিন্ন নম্বরে SMS পাঠিয়ে
  // বিল বাড়িয়ে দেওয়াটা সেটা আটকাত না।
  await limitByIp(
    RATE_RULES.otp,
    req,
    "Too many code requests from this device. Please try again later.",
  );

  const { phone } = await parseBody(req, sendOtpSchema);
  const result = await sendRegisterOtp(phone, getClientIp(req));

  return ok("We sent a code to your number. Enter it to finish signing up.", result);
});

/* ==========================================================================
   PUBLIC — সাইনআপ ধাপ ২: কোড + পাসওয়ার্ড = অ্যাকাউন্ট
   POST /api/v1/users/register  { "phone", "code", "password", "name"? }
   ========================================================================== */
const register = catchAsync(async (req: NextRequest) => {
  // এক IP থেকে ভুয়া অ্যাকাউন্টের বন্যা ঠেকায়
  await limitByIp(RATE_RULES.register, req);

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
  // নম্বর-ভিত্তিক লক আগে থেকেই আছে (`auth.service`), কিন্তু এক IP থেকে
  // নম্বরের পর নম্বর ধরে চেষ্টা করাটা সেটা আটকাত না
  await limitByIp(
    RATE_RULES.login,
    req,
    "Too many login attempts from this device. Please wait a few minutes.",
  );

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
  const auth = await requireUser(req);
  const { current_password, new_password } = await parseBody(
    req,
    changePasswordSchema,
  );
  const { token, ...result } = await changePassword(
    auth.id,
    current_password,
    new_password,
  );

  // পাসওয়ার্ড বদলানোয় বাকি সব যন্ত্রের সেশন বাতিল হয়ে গেছে; এই যন্ত্রটাকে
  // নতুন প্রজন্মের কুকি দিয়ে দিই, নাহলে সে নিজেই বেরিয়ে যেত
  return sendResponse({
    statusCode: 200,
    success: true,
    message: "Password updated. You are still signed in on this device.",
    data: result,
    headers: { "Set-Cookie": userCookie(token) },
  });
});

/* ==========================================================================
   PUBLIC — পাসওয়ার্ড ভুলে গেছি, ধাপ ১: নম্বরে কোড পাঠাও
   POST /api/v1/users/password/forgot   { "phone": "01712345678" }
   ========================================================================== */
const forgotPassword = catchAsync(async (req: NextRequest) => {
  await limitByIp(RATE_RULES.otp, req);

  const { phone } = await parseBody(req, forgotPasswordSchema);
  const result = await sendResetOtp(phone, getClientIp(req));

  return ok(
    "We sent a reset code to your number. Enter it to set a new password.",
    result,
  );
});

/* ==========================================================================
   PUBLIC — পাসওয়ার্ড ভুলে গেছি, ধাপ ২: কোডটা মিলিয়ে দেখা
   POST /api/v1/users/password/verify   { "phone", "code" }

   কোডটা এখানেই পুড়ে যায় আর বদলে অল্প সময়ের একটা টিকিট ফেরত আসে —
   ধাপ ৩ এ ঐ টিকিটটাই নতুন পাসওয়ার্ডের সাথে যায়।
   ========================================================================== */
const verifyResetCode = catchAsync(async (req: NextRequest) => {
  // ৬ ডিজিটের কোড অনুমান করার চেষ্টা — চেষ্টার সংখ্যাটাই আসল পাহারা
  await limitByIp(RATE_RULES.passwordReset, req);

  const payload = await parseBody(req, verifyResetOtpSchema);
  const result = await verifyResetOtp(payload, getClientIp(req));

  return ok("Code verified. Now choose a new password.", result);
});

/* ==========================================================================
   PUBLIC — পাসওয়ার্ড ভুলে গেছি, ধাপ ৩: টিকিট দেখিয়ে নতুন পাসওয়ার্ড
   POST /api/v1/users/password/reset   { "phone", "reset_token", "password" }

   টোকেন ফেরত যায় না — গ্রাহক নতুন পাসওয়ার্ড দিয়ে একবার লগইন করে,
   তাতেই নিশ্চিত হয় পাসওয়ার্ডটা তার মনে আছে।
   ========================================================================== */
const resetPassword = catchAsync(async (req: NextRequest) => {
  await limitByIp(RATE_RULES.passwordReset, req);

  const payload = await parseBody(req, resetPasswordSchema);
  const result = await resetPasswordWithTicket(payload, getClientIp(req));

  return ok("Your password has been changed. Please log in with it.", result);
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
  const auth = await requireUser(req);
  const user = await UserService.getMe(auth.id);
  return ok("Profile fetched successfully", user);
});

const updateMe = catchAsync(async (req: NextRequest) => {
  const auth = await requireUser(req);
  const payload = await parseBody(req, updateProfileSchema);
  const user = await UserService.updateMe(auth.id, payload);
  return ok("Profile updated successfully", user);
});

const getMyOrders = catchAsync(async (req: NextRequest) => {
  const auth = await requireUser(req);
  const { pagination } = splitQuery(req, [], UserPaginationFields);
  const result = await UserService.getMyOrders(
    auth.id,
    auth.phone,
    pagination as never,
  );
  return ok("Your orders", result.data, result.meta);
});

const getMyDishes = catchAsync(async (req: NextRequest) => {
  const auth = await requireUser(req);
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

/* --------------------------------------------------------------------------
   POST /api/v1/users/bulk-delete   { "ids": ["...", "..."] }
   কাস্টমার টেবিলে চেকবক্সে বাছা অ্যাকাউন্টগুলো একসাথে মুছে ফেলা।
   অনুমতি একজনকে মোছার মতোই — মালিক ছাড়া কেউ নয়।
   -------------------------------------------------------------------------- */
const bulkDeleteUsers = catchAsync(async (req: NextRequest) => {
  requireRole(req, ["superadmin"]);

  const { ids } = await parseBody(req, bulkDeleteSchema);
  const result = await UserService.deleteManyUsers(ids);

  return ok(
    result.deleted
      ? `${result.deleted} customer${result.deleted === 1 ? "" : "s"} deleted successfully`
      : "None of those customers are here any more",
    result,
  );
});

export const UserController = {
  requestOtp,
  register,
  login,
  updateMyPassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
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
  bulkDeleteUsers,
};
