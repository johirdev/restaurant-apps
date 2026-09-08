import { z } from "zod";
import { CONTACT_TOPICS } from "../interfaces/contactMessage.interface";

/* ==========================================================================
   CONTACT ফর্মের যাচাই
   --------------------------------------------------------------------------
   একই স্কিমা দুই জায়গায় চলে — ব্রাউজারে react-hook-form এর resolver
   হিসেবে, আর সার্ভারে `parseBody` তে। তাই একটাই নিয়ম, দুই জায়গাতেই
   একই এরর বার্তা; ব্রাউজারের যাচাই ফাঁকি দিয়ে কিছু পাঠালেও সার্ভার
   সেটা ঠিক একই ভাবে আটকায়।
   ========================================================================== */

export const createContactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please tell us your name")
    .max(80, "That name is too long"),

  email: z.email("Enter a valid email address").max(120),

  // ফোন ঐচ্ছিক — কেউ শুধু ইমেইলে উত্তর চাইতেই পারে
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[\d+\-\s()]*$/, "Use digits only")
    .optional()
    .or(z.literal("")),

  topic: z.enum(CONTACT_TOPICS as [string, ...string[]]).default("general"),

  subject: z.string().trim().max(140, "Keep the subject short").optional().or(z.literal("")),

  message: z
    .string()
    .trim()
    .min(10, "A few more words, please")
    .max(2000, "That message is a bit too long"),

  /**
   * মধুর ফাঁদ (honeypot) — ফর্মে মাঠটা চোখে দেখা যায় না, তাই মানুষ কখনো
   * এটা ভরে না। বট সব মাঠ ভরে দেয় বলে এখানে কিছু থাকলেই বোঝা যায়
   * বার্তাটা মানুষের নয়। ক্যাপচার ঝামেলা ছাড়াই বেশিরভাগ স্প্যাম আটকায়।
   */
  website: z.string().max(0, "Spam detected").optional().or(z.literal("")),
});

/**
 * `topic` এর একটা ডিফল্ট আছে, তাই স্কিমার "ঢোকার" আর "বেরোনোর" টাইপ
 * এক নয় — ফর্মে topic না থাকলেও চলে, যাচাইয়ের পরে সেটা সবসময় থাকে।
 * react-hook-form এই দুটো আলাদা করেই চায়, তাই দুটোই রপ্তানি করা হলো।
 */
export type CreateContactMessageInput = z.input<typeof createContactMessageSchema>;
export type CreateContactMessagePayload = z.output<typeof createContactMessageSchema>;

/** ইনবক্সে অবস্থা বদলানো — ম্যানেজার পড়া/আর্কাইভ করে */
export const updateContactMessageSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});
