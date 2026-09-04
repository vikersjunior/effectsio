export function isFiniteNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

export function sanitizeNumber(val: number, fallback: number): number {
  return isFiniteNumber(val) ? val : fallback;
}

export function calculateFitZoom(
  viewportW: number,
  viewportH: number,
  assetW: number,
  assetH: number,
  padding = 32
): { zoom: number; panX: number; panY: number } {
  const vW = sanitizeNumber(viewportW, 0);
  const vH = sanitizeNumber(viewportH, 0);
  const aW = sanitizeNumber(assetW, 0);
  const aH = sanitizeNumber(assetH, 0);

  if (vW <= 0 || vH <= 0 || aW <= 0 || aH <= 0) {
    return { zoom: 100, panX: 0, panY: 0 };
  }

  const maxW = Math.max(10, vW - padding * 2);
  const maxH = Math.max(10, vH - padding * 2);
  const scale = Math.min(maxW / aW, maxH / aH);
  const zoom = Math.round(scale * 100 * 100) / 100; // Keep decimal precision, un-clamped for Fit

  return { zoom: sanitizeNumber(zoom, 100), panX: 0, panY: 0 };
}

export function screenToImage(
  screenX: number,
  screenY: number,
  viewportW: number,
  viewportH: number,
  assetW: number,
  assetH: number,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  const sX = sanitizeNumber(screenX, 0);
  const sY = sanitizeNumber(screenY, 0);
  const vW = sanitizeNumber(viewportW, 100);
  const vH = sanitizeNumber(viewportH, 100);
  const aW = sanitizeNumber(assetW, 100);
  const aH = sanitizeNumber(assetH, 100);
  const z = sanitizeNumber(zoom, 100);
  const pX = sanitizeNumber(panX, 0);
  const pY = sanitizeNumber(panY, 0);

  const scale = z / 100;
  if (scale <= 0) return { x: aW / 2, y: aH / 2 };

  const relX = sX - (vW / 2 + pX);
  const relY = sY - (vH / 2 + pY);

  const imgX = relX / scale + aW / 2;
  const imgY = relY / scale + aH / 2;

  return {
    x: sanitizeNumber(imgX, aW / 2),
    y: sanitizeNumber(imgY, aH / 2),
  };
}

export function imageToScreen(
  imgX: number,
  imgY: number,
  viewportW: number,
  viewportH: number,
  assetW: number,
  assetH: number,
  zoom: number,
  panX: number,
  panY: number
): { x: number; y: number } {
  const iX = sanitizeNumber(imgX, 0);
  const iY = sanitizeNumber(imgY, 0);
  const vW = sanitizeNumber(viewportW, 100);
  const vH = sanitizeNumber(viewportH, 100);
  const aW = sanitizeNumber(assetW, 100);
  const aH = sanitizeNumber(assetH, 100);
  const z = sanitizeNumber(zoom, 100);
  const pX = sanitizeNumber(panX, 0);
  const pY = sanitizeNumber(panY, 0);

  const scale = z / 100;
  const screenX = (iX - aW / 2) * scale + (vW / 2 + pX);
  const screenY = (iY - aH / 2) * scale + (vH / 2 + pY);

  return {
    x: sanitizeNumber(screenX, 0),
    y: sanitizeNumber(screenY, 0),
  };
}

export function clampInteractiveZoom(zoom: number, minZoom = 10, maxZoom = 800): number {
  const z = sanitizeNumber(zoom, 100);
  return Math.max(minZoom, Math.min(maxZoom, z));
}

export function calculateFocalZoom(
  targetZoom: number,
  mouseX: number,
  mouseY: number,
  viewportW: number,
  viewportH: number,
  assetW: number,
  assetH: number,
  currentZoom: number,
  currentPanX: number,
  currentPanY: number
): { newZoom: number; newPanX: number; newPanY: number } {
  const tZoom = sanitizeNumber(targetZoom, 100);
  const mX = sanitizeNumber(mouseX, viewportW / 2);
  const mY = sanitizeNumber(mouseY, viewportH / 2);
  const vW = sanitizeNumber(viewportW, 100);
  const vH = sanitizeNumber(viewportH, 100);
  const aW = sanitizeNumber(assetW, 100);
  const aH = sanitizeNumber(assetH, 100);
  const cZoom = sanitizeNumber(currentZoom, 100);
  const cPanX = sanitizeNumber(currentPanX, 0);
  const cPanY = sanitizeNumber(currentPanY, 0);

  const newZoom = clampInteractiveZoom(tZoom);
  const oldScale = cZoom / 100;
  const newScale = newZoom / 100;

  if (oldScale <= 0 || newScale <= 0) {
    return { newZoom, newPanX: cPanX, newPanY: cPanY };
  }

  const scaleRatio = newScale / oldScale;
  const newPanX = mX - vW / 2 - (mX - vW / 2 - cPanX) * scaleRatio;
  const newPanY = mY - vH / 2 - (mY - vH / 2 - cPanY) * scaleRatio;

  return {
    newZoom,
    newPanX: sanitizeNumber(newPanX, cPanX),
    newPanY: sanitizeNumber(newPanY, cPanY),
  };
}
