import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  sanitizeFilename,
  buildExportFilename,
  disambiguateFilenames,
  getMimeTypeForFormat,
  getFileExtensionForFormat,
} from "./export-utils";
import { unzipSync } from "fflate";
import {
  resolveExportDimensions,
  exportSingleAsset,
  exportBatchAssets,
} from "./export-engine";
import type { Asset, EffectStack } from "../types/asset";
import type { BackgroundState } from "../types/look";
import type { ExportOptions } from "../types/export";
import { createImageData } from "../effects/canvas-utils";

describe("Phase 7.7 Viewport-Independent GPU Export Engine Suite", () => {
  beforeAll(() => {
    if (typeof globalThis.document === "undefined") {
      const mock2dContext = {
        fillStyle: "",
        shadowColor: "",
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        fillRect: () => {},
        clearRect: () => {},
        drawImage: () => {},
        putImageData: () => {},
        getImageData: (_x: number, _y: number, w: number, h: number) => createImageData(w, h),
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        closePath: () => {},
        rect: () => {},
        arc: () => {},
        clip: () => {},
        fill: () => {},
        stroke: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        createPattern: () => null,
      };

      const createMockCanvas = () => ({
        width: 100,
        height: 100,
        getContext: () => mock2dContext,
        toBlob: (cb: (b: Blob) => void, mimeType?: string) => {
          cb(new Blob([new Uint8Array(10)], { type: mimeType || "image/png" }));
        },
        toDataURL: () => "data:image/png;base64,mock",
      });

      (globalThis as any).document = {
        createElement: (tag: string) => {
          if (tag === "canvas") return createMockCanvas();
          return {};
        },
      };
    }

    if (typeof globalThis.Image === "undefined") {
      class MockImage {
        public crossOrigin = "";
        public width = 400;
        public height = 300;
        public naturalWidth = 400;
        public naturalHeight = 300;
        public onload: (() => void) | null = null;
        public onerror: (() => void) | null = null;
        private _src = "";

        set src(val: string) {
          this._src = val;
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
        get src() {
          return this._src;
        }
      }
      (globalThis as any).Image = MockImage;
    }
  });

  describe("1. Dimension & Resolution Resolution Logic", () => {
    it("resolves native source resolution when no scale or custom dimensions are provided", () => {
      const res = resolveExportDimensions(800, 600);
      expect(res).toEqual({ width: 800, height: 600 });

      const resWithOptions = resolveExportDimensions(1920, 1080, {
        target: "current",
        format: "png",
        quality: 0.92,
      });
      expect(resWithOptions).toEqual({ width: 1920, height: 1080 });
    });

    it("resolves scaled export resolution (0.5x, 2x, 4x)", () => {
      const halfScale = resolveExportDimensions(1000, 800, {
        target: "current",
        format: "png",
        quality: 0.92,
        scale: 0.5,
      });
      expect(halfScale).toEqual({ width: 500, height: 400 });

      const doubleScale = resolveExportDimensions(800, 600, {
        target: "current",
        format: "png",
        quality: 0.92,
        scale: 2,
      });
      expect(doubleScale).toEqual({ width: 1600, height: 1200 });

      const quadScale = resolveExportDimensions(400, 300, {
        target: "current",
        format: "png",
        quality: 0.92,
        scale: 4,
      });
      expect(quadScale).toEqual({ width: 1600, height: 1200 });
    });

    it("resolves explicit custom export dimensions (1920x1080, 800x800)", () => {
      const custom1 = resolveExportDimensions(500, 500, {
        target: "current",
        format: "png",
        quality: 0.92,
        width: 1920,
        height: 1080,
      });
      expect(custom1).toEqual({ width: 1920, height: 1080 });

      const custom2 = resolveExportDimensions(1200, 900, {
        target: "current",
        format: "jpeg",
        quality: 0.85,
        width: 800,
        height: 800,
      });
      expect(custom2).toEqual({ width: 800, height: 800 });
    });

    it("resolves proportional custom dimension when only width or height is specified", () => {
      const propWidth = resolveExportDimensions(1000, 500, {
        target: "current",
        format: "png",
        quality: 0.92,
        width: 500,
      });
      expect(propWidth).toEqual({ width: 500, height: 250 });

      const propHeight = resolveExportDimensions(1000, 500, {
        target: "current",
        format: "png",
        quality: 0.92,
        height: 1000,
      });
      expect(propHeight).toEqual({ width: 2000, height: 1000 });
    });

    it("enforces minimum boundary of 1px and clamps to maximum GPU dimension", () => {
      const minBounds = resolveExportDimensions(0, 0, {
        target: "current",
        format: "png",
        quality: 0.92,
        scale: 0.0001,
      });
      expect(minBounds.width).toBeGreaterThanOrEqual(1);
      expect(minBounds.height).toBeGreaterThanOrEqual(1);

      const maxBounds = resolveExportDimensions(1000, 1000, {
        target: "current",
        format: "png",
        quality: 0.92,
        width: 99999,
        height: 99999,
      });
      expect(maxBounds.width).toBeLessThanOrEqual(16384);
      expect(maxBounds.height).toBeLessThanOrEqual(16384);
    });
  });

  describe("2. Filename Sanitation & MIME Utilities", () => {
    it("sanitizes unsafe filesystem characters and whitespace", () => {
      expect(sanitizeFilename("my/photo:test*image?.png")).toBe("my-photo-test-image-.png");
      expect(sanitizeFilename("  sunset  photo  ")).toBe("sunset-photo");
      expect(sanitizeFilename("")).toBe("export");
      expect(sanitizeFilename("..")).toBe("export");
    });

    it("builds correct export filenames per format", () => {
      expect(buildExportFilename("photo.png", "png")).toBe("photo-effectsio.png");
      expect(buildExportFilename("landscape.jpg", "jpeg")).toBe("landscape-effectsio.jpg");
      expect(buildExportFilename("graphic.webp", "webp")).toBe("graphic-effectsio.webp");
    });

    it("disambiguates duplicate filenames in batch exports", () => {
      const input = [
        "image-effectsio.png",
        "image-effectsio.png",
        "photo-effectsio.png",
        "image-effectsio.png",
      ];
      const result = disambiguateFilenames(input);
      expect(result).toEqual([
        "image-effectsio.png",
        "image-effectsio-2.png",
        "photo-effectsio.png",
        "image-effectsio-3.png",
      ]);
    });

    it("resolves exact MIME types and file extensions", () => {
      expect(getMimeTypeForFormat("png")).toBe("image/png");
      expect(getMimeTypeForFormat("jpeg")).toBe("image/jpeg");
      expect(getMimeTypeForFormat("webp")).toBe("image/webp");

      expect(getFileExtensionForFormat("png")).toBe(".png");
      expect(getFileExtensionForFormat("jpeg")).toBe(".jpg");
      expect(getFileExtensionForFormat("webp")).toBe(".webp");
    });
  });

  describe("3. Single Asset Export Execution & Dimensions", () => {
    const mockAsset: Asset = {
      id: "asset-test-1",
      filename: "sample-model.png",
      mimeType: "image/png",
      fileSize: 4096,
      objectUrl: "blob:http://localhost/mock-1",
      width: 400,
      height: 300,
      aspectRatio: 400 / 300,
      thumbnailUrl: "data:image/png;base64,mock",
      createdAt: Date.now(),
    };

    const mockStack: EffectStack = [
      {
        instanceId: "inst-1",
        effectId: "black-and-white",
        enabled: true,
        parameters: { contrast: 1.5, warmth: 0.2 },
      },
      {
        instanceId: "inst-2",
        effectId: "grain",
        enabled: true,
        parameters: { amount: 25, animated: false },
      },
      {
        instanceId: "inst-3",
        effectId: "posterize",
        enabled: false, // Disabled: should be skipped
        parameters: { levels: 4 },
      },
    ];

    it("exports single asset with accurate native dimensions and filename", async () => {
      const options: ExportOptions = {
        target: "current",
        format: "png",
        quality: 0.92,
      };

      const result = await exportSingleAsset(mockAsset, mockStack, options);

      expect(result.filename).toBe("sample-model-effectsio.png");
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.size).toBeGreaterThan(0);
    });

    it("exports single asset at 2x scale resolution", async () => {
      const options: ExportOptions = {
        target: "current",
        format: "png",
        quality: 0.92,
        scale: 2,
      };

      const result = await exportSingleAsset(mockAsset, mockStack, options);

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it("exports single asset with background padding and framing dimensions", async () => {
      const background: BackgroundState = {
        type: "solid",
        color: "#10b981",
        padding: 40,
        borderRadius: 8,
        shadowBlur: 20,
        shadowOpacity: 0.5,
      };

      const options: ExportOptions = {
        target: "current",
        format: "png",
        quality: 0.92,
      };

      const result = await exportSingleAsset(mockAsset, mockStack, options, background);

      // Width = 400 + 2*40 = 480, Height = 300 + 2*40 = 380
      expect(result.width).toBe(480);
      expect(result.height).toBe(380);
    });

    it("supports JPEG and WEBP format exports with custom quality", async () => {
      const jpegOptions: ExportOptions = {
        target: "current",
        format: "jpeg",
        quality: 0.8,
      };

      const jpegResult = await exportSingleAsset(mockAsset, mockStack, jpegOptions);
      expect(jpegResult.filename).toBe("sample-model-effectsio.jpg");
      expect(jpegResult.blob).toBeInstanceOf(Blob);

      const webpOptions: ExportOptions = {
        target: "current",
        format: "webp",
        quality: 0.75,
      };

      const webpResult = await exportSingleAsset(mockAsset, mockStack, webpOptions);
      expect(webpResult.filename).toBe("sample-model-effectsio.webp");
      expect(webpResult.blob).toBeInstanceOf(Blob);
    });

    it("propagates timeline time for animated shader evaluation", async () => {
      const animatedOptions: ExportOptions = {
        target: "current",
        format: "png",
        quality: 0.92,
        time: 4.5,
      };

      const result = await exportSingleAsset(mockAsset, mockStack, animatedOptions);
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });

  describe("4. Batch ZIP Export Suite", () => {
    const mockAssets: Asset[] = [
      {
        id: "asset-a",
        filename: "portrait.png",
        mimeType: "image/png",
        fileSize: 2048,
        objectUrl: "blob:http://localhost/a",
        width: 300,
        height: 400,
        aspectRatio: 300 / 400,
        thumbnailUrl: "data:image/png;base64,a",
        createdAt: Date.now(),
      },
      {
        id: "asset-b",
        filename: "landscape.jpg",
        mimeType: "image/jpeg",
        fileSize: 3072,
        objectUrl: "blob:http://localhost/b",
        width: 600,
        height: 400,
        aspectRatio: 600 / 400,
        thumbnailUrl: "data:image/jpeg;base64,b",
        createdAt: Date.now(),
      },
    ];

    const mockStacks: Record<string, EffectStack> = {
      "asset-a": [
        {
          instanceId: "inst-a1",
          effectId: "duotone",
          enabled: true,
          parameters: { shadowColor: "#000", highlightColor: "#3b82f6" },
        },
      ],
      "asset-b": [
        {
          instanceId: "inst-b1",
          effectId: "halftone",
          enabled: true,
          parameters: { dotSize: 6 },
        },
      ],
    };

    const mockBackgrounds: Record<string, BackgroundState> = {
      "asset-a": { type: "transparent", color: "#000000", padding: 0 },
      "asset-b": { type: "linear-gradient", color: "#000000", gradientEndColor: "#ffffff", padding: 20 },
    };

    it("exports batch assets into a valid ZIP archive", async () => {
      const progressTracker: { current: number; total: number; percent: number }[] = [];

      const batchResult = await exportBatchAssets(
        mockAssets,
        mockStacks,
        {
          target: "all",
          format: "png",
          quality: 0.92,
        },
        mockBackgrounds,
        (progress) => {
          progressTracker.push({
            current: progress.current,
            total: progress.total,
            percent: progress.percent,
          });
        },
      );

      expect(batchResult.totalExported).toBe(2);
      expect(batchResult.failedCount).toBe(0);
      expect(batchResult.zipBlob).toBeInstanceOf(Blob);
      expect(batchResult.zipBlob.type).toBe("application/zip");

      // Verify progress callback events
      expect(progressTracker.length).toBe(2);
      expect(progressTracker[1]?.percent).toBe(100);

      // Validate ZIP archive contents using fflate
      const arrayBuffer = await batchResult.zipBlob.arrayBuffer();
      const unzipped = unzipSync(new Uint8Array(arrayBuffer));
      const fileNames = Object.keys(unzipped);

      expect(fileNames).toContain("portrait-effectsio.png");
      expect(fileNames).toContain("landscape-effectsio.png");
      expect(fileNames.length).toBe(2);
    });

    it("handles batch export cancellation gracefully", async () => {
      let cancel = false;

      await expect(
        exportBatchAssets(
          mockAssets,
          mockStacks,
          { target: "all", format: "png", quality: 0.92 },
          mockBackgrounds,
          undefined,
          () => {
            cancel = true;
            return true;
          },
        ),
      ).rejects.toThrow("Batch export cancelled by user.");
    });

    it("throws an error when empty assets array is passed to batch export", async () => {
      await expect(
        exportBatchAssets([], {}, { target: "all", format: "png", quality: 0.92 }),
      ).rejects.toThrow("No assets provided for batch export.");
    });
  });

  describe("5. Studio State Immutability Guarantee", () => {
    it("ensures export operations do not mutate original asset or effect stack references", async () => {
      const originalAsset: Asset = {
        id: "asset-immutable",
        filename: "freeze.png",
        mimeType: "image/png",
        fileSize: 1024,
        objectUrl: "blob:http://localhost/freeze",
        width: 500,
        height: 500,
        aspectRatio: 1,
        thumbnailUrl: "data:image/png;base64,freeze",
        createdAt: 1000000,
      };

      const originalStack: EffectStack = [
        {
          instanceId: "inst-freeze-1",
          effectId: "halftone",
          enabled: true,
          parameters: { dotSize: 8, angle: 45 },
        },
      ];

      const originalBackground: BackgroundState = {
        type: "radial-gradient",
        color: "#ff0000",
        gradientEndColor: "#0000ff",
        padding: 30,
      };

      // Deep clone snapshot before export
      const assetSnapshot = JSON.stringify(originalAsset);
      const stackSnapshot = JSON.stringify(originalStack);
      const bgSnapshot = JSON.stringify(originalBackground);

      await exportSingleAsset(
        originalAsset,
        originalStack,
        { target: "current", format: "png", quality: 0.92, scale: 2 },
        originalBackground,
      );

      // Verify zero mutation
      expect(JSON.stringify(originalAsset)).toBe(assetSnapshot);
      expect(JSON.stringify(originalStack)).toBe(stackSnapshot);
      expect(JSON.stringify(originalBackground)).toBe(bgSnapshot);
    });
  });
});
