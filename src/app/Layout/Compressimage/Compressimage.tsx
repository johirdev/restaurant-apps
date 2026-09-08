/**
 * compressImage
 * -------------
 * Runs entirely in the browser (canvas), before the file is sent to
 * /api/v1/upload. Solves the "user uploads a 5MB/20MB photo for a small
 * category icon" problem:
 *   1. Downscales to a sane max width/height (never upscales a small image).
 *   2. Re-encodes as JPEG and iteratively lowers quality until the file
 *      is under the target size, so pixel dimensions AND file size are
 *      both kept under control before upload.
 *
 * Usage:
 *   const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, maxSizeKB: 300 });
 *   fd.append("file", compressed);
 */

interface CompressOptions {
  maxWidth?: number; // px, default 800 — plenty for a category card/thumbnail
  maxHeight?: number; // px, default 800
  maxSizeKB?: number; // target output size, default 300KB
  quality?: number; // starting JPEG quality (0-1), default 0.85
  minQuality?: number; // don't go below this even if still too big, default 0.4
}

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    maxSizeKB = 300,
    quality = 0.85,
    minQuality = 0.4,
  } = options;

  // Non-image files, or already-small images, pass through untouched.
  if (!file.type.startsWith("image/")) return file;
  if (file.size <= maxSizeKB * 1024 && file.type !== "image/heic") {
    // Still worth checking pixel dimensions even if the file is small —
    // but for simplicity, small files are left as-is (common case: already
    // an optimized image).
    const dims = await getImageDimensions(file);
    if (dims.width <= maxWidth && dims.height <= maxHeight) {
      return file;
    }
  }

  const imageBitmap = await loadImage(file);

  // Never upscale — only shrink images bigger than the target box.
  let { width, height } = imageBitmap;
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  width = Math.round(width * scale);
  height = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // canvas unsupported — fall back to original

  ctx.drawImage(imageBitmap, 0, 0, width, height);

  let currentQuality = quality;
  let blob = await canvasToBlob(canvas, currentQuality);

  // Step down quality until we're under the size budget or hit the floor.
  while (blob.size > maxSizeKB * 1024 && currentQuality > minQuality) {
    currentQuality -= 0.1;
    blob = await canvasToBlob(canvas, currentQuality);
  }

  const newName =
    file.name.replace(/\.(png|jpe?g|webp|heic|heif|gif)$/i, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}

/* ==========================================================================
   compressImageToRange — ফাইলটাকে একটা নির্দিষ্ট সাইজ-জানালার ভিতরে আনে
   --------------------------------------------------------------------------
   compressImage() শুধু "এর চেয়ে বড় হবে না" দেখে, তাই ৫MB এর ছবি ৩০০KB আর
   ২০KB এর ছবি ২০KB ই থেকে যায়। রিভিউর ছবিতে আমরা চাই সবগুলো একই রকম হালকা
   হোক — তাই এখানে নিচের আর উপরের, দুটো সীমাই মানা হয়:

     ১. সবচেয়ে বড় অনুমোদিত মাপে এঁকে quality 0.95 এ চেষ্টা — এতেই যদি
        maxKB এর নিচে থাকে, ওটাই সেরা (সবচেয়ে পরিষ্কার) ফল।
     ২. না হলে quality নিয়ে বাইনারি সার্চ — maxKB এর নিচে থাকা সবচেয়ে বড়
        quality টা বেছে নেওয়া হয়, ফলে ফাইলটা সাধারণত minKB–maxKB এর ভিতরেই
        পড়ে (৮০KB এর ঠিক নিচে)।
     ৩. সবচেয়ে কম quality তেও যদি maxKB ছাড়িয়ে যায় (বিশাল রেজলিউশনের ছবি),
        পিক্সেল মাপ ছোট করে আবার ১–২ ধাপ চেষ্টা।

   minKB টা "চেষ্টা", প্রতিশ্রুতি নয় — একটা সাদামাটা ছোট ছবি সর্বোচ্চ
   quality তেও ৪০KB হয় না, আর নেই-এমন তথ্য বানিয়ে ফাইল ফোলানোর মানে নেই।
   ========================================================================== */

interface RangeCompressOptions {
  minKB?: number; // কাঙ্ক্ষিত সর্বনিম্ন সাইজ, default 40
  maxKB?: number; // কঠিন সর্বোচ্চ সীমা, default 80
  maxWidth?: number; // px, default 1280
  maxHeight?: number; // px, default 1280
  minQuality?: number; // এর নিচে JPEG quality নামানো হয় না, default 0.3
}

export async function compressImageToRange(
  file: File,
  options: RangeCompressOptions = {},
): Promise<File> {
  const {
    minKB = 40,
    maxKB = 80,
    maxWidth = 1280,
    maxHeight = 1280,
    minQuality = 0.3,
  } = options;

  if (!file.type.startsWith("image/")) return file;

  const maxBytes = maxKB * 1024;
  const minBytes = minKB * 1024;

  const img = await loadImage(file);
  // কখনোই বড় করা হয় না — শুধু বড় ছবিকে বাক্সের ভিতরে আনা
  const fit = Math.min(
    maxWidth / img.naturalWidth,
    maxHeight / img.naturalHeight,
    1,
  );

  let fallback: Blob | null = null;

  // বড় মাপ থেকে ছোট মাপের দিকে — প্রথম যেটা সীমার ভিতরে আসে সেটাই সবচেয়ে ভালো
  for (const step of [1, 0.75, 0.55, 0.4]) {
    const width = Math.max(1, Math.round(img.naturalWidth * fit * step));
    const height = Math.max(1, Math.round(img.naturalHeight * fit * step));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file; // canvas নেই — আসল ফাইলটাই যাক

    ctx.drawImage(img, 0, 0, width, height);

    // ১. সর্বোচ্চ quality তেই যদি হয়ে যায়
    const best = await canvasToBlob(canvas, 0.95);
    if (best.size <= maxBytes) return toJpegFile(best, file.name);

    // ২. quality নামিয়ে সবচেয়ে বড় যেটা সীমার ভিতরে থাকে
    let low = minQuality;
    let high = 0.95;
    let chosen: Blob | null = null;

    for (let i = 0; i < 7 && high - low > 0.02; i++) {
      const q = (low + high) / 2;
      const blob = await canvasToBlob(canvas, q);
      if (blob.size > maxBytes) {
        high = q;
      } else {
        chosen = blob;
        low = q;
        if (blob.size >= minBytes) break; // জানালার ভিতরে — আর খোঁজার দরকার নেই
      }
    }

    if (chosen) return toJpegFile(chosen, file.name);

    // ৩. এই মাপে সীমার নিচে নামানো গেল না — আরও ছোট মাপে চেষ্টা
    fallback = await canvasToBlob(canvas, minQuality);
    if (fallback.size <= maxBytes) return toJpegFile(fallback, file.name);
  }

  return fallback ? toJpegFile(fallback, file.name) : file;
}

function toJpegFile(blob: Blob, originalName: string): File {
  const name =
    originalName.replace(/\.(png|jpe?g|webp|heic|heif|gif|avif)$/i, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return loadImage(file).then((img) => ({
    width: img.naturalWidth,
    height: img.naturalHeight,
  }));
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
      "image/jpeg",
      quality,
    );
  });
}
