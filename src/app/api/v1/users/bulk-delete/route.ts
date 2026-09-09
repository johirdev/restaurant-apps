// src/app/api/v1/users/bulk-delete/route.ts
import { NextRequest } from "next/server";
import { UserController } from "@/src/controllers/user.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/users/bulk-delete   { "ids": ["...", "..."] }
 * কাস্টমার টেবিলে চেকবক্সে বাছা অ্যাকাউন্টগুলো একসাথে মোছে (শুধু superadmin)।
 * বডি সহ DELETE কিছু প্রক্সিতে খালি হয়ে পৌঁছায়, তাই আসল পথ POST।
 */
export async function POST(req: NextRequest) {
  return UserController.bulkDeleteUsers(req);
}

export async function DELETE(req: NextRequest) {
  return UserController.bulkDeleteUsers(req);
}
