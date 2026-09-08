/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcrypt";
import { signToken } from "../lib/tokens";
import { ApiError } from "../lib/apiError";
import {
  IStaff,
  ILoginPayload,
  IStaffLogin,
} from "../interfaces/staff.interface";
import { StaffModel } from "../models/staff.model";
import cloudinary from "../config/cloudinary";

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASS_LENGTH = 6;

// ── CREATE ────────────────────────────────────────────────────────────────
export const createStaffService = async (
  payload: IStaff,
): Promise<Omit<IStaff, "staff_password">> => {
  const staffEmail = payload.staff_email?.trim().toLowerCase();
  const phone = payload.staff_phone?.trim();
  const name = payload.staff_name?.trim();
  const password = payload.staff_password;

  if (!name) throw new ApiError(400, "Name is required");
  if (!staffEmail || !EMAIL_REGEX.test(staffEmail))
    throw new ApiError(400, "Valid email is required");
  if (!phone || !BD_PHONE_REGEX.test(phone))
    throw new ApiError(
      400,
      "Invalid Bangladesh phone number. Format: 01[3-9]XXXXXXXX",
    );
  if (!password || password.length < MIN_PASS_LENGTH)
    throw new ApiError(
      400,
      `Password must be at least ${MIN_PASS_LENGTH} characters`,
    );

  const [emailExists, phoneExists] = await Promise.all([
    StaffModel.findOne({ staff_email: staffEmail }).lean(),
    StaffModel.findOne({ staff_phone: phone }).lean(),
  ]);
  if (emailExists) throw new ApiError(409, "Email already exists");
  if (phoneExists) throw new ApiError(409, "Phone already exists");

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await StaffModel.create({
    staff_name: name,
    staff_email: staffEmail,
    staff_phone: phone,
    staff_password: hashedPassword,
    staff_role: payload.staff_role || "waiter",
    shift: payload.shift || "morning",
    status: payload.status || "active",
    staff_image: payload.staff_image || "",
    staff_image_public_id: payload.staff_image_public_id || "",
  });

  const { staff_password: _pw, ...safeStaff } = created.toObject();
  return safeStaff;
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
export const loginStaffService = async (
  payload: ILoginPayload,
): Promise<IStaffLogin> => {
  const email = payload.staff_email?.trim().toLowerCase();
  const { staff_password } = payload;

  if (!email || !staff_password)
    throw new ApiError(400, "Email and password are required");

  const user = await StaffModel.findOne({ staff_email: email }).select(
    "+staff_password",
  );
  if (!user) throw new ApiError(404, "Staff not found");

  if (user.status === "inactive")
    throw new ApiError(401, "This account is inactive. Contact admin.");

  const isMatch = await bcrypt.compare(staff_password, user.staff_password);
  if (!isMatch) throw new ApiError(401, "Wrong password");

  // স্টাফের টোকেন আলাদা চাবিতে, `aud: "staff"` সহ। রান্নাঘরের ট্যাব বা POS
  // টার্মিনাল থেকে এটা বেরিয়ে গেলেও অ্যাডমিনের দরজা বন্ধই থাকে।
  const access_token = signToken(
    "staff",
    {
      id: String(user._id),
      email: user.staff_email,
      role: user.staff_role,
      name: user.staff_name,
    },
    process.env.JWT_EXPIRES_IN_STAFF || "1d",
  );

  const refresh_token = signToken(
    "staff",
    { id: String(user._id), role: user.staff_role },
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  );

  return { access_token, refresh_token };
};

// ── UPDATE ────────────────────────────────────────────────────────────────
export const updateStaffService = async (
  id: string,
  payload: Partial<IStaff>,
): Promise<Omit<IStaff, "staff_password">> => {
  const staff = await StaffModel.findById(id);
  if (!staff) throw new ApiError(404, "Staff not found");

  const updateData: Record<string, unknown> = {};

  if (payload.staff_name) updateData.staff_name = payload.staff_name.trim();

  if (payload.staff_email) {
    const email = payload.staff_email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) throw new ApiError(400, "Invalid email");
    const exists = await StaffModel.findOne({
      staff_email: email,
      _id: { $ne: id },
    });
    if (exists) throw new ApiError(409, "Email already exists");
    updateData.staff_email = email;
  }

  if (payload.staff_phone) {
    const phone = payload.staff_phone.trim();
    if (!BD_PHONE_REGEX.test(phone))
      throw new ApiError(400, "Invalid phone number");
    const exists = await StaffModel.findOne({
      staff_phone: phone,
      _id: { $ne: id },
    });
    if (exists) throw new ApiError(409, "Phone already exists");
    updateData.staff_phone = phone;
  }

  if (payload.staff_role) {
    if (
      !["waiter", "chef", "manager", "cashier", "cleaner"].includes(
        payload.staff_role,
      )
    )
      throw new ApiError(400, "Invalid role");
    updateData.staff_role = payload.staff_role;
  }

  if (payload.shift) {
    if (!["morning", "evening", "night"].includes(payload.shift))
      throw new ApiError(400, "Invalid shift");
    updateData.shift = payload.shift;
  }

  if (payload.status) {
    if (!["active", "inactive"].includes(payload.status))
      throw new ApiError(400, "Invalid status");
    updateData.status = payload.status;
  }

  if (payload.staff_password) {
    if (payload.staff_password.length < MIN_PASS_LENGTH)
      throw new ApiError(
        400,
        `Password must be at least ${MIN_PASS_LENGTH} characters`,
      );
    updateData.staff_password = await bcrypt.hash(payload.staff_password, 12);
  }

  // ── Image replace: নতুন image আসলে পুরনোটা Cloudinary থেকে delete ──
  if (
    payload.staff_image &&
    payload.staff_image !== staff.staff_image &&
    staff.staff_image_public_id
  ) {
    try {
      await cloudinary.uploader.destroy(staff.staff_image_public_id);
    } catch {
      console.warn(
        "Old staff image delete failed:",
        staff.staff_image_public_id,
      );
    }
  }

  if (payload.staff_image !== undefined)
    updateData.staff_image = payload.staff_image;
  if (payload.staff_image_public_id !== undefined)
    updateData.staff_image_public_id = payload.staff_image_public_id;

  const updated = await StaffModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  ).select("-staff_password");

  if (!updated) throw new ApiError(500, "Staff update failed");
  return updated.toObject();
};

// ── GET ALL ───────────────────────────────────────────────────────────────
export const getStaffsService = async () => {
  return StaffModel.find().select("-staff_password").lean();
};

// ── GET ONE ───────────────────────────────────────────────────────────────
export const getSingleStaffService = async (id: string) => {
  const staff = await StaffModel.findById(id).select("-staff_password");
  if (!staff) throw new ApiError(404, "Staff not found");
  return staff.toObject();
};

// ── DELETE ────────────────────────────────────────────────────────────────
export const deleteStaffService = async (id: string) => {
  const staff = await StaffModel.findById(id);
  if (!staff) throw new ApiError(404, "Staff not found");

  // ── Staff delete হলে তার Cloudinary image ও remove করা ──
  if (staff.staff_image_public_id) {
    try {
      await cloudinary.uploader.destroy(staff.staff_image_public_id);
    } catch {
      console.warn("Staff image delete failed:", staff.staff_image_public_id);
    }
  }

  await StaffModel.deleteOne({ _id: id });
  return null;
};
