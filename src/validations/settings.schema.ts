import { z } from "zod";

/* ==========================================================================
   সেটিংস আপডেট — সব ফিল্ডই ঐচ্ছিক, যেটা পাঠানো হয় সেটাই বদলায়
   ========================================================================== */

const percent = z.coerce
  .number()
  .min(0, "Cannot be negative")
  .max(100, "Cannot be more than 100%");

const amount = z.coerce.number().min(0, "Cannot be negative").max(1_000_000);

/** ঐচ্ছিক লেখা — ফাঁকা স্ট্রিং মানে "মুছে ফেলো", তাই সেটাও বৈধ */
const text = (max: number) => z.string().trim().max(max).optional();

/** সোশ্যাল প্রোফাইলের লিংক — ফাঁকা নয়তো http(s) URL */
const socialUrl = z
  .union([z.literal(""), z.url("Enter a full link starting with https://")])
  .optional();

/**
 * ম্যানেজার সাধারণত গুগল ম্যাপ থেকে আস্ত `<iframe …>` কপি করে আনে।
 * পুরো ট্যাগটা রেখে দিলে সেটা পাতায় বসানো যেত না (আমরা নিজেরাই iframe
 * বানাই), তাই এখানেই `src` টা ছেঁকে নেওয়া হয় — ম্যানেজারকে HTML বুঝতে
 * হয় না, আর ডাটাবেসে কখনো কাঁচা HTML ঢোকে না।
 *
 * এরপর শুধু গুগলের embed URL-ই গ্রহণ করা হয়; অন্য কোনো সাইটের ফ্রেম
 * বসিয়ে দেওয়ার সুযোগ রাখা হয়নি।
 */
const mapEmbed = z
  .string()
  .trim()
  .transform((value) => {
    const fromIframe = value.match(/src=["']([^"']+)["']/i);
    return (fromIframe ? fromIframe[1] : value).trim();
  })
  .refine(
    (value) => value === "" || /^https:\/\/(www\.)?google\.com\/maps\/embed/i.test(value),
    "Paste the embed code (or its link) from Google Maps → Share → Embed a map",
  )
  .optional();

export const updateSettingsSchema = z.object({
  restaurant_name: z
    .string()
    .trim()
    .min(2, "Restaurant name is required")
    .max(80, "Name is too long")
    .optional(),
  logo: z.string().trim().optional(),
  logo_public_id: z.string().trim().optional(),
  address: z.string().trim().max(300, "Address is too long").optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email address")]).optional(),
  vat_reg_no: z.string().trim().max(40).optional(),

  currency: z.string().trim().min(1).max(4).optional(),
  currency_code: z.string().trim().min(2).max(4).optional(),

  tax_mode: z.enum(["exclusive", "inclusive"]).optional(),
  vat_percent: percent.optional(),
  service_charge_percent: percent.optional(),
  service_charge_dine_in_only: z.coerce.boolean().optional(),

  order_types: z
    .array(z.enum(["delivery", "pickup", "dine_in"]))
    .min(1, "Keep at least one way of taking orders")
    .optional(),
  payment_methods: z
    .array(z.enum(["cod", "bkash", "nagad", "card"]))
    .min(1, "Keep at least one payment method")
    .optional(),

  delivery_fee: amount.optional(),
  free_delivery_above: amount.optional(),
  min_order_amount: amount.optional(),

  avg_prep_minutes: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 minute")
    .max(240, "That is too long")
    .optional(),
  order_prefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,6}$/, "Use 2–6 letters, e.g. ORD")
    .optional(),

  invoice_footer: z.string().trim().max(200, "Footer is too long").optional(),
  invoice_show_staff: z.coerce.boolean().optional(),

  tagline: text(60),

  /* ---------------- সোশ্যাল মিডিয়া ---------------- */
  socials: z
    .object({
      facebook: socialUrl,
      instagram: socialUrl,
      youtube: socialUrl,
      x: socialUrl,
      tiktok: socialUrl,
      linkedin: socialUrl,
      // হোয়াটসঅ্যাপ লিংক নয় — শুধু নম্বর, লিংকটা সাইট নিজেই বানায়
      whatsapp: z.string().trim().max(24).optional(),
    })
    .optional(),

  /* ---------------- খোলার সময় ---------------- */
  opening_hours: z
    .array(
      z.object({
        day: z.coerce.number().int().min(0).max(6),
        open: z
          .string()
          .trim()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 10:00"),
        close: z
          .string()
          .trim()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time, e.g. 23:00"),
        closed: z.coerce.boolean(),
      }),
    )
    .length(7, "All seven days are needed")
    .optional(),

  /* ---------------- About পাতা ---------------- */
  about: z
    .object({
      eyebrow: text(60),
      headline: text(140),
      intro: text(600),
      cover_image: text(500),

      story_title: text(140),
      story: text(4000),
      story_image: text(500),
      founded_year: text(12),

      chef_name: text(80),
      chef_title: text(80),
      chef_quote: text(600),
      chef_image: text(500),

      highlights: z
        .array(
          z.object({
            icon: z.string().trim().max(24),
            title: z.string().trim().max(80),
            text: z.string().trim().max(240),
          }),
        )
        .max(8, "Eight cards is plenty")
        .optional(),

      stats: z
        .array(
          z.object({
            value: z.string().trim().max(16),
            label: z.string().trim().max(60),
          }),
        )
        .max(6)
        .optional(),

      milestones: z
        .array(
          z.object({
            year: z.string().trim().max(12),
            title: z.string().trim().max(80),
            text: z.string().trim().max(240),
          }),
        )
        .max(10)
        .optional(),

      gallery: z.array(z.string().trim().max(500)).max(12).optional(),
    })
    .optional(),

  /* ---------------- Contact পাতা ---------------- */
  contact: z
    .object({
      eyebrow: text(60),
      headline: text(140),
      intro: text(600),
      response_note: text(240),
      reservation_phone: text(40),
      map_embed: mapEmbed,
      map_link: z.union([z.literal(""), z.url("Enter a full link")]).optional(),
    })
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
