import { Schema, model, models } from "mongoose";
import { IAdmin, AdminModelType } from "../interfaces/admin.interface";

const blockedIPSchema = new Schema(
  {
    ip: { type: String, required: true },
    expires: { type: Number, required: true },
  },
  { _id: false },
);

const adminSchema = new Schema<IAdmin>(
  {
    admin_name: { type: String, required: true, trim: true },
    admin_email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    admin_phone: { type: String, required: true, unique: true, trim: true },
    admin_password: { type: String, required: true, select: false },
    admin_role: {
      type: String,
      enum: ["superadmin", "admin", "viewOnly"],
      default: "admin",
    },
    admin_ip_address: { type: String },
    login_attempts: { type: Number, default: 0 },
    blockTime: { type: Date, default: null },
    last_attempt: { type: Date, default: null },
    blockedIPs: { type: [blockedIPSchema], default: [] },
  },
  { timestamps: true },
);

export const AdminModel =
  (models.Admin as AdminModelType) || model<IAdmin>("Admin", adminSchema);
