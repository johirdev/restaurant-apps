/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcrypt";
import { signToken } from "../lib/tokens";
import { ApiError } from "../lib/apiError";
import {
  IAdmin,
  IAdminLogin,
  IBlockedIP,
  ILoginPayload,
} from "../interfaces/admin.interface";
import { AdminModel } from "../models/admin.model";

const BD_PHONE_REGEX = /^01[3-9]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASS_LENGTH = 6;
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MS = 60 * 60 * 1000; // 1 hour
const IP_BLOCK_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── CREATE ────────────────────────────────────────────────────────────────
export const createAdminService = async (
  payload: IAdmin,
  ip: string,
): Promise<Omit<IAdmin, "admin_password">> => {
  const adminEmail = payload.admin_email?.trim().toLowerCase();
  const phone = payload.admin_phone?.trim();
  const name = payload.admin_name?.trim();
  const password = payload.admin_password;
  const role = payload.admin_role?.trim();

  if (!name) throw new ApiError(400, "Name is required");
  if (!adminEmail || !EMAIL_REGEX.test(adminEmail))
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
    AdminModel.findOne({ admin_email: adminEmail }).lean(),
    AdminModel.findOne({ admin_phone: phone }).lean(),
  ]);
  if (emailExists) throw new ApiError(409, "Email already exists");
  if (phoneExists) throw new ApiError(409, "Phone already exists");

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await AdminModel.create({
    admin_name: name,
    admin_email: adminEmail,
    admin_phone: phone,
    admin_password: hashedPassword,
    admin_role: role || "admin",
    admin_ip_address: ip,
  });

  const { admin_password: _pw, ...safeAdmin } = created.toObject();
  return safeAdmin;
};

// ── LOGIN ─────────────────────────────────────────────────────────────────
export const loginAdminService = async (
  payload: ILoginPayload & { sendingDeviceIp: string },
): Promise<IAdminLogin> => {
  const email = payload.admin_email?.trim().toLowerCase();
  const { admin_password, sendingDeviceIp: ip } = payload;

  if (!email || !admin_password)
    throw new ApiError(400, "Email and password are required");

  const user = await AdminModel.findOne({ admin_email: email }).select(
    "+admin_password",
  );
  if (!user) throw new ApiError(404, "Admin not found");

  const now = Date.now();
  const activeIPs: IBlockedIP[] = (user.blockedIPs ?? []).filter(
    (item: any) => item.expires > now,
  );

  if (user.blockTime && user.blockTime > new Date())
    throw new ApiError(
      401,
      `Account locked until ${user.blockTime.toLocaleString()}`,
    );

  if (activeIPs.some((item) => item.ip === ip))
    throw new ApiError(401, "This IP is temporarily blocked");

  const isMatch = await bcrypt.compare(admin_password, user.admin_password);

  if (!isMatch) {
    const attempts = (user.login_attempts ?? 0) + 1;
    const locked = attempts >= MAX_LOGIN_ATTEMPTS;
    const update: Record<string, unknown> = {
      login_attempts: attempts,
      last_attempt: new Date(),
    };

    if (locked) {
      update.blockTime = new Date(Date.now() + ACCOUNT_LOCK_MS);
      if (!activeIPs.some((item) => item.ip === ip))
        activeIPs.push({ ip, expires: now + IP_BLOCK_MS });
      update.blockedIPs = activeIPs;
    }

    await AdminModel.updateOne({ _id: user._id }, { $set: update });
    throw new ApiError(
      401,
      locked
        ? "Account locked due to too many attempts"
        : `Wrong password. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) left.`,
    );
  }

  await AdminModel.updateOne(
    { _id: user._id },
    {
      $set: {
        login_attempts: 0,
        blockTime: null,
        blockedIPs: activeIPs,
        admin_ip_address: ip,
        last_attempt: new Date(),
      },
    },
  );

  // অ্যাডমিনের টোকেন আলাদা চাবিতে সই হয় আর `aud: "admin"` বহন করে —
  // স্টাফের টোকেন দিয়ে অ্যাডমিনের রুটে ঢোকা যায় না
  const access_token = signToken(
    "admin",
    {
      id: String(user._id),
      email: user.admin_email,
      role: user.admin_role,
      name: user.admin_name,
    },
    process.env.JWT_EXPIRES_IN_ADMIN || "1d",
  );

  const refresh_token = signToken(
    "admin",
    { id: String(user._id), role: user.admin_role },
    process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  );

  return { access_token, refresh_token };
};

// ── UPDATE ────────────────────────────────────────────────────────────────
export const updateAdminService = async (
  id: string,
  payload: Partial<IAdmin>,
  ip: string,
): Promise<Omit<IAdmin, "admin_password">> => {
  const admin = await AdminModel.findById(id);
  if (!admin) throw new ApiError(404, "Admin not found");

  const updateData: Record<string, unknown> = {};

  if (payload.admin_name) updateData.admin_name = payload.admin_name.trim();

  if (payload.admin_email) {
    const email = payload.admin_email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) throw new ApiError(400, "Invalid email");
    const exists = await AdminModel.findOne({
      admin_email: email,
      _id: { $ne: id },
    });
    if (exists) throw new ApiError(409, "Email already exists");
    updateData.admin_email = email;
  }

  if (payload.admin_phone) {
    const phone = payload.admin_phone.trim();
    if (!BD_PHONE_REGEX.test(phone))
      throw new ApiError(400, "Invalid phone number");
    const exists = await AdminModel.findOne({
      admin_phone: phone,
      _id: { $ne: id },
    });
    if (exists) throw new ApiError(409, "Phone already exists");
    updateData.admin_phone = phone;
  }

  if (payload.admin_role) {
    if (!["superadmin", "admin", "viewOnly"].includes(payload.admin_role))
      throw new ApiError(400, "Invalid role");
    updateData.admin_role = payload.admin_role;
  }

  if (payload.admin_password) {
    if (payload.admin_password.length < MIN_PASS_LENGTH)
      throw new ApiError(
        400,
        `Password must be at least ${MIN_PASS_LENGTH} characters`,
      );
    updateData.admin_password = await bcrypt.hash(payload.admin_password, 12);
  }

  updateData.admin_ip_address = ip;

  const updated = await AdminModel.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true },
  ).select("-admin_password");

  if (!updated) throw new ApiError(500, "Admin update failed");
  return updated.toObject();
};

// ── GET ALL ───────────────────────────────────────────────────────────────
export const getAdminsService = async () => {
  return AdminModel.find().select("-admin_password").lean();
};

// ── GET ONE ───────────────────────────────────────────────────────────────
export const getSingleAdminService = async (id: string) => {
  const admin = await AdminModel.findById(id).select("-admin_password");
  if (!admin) throw new ApiError(404, "Admin not found");
  return admin.toObject();
};

// ── DELETE ────────────────────────────────────────────────────────────────
export const deleteAdminService = async (id: string) => {
  const admin = await AdminModel.findById(id);
  if (!admin) throw new ApiError(404, "Admin not found");
  await AdminModel.deleteOne({ _id: id });
  return null;
};
