import { Document, Types } from "mongoose";

/**
 * ==========================================================================
 * TABLE — রেস্টুরেন্টের টেবিল
 * --------------------------------------------------------------------------
 * `status` হাতে বদলাতে হয় না — অর্ডার খুললে টেবিল `occupied`, বিল মিটলে
 * আবার `free`। ম্যানেজার চাইলে `reserved` বা `cleaning` নিজে বসাতে পারে।
 * ==========================================================================
 */

export type TableStatus = "free" | "occupied" | "reserved" | "cleaning";

export interface ITable {
  /** টেবিলের নাম — "T-01", "Balcony 2" */
  name: string;
  /** ছোট ক্রম নম্বর, ফ্লোর ম্যাপে সাজানোর জন্য */
  sort_order: number;
  image?: string;
  image_public_id?: string;
  /** কতজন বসতে পারে */
  capacity: number;
  /** কোন অংশে — "Ground floor", "Rooftop", "AC zone" */
  zone?: string;

  status: TableStatus;
  /** টেবিলটা যে ওয়েটারের দায়িত্বে */
  waiter_id?: string;
  waiter_name?: string;

  /** এখন যে অর্ডারটা চলছে — বিল মিটলে খালি হয়ে যায় */
  current_order_id?: Types.ObjectId | string | null;
  current_order_number?: string;
  occupied_since?: Date | null;

  is_active: boolean;
  notes?: string;
}

export interface ITableDocument extends ITable, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const TableFilterableFields = [
  "searchTerm",
  "status",
  "zone",
  "waiter_id",
  "is_active",
];

export const TablePaginationFields = ["page", "limit", "sortBy", "sortOrder"];

export const TABLE_STATUSES: TableStatus[] = [
  "free",
  "occupied",
  "reserved",
  "cleaning",
];
