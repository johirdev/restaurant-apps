import { NextRequest } from "next/server";
import { OrderService } from "../services/order.service";
import { ok, created } from "../lib/sendResponse";
import {
  catchAsync,
  parseBody,
  splitQuery,
  assertObjectId,
  getQuery,
} from "../lib/apiHandler";
import { ApiError, BadRequest } from "../lib/apiError";
import { canSetStatus } from "../config/permissions";
import { getClientIp } from "../lib/getClientIp";
import { limitByIp, RATE_RULES } from "../lib/rateLimit";
import { businessDayKey } from "../lib/businessTime";
import { LedgerService } from "../services/ledger.service";
import {
  requireRole,
  ANY_STAFF,
  CAN_WRITE,
  CASHIER_UP,
  FLOOR,
  KITCHEN,
  OWNER_ONLY,
  type AuthUser,
} from "../middlewares/requireAuth";
import { optionalUser } from "../middlewares/requireUser";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  updatePaymentSchema,
  addOrderItemsSchema,
  updateOrderItemSchema,
  setItemReadySchema,
  assignOrderSchema,
  setDiscountSchema,
  seatOrderSchema,
  purgeOrdersSchema,
} from "../validations/order.schema";
import { bulkDeleteSchema } from "../validations/bulkDelete.schema";
import {
  OrderFilterableFields,
  OrderPaginationFields,
  OrderStatus,
  type IOrderStaffRef,
} from "../interfaces/order.interfaces";

type IdCtx = { params: Promise<{ id: string }> };

/** লগ-ইন করা কর্মীর পরিচয় — অর্ডারের ইতিহাসে আর বিলে এটাই বসে */
const asStaffRef = (user: AuthUser): IOrderStaffRef => ({
  id: user.id ? String(user.id) : undefined,
  name: user.name || user.email || "staff",
  role: user.role,
});

/* ==========================================================================
   PUBLIC — কাস্টমার অর্ডার দেয়
   POST /api/v1/orders
   ========================================================================== */
const createOrder = catchAsync(async (req: NextRequest) => {
  /**
   * অর্ডার বসানো সবচেয়ে দামি কাজগুলোর একটা — মেনু পড়া, দাম হিসাব,
   * ডকুমেন্ট লেখা। তাই স্ক্রিপ্ট যেন এক IP থেকে হাজারটা ভুয়া অর্ডার
   * ছুঁড়ে রান্নাঘর আর ডাটাবেস দুটোই ভরিয়ে দিতে না পারে।
   * (আসল কাস্টমারের জন্য নিচের ৩ মিনিটের বিরতিই যথেষ্ট; এটা তার উপরের ঢাল।)
   */
  await limitByIp(RATE_RULES.orderCreate, req);

  const payload = await parseBody(req, createOrderSchema);

  // লগইন করা থাকলে অর্ডারটা তার অ্যাকাউন্টের সাথে জুড়ে যায় — গেস্টও অর্ডার করতে পারে
  const user = await optionalUser(req);

  const order = await OrderService.createOrder(
    // ওয়েব থেকে ছাড় দেওয়ার সুযোগ নেই — নাহলে যে কেউ নিজের বিল কমিয়ে ফেলত
    { ...payload, discount: 0 },
    {
      ip: getClientIp(req),
      source: "web",
      user_id: user?.id,
    },
  );

  return created("Order placed successfully", order);
});

/* ==========================================================================
   POS — কাউন্টার / ওয়েটারের হাতে তোলা অর্ডার
   POST /api/v1/orders/pos
   ========================================================================== */
const createPosOrder = catchAsync(async (req: NextRequest) => {
  const user = requireRole(req, CASHIER_UP);
  const payload = await parseBody(req, createOrderSchema);

  const order = await OrderService.createOrder(payload, {
    ip: getClientIp(req),
    source: "pos",
    taken_by: asStaffRef(user),
  });

  return created("Order created successfully", order);
});

/* ==========================================================================
   ADMIN — অর্ডার লিস্ট
   GET /api/v1/orders?status=pending&searchTerm=017&page=1&limit=20
   ========================================================================== */
