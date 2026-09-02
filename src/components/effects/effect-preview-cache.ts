import { EFFECT_REGISTRY } from "../../effects/registry";
import { applyEffect } from "../../effects/engine";

const PREVIEW_SIZE = 128;
let previewCache: Map<string, string> | null = null;

function createReferenceImageData(): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = PREVIEW_SIZE;
  canvas.height = PREVIEW_SIZE;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new ImageData(PREVIEW_SIZE, PREVIEW_SIZE);
  }

  // Draw a rich gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
  grad.addColorStop(0, "#0f172a");
  grad.addColorStop(0.5, "#3b82f6");
  grad.addColorStop(1, "#f43f5e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

  // Draw vibrant geometric shapes for high contrast
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(PREVIEW_SIZE * 0.35, PREVIEW_SIZE * 0.35, PREVIEW_SIZE * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.rect(PREVIEW_SIZE * 0.25, PREVIEW_SIZE * 0.65, PREVIEW_SIZE * 0.5, PREVIEW_SIZE * 0.12);
  ctx.fill();

  return ctx.getImageData(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
}

function initializePreviewCache(): Map<string, string> {
  if (typeof document === "undefined") {
    return new Map();
  }

  const cache = new Map<string, string>();
  const referenceData = createReferenceImageData();
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = PREVIEW_SIZE;
  tempCanvas.height = PREVIEW_SIZE;
  const tempCtx = tempCanvas.getContext("2d");

  if (!tempCtx) {
    return cache;
  }

  for (const effect of EFFECT_REGISTRY) {
    if (effect.id === "original") continue;

    try {
      const processedData = applyEffect(referenceData, effect.id);
      tempCtx.putImageData(processedData, 0, 0);
      const dataUrl = tempCanvas.toDataURL("image/png");
      cache.set(effect.id, dataUrl);
    } catch (err) {
      console.warn(`Failed to generate preview for ${effect.id}:`, err);
    }
  }

  return cache;
}

export function getEffectPreviewUrl(effectId: string): string | undefined {
  if (!previewCache) {
    previewCache = initializePreviewCache();
  }
  return previewCache.get(effectId);
}
