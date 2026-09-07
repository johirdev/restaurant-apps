import { z } from "zod";
import { TABLE_STATUSES } from "../interfaces/table.interface";

/* ==========================================================================
   টেবিল — তৈরি আর আপডেটের নিয়ম
   ========================================================================== */

export const createTableSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Table name is required")
    .max(40, "Table name is too long"),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  image: z.string().trim().optional(),
  image_public_id: z.string().trim().optional(),
  capacity: z.coerce
    .number()
    .int("Seats must be a whole number")
    .min(1, "A table seats at least 1")
    .max(50, "That is too many seats"),
  zone: z.string().trim().max(60, "Zone name is too long").optional(),
  waiter_id: z.string().trim().optional(),
  is_active: z.coerce.boolean().optional(),
  notes: z.string().trim().max(300, "Note is too long").optional(),
});

export const updateTableSchema = createTableSchema.partial().extend({
  status: z.enum(TABLE_STATUSES as [string, ...string[]]).optional(),
});

export const setTableStatusSchema = z.object({
  status: z.enum(TABLE_STATUSES as [string, ...string[]]),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
