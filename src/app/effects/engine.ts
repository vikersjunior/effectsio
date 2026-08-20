import type { PresetParams } from "../presets/types";
import { applyDuotoneToImageData } from "./duotone";
import { renderHalftone } from "./halftone";
import { applyScreenPrintMisregistration } from "./screenprint";
import { applyGrainAndTexture } from "./grain";
import { applyPosterization } from "./posterize";

export function processImageEffect(
  targetCanvas: HTMLCanvasElement,
  sourceImage: HTMLImageElement | HTMLCanvasElement,
  params: PresetParams
) {
  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const width = targetCanvas.width;
  const height = targetCanvas.height;

  // 1. Draw source image onto offscreen working canvas
  const workCanvas = document.createElement("canvas");
  workCanvas.width = width;
  workCanvas.height = height;
  const workCtx = workCanvas.getContext("2d");
  if (!workCtx) return;

  // Cover fit source image into working canvas
  const srcW = sourceImage.width || width;
  const srcH = sourceImage.height || height;
  const scale = Math.max(width / srcW, height / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const drawX = (width - drawW) / 2;
  const drawY = (height - drawH) / 2;

  // Fill background
  workCtx.fillStyle = params.paperColor;
  workCtx.fillRect(0, 0, width, height);

  workCtx.drawImage(sourceImage, drawX, drawY, drawW, drawH);

  // 2. Get image data for pixel manipulation
  let imageData = workCtx.getImageData(0, 0, width, height);

  // Apply posterize if enabled
  if (params.enablePosterize && params.colorLevels > 1) {
    imageData = applyPosterization(imageData, params.colorLevels);
  }

  // Apply duotone color mapping
  imageData = applyDuotoneToImageData(
    imageData,
    params.shadowColor,
    params.highlightColor,
    params.contrast,
    params.brightness
  );

  workCtx.putImageData(imageData, 0, 0);

  // 3. Render on target canvas
  ctx.clearRect(0, 0, width, height);

  if (params.enableHalftone) {
    renderHalftone(ctx, workCanvas, {
      dotSize: params.halftoneDotSize,
      angleDegrees: params.halftoneAngle,
      contrastThreshold: params.halftoneContrast,
      inkColor: params.shadowColor,
      paperColor: params.paperColor,
    });
  } else {
    ctx.drawImage(workCanvas, 0, 0);
  }

  // 4. Apply misregistration shift if enabled
  if (params.enableMisregistration && params.misregistrationShift > 0) {
    applyScreenPrintMisregistration(
      ctx,
      workCanvas,
      params.misregistrationShift,
      params.shadowColor,
      params.highlightColor,
      params.paperColor
    );
  }

  // 5. Apply paper & film grain
  if (params.enableGrain && params.grainIntensity > 0) {
    applyGrainAndTexture(ctx, width, height, params.grainIntensity);
  }
}
