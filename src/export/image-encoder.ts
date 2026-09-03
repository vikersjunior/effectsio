import type { Asset } from "../types/asset";
import type { ExportFormat } from "../types/export";
import type { BackgroundState } from "../types/look";
import { getMimeTypeForFormat } from "./export-utils";
import { createImageData, parseHexColor } from "../effects/canvas-utils";

function hexToRgba(hex: string, alpha = 1): string {
  const { r, g, b } = parseHexColor(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseStopPos(pos: string): number {
  const num = parseFloat(pos);
  if (isNaN(num)) return 0;
  return pos.includes("%") ? num / 100 : num;
}

export async function decodeAssetToImageElement(asset: Asset): Promise<HTMLImageElement> {
  if (typeof Image === "undefined") {
    throw new Error("HTML Image constructor unavailable in current environment.");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load image element from source URL: ${asset.filename}`));
    img.src = asset.objectUrl;
  });
}

export function scaleImageData(
  sourceData: ImageData,
  targetWidth: number,
  targetHeight: number,
): ImageData {
  if (sourceData.width === targetWidth && sourceData.height === targetHeight) {
    return sourceData;
  }

  if (typeof document === "undefined" || !document.createElement) {
    // In headless test environments, return new ImageData at target dimensions
    return createImageData(targetWidth, targetHeight);
  }

  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = sourceData.width;
  srcCanvas.height = sourceData.height;
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx) return sourceData;
  srcCtx.putImageData(sourceData, 0, 0);

  const dstCanvas = document.createElement("canvas");
  dstCanvas.width = targetWidth;
  dstCanvas.height = targetHeight;
  const dstCtx = dstCanvas.getContext("2d");
  if (!dstCtx) return sourceData;
  dstCtx.drawImage(srcCanvas, 0, 0, targetWidth, targetHeight);

  const result = dstCtx.getImageData(0, 0, targetWidth, targetHeight);
  srcCanvas.width = 0;
  srcCanvas.height = 0;
  dstCanvas.width = 0;
  dstCanvas.height = 0;
  return result;
}

export async function decodeAssetToImageData(asset: Asset): Promise<ImageData> {
  if (typeof Image === "undefined" || typeof document === "undefined") {
    return createImageData(asset.width || 100, asset.height || 100);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const width = asset.width || img.naturalWidth || img.width;
        const height = asset.height || img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          reject(new Error(`Invalid image dimensions: ${width}x${height}`));
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to create offscreen 2D canvas context for decoding."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        // Discard canvas reference
        canvas.width = 0;
        canvas.height = 0;

        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to decode image from source URL: ${asset.filename}`));
    };

    img.src = asset.objectUrl;
  });
}