const getAllOrders = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);

  const { filters, pagination } = splitQuery(
    req,
    OrderFilterableFields,
    OrderPaginationFields,
  );

  const result = await OrderService.getAllOrders(filters, pagination as never);

  return ok("Orders fetched successfully", result.data, {
    ...result.meta,
    totalAmount: result.totalAmount,
  });
});

/* ==========================================================================
   ADMIN — একটা অর্ডারের বিস্তারিত
   ========================================================================== */
const getOrderById = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, ANY_STAFF);
  const { id } = await params;

  const order = await OrderService.getOrderById(assertObjectId(id, "order id"));
  return ok("Order fetched successfully", order);
});

/* ==========================================================================
   PUBLIC — কাস্টমার নিজের অর্ডার ট্র্যাক করে
   GET /api/v1/orders/track?order_number=ORD-260907-0001&phone=01712345678
   ========================================================================== */
const trackOrder = catchAsync(async (req: NextRequest) => {
  // নম্বর + ফোন দুটোই লাগে বলে অনুমান করা কঠিন, তবু অসীমবার চেষ্টা
  // করতে দিলে শেষ পর্যন্ত মিলে যেত। তাই চেষ্টার সংখ্যা বাঁধা।
  await limitByIp(
    RATE_RULES.track,
    req,
    "Too many tracking attempts. Please wait a few minutes.",
  );

  const { order_number, phone } = getQuery(req);

  if (!order_number?.trim() || !phone?.trim()) {
    throw BadRequest("Both order_number and phone are required to track an order");
  }

  const order = await OrderService.trackOrder(order_number, phone);
  return ok("Order found", order);
});

/* ==========================================================================
   PUBLIC — পরের অর্ডার কখন দেওয়া যাবে
   GET /api/v1/orders/cooldown?phone=01712345678
   --------------------------------------------------------------------------
   চেকআউট পেজ এটা ডেকে লাইভ কাউন্টডাউন দেখায়, তাই কাস্টমার "Place order"
   চেপে ৪২৯ খাওয়ার আগেই জানতে পারে আর কতক্ষণ বাকি।

   এখানে কোনো গোপন তথ্য নেই — যে নম্বর জানে সে নিজের অর্ডারের অবস্থাই
   দেখে। তবু অসীমবার ডেকে "এই নম্বরটা কি সম্প্রতি অর্ডার দিয়েছে" জেনে
   ফেলা ঠেকাতে সীমা বসানো।
   ========================================================================== */
const getCooldown = catchAsync(async (req: NextRequest) => {
  await limitByIp(RATE_RULES.track, req);

  const { phone } = getQuery(req);
  if (!phone?.trim()) throw BadRequest("phone is required");

  const user = await optionalUser(req);
  const status = await OrderService.getCooldown(phone.trim(), user?.id);

  return ok("Cooldown status", status);
});

/* ==========================================================================
   ADMIN — স্ট্যাটাস বদল
   PATCH /api/v1/orders/:id/status   { "status": "confirmed" }
   --------------------------------------------------------------------------
   ফ্লোরের সবাই পারে: শেফ রান্না শেষ করে `ready`, ওয়েটার টেবিলে দিয়ে `served`।
   ========================================================================== */
const updateStatus = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, FLOOR);
  const { id } = await params;
  const body = await parseBody(req, updateOrderStatusSchema);

  /**
   * ধাপ ধরে ধরে অনুমতি — রান্নাঘর শুধু রান্নার ধাপ, ফ্লোর শুধু পরিবেশনের।
   * এটা ছাড়া শেফও অর্ডার কনফার্ম বা বাতিল করে ফেলতে পারত, ওয়েটারও
   * "রান্না হয়ে গেছে" বলে দিতে পারত।
   */
  if (!canSetStatus(user.role, body.status as OrderStatus)) {
    throw new ApiError(
      403,
      `A ${user.role} cannot move an order to "${body.status.replace(/_/g, " ")}"`,
    );
  }

  const order = await OrderService.updateStatus(
    assertObjectId(id, "order id"),
    body.status as OrderStatus,
    {
      by: user.name || user.email || "staff",
      note: body.note,
      cancelled_reason: body.cancelled_reason,
      staff: asStaffRef(user),
    },
  );

  return ok(`Order marked as ${body.status.replace(/_/g, " ")}`, order);
});

