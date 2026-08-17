/* eslint-disable @typescript-eslint/no-explicit-any */
import cloudinary from "@/src/config/cloudinary";
import { NextRequest, NextResponse } from "next/server";

// Buffer/streams নিয়ে কাজ করতে হলে Node.js runtime বাধ্যতামূলক
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") || "staff");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type?.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    // Cloudinary env variables না থাকলে সরাসরি error দেখাবে
    if (!hasCloudinaryConfig) {
      return NextResponse.json(
        {
          error:
            "Cloudinary env variables missing (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET)",
        },
        { status: 500 },
      );
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

      return NextResponse.json({
        success: true,
        message: "Uploaded to Cloudinary",
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (err: any) {
      console.error("Cloudinary upload error:", err);
      return NextResponse.json(
        {
          error:
            err?.message || err?.error?.message || "Cloudinary upload failed",
        },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { public_id } = await req.json();

    if (!public_id) {
      return NextResponse.json(
        { error: "public_id required" },
        { status: 400 },
      );
    }

    const result = await cloudinary.uploader.destroy(public_id);

    return NextResponse.json({
      success: true,
      message: "Deleted from Cloudinary",
      result,
    });
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 },
    );
  }
}
