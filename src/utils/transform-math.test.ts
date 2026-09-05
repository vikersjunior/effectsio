import { describe, it, expect } from "vitest";
import {
  normalizeRotation,
  clampScale,
  sanitizeTransform,
  calculateFittedDimensions,
  getLayerCenterInFrame,
  getOrientedBoundingBox,
  isPointInOrientedBox,
  screenToFrame,
  frameToScreen,
} from "./transform-math";
import { DEFAULT_LAYER_TRANSFORM, createImageLayer } from "../types/frame";

describe("Transform Math & Domain Logic", () => {
  describe("normalizeRotation", () => {
    it("preserves angles already within [-180, 180]", () => {
      expect(normalizeRotation(0)).toBe(0);
      expect(normalizeRotation(45)).toBe(45);
      expect(normalizeRotation(-45)).toBe(-45);
      expect(normalizeRotation(180)).toBe(180);
      expect(normalizeRotation(-180)).toBe(-180);
    });

    it("normalizes angles greater than 180", () => {
      expect(normalizeRotation(181)).toBe(-179);
      expect(normalizeRotation(270)).toBe(-90);
      expect(normalizeRotation(360)).toBe(0);
      expect(normalizeRotation(450)).toBe(90);
      expect(normalizeRotation(720)).toBe(0);
    });

    it("normalizes angles less than -180", () => {
      expect(normalizeRotation(-181)).toBe(179);
      expect(normalizeRotation(-270)).toBe(90);
      expect(normalizeRotation(-360)).toBe(0);
      expect(normalizeRotation(-450)).toBe(-90);
    });

    it("handles non-finite values safely", () => {
      expect(normalizeRotation(NaN)).toBe(0);
      expect(normalizeRotation(Infinity)).toBe(0);
      expect(normalizeRotation(-Infinity)).toBe(0);
    });
  });

  describe("clampScale", () => {
    it("preserves scale values in [0.05, 20.0]", () => {
      expect(clampScale(1.0)).toBe(1.0);
      expect(clampScale(0.05)).toBe(0.05);
      expect(clampScale(5.0)).toBe(5.0);
      expect(clampScale(20.0)).toBe(20.0);
    });

    it("clamps values below 0.05", () => {
      expect(clampScale(0.01)).toBe(0.05);
      expect(clampScale(0)).toBe(0.05);
      expect(clampScale(-1)).toBe(0.05);
    });

    it("clamps values above 20.0", () => {
      expect(clampScale(25.0)).toBe(20.0);
      expect(clampScale(100.0)).toBe(20.0);
    });

    it("handles non-finite values safely by falling back to 1.0", () => {
      expect(clampScale(NaN)).toBe(1.0);
      expect(clampScale(Infinity)).toBe(1.0);
    });
  });

  describe("sanitizeTransform", () => {
    it("returns DEFAULT_LAYER_TRANSFORM when input is null or undefined", () => {
      expect(sanitizeTransform(null)).toEqual(DEFAULT_LAYER_TRANSFORM);
      expect(sanitizeTransform(undefined)).toEqual(DEFAULT_LAYER_TRANSFORM);
    });

    it("sanitizes partial transforms and applies defaults to missing fields", () => {
      const sanitized = sanitizeTransform({ x: 50, scaleX: 2.0 });
      expect(sanitized.x).toBe(50);
      expect(sanitized.y).toBe(0);
      expect(sanitized.scaleX).toBe(2.0);
      expect(sanitized.scaleY).toBe(1.0);
      expect(sanitized.rotation).toBe(0);
    });

    it("clamps scale and normalizes rotation in invalid inputs", () => {
      const sanitized = sanitizeTransform({
        x: NaN,
        y: 100,
        scaleX: -5,
        scaleY: 50,
        rotation: 270,
      });
      expect(sanitized.x).toBe(0);
      expect(sanitized.y).toBe(100);
      expect(sanitized.scaleX).toBe(0.05);
      expect(sanitized.scaleY).toBe(20.0);
      expect(sanitized.rotation).toBe(-90);
    });
  });

  describe("createImageLayer default transform", () => {
    it("initializes with default LayerTransform when not specified", () => {
      const layer = createImageLayer("asset-1", "Test Layer");
      expect(layer.transform).toEqual({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      });
    });

    it("accepts custom partial transform", () => {
      const layer = createImageLayer("asset-1", "Test Layer", [], "contain", {
        x: 100,
        scaleX: 1.5,
        scaleY: 1.5,
        rotation: 45,
      });
      expect(layer.transform).toEqual({
        x: 100,
        y: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        rotation: 45,
      });
    });
  });

  describe("calculateFittedDimensions", () => {
    it("calculates contain dimensions correctly when asset is wider than frame", () => {
      // 16:9 asset in 1:1 frame (1920x1080 in 1080x1080)
      const fitted = calculateFittedDimensions(1920, 1080, 1080, 1080, "contain");
      expect(fitted.width).toBeCloseTo(1080);
      expect(fitted.height).toBeCloseTo(1080 * (1080 / 1920));
    });

    it("calculates contain dimensions correctly when asset is taller than frame", () => {
      // 9:16 asset in 1:1 frame (1080x1920 in 1080x1080)
      const fitted = calculateFittedDimensions(1080, 1920, 1080, 1080, "contain");
      expect(fitted.width).toBeCloseTo(1080 * (1080 / 1920));
      expect(fitted.height).toBeCloseTo(1080);
    });

    it("calculates cover dimensions correctly when asset is wider than frame", () => {
      // 16:9 asset in 1:1 frame (1920x1080 in 1080x1080)
      const fitted = calculateFittedDimensions(1920, 1080, 1080, 1080, "cover");
      expect(fitted.height).toBeCloseTo(1080);
      expect(fitted.width).toBeCloseTo(1080 * (1920 / 1080));
    });

    it("calculates cover dimensions correctly when asset is taller than frame", () => {
      // 9:16 asset in 1:1 frame (1080x1920 in 1080x1080)
      const fitted = calculateFittedDimensions(1080, 1920, 1080, 1080, "cover");
      expect(fitted.width).toBeCloseTo(1080);
      expect(fitted.height).toBeCloseTo(1080 * (1920 / 1080));
    });
  });

  describe("getLayerCenterInFrame", () => {
    it("returns frame center when transform offset is (0, 0)", () => {
      const center = getLayerCenterInFrame(DEFAULT_LAYER_TRANSFORM, 1080, 1080);
      expect(center).toEqual({ x: 540, y: 540 });
    });

    it("returns translated center with positive and negative offsets", () => {
      const center = getLayerCenterInFrame({ ...DEFAULT_LAYER_TRANSFORM, x: 120, y: -80 }, 1080, 1920);
      expect(center).toEqual({ x: 540 + 120, y: 960 - 80 });
    });
  });

  describe("getOrientedBoundingBox & isPointInOrientedBox", () => {
    it("computes unrotated bounding box corners correctly", () => {
      const center = { x: 500, y: 500 };
      const obb = getOrientedBoundingBox(center, 200, 100, 0, 24);

      expect(obb.topLeft).toEqual({ x: 400, y: 450 });
      expect(obb.topRight).toEqual({ x: 600, y: 450 });
      expect(obb.bottomRight).toEqual({ x: 600, y: 550 });
      expect(obb.bottomLeft).toEqual({ x: 400, y: 550 });
      expect(obb.rotationHandle).toEqual({ x: 500, y: 450 - 24 });
    });

    it("computes 90-degree rotated bounding box corners correctly", () => {
      const center = { x: 500, y: 500 };
      const obb = getOrientedBoundingBox(center, 200, 100, 90, 24);

      // Rotated 90 deg clockwise:
      // Top-left (-100, -50) becomes (50, -100) -> (550, 400)
      expect(obb.topLeft.x).toBeCloseTo(550);
      expect(obb.topLeft.y).toBeCloseTo(400);

      // Top-right (100, -50) becomes (50, 100) -> (550, 600)
      expect(obb.topRight.x).toBeCloseTo(550);
      expect(obb.topRight.y).toBeCloseTo(600);
    });

    it("hit tests points inside an unrotated box", () => {
      const center = { x: 500, y: 500 };
      expect(isPointInOrientedBox({ x: 500, y: 500 }, center, 200, 100, 0)).toBe(true);
      expect(isPointInOrientedBox({ x: 405, y: 455 }, center, 200, 100, 0)).toBe(true);
      expect(isPointInOrientedBox({ x: 595, y: 545 }, center, 200, 100, 0)).toBe(true);
      // Outside
      expect(isPointInOrientedBox({ x: 390, y: 500 }, center, 200, 100, 0)).toBe(false);
      expect(isPointInOrientedBox({ x: 500, y: 560 }, center, 200, 100, 0)).toBe(false);
    });

    it("hit tests points inside a rotated box", () => {
      const center = { x: 500, y: 500 };
      // 200x100 box rotated 90 degrees becomes 100 wide x 200 tall in world space
      expect(isPointInOrientedBox({ x: 500, y: 580 }, center, 200, 100, 90)).toBe(true);
      expect(isPointInOrientedBox({ x: 540, y: 500 }, center, 200, 100, 90)).toBe(true);
      // Outside (wider than 50 from center in X)
      expect(isPointInOrientedBox({ x: 560, y: 500 }, center, 200, 100, 90)).toBe(false);
    });
  });

  describe("screenToFrame and frameToScreen roundtrips", () => {
    it("roundtrips coordinates accurately under various pan and zoom levels", () => {
      const viewportW = 1200;
      const viewportH = 800;
      const frameW = 1080;
      const frameH = 1080;
      const zoom = 150; // 150%
      const panX = 60;
      const panY = -40;

      const originalFramePoint = { x: 720, y: 340 };

      const screenPoint = frameToScreen(
        originalFramePoint.x,
        originalFramePoint.y,
        viewportW,
        viewportH,
        frameW,
        frameH,
        zoom,
        panX,
        panY
      );

      const recoveredFramePoint = screenToFrame(
        screenPoint.x,
        screenPoint.y,
        viewportW,
        viewportH,
        frameW,
        frameH,
        zoom,
        panX,
        panY
      );

      expect(recoveredFramePoint.x).toBeCloseTo(originalFramePoint.x, 4);
      expect(recoveredFramePoint.y).toBeCloseTo(originalFramePoint.y, 4);
    });
  });
});
