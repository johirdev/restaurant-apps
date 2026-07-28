/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "../lib/apiError";
import { sendResponse } from "../lib/sendResponse";
import { connectDB } from "../config/db";
import { verifyTokenAndRole } from "../middlewares/adminRoleAccess.middlewares";
import {
  createStaffService,
  loginStaffService,
  getStaffsService,
  getSingleStaffService,
  updateStaffService,
  deleteStaffService,
} from "../services/staff.service";

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
export const createStaff = async (req: NextRequest) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const body = await req.json();
    const data = await createStaffService(body);
    return sendResponse({
      statusCode: 201,
      success: true,
      message: "Staff created successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
export const loginStaff = async (req: NextRequest) => {
  try {
    await connectDB();
    const body = await req.json();

    const result = await loginStaffService({
      staff_email: body.staff_email,
      staff_password: body.staff_password,
    });

    const response = sendResponse({
      statusCode: 200,
      success: true,
      message: "Login successful",
      data: { access_token: result.access_token },
    }) as NextResponse;

    response.cookies.set("staffRefreshToken", result.refresh_token, {
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
export const getStaffs = async (req: NextRequest) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin", "viewOnly"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const data = await getStaffsService();
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "All staff fetched successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── GET ONE ───────────────────────────────────────────────────────────────
export const getSingleStaff = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin", "viewOnly"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const data = await getSingleStaffService(id);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Staff fetched successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── UPDATE ────────────────────────────────────────────────────────────────
export const updateStaff = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    const body = await req.json();
    const data = await updateStaffService(id, body);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Staff updated successfully",
      data,
    });
  } catch (err: any) {
    return handleError(err);
  }
};

// ── DELETE ────────────────────────────────────────────────────────────────
export const deleteStaff = async (req: NextRequest, id: string) => {
  const auth = verifyTokenAndRole(req, ["superadmin", "admin"]);
  if (!auth.success)
    return sendResponse({
      statusCode: 401,
      success: false,
      message: auth.message,
    });

  try {
    await connectDB();
    await deleteStaffService(id);
    return sendResponse({
      statusCode: 200,
      success: true,
      message: "Staff deleted successfully",
      data: null,
    });
  } catch (err: any) {
    return handleError(err);
  }
};
