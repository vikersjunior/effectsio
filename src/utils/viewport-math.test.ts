import { describe, it, expect } from "vitest";
import {
  calculateFitZoom,
  screenToImage,
  imageToScreen,
  clampInteractiveZoom,
  calculateFocalZoom,
  isFiniteNumber,
  sanitizeNumber,
} from "./viewport-math";

describe("viewport-math unit tests & stability guards", () => {
  it("isFiniteNumber and sanitizeNumber validate numeric input correctly", () => {
    expect(isFiniteNumber(100)).toBe(true);
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(-50.5)).toBe(true);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);

    expect(sanitizeNumber(100, 0)).toBe(100);
    expect(sanitizeNumber(NaN, 50)).toBe(50);
    expect(sanitizeNumber(Infinity, 10)).toBe(10);
  });

  it("calculateFitZoom calculates unclamped fit scale for large assets without NaN", () => {
    const fit = calculateFitZoom(1000, 500, 10000, 5000);
    expect(fit.zoom).toBeLessThan(25);
    expect(Number.isFinite(fit.zoom)).toBe(true);
    expect(fit.panX).toBe(0);
    expect(fit.panY).toBe(0);
  });

  it("screenToImage and imageToScreen are inverse operations and return finite numbers", () => {
    const viewportW = 800;
    const viewportH = 600;
    const assetW = 400;
    const assetH = 300;
    const zoom = 150;
    const panX = 50;
    const panY = -30;

    const screenX = 350;
    const screenY = 220;

    const imgPt = screenToImage(screenX, screenY, viewportW, viewportH, assetW, assetH, zoom, panX, panY);
    expect(Number.isFinite(imgPt.x)).toBe(true);
    expect(Number.isFinite(imgPt.y)).toBe(true);

    const screenPt = imageToScreen(imgPt.x, imgPt.y, viewportW, viewportH, assetW, assetH, zoom, panX, panY);
    expect(screenPt.x).toBeCloseTo(screenX, 5);
    expect(screenPt.y).toBeCloseTo(screenY, 5);
  });

  it("clampInteractiveZoom clamps manual zoom strictly to 10%-800%", () => {
    expect(clampInteractiveZoom(5)).toBe(10);
    expect(clampInteractiveZoom(10)).toBe(10);
    expect(clampInteractiveZoom(25)).toBe(25);
    expect(clampInteractiveZoom(500)).toBe(500);
    expect(clampInteractiveZoom(1000)).toBe(800);
    expect(clampInteractiveZoom(NaN)).toBe(100);
  });

  it("calculateFocalZoom preserves the image point beneath the cursor and avoids NaN", () => {
    const viewportW = 800;
    const viewportH = 600;
    const assetW = 400;
    const assetH = 300;

    const mouseX = 500;
    const mouseY = 400;
    const currentZoom = 100;
    const currentPanX = 20;
    const currentPanY = -10;

    const initialImgPt = screenToImage(
      mouseX,
      mouseY,
      viewportW,
      viewportH,
      assetW,
      assetH,
      currentZoom,
      currentPanX,
      currentPanY
    );

    const result = calculateFocalZoom(
      200,
      mouseX,
      mouseY,
      viewportW,
      viewportH,
      assetW,
      assetH,
      currentZoom,
      currentPanX,
      currentPanY
    );

    expect(Number.isFinite(result.newZoom)).toBe(true);
    expect(Number.isFinite(result.newPanX)).toBe(true);
    expect(Number.isFinite(result.newPanY)).toBe(true);

    const newScreenPt = imageToScreen(
      initialImgPt.x,
      initialImgPt.y,
      viewportW,
      viewportH,
      assetW,
      assetH,
      result.newZoom,
      result.newPanX,
      result.newPanY
    );

    expect(newScreenPt.x).toBeCloseTo(mouseX, 4);
    expect(newScreenPt.y).toBeCloseTo(mouseY, 4);
  });
});
