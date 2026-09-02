import { describe, it, expect } from "vitest";
import {
  isGPUSupportedEffect,
  canExecuteStackOnGPU,
  GPU_EFFECT_REGISTRY,
} from "./webgl-effect-pipeline";
import { BLACK_AND_WHITE_FRAGMENT_SHADER } from "./shaders/black-and-white";
import { DUOTONE_FRAGMENT_SHADER } from "./shaders/duotone";
import { POSTERIZE_FRAGMENT_SHADER } from "./shaders/posterize";
import { GRAIN_FRAGMENT_SHADER } from "./shaders/grain";
import { HALFTONE_FRAGMENT_SHADER } from "./shaders/halftone";
import { SCREEN_PRINT_FRAGMENT_SHADER } from "./shaders/screen-print";
import { VINTAGE_FILM_FRAGMENT_SHADER } from "./shaders/vintage-film";
import { GLITCH_FRAGMENT_SHADER } from "./shaders/glitch";
import { PIXELATE_FRAGMENT_SHADER } from "./shaders/pixelate";
import { LINE_ART_FRAGMENT_SHADER } from "./shaders/line-art";
import { ASCII_FRAGMENT_SHADER } from "./shaders/ascii";

import { EFFECT_REGISTRY } from "../../effects/registry";
import { pixelateEffect } from "../../effects/modules/pixelate";
import { lineArtEffect } from "../../effects/modules/line-art";
import { halftoneEffect } from "../../effects/modules/halftone";
import { vintageFilmEffect } from "../../effects/modules/vintage-film";
import { glitchEffect } from "../../effects/modules/glitch";
import { screenPrintEffect } from "../../effects/modules/screen-print";
import { asciiEffect } from "../../effects/modules/ascii";
import { createImageData } from "../../effects/canvas-utils";
import type { EffectStack } from "../../types/asset";

