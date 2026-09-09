// src/app/api/v1/orders/maintenance/route.ts
import { NextRequest } from "next/server";
import { OrderController } from "@/src/controllers/order.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// পুরোনো অর্ডার সরানো একটু সময় নিতে পারে — Vercel এ সর্বোচ্চ ৫ মিনিট
export const maxDuration = 300;

/**
 * POST /api/v1/orders/maintenance  { "older_than_days": 90, "dry_run": true }
 * শেষ হয়ে যাওয়া পুরোনো অর্ডার চলতি টেবিল থেকে সরিয়ে দেয় (superadmin)।
 * হিসাব দিনের খাতায়, বিবরণ আর্কাইভে — দুটোই থেকে যায়।
 */
export async function POST(req: NextRequest) {
  return OrderController.runMaintenance(req);
}