/* ==========================================================================
   KITCHEN — শেফের স্ক্রিন
   ========================================================================== */
const getKitchenQueue = catchAsync(async (req: NextRequest) => {
  const user = requireRole(req, KITCHEN);
  // নিজের আজকের হিসাব দেখানোর জন্য কে দেখছে সেটা জানা দরকার
  const data = await OrderService.getKitchenQueue(
    user.id ? String(user.id) : undefined,
  );
  return ok("Kitchen queue fetched successfully", data);
});

/** PATCH /api/v1/orders/:id/items/ready — একটা পদ হয়ে গেছে */
const setItemReady = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, KITCHEN);
  const { id } = await params;
  const body = await parseBody(req, setItemReadySchema);

  const order = await OrderService.setItemReady(
    assertObjectId(id, "order id"),
    body.index,
    body.is_ready,
    asStaffRef(user),
  );

  return ok(body.is_ready ? "Item marked ready" : "Item put back", order);
});

/* ==========================================================================
   POS — চলতি অর্ডার বদলানো
   ========================================================================== */
const addItems = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, CASHIER_UP);
  const { id } = await params;
  const body = await parseBody(req, addOrderItemsSchema);

  const order = await OrderService.addItems(
    assertObjectId(id, "order id"),
    body.items,
    asStaffRef(user),
  );

  return ok("Items added to the order", order);
});

const updateItem = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, CASHIER_UP);
  const { id } = await params;
  const body = await parseBody(req, updateOrderItemSchema);

  const order = await OrderService.updateItem(
    assertObjectId(id, "order id"),
    body.index,
    body.quantity,
    asStaffRef(user),
  );

  return ok(body.quantity === 0 ? "Item removed" : "Item updated", order);
});

/** ছাড় দেওয়া — শুধু ম্যানেজার/অ্যাডমিন */
const setDiscount = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, CAN_WRITE);
  const { id } = await params;
  const body = await parseBody(req, setDiscountSchema);

  const order = await OrderService.setDiscount(
    assertObjectId(id, "order id"),
    body.discount,
    asStaffRef(user),
  );

  return ok("Discount applied", order);
});

/**
 * POST /api/v1/orders/:id/seat — সারি থেকে টেবিলে বসানো
 * টেবিল বসানো + কনফার্ম একসাথে, তাই ব্যস্ত সময়ে এক ক্লিকেই কাজ শেষ
 */
const seatOrder = catchAsync<IdCtx>(async (req, { params }) => {
  const user = requireRole(req, CASHIER_UP);
  const { id } = await params;
  const { table_id } = await parseBody(req, seatOrderSchema);

  const order = await OrderService.seatOrder(
    assertObjectId(id, "order id"),
    assertObjectId(table_id, "table id"),
    asStaffRef(user),
  );

  return ok(`Seated at ${order.table_name}`, order);
});

/** ওয়েটার / শেফ / টেবিল বসানো */
const assign = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CAN_WRITE);
  const { id } = await params;
  const body = await parseBody(req, assignOrderSchema);

  const order = await OrderService.assign(assertObjectId(id, "order id"), body);
  return ok("Order updated successfully", order);
});

/* ==========================================================================
   ADMIN — পেমেন্ট আপডেট
   ========================================================================== */
const updatePayment = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CASHIER_UP);
  const { id } = await params;
  const body = await parseBody(req, updatePaymentSchema);

  const order = await OrderService.updatePayment(assertObjectId(id, "order id"), body);
  return ok("Payment updated successfully", order);
});

/** POST /api/v1/orders/:id/invoice — ছাপা হলো, গুনে রাখি */
const markInvoicePrinted = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, CASHIER_UP);
  const { id } = await params;
  const order = await OrderService.markInvoicePrinted(
    assertObjectId(id, "order id"),
  );
  return ok("Invoice printed", order);
});

/* ==========================================================================
   ADMIN — অর্ডার মুছে ফেলা (শুধু superadmin)
   ========================================================================== */
