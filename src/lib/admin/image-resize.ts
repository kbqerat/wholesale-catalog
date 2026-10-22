"use client";

const MAX_EDGE = 1600;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export const ACCEPTED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/**
 * Downscale phone photos before upload (faster for the seller on mobile data,
 * lighter for clients). Falls back to the original file if the browser
 * cannot re-encode it.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const original = { blob: file as Blob, ext: EXTENSIONS[file.type] ?? "jpg", type: file.type };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return original;
    return { blob, ext: "webp", type: "image/webp" };
  } catch {
    return original;
  }
}
