import { z } from "zod";
import { normalizeBdPhone } from "../lib/phone";
import { BD_DISTRICTS, BD_DIVISION_NAMES } from "../config/bd-locations";

/* ==========================================================================
   ইউজার — একই স্কিমা সার্ভার আর প্রোফাইল ফর্ম দুই জায়গায় ব্যবহার হয়
   ========================================================================== */

export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?88)?01[3-9]\d{8}$/,
    "Enter a valid Bangladeshi mobile number (e.g. 01712345678)",
  )
  .transform(normalizeBdPhone);

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "The code is 6 digits"),
});

/** প্রোফাইল আপডেট — সব ফিল্ডই ঐচ্ছিক, যেটা পাঠানো হয় সেটাই বদলায় */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(60, "Name is too long")
    .optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]).optional(),
  division: z
    .union([z.literal(""), z.enum(BD_DIVISION_NAMES as [string, ...string[]])])
    .optional(),
  district: z
    .union([z.literal(""), z.enum(BD_DISTRICTS as [string, ...string[]])])
    .optional(),
  village: z.string().trim().max(120, "Village name is too long").optional(),
  address: z.string().trim().max(300, "Address is too long").optional(),
  favorite_dishes: z
    .array(z.string().trim().min(1).max(60))
    .max(20, "You can save at most 20 favourite dishes")
    .optional(),
  image: z
    .object({
      url: z.string().trim(),
      public_id: z.string().trim().optional(),
    })
    .optional(),
});

/** অ্যাডমিন ইউজারকে ব্লক/আনব্লক করে, নোট লিখতে পারে */
export const adminUpdateUserSchema = z.object({
  status: z.enum(["active", "blocked"]).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
