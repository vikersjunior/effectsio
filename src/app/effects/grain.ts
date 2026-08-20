export function applyGrainAndTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grainIntensity: number
) {
  if (grainIntensity <= 0) return;

  const noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = width;
  noiseCanvas.height = height;
  const noiseCtx = noiseCanvas.getContext("2d");
  if (!noiseCtx) return;

  const noiseImageData = noiseCtx.createImageData(width, height);
  const data = noiseImageData.data;
  const alphaFactor = (grainIntensity / 100) * 40;

  for (let i = 0; i < data.length; i += 4) {
    const val = Math.floor(Math.random() * 255);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = Math.floor(Math.random() * alphaFactor);
  }

  noiseCtx.putImageData(noiseImageData, 0, 0);

  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.restore();
}
