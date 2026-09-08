/* ==========================================================================
   কে কোন স্ক্রিন দেখবে
   --------------------------------------------------------------------------
   সার্ভারে প্রতিটা রুট নিজেই রোল যাচাই করে (requireAuth.ts)। এই ফাইলটা
   শুধু UI এর জন্য — যে পাতায় ঢোকার অনুমতি নেই সেটা সাইডবারে দেখানোই হয় না।
   নিরাপত্তা এখান থেকে আসে না, সুবিধা আসে।
   ========================================================================== */

export type DashboardRole =
  | "superadmin"
  | "admin"
  | "viewOnly"
  | "manager"
  | "chef"
  | "waiter"
  | "cashier"
  | "cleaner";

/** সব কিছুর মালিক */
export const OWNERS: DashboardRole[] = ["superadmin", "admin"];

/** দোকান চালায় — মেনু, স্টাফ, টেবিল, সেটিংস, রিপোর্ট */
export const MANAGEMENT: DashboardRole[] = ["superadmin", "admin", "manager"];

/** কাউন্টারে টাকা নেয় / অর্ডার তোলে */
export const COUNTER: DashboardRole[] = [
  "superadmin",
  "admin",
  "manager",
  "cashier",
  "waiter",
];

/** রান্নাঘর */
export const KITCHEN_ROLES: DashboardRole[] = [
  "superadmin",
  "admin",
  "manager",
  "chef",
];

/** ফ্লোরের সবাই — অর্ডার দেখতে পারে */
export const FLOOR_ROLES: DashboardRole[] = [
  "superadmin",
  "admin",
  "manager",
  "cashier",
  "waiter",
  "chef",
];

/** লগ-ইন করা যে কেউ */
export const EVERYONE: DashboardRole[] = [
  "superadmin",
  "admin",
  "viewOnly",
  "manager",
  "chef",
  "waiter",
  "cashier",
  "cleaner",
];

export const can = (role: string | undefined, allowed: DashboardRole[]) =>
  !!role && allowed.includes(role as DashboardRole);

/**
 * শেফ অর্ডারের তালিকা দেখতে পারে, কিন্তু কোনো বোতাম নেই — তার কাজ
 * রান্নাঘরের স্ক্রিনে। ওয়েটার টেবিল আর POS পায়, রান্নাঘর নয়।
 */
export const ORDERS_VIEW: DashboardRole[] = [
  "superadmin",
  "admin",
  "manager",
  "cashier",
  "waiter",
  "chef",
  "viewOnly",
];

/**
 * লগইনের পর কে কোথায় গিয়ে নামবে।
 * শেফকে বিক্রির হিসাব দেখিয়ে লাভ নেই — তাকে সোজা রান্নাঘরের স্ক্রিনে পাঠাই।
 */
export const landingFor = (role: string | undefined): string => {
  if (role === "chef") return "/dashboard/kitchen";
  if (role === "waiter") return "/dashboard/tables";
  if (role === "cashier") return "/dashboard/pos";
  return "/dashboard";
};

/** সাইডবারে রোল অনুযায়ী নাম — উপরে দেখানো হয় */
export const ROLE_LABEL: Record<string, string> = {
  superadmin: "Owner",
  admin: "Admin",
  viewOnly: "View only",
  manager: "Manager",
  chef: "Chef",
  waiter: "Waiter",
  cashier: "Cashier",
  cleaner: "Cleaner",
};
