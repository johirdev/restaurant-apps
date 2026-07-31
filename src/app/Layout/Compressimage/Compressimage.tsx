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
