/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "../lib/apiError";
import { getClientIp } from "../lib/getClientIp";
import { sendResponse } from "../lib/sendResponse";
import { connectDB } from "../config/db";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";
import { AdminModel } from "../models/admin.model";
import { limitByIp, RATE_RULES } from "../lib/rateLimit";
import {
  createAdminService,
  loginAdminService,
  getAdminsService,
  getSingleAdminService,
  updateAdminService,
  deleteAdminService,
} from "../services/admin.service";

// ── shared error responder ───────────────────────────────────────────────
const handleError = (err: any) => {
  const status = err instanceof ApiError ? err.statusCode : 500;
  if (status >= 500) console.error("[admin]", err);
  return sendResponse({
    statusCode: status,
    success: false,
    message:
      status >= 500
        ? "Something went wrong on our side. Please try again."
        : (err.message ?? "Something went wrong"),
    // ৪২৯ এর `Retry-After` ক্লায়েন্ট পর্যন্ত পৌঁছায়
    headers: err instanceof ApiError ? err.headers : undefined,
  });
};

/* ==========================================================================
   CREATE — অ্যাডমিন অ্যাকাউন্ট খোলা
   --------------------------------------------------------------------------
   এই দরজাটা আগে সম্পূর্ণ খোলা ছিল। অর্থাৎ ইন্টারনেটের যে কেউ
   `{"admin_role":"superadmin", ...}` পাঠিয়ে নিজের নামে মালিক-পর্যায়ের
   অ্যাকাউন্ট বানিয়ে পুরো ড্যাশবোর্ড দখল করে নিতে পারত। পুরো অ্যাপের
   সবচেয়ে বড় ফাঁক ছিল এটাই।

   এখন দুটো নিয়ম:

     ১. **প্রথম অ্যাকাউন্ট** — ডাটাবেসে একটাও অ্যাডমিন না থাকলে (একদম
        নতুন ইনস্টল) প্রথমজন টোকেন ছাড়াই তৈরি হতে পারে, নাহলে কেউই
        কখনো ঢুকতে পারত না। সে সবসময় `superadmin`। একজন তৈরি হয়ে
        যাওয়ার সাথে সাথেই দরজাটা চিরতরে বন্ধ।

     ২. **এরপর থেকে** — শুধু `superadmin` নতুন অ্যাডমিন বানাতে পারে।
        তাই `admin` বা `viewOnly` কেউ নিজেকে প্রমোশন দিতে পারে না।
   ========================================================================== */
export const createAdmin = async (req: NextRequest) => {
  try {
    await connectDB();

    const existingAdmins = await AdminModel.estimatedDocumentCount();
    const isBootstrap = existingAdmins === 0;

    if (!isBootstrap) {
      const auth = verifyTokenAndRole(req, ["superadmin"]);
      if (!auth.success) {
        return sendResponse({
          statusCode: auth.message.startsWith("Forbidden") ? 403 : 401,
          success: false,
          message: auth.message.startsWith("Forbidden")
            ? "Only the owner account can add a new admin"
            : auth.message,
        });
      }
    }

    const body = await req.json();
    const ip = getClientIp(req);

    const data = await createAdminService(
      {
        ...body,
        // প্রথমজন সবসময় মালিক; বাকিদের রোল superadmin ছাড়া কেউ বসাতে পারে না
        admin_role: isBootstrap ? "superadmin" : body?.admin_role,
      },
      ip,
    );

    return sendResponse({
      statusCode: 201,
      success: true,
      message: "Admin created successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
export const loginAdmin = async (req: NextRequest) => {
  try {
    await connectDB();

    // অ্যাকাউন্ট-ভিত্তিক লক আগে থেকেই আছে, কিন্তু সেটা ইমেইল ধরে কাজ করে।
    // এক IP থেকে অসংখ্য ভিন্ন ইমেইল ধরে ধরে চেষ্টা করাটা তাতে আটকাত না।
    await limitByIp(
      RATE_RULES.login,
      req,
      "Too many login attempts from this device. Please wait a few minutes.",
    );

    const body = await req.json();
    const ip = getClientIp(req);

    const result = await loginAdminService({
      admin_email: body.admin_email,
      admin_password: body.admin_password,
      sendingDeviceIp: ip,
    });

    const response = sendResponse({
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: { access_token: result.access_token },
    }) as NextResponse;

    response.cookies.set("refreshToken", result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return handleError(err);
  }
};

// ── GET ALL ───────────────────────────────────────────────────────────────
export const getAdmins = async (req: NextRequest) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const data = await getAdminsService();
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "All admins fetched successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── GET ONE ───────────────────────────────────────────────────────────────
export const getSingleAdmin = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin", "viewOnly"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const data = await getSingleAdminService(id);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Admin fetched successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────
export const updateAdmin = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const body = await req.json();
    const ip = getClientIp(req);
    const data = await updateAdminService(id, body, ip);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Admin updated successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────
export const deleteAdmin = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    await deleteAdminService(id);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Admin deleted successfully",
      data: null,
    });
  } catch (err: any) {
    return handleError(err);
  }
};
