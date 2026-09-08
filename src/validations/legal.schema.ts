import { z } from "zod";
import {
  LEGAL_LANGS,
  LEGAL_SLUGS,
  LEGAL_STATUSES,
  SECTION_ICONS,
  SECTION_STATUSES,
  TEXT_ALIGNS,
} from "../interfaces/legal.interface";

/* ==========================================================================
   আইনি পাতা আপডেটের নিয়ম
   --------------------------------------------------------------------------
   পাতা তৈরি হয় সার্ভিস লেয়ারে নিজে থেকেই (প্রথম ডাকাতেই), তাই এখানে
   শুধু আপডেটের স্কিমা — সবকিছু ঐচ্ছিক, ম্যানেজার যেটুকু পাঠান সেটুকুই বসে।

   ⚠️ `body` আর `intro` এর HTML এখানে যাচাই হয় না, শুধু লম্বায় আটকানো হয়।
   ছাঁকার কাজটা sanitizeHtml করে — সেটা সার্ভিস লেয়ারে, ডাটাবেসে বসার
   ঠিক আগের ধাপে।
   ========================================================================== */

/** CSS এর একটা মান — "18px", "1.8", "#ff0000", "var(--color-brand)" */
const cssValue = z
  .string()
  .trim()
  .max(60, "That value is too long")
  .regex(
    /^$|^[a-zA-Z0-9\s#%.,()\-_/]+$/,
    "Use a plain CSS value like 18px, 1.6 or #d70f64",
  );

/**
 * ঐচ্ছিক enum — এডিটরের সিলেক্ট বক্সে "ডিফল্ট" মানে খালি স্ট্রিং পাঠায়,
 * সেটাকে এখানেই `undefined` করে দেওয়া হয়। তাতে ডাটাবেসে `align: ""`
 * জাতীয় অর্থহীন মান জমে না, আর টাইপটাও ডোমেইন টাইপের সাথে মেলে।
 */
const optionalEnum = <T extends string>(values: readonly T[]) =>
  z
    .union([z.enum(values as unknown as [T, ...T[]]), z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value));

/** এক টুকরো লেখা, দুই ভাষায় */
const localized = (max: number, label: string) =>
  z.object({
    en: z.string().max(max, `English ${label} is too long`).default(""),
    bn: z.string().max(max, `Bangla ${label} is too long`).default(""),
  });

const blockStyleSchema = z.object({
  heading_size: cssValue.optional(),
  heading_color: cssValue.optional(),
  heading_weight: cssValue.optional(),

  body_size: cssValue.optional(),
  body_color: cssValue.optional(),
  line_height: cssValue.optional(),
  letter_spacing: cssValue.optional(),
  align: optionalEnum(TEXT_ALIGNS),

  space_above: cssValue.optional(),
  space_below: cssValue.optional(),

  background: cssValue.optional(),
  accent: cssValue.optional(),
  card: z.boolean().optional(),
  divider: z.boolean().optional(),
});

const sectionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Every section needs an id")
    .max(80, "Section id is too long")
    .regex(
      /^[a-zA-Z0-9][a-zA-Z0-9-]*$/,
      "Section id can use letters, numbers and dashes only",
    ),

  icon: optionalEnum(SECTION_ICONS),

  heading: localized(200, "heading"),
  // একটা সেকশনের লেখা — ৪০ হাজার অক্ষরের বেশি হলে সেটা আর সেকশন নয়
  body: localized(40_000, "text"),

  style: blockStyleSchema.optional(),
  status: z.enum(SECTION_STATUSES).optional(),
});

const themeSchema = z.object({
  accent: cssValue.optional(),
  hero_background: cssValue.optional(),
  hero_ink: cssValue.optional(),
  body_size: cssValue.optional(),
  line_height: cssValue.optional(),
  content_width: cssValue.optional(),
  font: z.enum(["sans", "bengali", "serif"]).optional(),
  show_toc: z.boolean().optional(),
  show_contact: z.boolean().optional(),
  show_print: z.boolean().optional(),
  show_lang_switch: z.boolean().optional(),
});

export const updateLegalPageSchema = z.object({
  title: localized(160, "title").optional(),
  subtitle: localized(300, "subtitle").optional(),
  intro: localized(20_000, "intro").optional(),

  sections: z
    .array(sectionSchema)
    .max(60, "That is a lot of sections — keep it under 60")
    .optional()
    .superRefine((sections, ctx) => {
      if (!sections) return;
      // দুটো সেকশনের `key` এক হলে TOC এর লিংক আর অ্যাংকর মেলে না
      const seen = new Set<string>();
      sections.forEach((section, index) => {
        if (seen.has(section.key)) {
          ctx.addIssue({
            code: "custom",
            path: [index, "key"],
            message: `Two sections share the id "${section.key}"`,
          });
        }
        seen.add(section.key);
      });
    }),

  effective_date: z.coerce.date().optional(),

  contact: z
    .object({
      email: z
        .union([z.literal(""), z.email("That email does not look right")])
        .optional(),
      phone: z.string().trim().max(40, "Phone number is too long").optional(),
      address: localized(300, "address").optional(),
    })
    .optional(),

  seo: z
    .object({
      meta_title: localized(70, "meta title").optional(),
      meta_description: localized(200, "meta description").optional(),
    })
    .optional(),

  theme: themeSchema.optional(),

  default_lang: z.enum(LEGAL_LANGS).optional(),
  status: z.enum(LEGAL_STATUSES).optional(),
});

/** URL এর `:slug` — তিনটের বাইরে কিছু হলে সরাসরি 400 */
export const legalSlugSchema = z.enum(LEGAL_SLUGS);

export type UpdateLegalPageInput = z.infer<typeof updateLegalPageSchema>;
