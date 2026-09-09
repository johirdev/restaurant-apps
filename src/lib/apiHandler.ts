/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { ZodError, ZodType } from "zod";
import { ApiError, BadRequest } from "./apiError";
import { sendResponse } from "./sendResponse";
import { connectDB } from "../config/db";
import { IGenericErrorMassage } from "../utils/GlobalError";
import { queryPick } from "./queryPick";

/* ==========================================================================
   1. GLOBAL ERROR HANDLER
   যেকোনো ধরনের এররকে একটাই কনসিস্টেন্ট JSON শেপে রূপান্তর করে —
   ফ্রন্টএন্ডকে আর কখনো `err.response.data` আন্দাজ করতে হবে না।
   ========================================================================== */
export function handleApiError(err: unknown) {
  /* ---- Zod ভ্যালিডেশন ---- */
  if (err instanceof ZodError) {
    const errorMessages: IGenericErrorMassage[] = err.issues.map((issue) => ({
      path: issue.path.join(".") || "body",
      message: issue.message,
    }));
    return sendResponse({
      statusCode: 400,
      success: false,
      message: errorMessages[0]?.message || "Validation failed",
      errorMessages,
    });
  }

  /* ---- Mongoose স্কিমা ভ্যালিডেশন ---- */
  if (err instanceof mongoose.Error.ValidationError) {
    const errorMessages: IGenericErrorMassage[] = Object.values(err.errors).map(
      (e: any) => ({ path: e.path, message: e.message }),
    );
    return sendResponse({
      statusCode: 400,
      success: false,
      message: errorMessages[0]?.message || "Validation failed",
      errorMessages,
    });
  }

  /* ---- ভুল ObjectId ---- */
  if (err instanceof mongoose.Error.CastError) {
    return sendResponse({
      statusCode: 400,
      success: false,
      message: `Invalid value for "${err.path}"`,
      errorMessages: [{ path: err.path, message: "Invalid id or value" }],
    });
  }

  /* ---- ডুপ্লিকেট key (unique index) ---- */
  if (typeof err === "object" && err !== null && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || "field";
    const pretty = field.split(".").pop();
    return sendResponse({
      statusCode: 409,
      success: false,
      message: `A record with this ${pretty} already exists`,
      errorMessages: [{ path: field, message: "Must be unique" }],
    });
  }

  /* ---- আমাদের নিজের ApiError ---- */
  if (err instanceof ApiError) {
    return sendResponse({
      statusCode: err.statusCode,
      success: false,
      message: err.message,
      errorMessages: err.errorMessages,
      // ৪২৯ এর `Retry-After` এখান দিয়েই ক্লায়েন্ট পর্যন্ত যায়
      headers: err.headers,
    });
  }

  /* ---- অজানা এরর — লগ করে জেনেরিক মেসেজ পাঠাই (স্ট্যাক লিক করি না) ---- */
  console.error("[API] Unhandled error:", err);
  const isDev = process.env.NODE_ENV !== "production";
  return sendResponse({
    statusCode: 500,
    success: false,
    message:
      isDev && err instanceof Error
        ? err.message
        : "Something went wrong on our side. Please try again.",
  });
}

/* ==========================================================================
   2. catchAsync — কন্ট্রোলার হ্যান্ডলারের র‍্যাপার
   DB কানেকশন + try/catch দুটোই এক জায়গায়, তাই প্রতিটা কন্ট্রোলারে
   আর `await connectDB()` আর `try { } catch { }` লিখতে হয় না।
   ========================================================================== */
type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response> | Response;

export function catchAsync<Ctx = undefined>(handler: Handler<Ctx>) {
  // ctx অপশনাল রাখা হয়েছে যাতে ডাইনামিক ({ params }) আর স্ট্যাটিক দুই ধরনের
  // route handler এর টাইপেই এটা সরাসরি বসে যায়।
  return async (req: NextRequest, ctx?: Ctx): Promise<Response> => {
    try {
      await connectDB();
      return await handler(req, ctx as Ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}

/* ==========================================================================
   3. REQUEST HELPERS
   ========================================================================== */

/** JSON body পড়ে zod দিয়ে যাচাই করে — ভুল হলে 400 সহ ফিল্ড-লেভেল এরর */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw BadRequest("Request body must be valid JSON");
  }
  return schema.parse(raw);
}

/** query string → plain object */
export function getQuery(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

/** query string থেকে filter + pagination দুটো আলাদা করে বের করে */
export function splitQuery(
  req: NextRequest,
  filterFields: string[],
  paginationFields: string[] = ["page", "limit", "sortBy", "sortOrder"],
) {
  const query = getQuery(req);
  return {
    filters: queryPick(query, filterFields),
    pagination: queryPick(query, paginationFields) as {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    },
  };
}

/** ObjectId যাচাই — না মিললে সরাসরি 400 throw করে */
export function assertObjectId(id: string, label = "id"): string {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw BadRequest(`Invalid ${label}`, [{ path: label, message: "Not a valid id" }]);
  }
  return id;
}
