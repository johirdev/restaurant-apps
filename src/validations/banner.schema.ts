import { z } from "zod";
import { BANNER_STATUSES } from "../interfaces/banner.interface";

/* ==========================================================================
   ব্যানার — তৈরি আর আপডেটের নিয়ম
   ========================================================================== */

/** `#fff`, `#ffffff`, `var(--color-brand)` বা ফাঁকা — এর বাইরে কিছু নয় */
const colorField = (label: string) =>
  z
    .string()
    .trim()
    .max(60, `${label} is too long`)
    .refine(
      (v) => v === "" || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v) || /^var\(--[a-zA-Z0-9-]+\)$/.test(v),
      `${label} must be a hex colour like #1c1c28, or left empty to use the theme colour`,
    )
    .optional();

export const createBannerSchema = z.object({
  eyebrow: z.string().trim().max(60, "Eyebrow text is too long").optional(),

  title: z
    .string()
    .trim()
    .min(1, "Banner title is required")
    .max(120, "Title is too long"),

  highlight: z.string().trim().max(60, "Highlight text is too long").optional(),
  subtitle: z.string().trim().max(400, "Description is too long").optional(),

  button_label: z.string().trim().max(40, "Button label is too long").optional(),
  button_link: z.string().trim().max(300, "Button link is too long").optional(),

  image: z.string().trim().optional(),
  image_public_id: z.string().trim().optional(),

  bg_color: colorField("Background colour"),
  accent_color: colorField("Accent colour"),
  text_color: colorField("Text colour"),

  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  status: z.enum(BANNER_STATUSES).optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
