import axios from "axios";
import { getApiErrorMessage } from "./apiClient";

/* ==========================================================================
   IMAGE UPLOAD — ছবি আগে Cloudinary তে, তারপর সেই URL ডাটাবেসে
   --------------------------------------------------------------------------
   নিয়মটা সব জায়গায় একই:

     ১. ফাইল যায় POST /api/v1/upload → Cloudinary → { url, public_id }
     ২. পুরোনো ছবি থাকলে সেটা Cloudinary থেকে মুছে ফেলা হয়
     ৩. নতুন URL টা ফর্মে বসে, সেভ করলে ডাটাবেসে যায়

   আগে প্রতিটা কম্পোনেন্ট নিজের মতো করে এই কাজটা লিখত, তাই কোথাও পুরোনো
   ছবি মুছত, কোথাও মুছত না। এখন একটাই জায়গা।
   ========================================================================== */

export interface UploadedImage {
  url: string;
  public_id: string;
}

export const EMPTY_IMAGE: UploadedImage = { url: "", public_id: "" };

/** ছবি কোন ফোল্ডারে যাবে — সার্ভারেও ঠিক এই তালিকাটাই যাচাই হয় */
export type UploadFolder =
  | "staff"
  | "users"
  | "tables"
  | "restaurant"
  | "foods"
  | "categories";

export const MAX_IMAGE_MB = 2;

/**
 * বাছাই করা ফাইলটা আদৌ পাঠানোর মতো কিনা।
 * ঠিক থাকলে null, নাহলে মানুষ-পড়ার মতো কারণটা ফেরত দেয়।
 */
export function validateImage(file: File, maxMb = MAX_IMAGE_MB): string | null {
  if (!file.type.startsWith("image/")) return "Only image files are allowed";
  if (file.size > maxMb * 1024 * 1024) return `Image must be under ${maxMb}MB`;
  return null;
}

/** ধাপ ১ — Cloudinary তে পাঠাও */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
): Promise<UploadedImage> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  try {
    // Content-Type হাতে বসাই না — ব্রাউজার নিজেই boundary সহ ঠিকটা বসায়
    const res = await axios.post("/api/v1/upload", fd);
    const { url, public_id } = res.data ?? {};

    if (!url) throw new Error("Upload succeeded but no image URL came back");
    return { url, public_id: public_id || "" };
  } catch (err) {
    // রুট `message` আর `error` দুটোতেই আসল কারণ পাঠায়, তাই এখানে
    // "Cloudinary সেট করা নেই" এর মতো কাজে লাগার বার্তাটাই উঠে আসে
    throw new Error(getApiErrorMessage(err, "Image upload failed"));
  }
}

/**
 * ধাপ ২ — পুরোনো ছবি Cloudinary থেকে সরাও।
 * এটা ব্যর্থ হলেও কাজ আটকানো হয় না: নতুন ছবি ইতিমধ্যেই উঠে গেছে, আর
 * একটা এতিম ফাইলের জন্য ব্যবহারকারীকে এরর দেখানোর মানে নেই।
 */
export async function deleteImage(publicId?: string): Promise<void> {
  if (!publicId) return;
  try {
    await axios.delete("/api/v1/upload", { data: { public_id: publicId } });
  } catch {
    console.warn("Could not delete the old image from Cloudinary:", publicId);
  }
}

/**
 * ধাপ ১ + ২ একসাথে — ফর্মে যেটা দরকার হয়।
 *
 *   const image = await replaceImage(file, "tables", form.image);
 *   setForm((p) => ({ ...p, image }));
 *
 * ফাইল না দিলে আগেরটাই ফেরত আসে, তাই "ছবি বদলাইনি" ক্ষেত্রেও নিরাপদে ডাকা যায়।
 */
export async function replaceImage(
  file: File | null,
  folder: UploadFolder,
  existing: UploadedImage = EMPTY_IMAGE,
): Promise<UploadedImage> {
  if (!file) return existing;

  const uploaded = await uploadImage(file, folder);

  // নতুনটা হাতে আসার পরেই পুরোনোটা মুছি — উল্টো করলে আপলোড ব্যর্থ হলে
  // ব্যবহারকারীর ছবিটাই হারিয়ে যেত
  if (existing.public_id && existing.public_id !== uploaded.public_id) {
    await deleteImage(existing.public_id);
  }

  return uploaded;
}
