import { NextRequest } from "next/server";
import { LegalController } from "@/src/controllers/legal.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next.js 15+ : `params` একটা Promise, তাই await করতে হয়
type Params = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Params) {
  return LegalController.getPage(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: Params) {
  return LegalController.updatePage(req, ctx);
}

/** পাতা মুছে যায় না — শুরুর খসড়ায় ফিরে যায় */
export async function DELETE(req: NextRequest, ctx: Params) {
  return LegalController.resetPage(req, ctx);
}
