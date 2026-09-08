/* eslint-disable @typescript-eslint/no-explicit-any */
import cloudinary from "@/src/config/cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { verifyTokenAndRole } from "@/src/middlewares/adminRoleAccess.middlewares";
import { optionalUser } from "@/src/middlewares/requireUser";
import { ANY_STAFF } from "@/src/middlewares/requireAuth";
import { connectDB } from "@/src/config/db";

// Buffer/streams নিয়ে কাজ করতে হলে Node.js runtime বাধ্যতামূলক
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

const MISSING_CONFIG_MESSAGE =
  "Image upload is not set up yet — add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env, then restart the server.";

/** ৫ মেগাবাইটের বেশি ছবি কোথাও দরকার নেই — ক্লায়েন্টেও চেক আছে, এটা শেষ পাহারা */
const MAX_BYTES = 5 * 1024 * 1024;

/** যেসব ফোল্ডারে ছবি রাখা যায় — ইচ্ছেমতো নাম দিয়ে যেন কেউ ছড়িয়ে না ফেলে */
const ALLOWED_FOLDERS = new Set([
  "staff",
  "users",
  "tables",
  "restaurant",
  "foods",
  "categories",
  "banners",
  "videos",
  "reviews",
]);

/**
 * ছবি তোলার অনুমতি কার আছে:
 *   - লগ-ইন করা যেকোনো কর্মী (স্টাফ ছবি, টেবিল, মেনু, লোগো)
 *   - লগ-ইন করা কাস্টমার (শুধু নিজের প্রোফাইল ছবি)
 * আগে এই রুট একদম খোলা ছিল — যে কেউ আপনার Cloudinary কোটা শেষ করে
 * দিতে পারত, তাই সেটা বন্ধ করা হলো।
 */
async function whoIsUploading(
  req: NextRequest,
): Promise<{ ok: boolean; isStaff: boolean }> {
  const staff = verifyTokenAndRole(req, ANY_STAFF as unknown as string[]);
  if (staff.success) return { ok: true, isStaff: true };

  // কাস্টমারের সেশনটা ডাটাবেসেও মিলিয়ে দেখা হয় (ব্লক করা হয়েছে কিনা,
  // পাসওয়ার্ড বদলে গেছে কিনা) — এই রুটটা `catchAsync` ব্যবহার করে না,
  // তাই কানেকশনটা এখানে নিজেই নিশ্চিত করতে হয়
  await connectDB();

  const customer = await optionalUser(req);
  if (customer) return { ok: true, isStaff: false };

  return { ok: false, isStaff: false };
}

/** এরর সবসময় `error` আর `message` দুটোতেই — পুরোনো কল সাইট `error` পড়ে,
 *  নতুনগুলো `getApiErrorMessage()` দিয়ে `message` পড়ে */
const fail = (message: string, status: number) =>
  NextResponse.json({ success: false, error: message, message }, { status });

export async function POST(req: NextRequest) {
  try {
    const auth = await whoIsUploading(req);
    if (!auth.ok) {
      return fail("Please log in before uploading an image", 401);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const requested = String(formData.get("folder") || "staff");

    if (!file) return fail("No file provided", 400);

    if (!file.type?.startsWith("image/")) {
      return fail("Only image files are allowed", 400);
    }

    if (file.size > MAX_BYTES) {
      return fail("Image must be under 5MB", 400);
    }

    // কাস্টমার শুধু দুই জায়গায় ছবি তুলতে পারে — নিজের প্রোফাইল আর নিজের
    // রিভিউ। বাকি সব ফোল্ডার কর্মীদের।
    const CUSTOMER_FOLDERS = new Set(["users", "reviews"]);
    const folder = auth.isStaff
      ? ALLOWED_FOLDERS.has(requested)
        ? requested
        : "staff"
      : CUSTOMER_FOLDERS.has(requested)
        ? requested
        : "users";

    if (!hasCloudinaryConfig()) {
      // ৫০০ নয় — এটা সার্ভারের ভুল নয়, কনফিগারেশন এখনো হয়নি
      return fail(MISSING_CONFIG_MESSAGE, 503);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    try {
      const result: any = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder }, (err, result) =>
            err ? reject(err) : resolve(result),
          )
          .end(buffer);
      });

      // `url` আর `public_id` উপরের স্তরেই থাকে — পুরোনো কল সাইটগুলো
      // (Staff, Categories, FoodCreate) ঠিক এই দুটো কী-ই পড়ে
      return NextResponse.json({
        success: true,
        message: "Uploaded to Cloudinary",
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      return fail(
        err?.message || err?.error?.message || "Cloudinary upload failed",
        502,
      );
    }
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return fail(err instanceof Error ? err.message : "Upload failed", 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await whoIsUploading(req);
    if (!auth.ok) {
      return fail("Please log in before deleting an image", 401);
    }

    const { public_id } = await req.json();
    if (!public_id) return fail("public_id required", 400);

    if (!hasCloudinaryConfig()) {
      return fail(MISSING_CONFIG_MESSAGE, 503);
    }

    const result = await cloudinary.uploader.destroy(public_id);

    return NextResponse.json({
      success: true,
      message: "Deleted from Cloudinary",
      result,
    });
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    return fail(err instanceof Error ? err.message : "Delete failed", 500);
  }
}
