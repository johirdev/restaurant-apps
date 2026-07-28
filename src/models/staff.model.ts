import { Schema, model, models } from "mongoose";
import { IStaff, StaffModelType } from "../interfaces/staff.interface";

const staffSchema = new Schema<IStaff>(
  {
    staff_name: { type: String, required: true, trim: true },
    staff_email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    staff_phone: { type: String, required: true, unique: true, trim: true },
    staff_password: { type: String, required: true, select: false },
    staff_role: {
      type: String,
      enum: ["waiter", "chef", "manager", "cashier", "cleaner"],
      default: "waiter",
    },
    shift: {
      type: String,
      enum: ["morning", "evening", "night"],
      default: "morning",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    staff_image: { type: String, default: "" },
    staff_image_public_id: { type: String, default: "" },
  },
  { timestamps: true },
);

export const StaffModel =
  (models.Staff as StaffModelType) || model<IStaff>("Staff", staffSchema);
