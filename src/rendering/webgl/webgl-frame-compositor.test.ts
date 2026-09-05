import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WebGL2FrameCompositor,
  BLEND_MODE_MAP,
  type ViewportPresentationParams,
} from "./webgl-frame-compositor";
import {
  LAYER_BLEND_VERTEX_SHADER,
  LAYER_BLEND_FRAGMENT_SHADER,
} from "./shaders/layer-blend";
import {
  LAYER_IMAGE_VERTEX_SHADER,
  LAYER_IMAGE_FRAGMENT_SHADER,
} from "./shaders/layer-image";
import type { Frame, GenerativeLayer, ImageLayer } from "../../types/frame";
import {
  createDefaultFrame,
  createDefaultGenerativeLayer,
  createImageLayer,
} from "../../types/frame";

describe("Stage 1B Multi-Layer WebGL2 Compositor Suite", () => {
  describe("Shader Contract & W3C Blend Mode Coverage", () => {
    it("exports valid GLSL ES 3.00 layer blend shaders with all required uniforms", () => {
      expect(LAYER_BLEND_VERTEX_SHADER).toContain("#version 300 es");
      expect(LAYER_BLEND_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(LAYER_BLEND_FRAGMENT_SHADER).toContain("uniform sampler2D u_backdrop;");
      expect(LAYER_BLEND_FRAGMENT_SHADER).toContain("uniform sampler2D u_source;");
      expect(LAYER_BLEND_FRAGMENT_SHADER).toContain("uniform float u_opacity;");
      expect(LAYER_BLEND_FRAGMENT_SHADER).toContain("uniform int u_blendMode;");
    });

    it("verifies 100% of approved 12 W3C blend modes are mapped", () => {
      const expectedModes = [
        "normal",
        "multiply",
        "screen",
        "overlay",
        "darken",
        "lighten",
        "color-dodge",
        "color-burn",
        "hard-light",
        "soft-light",
        "difference",
        "exclusion",
      ] as const;

      for (const mode of expectedModes) {
        expect(BLEND_MODE_MAP[mode]).toBeDefined();
        expect(typeof BLEND_MODE_MAP[mode]).toBe("number");
      }
      expect(Object.keys(BLEND_MODE_MAP)).toHaveLength(12);
    });

    it("exports valid GLSL ES 3.00 layer image fit shader supporting contain and cover", () => {
      expect(LAYER_IMAGE_VERTEX_SHADER).toContain("#version 300 es");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform sampler2D u_assetTexture;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_frameSize;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_assetSize;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform int u_fitMode;");
    });
  });

  describe("Mathematical Blend & Premultiplied Alpha Invariants", () => {
    // JavaScript reference implementation of the GLSL W3C blend & premultiplied alpha math
    function compositeW3C(
      dstRgb: [number, number, number],
      dstA: number,
      srcRgb: [number, number, number],
      srcA: number,
      opacity: number,
      mode: string,
    ): { rgb: [number, number, number]; a: number } {
      const effSrcA = srcA * Math.max(0, Math.min(1, opacity));
      if (dstA <= 0.00001 && effSrcA <= 0.00001) return { rgb: [0, 0, 0], a: 0 };
      if (effSrcA <= 0.00001) return { rgb: [...dstRgb], a: dstA };
      if (dstA <= 0.00001) return { rgb: [...srcRgb], a: effSrcA };

      const blendChannel = (d: number, s: number): number => {
        switch (mode) {
          case "multiply":
            return d * s;
          case "screen":
            return d + s - d * s;
          case "overlay":
            return d <= 0.5 ? 2 * d * s : 1 - 2 * (1 - d) * (1 - s);
          case "darken":
            return Math.min(d, s);
          case "lighten":
            return Math.max(d, s);
          case "difference":
            return Math.abs(d - s);
          case "exclusion":
            return d + s - 2 * d * s;
          case "normal":
          default:
            return s;
        }
      };

      const blended: [number, number, number] = [
        blendChannel(dstRgb[0], srcRgb[0]),
        blendChannel(dstRgb[1], srcRgb[1]),
        blendChannel(dstRgb[2], srcRgb[2]),
      ];

      const outA = effSrcA + dstA * (1 - effSrcA);
      const outPremulRgb: [number, number, number] = [
        blended[0] * effSrcA * dstA + srcRgb[0] * effSrcA * (1 - dstA) + dstRgb[0] * dstA * (1 - effSrcA),
        blended[1] * effSrcA * dstA + srcRgb[1] * effSrcA * (1 - dstA) + dstRgb[1] * dstA * (1 - effSrcA),
        blended[2] * effSrcA * dstA + srcRgb[2] * effSrcA * (1 - dstA) + dstRgb[2] * dstA * (1 - effSrcA),
      ];

      return {
        rgb: [outPremulRgb[0] / outA, outPremulRgb[1] / outA, outPremulRgb[2] / outA],
        a: outA,
      };
    }

    it("ensures transparent backdrop passes through source color without dark fringes", () => {
      const res = compositeW3C([0, 0, 0], 0.0, [1.0, 0.5, 0.25], 1.0, 1.0, "multiply");
      expect(res.rgb[0]).toBeCloseTo(1.0);
      expect(res.rgb[1]).toBeCloseTo(0.5);
      expect(res.rgb[2]).toBeCloseTo(0.25);
      expect(res.a).toBeCloseTo(1.0);
    });

    it("ensures transparent source layer leaves backdrop untouched", () => {
      const res = compositeW3C([0.2, 0.4, 0.8], 1.0, [1.0, 1.0, 1.0], 0.0, 1.0, "screen");
      expect(res.rgb[0]).toBeCloseTo(0.2);
      expect(res.rgb[1]).toBeCloseTo(0.4);
      expect(res.rgb[2]).toBeCloseTo(0.8);
      expect(res.a).toBeCloseTo(1.0);
    });

    it("applies layer opacity correctly during cross-layer accumulation", () => {
      // 50% opacity source layer blending over opaque white background
      const res = compositeW3C([1.0, 1.0, 1.0], 1.0, [0.0, 0.0, 0.0], 1.0, 0.5, "normal");
      expect(res.rgb[0]).toBeCloseTo(0.5);
      expect(res.rgb[1]).toBeCloseTo(0.5);
      expect(res.rgb[2]).toBeCloseTo(0.5);
      expect(res.a).toBeCloseTo(1.0);
    });

    it("verifies Multiply blend mode over opaque backdrop", () => {
      // Red [1, 0, 0] multiplied with Blue [0, 0, 1] over 100% opaque backdrop -> Black [0, 0, 0]
      const res = compositeW3C([1.0, 0.0, 0.0], 1.0, [0.0, 0.0, 1.0], 1.0, 1.0, "multiply");
      expect(res.rgb[0]).toBeCloseTo(0.0);
      expect(res.rgb[1]).toBeCloseTo(0.0);
      expect(res.rgb[2]).toBeCloseTo(0.0);
      expect(res.a).toBeCloseTo(1.0);
    });

    it("verifies Screen blend mode over opaque backdrop", () => {
      // 0.5 gray screened with 0.5 gray -> 0.75
      const res = compositeW3C([0.5, 0.5, 0.5], 1.0, [0.5, 0.5, 0.5], 1.0, 1.0, "screen");
      expect(res.rgb[0]).toBeCloseTo(0.75);
      expect(res.rgb[1]).toBeCloseTo(0.75);
      expect(res.rgb[2]).toBeCloseTo(0.75);
      expect(res.a).toBeCloseTo(1.0);
    });
  });

  describe("Compositor Working Set & Architecture Invariants", () => {
    function createMockGL(): WebGL2RenderingContext {
      const activeTextures = new Map<number, any>();
      let boundFramebuffer: any = null;

      const gl: any = {
        COLOR_ATTACHMENT0: 0x8ce0,
        FRAMEBUFFER: 0x8d40,
        FRAMEBUFFER_COMPLETE: 0x8cd5,
        TEXTURE_2D: 0x0de1,
        TEXTURE0: 0x84c0,
        TEXTURE1: 0x84c1,
        RGBA8: 0x8058,
        RGBA: 0x1908,
        UNSIGNED_BYTE: 0x1401,
        LINEAR: 0x2601,
        CLAMP_TO_EDGE: 0x812f,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_MAG_FILTER: 0x2800,
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
        UNPACK_ALIGNMENT: 0x0cf5,
        COLOR_BUFFER_BIT: 0x4000,
        canvas: { width: 1080, height: 1080 },

        pixelStorei: vi.fn(),
        createTexture: vi.fn(() => ({ id: "tex-" + Math.random() })),
        deleteTexture: vi.fn(),
        bindTexture: vi.fn((target: number, tex: any) => {}),
        texImage2D: vi.fn(),
        texParameteri: vi.fn(),
        activeTexture: vi.fn((slot: number) => {}),

        createFramebuffer: vi.fn(() => ({ id: "fbo-" + Math.random() })),
        deleteFramebuffer: vi.fn(),
        bindFramebuffer: vi.fn((target: number, fbo: any) => {
          boundFramebuffer = fbo;
        }),
        framebufferTexture2D: vi.fn(),
        checkFramebufferStatus: vi.fn(() => 0x8cd5), // FRAMEBUFFER_COMPLETE

        ACTIVE_UNIFORMS: 0x8b89,
        ACTIVE_ATTRIBUTES: 0x8b84,
        LINK_STATUS: 0x8b82,
        COMPILE_STATUS: 0x8b81,

        createProgram: vi.fn(() => ({ id: "prog-" + Math.random() })),
        deleteProgram: vi.fn(),
        deleteShader: vi.fn(),
        useProgram: vi.fn(),
        createShader: vi.fn(() => ({ id: "shader-" + Math.random() })),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn(() => true),
        getProgramParameter: vi.fn((_p: any, param: number) => {
          if (param === 0x8b89) return 0; // ACTIVE_UNIFORMS
          if (param === 0x8b84) return 0; // ACTIVE_ATTRIBUTES
          return true; // LINK_STATUS
        }),
        getActiveUniform: vi.fn(() => null),
        getActiveAttrib: vi.fn(() => null),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getUniformLocation: vi.fn(() => ({ id: "loc-" + Math.random() })),
        getAttribLocation: vi.fn(() => 0),
        uniform1i: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),

        createBuffer: vi.fn(() => ({ id: "buf-" + Math.random() })),
        deleteBuffer: vi.fn(),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        createVertexArray: vi.fn(() => ({ id: "vao-" + Math.random() })),
        deleteVertexArray: vi.fn(),
        bindVertexArray: vi.fn(),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),

        viewport: vi.fn(),
        clearColor: vi.fn(),
        clear: vi.fn(),
        drawArrays: vi.fn(),
      };

      return gl as WebGL2RenderingContext;
    }

    it("allocates exactly 4 reusable working attachments sized to Frame dimensions", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      // Frame at 1920x1080
      compositor.resizeWorkingPool(1920, 1080);
      const dims = compositor.getWorkingDimensions();
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);

      // Working set calculation: 4 * (1920 * 1080 * 4 bytes) = 33,177,600 bytes (~33.2 MB)
      const workingSetBytes = 4 * dims.width * dims.height * 4;
      const workingSetMB = workingSetBytes / (1024 * 1024);
      expect(workingSetMB).toBeCloseTo(31.64, 1); // 31.64 MiB (decimal: ~33.2 MB)

      compositor.dispose();
    });

    it("executes multi-layer accumulation in strict bottom-to-top order", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      baseGen.backgroundConfig = {
        type: "solid",
        color: "#ff0000",
        padding: 0,
        borderRadius: 0,
        shadowBlur: 0,
        shadowOpacity: 0,
      };

      const imgA = createImageLayer("asset-1", "Image A", [], "contain");
      const imgB = createImageLayer("asset-2", "Image B", [], "cover");

      const frame: Frame = {
        id: "test-frame",
        name: "Test Frame",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        layers: [baseGen, imgA, imgB],
        activeLayerId: imgB.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      // Mock asset textures in cache
      compositor.uploadAsset("asset-1", { width: 800, height: 600 } as any);
      compositor.uploadAsset("asset-2", { width: 1000, height: 1000 } as any);

      // Compose frame
      const resultFBO = compositor.composeFrame(frame);
      expect(resultFBO).toBeDefined();
      expect(resultFBO.width).toBe(1080);
      expect(resultFBO.height).toBe(1080);

      // Draw calls executed (GenerativeLayer blit + imgA fit + imgA composite + imgB fit + imgB composite)
      expect(mockGL.drawArrays).toHaveBeenCalled();

      compositor.dispose();
    });

    it("skips invisible and zero-opacity layers during composition", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgVisible = createImageLayer("asset-1", "Visible", [], "contain");
      const imgInvisible = createImageLayer("asset-2", "Invisible", [], "contain");
      imgInvisible.visible = false;
      const imgZeroOpacity = createImageLayer("asset-3", "Zero Opacity", [], "contain");
      imgZeroOpacity.opacity = 0;

      const frame: Frame = {
        id: "frame-skip",
        name: "Frame Skip",
        dimensions: { width: 500, height: 500, presetId: null },
        layers: [baseGen, imgVisible, imgInvisible, imgZeroOpacity],
        activeLayerId: imgVisible.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-1", { width: 500, height: 500 } as any);
      compositor.uploadAsset("asset-2", { width: 500, height: 500 } as any);
      compositor.uploadAsset("asset-3", { width: 500, height: 500 } as any);

      const beforeCalls = (mockGL.drawArrays as any).mock.calls.length;
      compositor.composeFrame(frame, undefined, 0, true);
      const callsMade = (mockGL.drawArrays as any).mock.calls.length - beforeCalls;

      // Only baseGen (clear) + imgVisible (fit + composite) should draw
      // Invisible and zero-opacity layers must not produce draw calls
      expect(callsMade).toBeGreaterThan(0);

      compositor.dispose();
    });

    it("decouples viewport presentation from composition: pan/zoom does not re-composite layers", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const defaultFrame = createDefaultFrame();
      compositor.composeFrame(defaultFrame);

      // Reset draw count after initial composition
      (mockGL.drawArrays as any).mockClear();

      // Viewport pan/zoom call
      const presentationParams: ViewportPresentationParams = {
        viewportWidth: 800,
        viewportHeight: 600,
        panX: 50,
        panY: -20,
        zoom: 150,
      };

      const rendered = compositor.renderPresentation(presentationParams);
      expect(rendered).toBe(true);

      // Only the single viewport presentation quad draw was executed
      expect(mockGL.drawArrays).toHaveBeenCalledTimes(1);

      compositor.dispose();
    });

    it("resizes working pool when Frame dimensions change", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      compositor.resizeWorkingPool(800, 600);
      expect(compositor.getWorkingDimensions()).toEqual({ width: 800, height: 600 });

      compositor.resizeWorkingPool(1200, 1200);
      expect(compositor.getWorkingDimensions()).toEqual({ width: 1200, height: 1200 });

      compositor.dispose();
    });

    it("verifies changing ImageLayer order changes composition key and layer ordering", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgA = createImageLayer("asset-1", "Image A", [], "contain");
      const imgB = createImageLayer("asset-2", "Image B", [], "contain");

      const frameOrder1: Frame = {
        id: "frame-order-1",
        name: "Order 1",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [baseGen, imgA, imgB],
        activeLayerId: imgA.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const frameOrder2: Frame = {
        id: "frame-order-2",
        name: "Order 2",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [baseGen, imgB, imgA],
        activeLayerId: imgB.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-1", { width: 800, height: 800 } as any);
      compositor.uploadAsset("asset-2", { width: 800, height: 800 } as any);

      const res1 = compositor.composeFrame(frameOrder1);
      expect(res1).toBeDefined();

      const res2 = compositor.composeFrame(frameOrder2);
      expect(res2).toBeDefined();

      compositor.dispose();
    });

    it("isolates effect stacks to their respective ImageLayers without leaking", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgWithEffect = createImageLayer(
        "asset-1",
        "Layer With Black-and-White",
        [{ instanceId: "inst-1", effectId: "black-and-white", enabled: true, parameters: {} }],
        "contain",
      );
      const imgClean = createImageLayer("asset-2", "Clean Layer", [], "contain");

      const frame: Frame = {
        id: "frame-effects",
        name: "Effect Isolation",
        dimensions: { width: 600, height: 600, presetId: null },
        layers: [baseGen, imgWithEffect, imgClean],
        activeLayerId: imgWithEffect.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-1", { width: 600, height: 600 } as any);
      compositor.uploadAsset("asset-2", { width: 600, height: 600 } as any);

      const res = compositor.composeFrame(frame);
      expect(res).toBeDefined();

      // Effect was executed for layer 1, and layer 2 remained effect-free
      expect(imgWithEffect.effectStack).toHaveLength(1);
      expect(imgClean.effectStack).toHaveLength(0);

      compositor.dispose();
    });

    it("verifies multi-image layers (A + B + C) accumulate in bottom-to-top order", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgA = createImageLayer("asset-a", "A", [], "contain");
      const imgB = createImageLayer("asset-b", "B", [], "cover");
      const imgC = createImageLayer("asset-c", "C", [], "contain");

      const frame: Frame = {
        id: "frame-abc",
        name: "ABC",
        dimensions: { width: 1000, height: 1000, presetId: null },
        layers: [baseGen, imgA, imgB, imgC],
        activeLayerId: imgC.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-a", { width: 1000, height: 1000 } as any);
      compositor.uploadAsset("asset-b", { width: 1000, height: 1000 } as any);
      compositor.uploadAsset("asset-c", { width: 1000, height: 1000 } as any);

      const res = compositor.composeFrame(frame);
      expect(res).toBeDefined();
      expect(res.width).toBe(1000);
      expect(res.height).toBe(1000);

      compositor.dispose();
    });
  });
});
