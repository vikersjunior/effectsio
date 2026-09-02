import type { Asset } from "../types/asset";

const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file provided." };
  }
  const type = file.type.toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || file.name}). Please import PNG, JPG, or WebP images.`,
    };
  }
  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const num = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1);
  return `${num} ${sizes[i]}`;
}

export function revokeAssetUrls(asset: Asset): void {
  if (asset.objectUrl && asset.objectUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(asset.objectUrl);
    } catch {
      // Ignore revocation errors
    }
  }
  if (asset.thumbnailUrl && asset.thumbnailUrl.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(asset.thumbnailUrl);
    } catch {
      // Ignore revocation errors
    }
  }
}

export async function createThumbnailDataUrl(
  imageSource: CanvasImageSource,
  origWidth: number,
  origHeight: number,
  maxDimension = 200
): Promise<string> {
  const scale = Math.min(1, maxDimension / Math.max(origWidth, origHeight));
  const thumbWidth = Math.max(1, Math.round(origWidth * scale));
  const thumbHeight = Math.max(1, Math.round(origHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = thumbWidth;
  canvas.height = thumbHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(imageSource, 0, 0, thumbWidth, thumbHeight);
  }
  return canvas.toDataURL("image/png");
}

export async function createAssetFromFile(file: File): Promise<Asset> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid image file");
  }

  const objectUrl = URL.createObjectURL(file);
  let width = 0;
  let height = 0;
  let thumbnailUrl = "";

  try {
    if (typeof createImageBitmap !== "undefined") {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      thumbnailUrl = await createThumbnailDataUrl(bitmap, width, height);
      bitmap.close();
    } else {
      const img = new Image();
      img.src = objectUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image element"));
      });
      width = img.naturalWidth || img.width;
      height = img.naturalHeight || img.height;
      thumbnailUrl = await createThumbnailDataUrl(img, width, height);
    }
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }

  const aspectRatio = height > 0 ? width / height : 1;
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  return {
    id,
    filename: file.name,
    mimeType: file.type || "image/png",
    fileSize: file.size,
    objectUrl,
    rawBlob: file,
    width,
    height,
    aspectRatio,
    thumbnailUrl: thumbnailUrl || objectUrl,
    createdAt: Date.now(),
  };
}
