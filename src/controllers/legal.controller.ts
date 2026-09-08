import { NextRequest } from "next/server";
import { LegalService } from "../services/legal.service";
import { ok } from "../lib/sendResponse";
import { catchAsync } from "../lib/apiHandler";
import { BadRequest, NotFound } from "../lib/apiError";
import {
  requireRole,
  MANAGER_UP,
  OWNER_ONLY,
} from "../middlewares/requireAuth";
import { parseBody } from "../lib/apiHandler";
import {
  legalSlugSchema,
  updateLegalPageSchema,
} from "../validations/legal.schema";
import type { LegalSlug } from "../interfaces/legal.interface";

/* ==========================================================================
   আইনি পাতা — কন্ট্রোলার স্তর
   --------------------------------------------------------------------------
   ভিডিও ব্লগের মতোই ভাগ: পড়া পাবলিক, লেখা ম্যানেজমেন্টের হাতে।
   পার্থক্য একটাই — খসড়া (draft) পাতা পাবলিক GET এ আসে না, কিন্তু
   লগ-ইন করা ম্যানেজার সেটাও দেখতে পান (এডিটরের প্রিভিউয়ের জন্য দরকার)।
   ========================================================================== */

type SlugCtx = { params: Promise<{ slug: string }> };

/** URL এর slug যাচাই — তিনটের বাইরে কিছু হলে সরাসরি 400 */
const readSlug = (raw: string): LegalSlug => {
  const parsed = legalSlugSchema.safeParse(raw);
  if (!parsed.success) {
    throw BadRequest("That page does not exist", [
      { path: "slug", message: "Use privacy, terms or refund" },
    ]);
  }
  return parsed.data;
};

/**
 * GET /api/v1/legal
 * তিনটে পাতার পুরো কনটেন্ট একসাথে — ড্যাশবোর্ডের এডিটর এটাই ডাকে।
 */
const getAllPages = catchAsync(async (req: NextRequest) => {
  requireRole(req, MANAGER_UP);
  const pages = await LegalService.getAllForEditor();
  return ok("Legal pages fetched successfully", pages);
});

/**
 * GET /api/v1/legal/:slug
 *   ডিফল্ট       → পাবলিক, শুধু published পাতা আর চালু সেকশন
 *   ?draft=1     → ম্যানেজারের প্রিভিউ, খসড়া পাতাও আসে
 */
const getPage = catchAsync<SlugCtx>(async (req, { params }) => {
  const slug = readSlug((await params).slug);

  if (new URL(req.url).searchParams.get("draft") === "1") {
    requireRole(req, MANAGER_UP);
    const page = await LegalService.getForEditor(slug);
    return ok("Legal page fetched successfully", page);
  }

  const page = await LegalService.getPublicPage(slug);
  if (!page) throw NotFound("That page is not published yet");

  return ok("Legal page fetched successfully", page);
});

/** PATCH /api/v1/legal/:slug — লেখা, সাজ, ভাষা, স্ট্যাটাস সব একসাথে */
const updatePage = catchAsync<SlugCtx>(async (req, { params }) => {
  requireRole(req, MANAGER_UP);
  const slug = readSlug((await params).slug);
  const payload = await parseBody(req, updateLegalPageSchema);
  const page = await LegalService.updatePage(slug, payload);
  return ok("Page saved successfully", page);
});

/**
 * DELETE /api/v1/legal/:slug — মুছে ফেলা নয়, শুরুর খসড়ায় ফিরিয়ে নেওয়া।
 * পাতাটা সাইটের আইনি পাতা, তাই এটা কখনো একেবারে না-থাকা অবস্থায় যায় না।
 * অন্যের লেখা পুরোটা মুছে দেওয়া বড় ক্ষমতা — তাই শুধু মালিক।
 */
const resetPage = catchAsync<SlugCtx>(async (req, { params }) => {
  requireRole(req, OWNER_ONLY);
  const slug = readSlug((await params).slug);
  const page = await LegalService.resetPage(slug);
  return ok("Page reset to the starting draft", page);
});

export const LegalController = {
  getAllPages,
  getPage,
  updatePage,
  resetPage,
};
