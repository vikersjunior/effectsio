import { sanitizeNumber } from "./viewport-math";
import type { LayerTransform } from "../types/frame";
import { DEFAULT_LAYER_TRANSFORM } from "../types/frame";

export interface Point2D {
  x: number;
  y: number;
}

export interface OrientedBoundingBox {
  center: Point2D;
  width: number;
  height: number;
  rotation: number;
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
  rotationHandle: Point2D;
}

/**
 * Normalizes an angle in degrees into the canonical [-180, 180] range.
 */
export function normalizeRotation(deg: number): number {
  const sanitized = sanitizeNumber(deg, 0);
  let normalized = sanitized % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  if (normalized === 0) normalized = 0;
  return sanitizeNumber(normalized, 0);
}

/**
 * Clamps a scale multiplier into the valid canonical [0.05, 20.0] range.
 */
export function clampScale(scale: number): number {
  const sanitized = sanitizeNumber(scale, 1.0);
  return Math.max(0.05, Math.min(20.0, sanitized));
}

/**
 * Ensures a LayerTransform object has valid, finite numbers within allowed ranges.
 */
export function sanitizeTransform(transform?: Partial<LayerTransform> | null): LayerTransform {
  if (!transform) {
    return { ...DEFAULT_LAYER_TRANSFORM };
  }
  return {
    x: sanitizeNumber(transform.x ?? DEFAULT_LAYER_TRANSFORM.x, DEFAULT_LAYER_TRANSFORM.x),
    y: sanitizeNumber(transform.y ?? DEFAULT_LAYER_TRANSFORM.y, DEFAULT_LAYER_TRANSFORM.y),
    scaleX: clampScale(transform.scaleX ?? DEFAULT_LAYER_TRANSFORM.scaleX),
    scaleY: clampScale(transform.scaleY ?? DEFAULT_LAYER_TRANSFORM.scaleY),
    rotation: normalizeRotation(transform.rotation ?? DEFAULT_LAYER_TRANSFORM.rotation),
  };
}

/**
 * Calculates the un-transformed base dimensions of an asset fitted inside frame dimensions
 * matching the exact shader logic in layer-image.ts.
 */
export function calculateFittedDimensions(
  assetW: number,
  assetH: number,
  frameW: number,
  frameH: number,
  fit: "contain" | "cover"
): { width: number; height: number } {
  const aW = Math.max(1, sanitizeNumber(assetW, 1));
  const aH = Math.max(1, sanitizeNumber(assetH, 1));
  const fW = Math.max(1, sanitizeNumber(frameW, 1));
  const fH = Math.max(1, sanitizeNumber(frameH, 1));

  const frameAspect = fW / fH;
  const assetAspect = aW / aH;

  if (fit === "contain") {
    if (assetAspect > frameAspect) {
      // Asset is wider: width fits to frame, height letterboxed
      return { width: fW, height: fW / assetAspect };
    }
    // Asset is taller or equal: height fits to frame, width pillarboxed
    return { width: fH * assetAspect, height: fH };
  }

  // Cover mode
  if (assetAspect > frameAspect) {
    // Asset is wider: height covers frame, width cropped
    return { width: fH * assetAspect, height: fH };
  }
  // Asset is taller or equal: width covers frame, height cropped
  return { width: fW, height: fW / assetAspect };
}

/**
 * Computes layer center in Frame document coordinates (0 to frameW, 0 to frameH).
 */
export function getLayerCenterInFrame(
  transform: LayerTransform,
  frameW: number,
  frameH: number
): Point2D {
  return {
    x: frameW / 2 + transform.x,
    y: frameH / 2 + transform.y,
  };
}

/**
 * Computes the 4 corners and rotation handle of an oriented layer in Frame document coordinates.
 */
export function getOrientedBoundingBox(
  center: Point2D,
  width: number,
  height: number,
  rotationDeg: number,
  rotationHandleOffset = 24
): OrientedBoundingBox {
  const rad = rotationDeg * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotatePoint = (px: number, py: number): Point2D => ({
    x: center.x + (px * cos - py * sin),
    y: center.y + (px * sin + py * cos),
  });

  const halfW = width / 2;
  const halfH = height / 2;

  const topLeft = rotatePoint(-halfW, -halfH);
  const topRight = rotatePoint(halfW, -halfH);
  const bottomRight = rotatePoint(halfW, halfH);
  const bottomLeft = rotatePoint(-halfW, halfH);
  const rotationHandle = rotatePoint(0, -halfH - rotationHandleOffset);

  return {
    center,
    width,
    height,
    rotation: rotationDeg,
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
    rotationHandle,
  };
}

/**
 * Point-in-oriented-box hit testing in Frame document space.
 * Uses inverse rotation around center to test against an axis-aligned box.
 */
export function isPointInOrientedBox(
  point: Point2D,
  center: Point2D,
  width: number,
  height: number,
  rotationDeg: number
): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const rad = -rotationDeg * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const unrotX = dx * cos - dy * sin;
  const unrotY = dx * sin + dy * cos;

  return Math.abs(unrotX) <= width / 2 && Math.abs(unrotY) <= height / 2;
}

/**
 * Converts screen coordinates (CSS pixels in viewport container) to Frame document coordinates.
 */
export function screenToFrame(
  screenX: number,
  screenY: number,
  viewportW: number,
  viewportH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  panX: number,
  panY: number
): Point2D {
  const scale = Math.max(0.01, sanitizeNumber(zoom, 100) / 100);
  const vW = sanitizeNumber(viewportW, 100);
  const vH = sanitizeNumber(viewportH, 100);
  const pX = sanitizeNumber(panX, 0);
  const pY = sanitizeNumber(panY, 0);
  const fW = sanitizeNumber(frameW, 1080);
  const fH = sanitizeNumber(frameH, 1080);

  const relX = screenX - (vW / 2 + pX);
  const relY = screenY - (vH / 2 + pY);

  return {
    x: relX / scale + fW / 2,
    y: relY / scale + fH / 2,
  };
}

/**
 * Converts Frame document coordinates to screen coordinates (CSS pixels in viewport container).
 */
export function frameToScreen(
  frameX: number,
  frameY: number,
  viewportW: number,
  viewportH: number,
  frameW: number,
  frameH: number,
  zoom: number,
  panX: number,
  panY: number
): Point2D {
  const scale = Math.max(0.01, sanitizeNumber(zoom, 100) / 100);
  const vW = sanitizeNumber(viewportW, 100);
  const vH = sanitizeNumber(viewportH, 100);
  const pX = sanitizeNumber(panX, 0);
  const pY = sanitizeNumber(panY, 0);
  const fW = sanitizeNumber(frameW, 1080);
  const fH = sanitizeNumber(frameH, 1080);

  return {
    x: (frameX - fW / 2) * scale + (vW / 2 + pX),
    y: (frameY - fH / 2) * scale + (vH / 2 + pY),
  };
}