export function renderBackgroundToCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  background: BackgroundState
): void {
  const {
    type,
    color,
    opacity = 100,
    gradientEndColor = "#3b82f6",
    gradientAngle = 135,
    patternSpacing = 24,
    gradientStops,
  } = background;
  const normalizedOpacity = Math.max(0, Math.min(1, opacity / 100));

  if (type === "transparent") {
    ctx.clearRect(0, 0, width, height);
    return;
  }

  if (type === "solid") {
    ctx.save?.();
    ctx.globalAlpha = normalizedOpacity;
    ctx.fillStyle = color || "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore?.();
    return;
  }

  if (type === "linear-gradient") {
    const rad = ((gradientAngle - 90) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.sqrt(width * width + height * height) / 2;
    const x0 = cx - Math.cos(rad) * len;
    const y0 = cy - Math.sin(rad) * len;
    const x1 = cx + Math.cos(rad) * len;
    const y1 = cy + Math.sin(rad) * len;

    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    if (gradientStops && gradientStops.length > 0) {
      for (const stop of gradientStops) {
        const p = Math.max(0, Math.min(1, parseStopPos(stop.position)));
        const op = typeof stop.opacity === "number" ? Math.max(0, Math.min(1, stop.opacity / 100)) : 1;
        grad.addColorStop(p, hexToRgba(stop.color, op));
      }
    } else {
      grad.addColorStop(0, color || "#000000");
      grad.addColorStop(1, gradientEndColor);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (type === "radial-gradient") {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.max(width, height) / 1.5;

    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (gradientStops && gradientStops.length > 0) {
      for (const stop of gradientStops) {
        const p = Math.max(0, Math.min(1, parseStopPos(stop.position)));
        const op = typeof stop.opacity === "number" ? Math.max(0, Math.min(1, stop.opacity / 100)) : 1;
        grad.addColorStop(p, hexToRgba(stop.color, op));
      }
    } else {
      grad.addColorStop(0, color || "#000000");
      grad.addColorStop(1, gradientEndColor);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (type === "dots" || type === "grid") {
    // User-configurable pattern background color
    const bgHex = background.patternBackgroundColor ?? "#000000";
    const bgOpacity = typeof background.patternBackgroundOpacity === "number"
      ? Math.max(0, Math.min(1, background.patternBackgroundOpacity / 100))
      : 1.0;

    ctx.save?.();
    ctx.globalAlpha = bgOpacity;
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.restore?.();

    ctx.save?.();
    ctx.globalAlpha = normalizedOpacity;
    ctx.fillStyle = color || "#3b82f6";
    ctx.strokeStyle = color || "#3b82f6";
    ctx.lineWidth = 1;

    const spacing = Math.max(8, patternSpacing);

    if (type === "dots") {
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      for (let x = 0; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    ctx.restore?.();
    return;
  }
}

export async function encodeImageDataToBlob(
  imageData: ImageData,
  format: ExportFormat,
  quality = 0.92,
  background?: BackgroundState
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const imgW = imageData.width;
      const imgH = imageData.height;

      if (imgW <= 0 || imgH <= 0) {
        reject(new Error(`Invalid ImageData dimensions: ${imgW}x${imgH}`));
        return;
      }

      const padding = background?.padding ?? 0;
      const borderRadius = background?.borderRadius ?? 0;
      const shadowBlur = background?.shadowBlur ?? 16;
      const shadowOpacity = background?.shadowOpacity ?? 0.4;

      const outWidth = imgW + 2 * padding;
      const outHeight = imgH + 2 * padding;

      const canvas = document.createElement("canvas");
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to create offscreen 2D canvas context for encoding."));
        return;
      }

      // Render background if specified
      if (background && background.type !== "transparent") {
        renderBackgroundToCanvas(ctx, outWidth, outHeight, background);
      } else if (format === "jpeg") {
        // JPEG fallback white background for transparent mode
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, outWidth, outHeight);
      }

      // Prepare image canvas buffer
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imgW;
      tempCanvas.height = imgH;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(imageData, 0, 0);
      }

      ctx.save();

      // Render drop shadow if framing padding is active
      if (padding > 0 && shadowOpacity > 0 && shadowBlur > 0) {
        ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetY = shadowBlur / 2;
      }

      // Clip image corners if borderRadius is active
      if (borderRadius > 0) {
        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(padding, padding, imgW, imgH, borderRadius);
        } else {
          ctx.rect(padding, padding, imgW, imgH);
        }
        ctx.clip();
      }

      ctx.drawImage(tempCanvas, padding, padding);
      ctx.restore();

      // Zero out temporary canvas
      tempCanvas.width = 0;
      tempCanvas.height = 0;

      const mimeType = getMimeTypeForFormat(format);
      const encQuality = format === "png" ? undefined : Math.max(0.01, Math.min(1, quality));

      canvas.toBlob(
        (blob) => {
          canvas.width = 0;
          canvas.height = 0;

          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Canvas failed to encode image blob for format: ${format}`));
          }
        },
        mimeType,
        encQuality
      );
    } catch (err) {
      reject(err);
    }
  });
}
