/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { verifyTokenAndRole } from "./adminRoleAccess.middlewares";
import { ApiError } from "../lib/apiError";

export type AuthUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  [key: string]: any;
};

/**
 * টোকেন + রোল যাচাই করে, না মিললে সরাসরি ApiError throw করে।
 * `catchAsync` সেটা ধরে সঠিক 401/403 রেসপন্স বানায় — তাই প্রতিটা
 * রুটে আর `if (!auth.success) return NextResponse.json(...)` লিখতে হয় না।
 *
 *   export const GET = catchAsync(async (req) => {
 *     requireRole(req, MANAGER_UP);
 *     ...
 *   });
 */
export function requireRole(req: NextRequest, roles: readonly string[]): AuthUser {
  const result = verifyTokenAndRole(req, roles as string[]);

  if (!result.success) {
    const status = result.message.startsWith("Forbidden") ? 403 : 401;
    throw new ApiError(status, result.message);
  }

  return result.user as AuthUser;
}

/* ==========================================================================
   রোল গ্রুপ
   --------------------------------------------------------------------------
   দুই ধরনের অ্যাকাউন্ট একই টোকেন-ফরম্যাট ব্যবহার করে:
     Admin  → superadmin | admin | viewOnly
     Staff  → manager | chef | waiter | cashier | cleaner
   নিচের গ্রুপগুলো দিয়েই প্রতিটা রুট ঠিক করে কে ঢুকতে পারবে।
   ========================================================================== */

/** ম্যানেজমেন্ট — দোকানের নিয়ম, স্টাফ, মেনু, সেটিংস বদলাতে পারে */
export const MANAGER_UP = ["superadmin", "admin", "manager"] as const;

/** রান্নাঘরের স্ক্রিন — শেফ নিজের টিকিট নিজে সামলায় */
export const KITCHEN = ["superadmin", "admin", "manager", "chef"] as const;

/** কাউন্টার / POS — টাকা নেওয়া আর অর্ডার তোলার অধিকার */
export const CASHIER_UP = [
  "superadmin",
  "admin",
  "manager",
  "cashier",
  "waiter",
] as const;

/** ফ্লোরের সবাই — অর্ডার দেখতে পারে, নিজের কাজটুকু করতে পারে */
export const FLOOR = [
  "superadmin",
  "admin",
  "manager",
  "chef",
  "waiter",
  "cashier",
] as const;

/** যেকোনো লগ-ইন করা কর্মী — শুধু দেখার রুটে */
export const ANY_STAFF = [
  "superadmin",
  "admin",
  "viewOnly",
  "manager",
  "chef",
  "waiter",
  "cashier",
  "cleaner",
  "staff",
] as const;

/** লেখার অনুমতি আছে এমন রোল — ম্যানেজার এখন এর ভেতরে */
export const CAN_WRITE = MANAGER_UP;

/** শুধু মালিক পর্যায় — মুছে ফেলা, হিসাব রিসেট */
export const OWNER_ONLY = ["superadmin"] as const;
