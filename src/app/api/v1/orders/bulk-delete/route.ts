// src/app/api/v1/orders/bulk-delete/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/orders/bulk-delete   { "ids": ["...", "..."] }
 * টেবিলে চেকবক্সে বাছা অর্ডারগুলো একসাথে মুছে ফেলে (শুধু superadmin)।
 *
 * বডি সহ কাজটা POST এ রাখা হয়েছে — DELETE রিকোয়েস্টের বডি কিছু প্রক্সি
 * আর CDN পথেই ফেলে দেয়, তখন "ids missing" এর মতো অদ্ভুত এরর আসত।
 * তবু যাদের ক্লায়েন্ট DELETE ই পাঠাতে চায় তাদের জন্য নিচে একই হ্যান্ডলার।
 */
export async function POST(req: NextRequest) {
  return OrderController.bulkDeleteOrders(req);
}

export async function DELETE(req: NextRequest) {
  return OrderController.bulkDeleteOrders(req);
}