const deleteOrder = catchAsync<IdCtx>(async (req, { params }) => {
  requireRole(req, OWNER_ONLY);
  const { id } = await params;

  const order = await OrderService.deleteOrder(assertObjectId(id, "order id"));
  return ok("Order deleted successfully", order);
});

/* ==========================================================================
   ADMIN — চেকবক্সে বাছা অর্ডারগুলো একসাথে মুছে ফেলা (শুধু superadmin)
   POST /api/v1/orders/bulk-delete   { "ids": ["...", "..."] }
   --------------------------------------------------------------------------
   অনুমতি একটা অর্ডার মোছার মতোই — মালিক ছাড়া কেউ নয়। একসাথে অনেকগুলো
   বলে নিয়ম আলগা হয় না, বরং ক্ষতির আকারটাই বড়।
   ========================================================================== */
const bulkDeleteOrders = catchAsync(async (req: NextRequest) => {
  requireRole(req, OWNER_ONLY);

  const { ids } = await parseBody(req, bulkDeleteSchema);
  const result = await OrderService.deleteManyOrders(ids);

  return ok(
    result.deleted
      ? `${result.deleted} order${result.deleted === 1 ? "" : "s"} deleted successfully`
      : "None of those orders are here any more",
    result,
  );
});

/* ==========================================================================
   ADMIN — ড্যাশবোর্ড স্ট্যাট
   GET /api/v1/orders/stats
   ========================================================================== */
const getStats = catchAsync(async (req: NextRequest) => {
  requireRole(req, ANY_STAFF);
  const stats = await OrderService.getStats();
  return ok("Order stats fetched successfully", stats);
});

/* ==========================================================================
   হিসাবের খাতা আর আর্কাইভ — মালিকের নিজের হাতের কাজ
   ========================================================================== */

/**
 * GET /api/v1/orders/ledger?from=2026-01-01&to=2026-12-31
 * বছরের হিসাবও এতে ৩৬৫টা সারির যোগ — লক্ষ লক্ষ অর্ডার স্ক্যান নয়।
 */
const getLedger = catchAsync(async (req: NextRequest) => {
  requireRole(req, CAN_WRITE);

  const { from, to, series } = getQuery(req);
  const today = businessDayKey();
  // কিছু না দিলে চলতি মাসের হিসাব
  const fromDay = from?.trim() || `${today.slice(0, 7)}-01`;
  const toDay = to?.trim() || today;

  const [summary, daily] = await Promise.all([
    LedgerService.summarize(fromDay, toDay),
    series === "false" ? Promise.resolve([]) : LedgerService.dailySeries(fromDay, toDay),
  ]);

  return ok("Ledger fetched successfully", { ...summary, daily });
});

/**
 * POST /api/v1/orders/maintenance — পুরোনো অর্ডার সরানো
 * { "older_than_days": 90, "dry_run": true }
 *
 * `dry_run` দিয়ে আগে দেখে নেওয়া যায় কয়টা সরবে, তারপর সত্যি করা যায়।
 * হিসাব খাতায় আর বিবরণ আর্কাইভে থেকেই যায় — কিছু হারায় না।
 */
const runMaintenance = catchAsync(async (req: NextRequest) => {
  requireRole(req, OWNER_ONLY);

  const body = await parseBody(req, purgeOrdersSchema);
  const result = await LedgerService.purgeOldOrders(body.older_than_days, {
    dryRun: body.dry_run,
    batch: body.batch,
  });

  return ok(
    body.dry_run
      ? `${result.scanned} closed orders are older than ${result.older_than_days} days`
      : `${result.deleted} old orders moved out of the live table`,
    result,
  );
});

export const OrderController = {
  seatOrder,
  createOrder,
  getCooldown,
  getLedger,
  runMaintenance,
  createPosOrder,
  getAllOrders,
  getOrderById,
  trackOrder,
  getKitchenQueue,
  setItemReady,
  addItems,
  updateItem,
  setDiscount,
  assign,
  updateStatus,
  updatePayment,
  markInvoicePrinted,
  deleteOrder,
  bulkDeleteOrders,
  getStats,
};
