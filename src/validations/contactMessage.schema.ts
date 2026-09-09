import { z } from "zod";
import { CONTACT_TOPICS } from "../interfaces/contactMessage.interface";
import { countWords, hasLink, NO_LINK_MESSAGE } from "../lib/textGuard";

/**
 * বার্তার সীমা। শব্দের হিসাবটা অতিথিকে বলার জন্য — "৫০০ শব্দের মধ্যে
 * লিখুন" বোঝা "৪০০০ অক্ষর" এর চেয়ে সহজ। অক্ষরের সীমাটা তার উপরে
 * জালের কাজ করে: একটাই বিশাল "শব্দ" পাঠিয়ে শব্দ-গণনা ফাঁকি দেওয়ার
 * সুযোগ থাকে না।
 */
export const MESSAGE_WORD_LIMIT = 500;
export const MESSAGE_CHAR_LIMIT = 4000;

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
    .max(MESSAGE_CHAR_LIMIT, "That message is a bit too long")
    .refine(
      (v) => countWords(v) <= MESSAGE_WORD_LIMIT,
      `Please keep your message within ${MESSAGE_WORD_LIMIT} words`,
    )
    /**
     * ইনবক্সে লিংক গুঁজে দেওয়াই স্প্যামারের আসল উদ্দেশ্য — honeypot আর
     * থ্রটল বটের সংখ্যা কমায়, কিন্তু যেটা ঢোকে তার ভেতরের লিংক আটকায়
     * না। তাই বার্তায় কোনো লিংকই নেওয়া হয় না; দরকারি কথা সাদা কথায়
     * লিখলেই চলে, আর ম্যানেজারকেও অচেনা লিংকে ক্লিকের ঝুঁকি নিতে হয় না।
     */
    .refine((v) => !hasLink(v), NO_LINK_MESSAGE),

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
