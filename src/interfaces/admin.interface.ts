import { Model } from "mongoose";

export type IBlockedIP = {
  ip: string;
  expires: number;
};

export type IAdmin = {
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  admin_role: string;
  admin_password: string;
  admin_ip_address?: string;
  login_attempts?: number;
  blockTime?: Date | null;
  last_attempt?: Date | null;
  blockedIPs?: IBlockedIP[];
  createdAt?: Date;
  updatedAt?: Date;
};

export type ILoginPayload = {
  admin_email: string;
  admin_password: string;
};

export type IAdminLogin = {
  access_token: string;
  refresh_token: string;
};

export type AdminModelType = Model<IAdmin, Record<string, unknown>>;
