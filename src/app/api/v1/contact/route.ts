import { NextRequest } from "next/server";
import { ContactMessageController } from "@/src/controllers/contactMessage.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET — ড্যাশবোর্ড ইনবক্স (কর্মীদের জন্য) */
export async function GET(req: NextRequest) {
  return ContactMessageController.getMessages(req);
}

/** POST — /contact ফর্ম, যে কেউ পাঠাতে পারে */
export async function POST(req: NextRequest) {
  return ContactMessageController.createMessage(req);
}
