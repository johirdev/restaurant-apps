import { NextRequest } from "next/server";
import { ContactMessageController } from "@/src/controllers/contactMessage.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — পড়া / আর্কাইভ করা */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return ContactMessageController.updateMessageStatus(req, ctx);
}

/** DELETE — বার্তাটা একেবারে মুছে ফেলা */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return ContactMessageController.deleteMessage(req, ctx);
}
