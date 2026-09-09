// src/app/api/v1/contact/bulk-delete/route.ts
import { NextRequest } from "next/server";
import { ContactMessageController } from "@/src/controllers/contactMessage.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/contact/bulk-delete   { "ids": ["...", "..."] }
 * ইনবক্সে বাছা বার্তাগুলো একসাথে মোছে (ম্যানেজার বা তার উপরে)।
 */
export async function POST(req: NextRequest) {
  return ContactMessageController.bulkDeleteMessages(req);
}

export async function DELETE(req: NextRequest) {
  return ContactMessageController.bulkDeleteMessages(req);
}
