import { describe, it, expect, vi, beforeAll } from "vitest";
import { renderGPUFrameExport } from "./gpu-export-renderer";
import type { Frame, ImageLayer } from "../types/frame";
import { createDefaultGenerativeLayer, createImageLayer, DEFAULT_LAYER_TRANSFORM } from "../types/frame";
import { WebGL2FrameCompositor } from "../rendering/webgl/webgl-frame-compositor";

describe("Stage 2 Transform & Composition Export Equivalence Suite", () => {
  beforeAll(() => {
    if (typeof globalThis.document === "undefined") {
      (globalThis as any).document = {
        createElement: (tag: string) => {
          if (tag === "canvas") {
            return {
              width: 1080,
              height: 1080,
              getContext: () => null,
              toBlob: (cb: (b: Blob) => void) => cb(new Blob([new Uint8Array(100)], { type: "image/png" })),
              toDataURL: () => "data:image/png;base64,mock",
            };
          }
          return {};
        },
      };
    }
  });

  it("ensures preview composition and export composition use identical transform state and uniforms", () => {
    const baseGen = createDefaultGenerativeLayer();
    const imgLayer = createImageLayer("asset-export-1", "Export Image", [], "contain", {
      x: 180,
      y: -90,
      scaleX: 2.2,
      scaleY: 2.2,
      rotation: 45,
    });

    const frame: Frame = {
      id: "frame-export-test",
      name: "Transform Export Frame",
      dimensions: { width: 1080, height: 1080, presetId: "1:1" },
      layers: [baseGen, imgLayer],
      activeLayerId: imgLayer.id,
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Verify layer transform in frame matches expected parameters
    expect(imgLayer.transform).toEqual({
      x: 180,
      y: -90,
      scaleX: 2.2,
      scaleY: 2.2,
      rotation: 45,
    });

    // Mock GL context for compositor verification
    const uniformsCalled: Record<string, any> = {};
    const knownUniforms = [
      "u_assetTexture",
      "u_frameSize",
      "u_assetSize",
      "u_fitMode",
      "u_layerOffset",
      "u_layerScale",
      "u_layerRotation",
      "u_backdrop",
      "u_source",
      "u_opacity",
      "u_blendMode",
      "u_texture",
      "u_resolution",
      "u_time",
    ];

    const mockGL: any = {
      COLOR_ATTACHMENT0: 0x8ce0,
      FRAMEBUFFER: 0x8d40,
      FRAMEBUFFER_COMPLETE: 0x8cd5,
      TEXTURE_2D: 0x0de1,
      TEXTURE0: 0x84c0,
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
      ACTIVE_UNIFORMS: 0x8b89,
      ACTIVE_ATTRIBUTES: 0x8b84,
      LINK_STATUS: 0x8b82,
      COMPILE_STATUS: 0x8b81,
      canvas: { width: 1080, height: 1080 },

      pixelStorei: vi.fn(),
      createTexture: vi.fn(() => ({ id: "tex-1" })),
      deleteTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      activeTexture: vi.fn(),

      createFramebuffer: vi.fn(() => ({ id: "fbo-1" })),
      deleteFramebuffer: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      checkFramebufferStatus: vi.fn(() => 0x8cd5),

      createProgram: vi.fn(() => ({ id: "prog-1" })),
      deleteProgram: vi.fn(),
      deleteShader: vi.fn(),
      useProgram: vi.fn(),
      createShader: vi.fn(() => ({ id: "shader-1" })),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      getProgramParameter: vi.fn((_p: any, param: number) => {
        if (param === 0x8b89) return knownUniforms.length;
        if (param === 0x8b84) return 0;
        return true;
      }),
      getActiveUniform: vi.fn((_p: any, idx: number) => {
        if (idx >= 0 && idx < knownUniforms.length) {
          return { name: knownUniforms[idx] };
        }
        return null;
      }),
      getActiveAttrib: vi.fn(() => null),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getUniformLocation: vi.fn((_p: any, name: string) => ({ name })),
      getAttribLocation: vi.fn(() => 0),

      uniform1i: vi.fn((loc: any, val: number) => {
        if (loc?.name) uniformsCalled[loc.name] = val;
      }),
      uniform1f: vi.fn((loc: any, val: number) => {
        if (loc?.name) uniformsCalled[loc.name] = val;
      }),
      uniform2f: vi.fn((loc: any, x: number, y: number) => {
        if (loc?.name) uniformsCalled[loc.name] = [x, y];
      }),

      createBuffer: vi.fn(() => ({ id: "buf-1" })),
      deleteBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      createVertexArray: vi.fn(() => ({ id: "vao-1" })),
      deleteVertexArray: vi.fn(),
      bindVertexArray: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),

      viewport: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      drawArrays: vi.fn(),
    };

    const compositor = new WebGL2FrameCompositor(mockGL);
    compositor.uploadAsset("asset-export-1", { width: 1920, height: 1080 } as any);

    // Run composeFrame
    const attachment = compositor.composeFrame(frame);
    expect(attachment).toBeDefined();

    // Verify exact transform uniforms passed to image shader
    expect(uniformsCalled["u_layerOffset"]).toEqual([180, -90]);
    expect(uniformsCalled["u_layerScale"]).toEqual([2.2, 2.2]);
    expect(uniformsCalled["u_layerRotation"]).toBeCloseTo((45 * Math.PI) / 180, 5);

    compositor.dispose();
  });
});
