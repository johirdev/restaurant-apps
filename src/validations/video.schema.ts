import { z } from "zod";
import { VIDEO_STATUSES } from "../interfaces/video.interface";
import { isSupportedVideoUrl } from "../lib/videoUrl";

/* ==========================================================================
   ভিডিও ব্লগ — তৈরি আর আপডেটের নিয়ম
   ========================================================================== */

const videoUrlField = z
  .string()
  .trim()
  .min(1, "Video link is required")
  .max(500, "That link is too long")
  .refine(
    isSupportedVideoUrl,
    "Paste a full YouTube, Facebook or TikTok video link. Short TikTok links (vm.tiktok.com/…) do not work — open the video and copy the link from the address bar.",
  );

export const createVideoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Video title is required")
    .max(120, "Title is too long"),

  description: z.string().trim().max(400, "Description is too long").optional(),

  video_url: videoUrlField,

  thumbnail: z.string().trim().optional(),
  thumbnail_public_id: z.string().trim().optional(),

  duration: z.string().trim().max(12, "Duration is too long").optional(),

  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  status: z.enum(VIDEO_STATUSES).optional(),
});

export const updateVideoSchema = createVideoSchema.partial().extend({
  // আপডেটে লিংক না পাঠালেও চলে, পাঠালে সেটাও চেনা প্ল্যাটফর্মের হতে হবে
  video_url: videoUrlField.optional(),
});

export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
