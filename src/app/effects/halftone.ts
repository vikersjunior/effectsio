import { hexToRgb } from "./duotone";

export interface HalftoneOptions {
  dotSize: number; // 1 to 20
  angleDegrees: number; // 0 to 90
  contrastThreshold: number; // 0 to 100
  inkColor: string;
  paperColor: string;
}

export function renderHalftone(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  options: HalftoneOptions
) {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  // Create temporary canvas to read source pixel luminance
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  tempCtx.drawImage(sourceCanvas, 0, 0);
  const imageData = tempCtx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Clear main canvas with paper background
  ctx.fillStyle = options.paperColor;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = options.inkColor;

  const gridStep = Math.max(2, Math.round(options.dotSize * 2));
  const angleRad = (options.angleDegrees * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const diag = Math.sqrt(width * width + height * height);
  const start = -diag;
  const end = diag;

  const contrastScale = 0.5 + (options.contrastThreshold / 100) * 1.5;

  for (let y = start; y < end; y += gridStep) {
    for (let x = start; x < end; x += gridStep) {
      // Rotate grid coordinate back to image space
      const imgX = Math.round(x * cos - y * sin + width / 2);
      const imgY = Math.round(x * sin + y * cos + height / 2);

      if (imgX >= 0 && imgX < width && imgY >= 0 && imgY < height) {
        const idx = (imgY * width + imgX) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Darkness (0 = white, 1 = black)
        let darkness = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        darkness = Math.pow(darkness, contrastScale);

        const radius = (gridStep / 2) * Math.min(1, Math.max(0, darkness));

        if (radius > 0.4) {
          ctx.beginPath();
          ctx.arc(imgX, imgY, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
