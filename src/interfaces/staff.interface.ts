import { Model } from "mongoose";

export type StaffRole = "waiter" | "chef" | "manager" | "cashier" | "cleaner";
export type Shift = "morning" | "evening" | "night";
export type Status = "active" | "inactive";

export type IStaff = {
  staff_name: string;
  staff_phone: string;
  staff_email: string;
  staff_password: string;
  staff_role: StaffRole;
  shift: Shift;
  status: Status;
  staff_image?: string;
  staff_image_public_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ILoginPayload = {
  staff_email: string;
  staff_password: string;
};

export type IStaffLogin = {
  access_token: string;
  refresh_token: string;
};

export type StaffModelType = Model<IStaff, Record<string, unknown>>;
