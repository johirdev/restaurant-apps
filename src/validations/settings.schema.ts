import { z } from "zod";

/* ==========================================================================
   সেটিংস আপডেট — সব ফিল্ডই ঐচ্ছিক, যেটা পাঠানো হয় সেটাই বদলায়
   ========================================================================== */

const percent = z.coerce
  .number()
  .min(0, "Cannot be negative")
  .max(100, "Cannot be more than 100%");

const amount = z.coerce.number().min(0, "Cannot be negative").max(1_000_000);

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
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
