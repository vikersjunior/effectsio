export function applyScreenPrintMisregistration(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  shiftPixels: number,
  shadowColor: string,
  highlightColor: string,
  paperColor: string
) {
  if (shiftPixels <= 0) return;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Create temporary offscreen layer
  const shiftCanvas = document.createElement("canvas");
  shiftCanvas.width = width;
  shiftCanvas.height = height;
  const shiftCtx = shiftCanvas.getContext("2d");
  if (!shiftCtx) return;

  // Draw highlight channel shifted up-left
  shiftCtx.save();
  shiftCtx.globalAlpha = 0.5;
  shiftCtx.drawImage(sourceCanvas, -shiftPixels, -shiftPixels);
  shiftCtx.restore();

  // Draw shadow channel shifted down-right
  shiftCtx.save();
  shiftCtx.globalCompositeOperation = "multiply";
  shiftCtx.globalAlpha = 0.6;
  shiftCtx.drawImage(sourceCanvas, shiftPixels, shiftPixels);
  shiftCtx.restore();

  // Composite over main canvas
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(shiftCanvas, 0, 0);
  ctx.restore();
}
