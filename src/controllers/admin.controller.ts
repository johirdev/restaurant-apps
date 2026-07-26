/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "../lib/apiError";
import { getClientIp } from "../lib/getClientIp";
import { sendResponse } from "../lib/sendResponse";
import { connectDB } from "../config/db";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";
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
  return sendResponse({
    statusCode: status,
    success: false,
    message: err.message ?? "Something went wrong",
  });
};

// ── CREATE ────────────────────────────────────────────────────────────────
export const createAdmin = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();
    const ip = getClientIp(req);
    const data = await createAdminService(body, ip);
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