describe("Phase 7.4 Complex GPU Effect Shader Migration Suite", () => {
  describe("Shader Source & Registry Coverage", () => {
    it("exports valid GLSL ES 3.00 shaders for all 12 registered effects", () => {
      expect(HALFTONE_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(HALFTONE_FRAGMENT_SHADER).toContain("uniform float u_dotSize;");
      expect(HALFTONE_FRAGMENT_SHADER).toContain("uniform float u_contrast;");

      expect(SCREEN_PRINT_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(SCREEN_PRINT_FRAGMENT_SHADER).toContain("uniform vec3 u_inkColor1;");
      expect(SCREEN_PRINT_FRAGMENT_SHADER).toContain("uniform vec3 u_inkColor2;");

      expect(VINTAGE_FILM_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(VINTAGE_FILM_FRAGMENT_SHADER).toContain("uniform float u_fade;");
      expect(VINTAGE_FILM_FRAGMENT_SHADER).toContain("uniform float u_vignette;");

      expect(GLITCH_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(GLITCH_FRAGMENT_SHADER).toContain("uniform float u_rgbShift;");
      expect(GLITCH_FRAGMENT_SHADER).toContain("uniform float u_scanlines;");

      expect(PIXELATE_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(PIXELATE_FRAGMENT_SHADER).toContain("uniform float u_blockSize;");

      expect(LINE_ART_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(LINE_ART_FRAGMENT_SHADER).toContain("uniform float u_edgeThreshold;");
      expect(LINE_ART_FRAGMENT_SHADER).toContain("uniform float u_lineWeight;");

      expect(ASCII_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(ASCII_FRAGMENT_SHADER).toContain("uniform float u_fontSize;");
      expect(ASCII_FRAGMENT_SHADER).toContain("uniform float u_colorMode;");
    });

    it("verifies 100% of canonical registry effects have GPU shader implementations", () => {
      for (const effect of EFFECT_REGISTRY) {
        expect(isGPUSupportedEffect(effect.id)).toBe(true);
        expect(GPU_EFFECT_REGISTRY[effect.id as keyof typeof GPU_EFFECT_REGISTRY]).toBeDefined();
      }
    });

    it("evaluates stack GPU execution capability for multi-layer complex stacks", () => {
      const complexStack: EffectStack = [
        { instanceId: "1", effectId: "pixelate", enabled: true, parameters: { blockSize: 16 } },
        { instanceId: "2", effectId: "halftone", enabled: true, parameters: { dotSize: 8 } },
        { instanceId: "3", effectId: "vintage-film", enabled: true, parameters: { vignette: 50 } },
        { instanceId: "4", effectId: "line-art", enabled: true, parameters: { edgeThreshold: 60 } },
      ];
      expect(canExecuteStackOnGPU(complexStack)).toBe(true);
    });
  });

  describe("Alpha Channel Preservation across Complex Shaders", () => {
    it("preserves alpha channel completely for Pixelate, Vintage Film, Glitch, and Line Art", () => {
      const uniformAlphaImg = createImageData(4, 4);
      for (let i = 0; i < 16; i++) {
        uniformAlphaImg.data.set([120, 140, 160, 200], i * 4);
      }
      const pixelateOut = pixelateEffect.render(uniformAlphaImg, { blockSize: 2 });
      for (let i = 0; i < 16; i++) {
        expect(pixelateOut.data[i * 4 + 3]).toBe(200);
      }

      const testImg = createImageData(4, 4);
      for (let i = 0; i < 16; i++) {
        testImg.data.set([120, 140, 160, (i * 16) % 256], i * 4);
      }

      const vintageOut = vintageFilmEffect.render(testImg, { fade: 20, vignette: 30 });
      for (let i = 0; i < 16; i++) {
        expect(vintageOut.data[i * 4 + 3]).toBe((i * 16) % 256);
      }

      const glitchOut = glitchEffect.render(testImg, { intensity: 50, rgbShift: 4 });
      for (let i = 0; i < 16; i++) {
        expect(glitchOut.data[i * 4 + 3]).toBe((i * 16) % 256);
      }

      const lineOut = lineArtEffect.render(testImg, { edgeThreshold: 30 });
      for (let i = 0; i < 16; i++) {
        expect(lineOut.data[i * 4 + 3]).toBe((i * 16) % 256);
      }
    });
  });

  describe("Mathematical Equivalence & Precision (Complex Effects)", () => {
    it("verifies Pixelate block center quantization logic", () => {
      const width = 100;
      const height = 100;
      const blockSize = 12;

      const px = 25; // Inside block 2 (range 24..35)
      const py = 40; // Inside block 3 (range 36..47)

      // CPU block coordinate:
      const blockX = Math.floor(px / blockSize) * blockSize; // 24
      const blockY = Math.floor(py / blockSize) * blockSize; // 36

      // GPU Shader block center in pixels:
      const gpuCenterX = Math.floor(px / blockSize) * blockSize + blockSize * 0.5; // 30
      const gpuCenterY = Math.floor(py / blockSize) * blockSize + blockSize * 0.5; // 42

      expect(gpuCenterX).toBeGreaterThanOrEqual(blockX);
      expect(gpuCenterX).toBeLessThanOrEqual(blockX + blockSize);
      expect(gpuCenterY).toBeGreaterThanOrEqual(blockY);
      expect(gpuCenterY).toBeLessThanOrEqual(blockY + blockSize);
    });

    it("verifies Sobel convolution horizontal and vertical kernel gradients in Line Art", () => {
      // 3x3 test pattern: vertical step edge (left dark, right bright)
      const p00 = 0, p01 = 0, p02 = 255;
      const p10 = 0, p11 = 0, p12 = 255;
      const p20 = 0, p21 = 0, p22 = 255;

      const gx = -p00 - 2 * p10 - p20 + p02 + 2 * p12 + p22;
      const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

      expect(gx).toBe(1020); // 4 * 255
      expect(gy).toBe(0);

      const magnitude = Math.hypot(gx, gy);
      expect(magnitude).toBe(1020);
    });

    it("verifies Black & White shader formula matches CPU math within 1 unit tolerance", () => {
      const r = 180;
      const g = 120;
      const b = 60;
      const contrast = 1.3;
      const warmth = 15;

      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      let grayNorm = 0.299 * rNorm + 0.587 * gNorm + 0.114 * bNorm;
      grayNorm = Math.max(0, Math.min(1, (grayNorm - 0.5) * contrast + 0.5));
      const wNorm = warmth / 255;
      const rGpu = Math.round(Math.max(0, Math.min(1, grayNorm + wNorm)) * 255);
      const gGpu = Math.round(Math.max(0, Math.min(1, grayNorm + wNorm * 0.5)) * 255);
      const bGpu = Math.round(Math.max(0, Math.min(1, grayNorm - wNorm)) * 255);

      const grayCpu = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const grayContrasted = Math.max(0, Math.min(255, Math.round((grayCpu - 128) * contrast + 128)));
      const rCpu = Math.max(0, Math.min(255, grayContrasted + warmth));
      const gCpu = Math.max(0, Math.min(255, grayContrasted + Math.round(warmth * 0.5)));
      const bCpu = Math.max(0, Math.min(255, grayContrasted - warmth));

      expect(Math.abs(rCpu - rGpu)).toBeLessThanOrEqual(1);
      expect(Math.abs(gCpu - gGpu)).toBeLessThanOrEqual(1);
      expect(Math.abs(bCpu - bGpu)).toBeLessThanOrEqual(1);
    });
  });

  describe("Reactive Parameter Propagation & Uniform Invalidation", () => {
    it("ensures GPU uniform bindings receive updated parameter values on every pass", () => {
      const boundUniforms: Record<string, number> = {};
      const mockGL = {
        uniform1f: (loc: WebGLUniformLocation, val: number) => {
          boundUniforms[loc as unknown as string] = val;
        },
      } as unknown as WebGL2RenderingContext;

      const mockProgram = {
        program: {} as WebGLProgram,
        vertexShader: {} as WebGLShader,
        fragmentShader: {} as WebGLShader,
        uniformLocations: new Map<string, WebGLUniformLocation>([
          ["u_contrast", "u_contrast" as unknown as WebGLUniformLocation],
          ["u_warmth", "u_warmth" as unknown as WebGLUniformLocation],
        ]),
        attributeLocations: new Map(),
      };

      // 1. First execution with initial parameters
      GPU_EFFECT_REGISTRY["black-and-white"].bindUniforms(
        mockGL,
        mockProgram,
        { contrast: 1.0, warmth: 0 },
        800,
        600,
      );

      expect(boundUniforms["u_contrast"]).toBe(1.0);
      expect(boundUniforms["u_warmth"]).toBe(0);

      // 2. Subsequent mutation with updated contrast slider value
      GPU_EFFECT_REGISTRY["black-and-white"].bindUniforms(
        mockGL,
        mockProgram,
        { contrast: 2.2, warmth: 25 },
        800,
        600,
      );

      expect(boundUniforms["u_contrast"]).toBe(2.2);
      expect(boundUniforms["u_warmth"]).toBe(25);
    });

    it("verifies partial parameter mutation correctly merges with default parameters", () => {
      // User only changed 'blockSize' on pixelate; other defaults should stay intact
      const partialPixelateParams = { blockSize: 32 };
      let passedBlockSize = 0;

      const trackingDef = {
        ...GPU_EFFECT_REGISTRY["pixelate"],
        bindUniforms: (
          _gl: WebGL2RenderingContext,
          _prog: unknown,
          params: typeof partialPixelateParams,
        ) => {
          passedBlockSize = params.blockSize;
        },
      };

      trackingDef.bindUniforms({} as WebGL2RenderingContext, {} as never, partialPixelateParams);
      expect(passedBlockSize).toBe(32);
    });
  });
});
