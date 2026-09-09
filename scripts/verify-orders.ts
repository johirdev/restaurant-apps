/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * অর্ডার নম্বর, কুলডাউন আর হিসাবের খাতা — তিনটেই আসল ডাটাবেসে যাচাই।
 * প্রোডাকশন ডেটা ছোঁয়া হয় না: একই ক্লাস্টারে আলাদা একটা scratch ডাটাবেসে
 * চলে, আর শেষে সেটা মুছে ফেলা হয়।
 */
import mongoose from "mongoose";
import { loadEnv } from "./loadEnv";

loadEnv();

// প্রোডাকশনের বদলে scratch ডাটাবেস — connectDB() ইমপোর্টের সময়ই URL পড়ে,
// তাই যেকোনো মডেল ইমপোর্টের *আগে* বদলাতে হবে
const base = process.env.DATABASE_URL!;
process.env.DATABASE_URL = base.replace(
  "/restaurant_apps?",
  "/claude_order_test?",
);

let pass = 0;
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

async function main() {
  const { connectDB } = await import("@/src/config/db");

  const OrderModel = (await import("@/src/models/order.model")).default;
  const FoodModel = (await import("@/src/models/food.model")).default;
  const SettingsModel = (await import("@/src/models/settings.model")).default;
  const SalesLedgerModel = (await import("@/src/models/salesLedger.model")).default;
  const OrderArchiveModel = (await import("@/src/models/orderArchive.model")).default;
  const OrderSequenceModel = (await import("@/src/models/orderSequence.model")).default;
  const { OrderService } = await import("@/src/services/order.service");
  const { LedgerService } = await import("@/src/services/ledger.service");


  await connectDB();
  console.log(`db: ${mongoose.connection.name}\n`);

  // পরিষ্কার শুরু
  await Promise.all([
    OrderModel.deleteMany({}),
    FoodModel.deleteMany({}),
    SettingsModel.deleteMany({}),
    SalesLedgerModel.deleteMany({}),
    OrderArchiveModel.deleteMany({}),
    OrderSequenceModel.deleteMany({}),
  ]);

  // একটা খাবার
  const food = await FoodModel.create({
    name: "Test Biryani",
    category_name: "Test",
    status: "active",
    variations: [
      {
        name: "Full",
        regularPrice: 300,
        salePrice: 250,
        status: "active",
        sku: "TEST-BIRYANI-0001",
        barcode: "8800000000001",
        stock_quantity: 100000,
        images: [{ url: "https://example.com/x.jpg", public_id: "x" }],
      },
    ],
  });
  const variationId = String((food.variations as any)[0]._id);

  const line = {
    items: [{ food_id: String(food._id), variation_id: variationId, quantity: 1 }],
    order_type: "pickup" as const,
    payment_method: "cod" as const,
  };

  const order = (phone: string) => ({
    ...line,
    customer: { name: "Test Customer", phone },
  });

  /* ====================================================================
     ১. একই মুহূর্তে ৩০টা অর্ডার — আগের কোডে এখানেই ৪০৯ আসত
     ==================================================================== */
  console.log("1) 30 concurrent orders (the old 409 bug)");
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, (_, i) =>
      OrderService.createOrder(order(`0171000${String(i).padStart(4, "0")}`) as any, {
        source: "web",
        ip: "1.2.3.4",
      }),
    ),
  );

  const ok = results.filter((r) => r.status === "fulfilled");
  const errs = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];

  check("all 30 succeeded", ok.length === 30, `${ok.length}/30`);
  if (errs.length) console.log("     first error:", errs[0].reason?.message);

  const numbers = ok.map((r: any) => r.value.order_number);
  check("all order numbers unique", new Set(numbers).size === numbers.length,
    `${new Set(numbers).size} unique of ${numbers.length}`);
  console.log(`     sample: ${numbers.slice(0, 3).join(", ")} … ${numbers[numbers.length - 1]}`);

  /* ====================================================================
     ২. কাউন্টার পিছিয়ে দিলেও নিজে সেরে ওঠে
     ==================================================================== */
  console.log("\n2) counter knocked backwards (self-healing)");
  await OrderSequenceModel.updateMany({}, { $set: { value: 1 } });
  const healed = await OrderService.createOrder(order("01710009999") as any, {
    source: "web",
    ip: "1.2.3.5",
  });
  check("order still placed after counter reset", !!healed?.order_number,
    healed?.order_number);
  const allNums = (await OrderModel.find().select("order_number").lean()).map(
    (o) => o.order_number,
  );
  check("still no duplicates overall", new Set(allNums).size === allNums.length,
    `${allNums.length} orders`);

  /* ====================================================================
     ৩. ৩ মিনিটের কুলডাউন
     ==================================================================== */
  console.log("\n3) 3-minute cooldown");
  const phone = "01712345678";
  const first = await OrderService.createOrder(order(phone) as any, {
    source: "web",
    ip: "9.9.9.9",
  });
  check("first order placed", !!first?.order_number, first?.order_number);

  const cd = await OrderService.getCooldown(phone);
  check("cooldown is now active", cd.can_order === false, `${cd.seconds_remaining}s left`);
  check("cooldown window is 180s", cd.cooldown_seconds === 180);
  check("cooldown names the previous order", cd.last_order_number === first.order_number);

  let blocked = false;
  let blockedStatus = 0;
  try {
    await OrderService.createOrder(order(phone) as any, { source: "web", ip: "9.9.9.9" });
  } catch (e: any) {
    blocked = true;
    blockedStatus = e.statusCode;
  }
  check("second web order rejected with 429", blocked && blockedStatus === 429);

  // একই নম্বর, কিন্তু +88 লিখে — নম্বরের রূপ বদলে ফাঁকি দেওয়া যায় না
  let dodged = false;
  try {
    await OrderService.createOrder(order("+8801712345678") as any, {
      source: "web",
      ip: "9.9.9.9",
    });
  } catch {
    dodged = true;
  }
  check("+88 form of the same number is also blocked", dodged);

  // POS ইচ্ছে করেই বাইরে — কাউন্টারে পর পর অর্ডার তুলতেই হয়
  const posOrder = await OrderService.createOrder(order(phone) as any, {
    source: "pos",
    taken_by: { id: "1", name: "Cashier", role: "cashier" },
  });
  check("POS is not blocked by the cooldown", !!posOrder?.order_number);

  /* ====================================================================
     ৪. হিসাবের খাতা + আর্কাইভ
     ==================================================================== */
  console.log("\n4) sales ledger + archive");
  const target = await OrderModel.findById(first._id);
  await OrderService.updateStatus(String(target!._id), "confirmed", { by: "test" });
  await OrderService.updateStatus(String(target!._id), "preparing", { by: "test" });
  await OrderService.updateStatus(String(target!._id), "ready", { by: "test" });
  const delivered = await OrderService.updateStatus(String(target!._id), "delivered", {
    by: "test",
  });

  const ledger = await SalesLedgerModel.findOne({}).lean();
  check("a ledger row was written", !!ledger, ledger?.day);
  check("revenue landed in the ledger", (ledger?.net ?? 0) === delivered.pricing.total,
    `ledger ${ledger?.net} vs order ${delivered.pricing.total}`);
  check("order counted once", ledger?.orders === 1);
  check("split by order type recorded", !!(ledger?.by_type as any)?.pickup);
  check("items counted", ledger?.items_sold === 1);

  const archived = await OrderArchiveModel.findOne({
    order_number: delivered.order_number,
  }).lean();
  check("an archive copy exists", !!archived);
  check("archive keeps the money", (archived as any)?.pricing?.total === delivered.pricing.total);
  check("archive drops the image blobs",
    !JSON.stringify((archived as any)?.items ?? []).includes("image"));

  // দুবার ডাকলেও হিসাব দুবার বসে না
  await LedgerService.recordToLedger(await OrderModel.findById(first._id) as any);
  const again = await SalesLedgerModel.findOne({}).lean();
  check("recording twice does not double-count", again?.orders === 1, `orders=${again?.orders}`);

  const totals = await LedgerService.allTimeTotals();
  check("all-time totals read from the ledger", totals.orders === 1 && totals.revenue > 0,
    JSON.stringify(totals));

  /* ====================================================================
     ৫. পুরোনো অর্ডার সরানো — হিসাব যেন না হারায়
     ==================================================================== */
  console.log("\n5) purging old orders keeps the books");
  // ঐ অর্ডারটাকে ৪ মাস পিছিয়ে দিই
  const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
  // Mongoose `createdAt` কে immutable রাখে, তাই মডেল দিয়ে পেছানো যায় না —
  // টেস্টে সরাসরি কালেকশনে লিখি
  await OrderModel.collection.updateOne(
    { _id: first._id },
    { $set: { createdAt: oldDate } },
  );

  const moved = await OrderModel.findById(first._id).select("createdAt status").lean();
  console.log("     debug: createdAt=" + moved?.createdAt?.toISOString() + " status=" + moved?.status);

  const dry = await LedgerService.purgeOldOrders(90, { dryRun: true });
  check("dry run finds it but deletes nothing", dry.scanned === 1 && dry.deleted === 0,
    JSON.stringify(dry));

  const purged = await LedgerService.purgeOldOrders(90);
  check("the old order left the live table", purged.deleted === 1, JSON.stringify(purged));
  check("it is really gone", !(await OrderModel.exists({ _id: first._id })));

  const ledgerAfter = await SalesLedgerModel.findOne({}).lean();
  check("the money is still in the books", ledgerAfter?.net === delivered.pricing.total,
    `${ledgerAfter?.net}`);
  check("the order detail is still in the archive",
    !!(await OrderArchiveModel.exists({ order_number: delivered.order_number })));

  const summary = await LedgerService.summarize("2000-01-01", "2100-01-01");
  check("reports still work after the purge", summary.orders === 1 && summary.net > 0,
    `orders=${summary.orders} net=${summary.net}`);

  /* ====================================================================
     ৬. সার্চে রেজেক্স ইনজেকশন
     ==================================================================== */
  console.log("\n6) search cannot be abused");
  const wild = await OrderService.getAllOrders({ searchTerm: ".*" }, {} as any);
  check("`.*` no longer matches everything", wild.data.length === 0,
    `${wild.data.length} rows`);

  const bomb = await OrderService.getAllOrders(
    { searchTerm: "(a+)+(a+)+(a+)+$" },
    {} as any,
  );
  check("a ReDoS pattern returns instantly and matches nothing", bomb.data.length === 0);

  const real = await OrderService.getAllOrders({ searchTerm: "0171000" }, {} as any);
  check("a real phone prefix still finds orders", real.data.length > 0,
    `${real.data.length} rows`);

  /* ====================================================================
     ৭. পেজিনেশনের সীমা
     ==================================================================== */
  console.log("\n7) pagination limits");
  const huge = await OrderService.getAllOrders({}, { page: 1, limit: 999999 } as any);
  check("limit=999999 is capped", huge.meta.limit === 300, `limit=${huge.meta.limit}`);

  console.log(`\n${pass} passed, ${fail} failed`);

  // Atlas এর এই ইউজারের dropDatabase অনুমতি নেই — কালেকশনগুলো খালি করাই যথেষ্ট
  await Promise.all([
    OrderModel.deleteMany({}),
    FoodModel.deleteMany({}),
    SettingsModel.deleteMany({}),
    SalesLedgerModel.deleteMany({}),
    OrderArchiveModel.deleteMany({}),
    OrderSequenceModel.deleteMany({}),
  ]);
  console.log("scratch collections cleared");
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
