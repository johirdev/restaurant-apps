import type { OrderStatus } from "../interfaces/order.interfaces";

/* ==========================================================================
   কে কী করতে পারে — একটাই তালিকা
   --------------------------------------------------------------------------
   সার্ভার (কন্ট্রোলার) আর ক্লায়েন্ট (বোতাম দেখানো) দুজনেই ঠিক এই ফাইলটাই
   পড়ে। তাই স্ক্রিনে যে বোতামটা দেখা যায়, সার্ভারও ঠিক সেটাই অনুমোদন করে —
   দুই জায়গায় নিয়ম আলাদা হয়ে যাওয়ার সুযোগ নেই।

   মনে রাখা দরকার: বোতাম লুকানো নিরাপত্তা নয়, সুবিধা। আসল পাহারা সবসময়
   সার্ভারেই — প্রতিটা রুট নিজে এই তালিকা মিলিয়ে দেখে।
   ========================================================================== */

export type Role =
  | "superadmin"
  | "admin"
  | "viewOnly"
  | "manager"
  | "chef"
  | "waiter"
  | "cashier"
  | "cleaner";

/** মালিক পর্যায় — সব দরজা খোলা */
const OWNERS: Role[] = ["superadmin", "admin"];
/** দোকান চালায় */
const MANAGEMENT: Role[] = ["superadmin", "admin", "manager"];

/* ==========================================================================
   অর্ডারের ধাপ — কে কোন ধাপে নিয়ে যেতে পারে
   --------------------------------------------------------------------------
   রেস্টুরেন্টে কাজটা যেভাবে ভাগ হয়, ঠিক সেভাবেই:

     confirmed         ম্যানেজার/ক্যাশিয়ার অর্ডারটা গ্রহণ করে
     preparing, ready  রান্নাঘরের কাজ — শেফ
     served            ওয়েটার টেবিলে দিয়ে আসে
     out_for_delivery  ওয়েটার/ম্যানেজার রাইডারের হাতে দেয়
     delivered         বিল মেটানো — ক্যাশিয়ার/ম্যানেজার
     cancelled         শুধু ম্যানেজার

   ফলে শেফ কখনো কোনো অর্ডার কনফার্ম বা বাতিল করতে পারে না, আর ওয়েটার
   রান্না "হয়ে গেছে" বলতে পারে না।
   ========================================================================== */
export const STATUS_PERMISSIONS: Record<OrderStatus, Role[]> = {
  pending: [...MANAGEMENT, "cashier", "waiter"],
  confirmed: [...MANAGEMENT, "cashier"],
  preparing: [...MANAGEMENT, "chef"],
  ready: [...MANAGEMENT, "chef"],
  served: [...MANAGEMENT, "waiter"],
  out_for_delivery: [...MANAGEMENT, "waiter"],
  delivered: [...MANAGEMENT, "cashier"],
  cancelled: [...MANAGEMENT],
};

export const canSetStatus = (role: string | undefined, status: OrderStatus) =>
  !!role && (STATUS_PERMISSIONS[status] ?? []).includes(role as Role);

/** যে স্ট্যাটাসগুলোতে এই রোল অর্ডার নিতে পারে */
export const allowedStatusesFor = (role: string | undefined): OrderStatus[] =>
  (Object.keys(STATUS_PERMISSIONS) as OrderStatus[]).filter((s) =>
    canSetStatus(role, s),
  );

/* ==========================================================================
   বাকি কাজগুলো
   ========================================================================== */
export const ACTION_PERMISSIONS = {
  /** ড্যাশবোর্ডের হিসাব-নিকাশ, সেটিংস, মেনু, স্টাফ */
  manage_settings: MANAGEMENT,
  manage_menu: MANAGEMENT,
  manage_tables: MANAGEMENT,
  manage_staff: MANAGEMENT,
  manage_customers: MANAGEMENT,
  view_reports: MANAGEMENT,
  manage_admins: OWNERS,

  /** কাউন্টারের কাজ */
  take_order: [...MANAGEMENT, "cashier", "waiter"] as Role[],
  edit_order_items: [...MANAGEMENT, "cashier", "waiter"] as Role[],
  take_payment: [...MANAGEMENT, "cashier"] as Role[],
  give_discount: MANAGEMENT,
  print_invoice: [...MANAGEMENT, "cashier", "waiter"] as Role[],

  /** রান্নাঘর */
  view_kitchen: [...MANAGEMENT, "chef"] as Role[],
  cook_items: [...MANAGEMENT, "chef"] as Role[],

  /** ফ্লোর */
  view_orders: [
    ...MANAGEMENT,
    "cashier",
    "waiter",
    "chef",
    "viewOnly",
  ] as Role[],
  view_tables: [...MANAGEMENT, "cashier", "waiter"] as Role[],
  set_table_status: [...MANAGEMENT, "cashier", "waiter"] as Role[],

  /** ধ্বংসাত্মক */
  delete_order: ["superadmin"] as Role[],
} as const;

export type Action = keyof typeof ACTION_PERMISSIONS;

export const can = (role: string | undefined, action: Action) =>
  !!role && (ACTION_PERMISSIONS[action] as readonly Role[]).includes(role as Role);
