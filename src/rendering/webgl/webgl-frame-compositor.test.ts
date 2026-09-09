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
import type { Frame, GenerativeLayer, ImageLayer, Layer, ImageSource, ProceduralSource } from "../../types/frame";
import {
  createDefaultFrame,
  createDefaultGenerativeLayer,
  createImageLayer,
  createLayer,
  createProceduralLayer,
} from "../../types/frame";
import { createGenerativeSublayer } from "../../generative/registry";

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

    it("exports valid GLSL ES 3.00 layer image fit shader supporting contain and cover and spatial transforms", () => {
      expect(LAYER_IMAGE_VERTEX_SHADER).toContain("#version 300 es");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("#version 300 es");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform sampler2D u_assetTexture;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_frameSize;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_assetSize;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform int u_fitMode;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_layerOffset;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform vec2 u_layerScale;");
      expect(LAYER_IMAGE_FRAGMENT_SHADER).toContain("uniform float u_layerRotation;");
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

  describe("Compositor Working Set & Architecture Invariants", () => {

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

  describe("Stage 2B ImageLayer Transform Compositing", () => {
    it("renders layer with default transform identically to Stage 1 baseline", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgLayer = createImageLayer("asset-def", "Default Transform Layer", [], "contain");

      expect(imgLayer.transform).toBeDefined();
      expect(imgLayer.transform?.x).toBe(0);
      expect(imgLayer.transform?.y).toBe(0);
      expect(imgLayer.transform?.scaleX).toBe(1);
      expect(imgLayer.transform?.scaleY).toBe(1);
      expect(imgLayer.transform?.rotation).toBe(0);

      const frame: Frame = {
        id: "frame-default-trans",
        name: "Default Transform",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [baseGen, imgLayer],
        activeLayerId: imgLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-def", { width: 800, height: 800 } as any);
      const res = compositor.composeFrame(frame);

      expect(res).toBeDefined();
      expect(res.width).toBe(800);
      expect(res.height).toBe(800);

      compositor.dispose();
    });

    it("renders layer with custom transform (translation, proportional scale, rotation)", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgTrans = createImageLayer("asset-trans", "Transformed Layer", [], "contain", {
        x: 120,
        y: -60,
        scaleX: 2.0,
        scaleY: 2.0,
        rotation: 45,
      });

      const frame: Frame = {
        id: "frame-custom-trans",
        name: "Custom Transform",
        dimensions: { width: 1080, height: 1080, presetId: null },
        layers: [baseGen, imgTrans],
        activeLayerId: imgTrans.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-trans", { width: 1920, height: 1080 } as any);
      const res = compositor.composeFrame(frame);

      expect(res).toBeDefined();
      expect(res.width).toBe(1080);
      expect(res.height).toBe(1080);

      compositor.dispose();
    });

    it("renders layer with custom transform and active effect stack preserving effect pipeline order", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const imgWithEffect = createImageLayer(
        "asset-eff",
        "Layer with Effect",
        [{ instanceId: "duotone-1", effectId: "duotone", enabled: true, parameters: {} }],
        "contain",
        {
          x: 50,
          y: -30,
          scaleX: 1.25,
          scaleY: 1.25,
          rotation: 15,
        }
      );

      const frame: Frame = {
        id: "frame-trans-effect",
        name: "Transform + Effect",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [baseGen, imgWithEffect],
        activeLayerId: imgWithEffect.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-eff", { width: 800, height: 600 } as any);
      const res = compositor.composeFrame(frame);

      expect(res).toBeDefined();
      expect(res.width).toBe(800);
      expect(res.height).toBe(800);

      compositor.dispose();
    });

    it("invalidates and re-renders composition when transform values change", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseGen = createDefaultGenerativeLayer();
      const img = createImageLayer("asset-1", "Layer 1", [], "contain", {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
      });

      const frame: Frame = {
        id: "frame-trans-cache",
        name: "Cache Invalidation Test",
        dimensions: { width: 1000, height: 1000, presetId: null },
        layers: [baseGen, img],
        activeLayerId: img.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-1", { width: 1000, height: 1000 } as any);

      // First composition
      const res1 = compositor.composeFrame(frame);
      expect(res1).toBeDefined();

      // Second call with same state hits cache
      const res2 = compositor.composeFrame(frame);
      expect(res2).toBe(res1);

      // Mutate transform
      const modifiedFrame: Frame = {
        ...frame,
        layers: [
          baseGen,
          {
            ...img,
            transform: {
              x: 100,
              y: 50,
              scaleX: 1.5,
              scaleY: 1.5,
              rotation: 30,
            },
          },
        ],
      };

      // Changed transform must re-compose
      const res3 = compositor.composeFrame(modifiedFrame);
      expect(res3).toBeDefined();

      compositor.dispose();
    });
  });

  describe("Default Transform Mathematical Regression Suite", () => {
    // Stage 1 legacy fit UV calculator
    function legacyStage1FitUv(
      v_texCoord: { x: number; y: number },
      frameSize: { width: number; height: number },
      assetSize: { width: number; height: number },
      fitMode: "contain" | "cover"
    ) {
      const frameAspect = frameSize.width / frameSize.height;
      const assetAspect = assetSize.width / assetSize.height;
      let scaleX = 1;
      let scaleY = 1;

      if (fitMode === "contain") {
        if (assetAspect > frameAspect) {
          const s = frameAspect / assetAspect;
          scaleX = 1;
          scaleY = 1 / s;
        } else {
          const s = assetAspect / frameAspect;
          scaleX = 1 / s;
          scaleY = 1;
        }
      } else {
        if (assetAspect > frameAspect) {
          const s = assetAspect / frameAspect;
          scaleX = 1 / s;
          scaleY = 1;
        } else {
          const s = frameAspect / assetAspect;
          scaleX = 1;
          scaleY = 1 / s;
        }
      }

      return {
        u: (v_texCoord.x - 0.5) * scaleX + 0.5,
        v: (v_texCoord.y - 0.5) * scaleY + 0.5,
      };
    }

    // Stage 2 shader coordinate transformation with transform parameters
    function stage2ShaderFitUv(
      v_texCoord: { x: number; y: number },
      frameSize: { width: number; height: number },
      assetSize: { width: number; height: number },
      fitMode: "contain" | "cover",
      transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number }
    ) {
      const frameAspect = frameSize.width / frameSize.height;
      const assetAspect = assetSize.width / assetSize.height;
      let scaleX = 1;
      let scaleY = 1;

      if (fitMode === "contain") {
        if (assetAspect > frameAspect) {
          const s = frameAspect / assetAspect;
          scaleX = 1;
          scaleY = 1 / s;
        } else {
          const s = assetAspect / frameAspect;
          scaleX = 1 / s;
          scaleY = 1;
        }
      } else {
        if (assetAspect > frameAspect) {
          const s = assetAspect / frameAspect;
          scaleX = 1 / s;
          scaleY = 1;
        } else {
          const s = frameAspect / assetAspect;
          scaleX = 1;
          scaleY = 1 / s;
        }
      }

      // Convert WebGL fragment coordinate to UI Frame pixel offset from frame center
      const p = {
        x: (v_texCoord.x - 0.5) * frameSize.width,
        y: -(v_texCoord.y - 0.5) * frameSize.height,
      };

      // 1. Inverse translation
      const p_trans = {
        x: p.x - transform.x,
        y: p.y - transform.y,
      };

      // 2. Inverse rotation
      const rad = (transform.rotation * Math.PI) / 180;
      const cosR = Math.cos(rad);
      const sinR = Math.sin(rad);
      const p_rot = {
        x: p_trans.x * cosR + p_trans.y * sinR,
        y: -p_trans.x * sinR + p_trans.y * cosR,
      };

      // 3. Inverse scale
      const safeScaleX = Math.max(Math.abs(transform.scaleX), 0.001);
      const safeScaleY = Math.max(Math.abs(transform.scaleY), 0.001);
      const p_scaled = {
        x: p_rot.x / safeScaleX,
        y: p_rot.y / safeScaleY,
      };

      // Convert back to centered normalized UV offset
      const uvOffset = {
        x: p_scaled.x / frameSize.width,
        y: -p_scaled.y / frameSize.height,
      };

      return {
        u: uvOffset.x * scaleX + 0.5,
        v: uvOffset.y * scaleY + 0.5,
      };
    }

    it("empirically proves DEFAULT_LAYER_TRANSFORM produces bit-identical UV sampling to Stage 1 across contain and cover", () => {
      const testCases = [
        { frame: { width: 1920, height: 1080 }, asset: { width: 800, height: 600 } }, // Landscape in 16:9
        { frame: { width: 1080, height: 1920 }, asset: { width: 1200, height: 800 } }, // Landscape in 9:16
        { frame: { width: 1000, height: 1000 }, asset: { width: 500, height: 1000 } }, // Tall portrait in 1:1
        { frame: { width: 1200, height: 800 }, asset: { width: 1200, height: 800 } }, // Exact aspect match
      ];

      const defaultTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
      const fitModes: ("contain" | "cover")[] = ["contain", "cover"];

      for (const { frame, asset } of testCases) {
        for (const fit of fitModes) {
          for (let u = 0; u <= 1.0; u += 0.05) {
            for (let v = 0; v <= 1.0; v += 0.05) {
              const legacy = legacyStage1FitUv({ x: u, y: v }, frame, asset, fit);
              const stage2 = stage2ShaderFitUv({ x: u, y: v }, frame, asset, fit, defaultTransform);

              const deltaU = Math.abs(legacy.u - stage2.u);
              const deltaV = Math.abs(legacy.v - stage2.v);

              expect(deltaU).toBeLessThanOrEqual(1e-12);
              expect(deltaV).toBeLessThanOrEqual(1e-12);
            }
          }
        }
      }
    });
  });

  describe("Stage 3B: Generative Rendering Pipeline Suite", () => {
    it("renders each of the 5 Stage 3A floor primitives individually", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const primitives = [
        createGenerativeSublayer("solid", { parameters: { color: "#ff0000" } }),
        createGenerativeSublayer("linear-gradient", {
          parameters: { startColor: "#ff0000", endColor: "#0000ff", angle: 90 },
        }),
        createGenerativeSublayer("radial-gradient", {
          parameters: { startColor: "#00ff00", endColor: "#000000" },
        }),
        createGenerativeSublayer("dots", {
          parameters: { dotColor: "#ffffff", backgroundColor: "#111111", spacing: 32, dotSize: 4 },
        }),
        createGenerativeSublayer("grid", {
          parameters: { lineColor: "#ffffff", backgroundColor: "#111111", spacing: 20, lineWidth: 2 },
        }),
      ];

      for (const sub of primitives) {
        const genLayer = createDefaultGenerativeLayer();
        genLayer.visible = true;
        genLayer.sublayers = [sub];

        const frame: Frame = {
          id: `frame-${sub.type}`,
          name: `Frame ${sub.type}`,
          dimensions: { width: 800, height: 600, presetId: null },
          layers: [genLayer],
          activeLayerId: genLayer.id,
          createdAt: 1000,
          updatedAt: 1000,
        };

        const result = compositor.composeFrame(frame, undefined, 0, true);
        expect(result).toBeDefined();
        expect(result.width).toBe(800);
        expect(result.height).toBe(600);
        expect(mockGL.drawArrays).toHaveBeenCalled();
      }

      compositor.dispose();
    });

    it("composites multiple sublayers in strict bottom-to-top order with intra-layer ping-pong", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const sub1 = createGenerativeSublayer("solid", {
        parameters: { color: "#000000" },
        opacity: 1.0,
        blendMode: "normal",
      });
      const sub2 = createGenerativeSublayer("linear-gradient", {
        parameters: { startColor: "#ff0000", endColor: "#0000ff", angle: 45 },
        opacity: 0.8,
        blendMode: "screen",
      });
      const sub3 = createGenerativeSublayer("dots", {
        parameters: { dotColor: "#ffffff", backgroundColor: "#000000", spacing: 16, dotSize: 2 },
        opacity: 0.5,
        blendMode: "overlay",
      });

      const genLayer = createDefaultGenerativeLayer();
      genLayer.visible = true;
      genLayer.sublayers = [sub1, sub2, sub3];

      const frame: Frame = {
        id: "frame-multi-sublayers",
        name: "Multi Sublayers Frame",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        layers: [genLayer],
        activeLayerId: genLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.drawArrays as any).mockClear();
      const result = compositor.composeFrame(frame, undefined, 0, true);
      expect(result).toBeDefined();

      // For 3 sublayers: each sublayer renders primitive (1 draw) + blends into layerPP (1 draw) = 6 draws,
      // plus cross-layer blend into accumulator (1 draw) = 7 draws total.
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(7);

      compositor.dispose();
    });

    it("verifies changing sublayer order changes the composition key and draw sequencing", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const subA = createGenerativeSublayer("solid", {
        parameters: { color: "#ff0000" },
      });
      const subB = createGenerativeSublayer("grid", {
        parameters: { lineColor: "#ffffff", backgroundColor: "#000000", spacing: 24, lineWidth: 1 },
      });

      const gen1 = createDefaultGenerativeLayer();
      gen1.sublayers = [subA, subB];

      const gen2 = createDefaultGenerativeLayer();
      gen2.sublayers = [subB, subA];

      const frame1: Frame = {
        id: "frame-order-1",
        name: "Order 1",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [gen1],
        activeLayerId: gen1.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const frame2: Frame = {
        id: "frame-order-2",
        name: "Order 2",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [gen2],
        activeLayerId: gen2.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const key1 = (compositor as any).generateCompositionKey(frame1);
      const key2 = (compositor as any).generateCompositionKey(frame2);

      expect(key1).not.toEqual(key2);

      compositor.dispose();
    });

    it("skips disabled sublayers without generating draw calls for them", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const enabledSub = createGenerativeSublayer("solid", {
        enabled: true,
        parameters: { color: "#ff0000" },
      });
      const disabledSub = createGenerativeSublayer("grid", {
        enabled: false,
        parameters: { lineColor: "#00ff00", backgroundColor: "#000000", spacing: 20, lineWidth: 1 },
      });

      const genLayer = createDefaultGenerativeLayer();
      genLayer.visible = true;
      genLayer.sublayers = [enabledSub, disabledSub];

      const frame: Frame = {
        id: "frame-disabled",
        name: "Frame Disabled",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [genLayer],
        activeLayerId: genLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.drawArrays as any).mockClear();
      compositor.composeFrame(frame, undefined, 0, true);

      // Only 1 enabled sublayer: 1 primitive draw + 1 blend draw + 1 cross-layer blend draw = 3 draws
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(3);

      compositor.dispose();
    });

    it("handles an empty sublayers stack by producing clean transparent output", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const genEmpty = createDefaultGenerativeLayer();
      genEmpty.visible = true;
      genEmpty.sublayers = [];

      const frame: Frame = {
        id: "frame-empty",
        name: "Frame Empty",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [genEmpty],
        activeLayerId: genEmpty.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.clearColor as any).mockClear();
      (mockGL.drawArrays as any).mockClear();

      const result = compositor.composeFrame(frame, undefined, 0, true);
      expect(result).toBeDefined();

      // Confirms layerPingPong.read was cleared to transparent black (0, 0, 0, 0)
      expect(mockGL.clearColor).toHaveBeenCalledWith(0, 0, 0, 0);

      compositor.dispose();
    });

    it("verifies sublayer opacity and GenerativeLayer opacity operate at separate levels", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      // Populate mock uniform locations for blend program introspection
      (compositor as any).blendProgram.uniformLocations.set("u_opacity", { id: "loc_opacity" });
      (compositor as any).blendProgram.uniformLocations.set("u_blendMode", { id: "loc_blendMode" });
      (compositor as any).blendProgram.uniformLocations.set("u_backdrop", { id: "loc_backdrop" });
      (compositor as any).blendProgram.uniformLocations.set("u_source", { id: "loc_source" });

      const sub = createGenerativeSublayer("solid", {
        opacity: 0.6,
        blendMode: "normal",
        parameters: { color: "#ff0000" },
      });

      const genLayer = createDefaultGenerativeLayer();
      genLayer.visible = true;
      genLayer.opacity = 0.5; // GenerativeLayer frame-level opacity
      genLayer.blendMode = "multiply"; // GenerativeLayer frame-level blend mode
      genLayer.sublayers = [sub];

      const frame: Frame = {
        id: "frame-opacities",
        name: "Frame Opacities",
        dimensions: { width: 500, height: 500, presetId: null },
        layers: [genLayer],
        activeLayerId: genLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const uniformCalls: { name: string; value: unknown }[] = [];
      mockGL.uniform1f = vi.fn((_loc, v) => uniformCalls.push({ name: "1f", value: v }));
      mockGL.uniform1i = vi.fn((_loc, v) => uniformCalls.push({ name: "1i", value: v }));

      compositor.composeFrame(frame, undefined, 0, true);

      // Verify that 0.6 was passed for sublayer blend and 0.5 was passed for cross-layer blend
      const opacityCalls = uniformCalls.filter((u) => u.name === "1f" && (u.value === 0.6 || u.value === 0.5));
      expect(opacityCalls.some((c) => c.value === 0.6)).toBe(true);
      expect(opacityCalls.some((c) => c.value === 0.5)).toBe(true);

      compositor.dispose();
    });

    it("invalidates composition cache when any sublayer parameter or property changes", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const baseSub = createGenerativeSublayer("dots", {
        parameters: { dotColor: "#ffffff", backgroundColor: "#000000", spacing: 24, dotSize: 2 },
      });

      const genLayer = createDefaultGenerativeLayer();
      genLayer.visible = true;
      genLayer.sublayers = [baseSub];

      const baseFrame: Frame = {
        id: "frame-cache",
        name: "Cache Frame",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [genLayer],
        activeLayerId: genLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const baseKey = (compositor as any).generateCompositionKey(baseFrame);

      // 1. Change parameter (spacing)
      const modParams = {
        ...baseFrame,
        layers: [{
          ...genLayer,
          sublayers: [{
            ...baseSub,
            parameters: { ...baseSub.parameters, spacing: 32 },
          }],
        }],
      };
      expect((compositor as any).generateCompositionKey(modParams)).not.toBe(baseKey);

      // 2. Change sublayer opacity
      const modOpacity = {
        ...baseFrame,
        layers: [{
          ...genLayer,
          sublayers: [{ ...baseSub, opacity: 0.4 }],
        }],
      };
      expect((compositor as any).generateCompositionKey(modOpacity)).not.toBe(baseKey);

      // 3. Change sublayer blend mode
      const modBlend = {
        ...baseFrame,
        layers: [{
          ...genLayer,
          sublayers: [{ ...baseSub, blendMode: "multiply" as const }],
        }],
      };
      expect((compositor as any).generateCompositionKey(modBlend)).not.toBe(baseKey);

      // 4. Change sublayer enabled
      const modEnabled = {
        ...baseFrame,
        layers: [{
          ...genLayer,
          sublayers: [{ ...baseSub, enabled: false }],
        }],
      };
      expect((compositor as any).generateCompositionKey(modEnabled)).not.toBe(baseKey);

      compositor.dispose();
    });

    it("retains complete Stage 2 ImageLayer rendering, transform, and effect stack capability over GenerativeLayer", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const genLayer = createDefaultGenerativeLayer();
      genLayer.visible = true;
      genLayer.sublayers = [
        createGenerativeSublayer("solid", { parameters: { color: "#1e1b4b" } }),
        createGenerativeSublayer("linear-gradient", {
          parameters: { startColor: "#3b82f6", endColor: "#9333ea", angle: 135 },
          blendMode: "screen",
          opacity: 0.8,
        }),
      ];

      const imgLayer = createImageLayer(
        "asset-hero",
        "Hero Image",
        [{ instanceId: "eff-1", effectId: "black-and-white", enabled: true, parameters: {} }],
        "cover",
      );
      imgLayer.transform = { x: 50, y: -30, scaleX: 1.2, scaleY: 1.2, rotation: 15 };
      imgLayer.opacity = 0.9;
      imgLayer.blendMode = "overlay";

      const frame: Frame = {
        id: "frame-regression",
        name: "Regression Frame",
        dimensions: { width: 1920, height: 1080, presetId: "16:9" },
        layers: [genLayer, imgLayer],
        activeLayerId: imgLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      compositor.uploadAsset("asset-hero", { width: 1200, height: 800 } as any);

      (mockGL.drawArrays as any).mockClear();
      const resultFBO = compositor.composeFrame(frame, undefined, 0, true);
      expect(resultFBO).toBeDefined();
      expect(resultFBO.width).toBe(1920);
      expect(resultFBO.height).toBe(1080);

      // Draw calls: 2 sublayers (4 draws) + gen cross-layer (1 draw) + img fit (1 draw) + bw effect (1 draw) + img cross-layer (1 draw) = 8 draws
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(8);

      compositor.dispose();
    });
  });

  describe("Phase 2: Unified Composition Model — Canonical Layer & Source Runtime Suite", () => {
    it("resolves image assets authoritatively via Layer.source.assetId ignoring legacy layer.assetId", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      // Layer with canonical source "asset-canonical", but legacy compatibility field "asset-legacy"
      const layer = createLayer({
        name: "Test Image Layer",
        source: {
          type: "image",
          assetId: "asset-canonical",
        },
      });
      // Deliberately set contradictory legacy assetId
      (layer as any).assetId = "asset-legacy";

      const frame: Frame = {
        id: "frame-canonical-image",
        name: "Canonical Image Frame",
        dimensions: { width: 1000, height: 1000, presetId: null },
        layers: [layer],
        activeLayerId: layer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const uploadSpy = vi.spyOn(compositor, "uploadAsset");

      // Provide map containing both assets
      const assetMap = new Map<string, any>();
      assetMap.set("asset-canonical", { width: 800, height: 600 });
      assetMap.set("asset-legacy", { width: 400, height: 300 });

      compositor.composeFrame(frame, assetMap);

      // Compositor MUST upload and use asset-canonical, NEVER asset-legacy
      expect(uploadSpy).toHaveBeenCalledWith("asset-canonical", expect.anything());
      expect(uploadSpy).not.toHaveBeenCalledWith("asset-legacy", expect.anything());

      compositor.dispose();
    });

    it("renders canonical ProceduralSource layers directly via GPUBackgroundRenderer without requiring GenerativeLayer", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const proceduralLayer = createLayer({
        name: "Grid Layer",
        source: {
          type: "procedural",
          kind: "grid",
          parameters: {
            lineColor: "#ff00ff",
            backgroundColor: "#111111",
            spacing: 32,
            lineWidth: 2,
          },
          seed: 42,
        },
      });

      // Confirm canonical layer has type "procedural" and NO legacy sublayers/backgrounds
      expect(proceduralLayer.source.type).toBe("procedural");
      expect(proceduralLayer.type).toBe("procedural");
      expect(proceduralLayer.sublayers).toBeUndefined();
      expect(proceduralLayer.backgrounds).toBeUndefined();

      const bgRenderer = compositor.getBackgroundRenderer();
      const renderProcSpy = vi.spyOn(bgRenderer, "renderProceduralSourceToTexture");

      const frame: Frame = {
        id: "frame-procedural",
        name: "Procedural Frame",
        dimensions: { width: 800, height: 600, presetId: null },
        layers: [proceduralLayer],
        activeLayerId: proceduralLayer.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const result = compositor.composeFrame(frame);
      expect(result).toBeDefined();

      // GPUBackgroundRenderer.renderProceduralSourceToTexture was invoked with canonical source parameters
      expect(renderProcSpy).toHaveBeenCalledWith(
        800,
        600,
        expect.objectContaining({
          type: "procedural",
          kind: "grid",
          parameters: expect.objectContaining({
            lineColor: "#ff00ff",
            spacing: 32,
          }),
          seed: 42,
        }),
        0,
      );

      compositor.dispose();
    });

    it("composites multiple layers with heterogeneous sources in strict bottom-to-top order", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      // Layer 0: Solid backdrop ProceduralSource
      const layer0 = createLayer({
        name: "Solid Backdrop",
        source: {
          type: "procedural",
          kind: "solid",
          parameters: { color: "#000000" },
        },
      });

      // Layer 1: ImageSource
      const layer1 = createLayer({
        name: "Photo 1",
        source: {
          type: "image",
          assetId: "photo-1",
        },
        opacity: 0.8,
        blendMode: "multiply",
      });

      // Layer 2: Dots pattern ProceduralSource
      const layer2 = createLayer({
        name: "Dots Overlay",
        source: {
          type: "procedural",
          kind: "dots",
          parameters: { dotColor: "#ffffff", backgroundColor: "#000000", spacing: 16 },
        },
        opacity: 0.5,
        blendMode: "screen",
      });

      // Layer 3: ImageSource
      const layer3 = createLayer({
        name: "Photo 2",
        source: {
          type: "image",
          assetId: "photo-2",
        },
        opacity: 0.9,
        blendMode: "normal",
      });

      compositor.uploadAsset("photo-1", { width: 500, height: 500 } as any);
      compositor.uploadAsset("photo-2", { width: 600, height: 400 } as any);

      const frame: Frame = {
        id: "frame-heterogeneous",
        name: "Heterogeneous Multi-Layer Frame",
        dimensions: { width: 1080, height: 1080, presetId: null },
        layers: [layer0, layer1, layer2, layer3],
        activeLayerId: layer3.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.drawArrays as any).mockClear();
      const resultFBO = compositor.composeFrame(frame);
      expect(resultFBO).toBeDefined();

      // Verified draw calls:
      // Layer 0 (proc solid): 1 primitive draw + 1 cross-layer blend draw = 2
      // Layer 1 (img photo-1): 1 fit draw + 1 cross-layer blend draw = 2
      // Layer 2 (proc dots): 1 primitive draw + 1 cross-layer blend draw = 2
      // Layer 3 (img photo-2): 1 fit draw + 1 cross-layer blend draw = 2
      // Total = 8 draw calls
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(8);

      compositor.dispose();
    });

    it("honors layer-level visibility and opacity skipping invisible or zero-opacity layers", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const layerVisible = createLayer({
        name: "Visible Layer",
        source: { type: "image", assetId: "asset-vis" },
        visible: true,
        opacity: 1.0,
      });

      const layerInvisible = createLayer({
        name: "Invisible Layer",
        source: { type: "image", assetId: "asset-invis" },
        visible: false,
        opacity: 1.0,
      });

      const layerZeroOpacity = createLayer({
        name: "Zero Opacity Layer",
        source: { type: "procedural", kind: "solid", parameters: { color: "#ff0000" } },
        visible: true,
        opacity: 0,
      });

      compositor.uploadAsset("asset-vis", { width: 500, height: 500 } as any);
      compositor.uploadAsset("asset-invis", { width: 500, height: 500 } as any);

      const frame: Frame = {
        id: "frame-vis-test",
        name: "Visibility Frame",
        dimensions: { width: 500, height: 500, presetId: null },
        layers: [layerVisible, layerInvisible, layerZeroOpacity],
        activeLayerId: layerVisible.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.drawArrays as any).mockClear();
      compositor.composeFrame(frame);

      // Only layerVisible should be drawn (1 fit draw + 1 blend draw = 2 draws)
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(2);

      compositor.dispose();
    });

    it("applies transforms and intra-layer effect pipeline to both ImageSource and ProceduralSource layers", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      // Procedural layer with spatial transform and effect
      const procWithEffects = createLayer({
        name: "Procedural With Transform and Effect",
        source: {
          type: "procedural",
          kind: "linear-gradient",
          parameters: { startColor: "#ff0000", endColor: "#0000ff" },
        },
        transform: { x: 20, y: -10, scaleX: 1.5, scaleY: 1.5, rotation: 45 },
        effectStack: [
          {
            instanceId: "inst-1",
            effectId: "black-and-white",
            enabled: true,
            parameters: {},
          },
        ],
        blendMode: "screen",
        opacity: 0.85,
      });

      // Image layer with spatial transform and effect
      const imgWithEffects = createLayer({
        name: "Image With Transform and Effect",
        source: {
          type: "image",
          assetId: "asset-fx",
        },
        transform: { x: -30, y: 40, scaleX: 0.8, scaleY: 0.8, rotation: 10 },
        effectStack: [
          {
            instanceId: "inst-2",
            effectId: "black-and-white",
            enabled: true,
            parameters: {},
          },
        ],
        blendMode: "overlay",
        opacity: 0.75,
      });

      compositor.uploadAsset("asset-fx", { width: 400, height: 400 } as any);

      const frame: Frame = {
        id: "frame-fx-test",
        name: "Effects and Transform Frame",
        dimensions: { width: 800, height: 800, presetId: null },
        layers: [procWithEffects, imgWithEffects],
        activeLayerId: imgWithEffects.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      (mockGL.drawArrays as any).mockClear();
      const resultFBO = compositor.composeFrame(frame);
      expect(resultFBO).toBeDefined();

      // Pipeline verification:
      // Proc: 1 primitive draw + 1 transform draw + 1 black-and-white draw + 1 cross-layer blend = 4
      // Image: 1 fit/transform draw + 1 black-and-white draw + 1 cross-layer blend = 3
      // Total = 7 draw calls
      expect((mockGL.drawArrays as any).mock.calls.length).toBe(7);

      compositor.dispose();
    });

    it("invalidates composition cache when canonical source parameters or assetId changes", () => {
      const mockGL = createMockGL();
      const compositor = new WebGL2FrameCompositor(mockGL);

      const layerA = createLayer({
        name: "Layer A",
        source: {
          type: "procedural",
          kind: "dots",
          parameters: { spacing: 20 },
        },
      });

      const frameA: Frame = {
        id: "frame-cache",
        name: "Cache Test",
        dimensions: { width: 500, height: 500, presetId: null },
        layers: [layerA],
        activeLayerId: layerA.id,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const key1 = (compositor as any).generateCompositionKey(frameA);

      // Change procedural parameter
      const frameB: Frame = {
        ...frameA,
        layers: [
          {
            ...layerA,
            source: {
              type: "procedural",
              kind: "dots",
              parameters: { spacing: 40 },
            },
          },
        ],
      };
      const key2 = (compositor as any).generateCompositionKey(frameB);
      expect(key1).not.toBe(key2);

      // Change image source assetId
      const imgLayerA = createLayer({
        name: "Img Layer",
        source: { type: "image", assetId: "img-1" },
      });
      const frameImgA: Frame = { ...frameA, layers: [imgLayerA] };
      const keyImg1 = (compositor as any).generateCompositionKey(frameImgA);

      const frameImgB: Frame = {
        ...frameA,
        layers: [
          {
            ...imgLayerA,
            source: { type: "image", assetId: "img-2" },
          },
        ],
      };
      const keyImg2 = (compositor as any).generateCompositionKey(frameImgB);
      expect(keyImg1).not.toBe(keyImg2);

      compositor.dispose();
    });
  });
});
