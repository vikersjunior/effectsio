export function generateSampleImageCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Draw elegant geometric artwork with typography placeholder for sample visual
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, "#1A202C");
  grad.addColorStop(0.5, "#2D3748");
  grad.addColorStop(1, "#4A5568");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative circles and shapes
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#E2E8F0";
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.45, Math.min(width, height) * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#CBD5E0";
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.45, Math.min(width, height) * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#ED8936";
  ctx.fillRect(width * 0.2, height * 0.72, width * 0.6, Math.min(width, height) * 0.08);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.round(Math.min(width, height) * 0.08)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EFFECTSIO", width * 0.5, height * 0.45);

  ctx.font = `medium ${Math.round(Math.min(width, height) * 0.035)}px sans-serif`;
  ctx.fillText("VISUAL STYLE WORKSTATION", width * 0.5, height * 0.76);
  ctx.restore();

  return canvas;
}
