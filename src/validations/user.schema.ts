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

export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters long`)
  .max(PASSWORD_MAX, "Password is too long");

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "The code is 6 digits");

/** অ্যাকাউন্ট খোলার আগে নম্বরে কোড পাঠানো */
export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

/** অ্যাকাউন্ট তৈরি — কোড মিললে পাসওয়ার্ডটা সেট হয়ে যায় */
export const registerSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  password: passwordSchema,
  name: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(60, "Name is too long")
    .optional(),
});

/** লগইন — এখানে পাসওয়ার্ডের দৈর্ঘ্য যাচাই করি না, শুধু ফাঁকা কিনা দেখি */
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password"),
});

/** পাসওয়ার্ড বদল — পুরোনো অ্যাকাউন্টে পাসওয়ার্ড না থাকলে current লাগে না */
export const changePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: passwordSchema,
});

/** পাসওয়ার্ড ভুলে গেছি — ধাপ ১: নম্বরে রিসেট কোড চাওয়া */
export const forgotPasswordSchema = z.object({
  phone: phoneSchema,
});

/** পাসওয়ার্ড ভুলে গেছি — ধাপ ২: কোডটা মিলিয়ে দেখা */
export const verifyResetOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

/**
 * পাসওয়ার্ড ভুলে গেছি — ধাপ ৩: টিকিট দেখিয়ে নতুন পাসওয়ার্ড।
 * ৬ ডিজিটের কোডটা এখানে আর যায় না; ধাপ ২ সেটা পুড়িয়ে বদলে এই
 * এক-বারের টিকিটটা দিয়ে দেয়।
 */
export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  reset_token: z
    .string()
    .trim()
    .min(20, "This reset link has expired. Please ask for a new code.")
    .max(200),
  password: passwordSchema,
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
