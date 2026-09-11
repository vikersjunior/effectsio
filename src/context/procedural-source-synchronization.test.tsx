// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "./studio-context";
import {
  createDefaultFrame,
  createDefaultBackdropLayer,
  createImageLayer,
  createLayer,
  type Frame,
  type Layer,
  type ProceduralSource,
  type ImageSource,
} from "../types/frame";
import type { Asset } from "../types/asset";
import { WebGL2FrameCompositor } from "../rendering/webgl/webgl-frame-compositor";

// Mock storage/db
vi.mock("../storage/db", () => {
  let mockState: any = {
    assets: [],
    frames: [],
    activeFrameId: null,
    activeLayerId: null,
    activeImageId: null,
    effectStacks: {},
    backgrounds: {},
    userLooks: [],
  };

  return {
    loadHydratedProject: vi.fn(async () => mockState),
    __setMockHydratedProject: (state: any) => {
      mockState = state;
    },
    dbSaveAsset: vi.fn().mockResolvedValue(undefined),
    dbDeleteAsset: vi.fn().mockResolvedValue(undefined),
    dbSaveEffectStack: vi.fn().mockResolvedValue(undefined),
    dbDeleteEffectStack: vi.fn().mockResolvedValue(undefined),
    dbSaveBackground: vi.fn().mockResolvedValue(undefined),
    dbDeleteBackground: vi.fn().mockResolvedValue(undefined),
    dbSaveUserLook: vi.fn().mockResolvedValue(undefined),
    dbDeleteUserLook: vi.fn().mockResolvedValue(undefined),
    dbSaveSessionState: vi.fn().mockResolvedValue(undefined),
    dbSaveFrame: vi.fn().mockResolvedValue(undefined),
    dbSaveFrames: vi.fn().mockResolvedValue(undefined),
    dbDeleteFrame: vi.fn().mockResolvedValue(undefined),
    dbGetAllFrames: vi.fn().mockResolvedValue([]),
  };
});

function createMockGL(): WebGL2RenderingContext {
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
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texParameteri: vi.fn(),
    activeTexture: vi.fn(),

    createFramebuffer: vi.fn(() => ({ id: "fbo-" + Math.random() })),
    deleteFramebuffer: vi.fn(),
    bindFramebuffer: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => 0x8cd5),

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
      if (param === 0x8b89) return 0;
      if (param === 0x8b84) return 0;
      return true;
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
    uniform4f: vi.fn(),
    uniformMatrix3fv: vi.fn(),
    blendFunc: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),

    createBuffer: vi.fn(() => ({ id: "buf-" + Math.random() })),
    deleteBuffer: vi.fn(),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    createVertexArray: vi.fn(() => ({ id: "vao-" + Math.random() })),
    deleteVertexArray: vi.fn(),
    bindVertexArray: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    getExtension: vi.fn(() => null),
  };
  return gl as unknown as WebGL2RenderingContext;
}

const sampleAsset: Asset = {
  id: "asset-synchronization-test",
  filename: "photo-sync.png",
  mimeType: "image/png",
  fileSize: 2048,
  objectUrl: "blob://photo-sync",
  width: 1200,
  height: 800,
  aspectRatio: 1.5,
  thumbnailUrl: "blob://thumb-sync",
  createdAt: 1700000000000,
};

describe("BLK-01 & BLK-02 Remediation Verification Suite", () => {
  let hookResult: { current: ReturnType<typeof useStudioStore> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const solidBackdrop = createDefaultBackdropLayer({
      type: "solid",
      color: "#000000",
      visible: true,
      opacity: 100,
    });
    const defaultFrame: Frame = {
      id: "frame-sync-test",
      name: "Sync Test Frame",
      dimensions: { width: 1080, height: 1080, presetId: null },
      layers: [solidBackdrop],
      groups: [],
      activeLayerId: solidBackdrop.id,
      createdAt: 1000,
      updatedAt: 1000,
    };

    const { __setMockHydratedProject } = (await import("../storage/db")) as any;
    __setMockHydratedProject({
      assets: [],
      frames: [defaultFrame],
      activeFrameId: defaultFrame.id,
      activeLayerId: solidBackdrop.id,
      activeImageId: null,
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StudioProvider>{children}</StudioProvider>
    );
    const { result } = renderHook(() => useStudioStore(), { wrapper });
    hookResult = result;

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  // ---------------------------------------------------------------------------
  // BLK-01 Test A — Procedural parameter mutation updates canonical Layer.source
  // ---------------------------------------------------------------------------
  it("Test A: procedural parameter mutation updates layer.source.parameters canonically", async () => {
    const activeFrame = hookResult.current.activeFrame!;
    const backdropLayer = activeFrame.layers[0];
    expect(backdropLayer.source?.type).toBe("procedural");

    const bgId = (backdropLayer as any).backgrounds[0].id;

    // Mutate parameter via updateBackgroundItemParameters
    await act(async () => {
      hookResult.current.updateBackgroundItemParameters(bgId, { color: "#ff0055" });
    });

    const updatedFrame = hookResult.current.activeFrame!;
    const updatedBackdrop = updatedFrame.layers[0];
    expect(updatedBackdrop.source).toBeDefined();
    expect(updatedBackdrop.source?.type).toBe("procedural");
    const procSource = updatedBackdrop.source as ProceduralSource;
    expect(procSource.parameters.color).toBe("#ff0055");
  });

  // ---------------------------------------------------------------------------
  // BLK-01 Test B — Renderer-facing state consumed by WebGL compositor
  // ---------------------------------------------------------------------------
  it("Test B: compositor resolves the updated canonical ProceduralSource, not stale parameters", async () => {
    const mockGL = createMockGL();
    const compositor = new WebGL2FrameCompositor(mockGL);

    const activeFrame = hookResult.current.activeFrame!;
    const backdropLayer = activeFrame.layers[0];
    const bgId = (backdropLayer as any).backgrounds[0].id;

    // Update parameters in studio context
    await act(async () => {
      hookResult.current.updateBackgroundItemParameters(bgId, { color: "#00aaff" });
    });

    const currentLayer = hookResult.current.activeFrame!.layers[0];
    const resolvedSource = compositor.resolveLayerSource(currentLayer);

    expect(resolvedSource).toBeDefined();
    expect(resolvedSource?.type).toBe("procedural");
    const procSource = resolvedSource as ProceduralSource;
    expect(procSource.kind).toBe("solid");
    expect(procSource.parameters.color).toBe("#00aaff");

    compositor.dispose();
  });

  // ---------------------------------------------------------------------------
  // BLK-01 Test C — Legacy compatibility mirror remains synchronized
  // ---------------------------------------------------------------------------
  it("Test C: updateLayer with canonical ProceduralSource synchronizes legacy layer.backgrounds mirror", async () => {
    const activeFrame = hookResult.current.activeFrame!;
    const backdropId = activeFrame.layers[0].id;

    // Update canonical source via updateLayer
    await act(async () => {
      hookResult.current.updateLayer(backdropId, {
        source: {
          type: "procedural",
          kind: "grid",
          parameters: { gridSize: 64, gridColor: "#333333" },
          seed: 42,
        },
      });
    });

    const updatedLayer = hookResult.current.activeFrame!.layers[0];

    // Canonical source updated
    expect(updatedLayer.source?.type).toBe("procedural");
    const proc = updatedLayer.source as ProceduralSource;
    expect(proc.kind).toBe("grid");
    expect(proc.parameters.gridSize).toBe(64);
    expect(proc.seed).toBe(42);

    // Legacy compatibility mirror updated
    const legacyBgs = (updatedLayer as any).backgrounds;
    expect(Array.isArray(legacyBgs)).toBe(true);
    expect(legacyBgs.length).toBeGreaterThanOrEqual(1);
    expect(legacyBgs[0].type).toBe("grid");
    expect(legacyBgs[0].parameters.gridSize).toBe(64);
    expect(legacyBgs[0].seed).toBe(42);
  });

  // ---------------------------------------------------------------------------
  // BLK-01 Test D — Image layers remain unaffected and do not acquire procedural properties
  // ---------------------------------------------------------------------------
  it("Test D: image layers are unaffected and retain ImageSource without procedural contamination", async () => {
    // Ingest an image asset
    await act(async () => {
      await hookResult.current.addAssets([sampleAsset]);
    });

    const frame = hookResult.current.activeFrame!;
    expect(frame.layers.length).toBe(2);

    const imageLayer = frame.layers[1];
    expect(imageLayer.source?.type).toBe("image");
    expect((imageLayer.source as ImageSource).assetId).toBe(sampleAsset.id);

    // Update transform on image layer
    await act(async () => {
      hookResult.current.updateLayer(imageLayer.id, {
        opacity: 0.85,
        transform: { x: 50, y: 100, scaleX: 1.5, scaleY: 1.5, rotation: 10 },
      });
    });

    const updatedImageLayer = hookResult.current.activeFrame!.layers[1];
    expect(updatedImageLayer.source?.type).toBe("image");
    expect((updatedImageLayer.source as ImageSource).assetId).toBe(sampleAsset.id);
    expect(updatedImageLayer.opacity).toBe(0.85);
    expect(updatedImageLayer.transform?.x).toBe(50);
    expect((updatedImageLayer as any).backgrounds).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // BLK-02 Invariant 1 — Explicit locked: true on default backdrop
  // ---------------------------------------------------------------------------
  it("BLK-02 Invariant 1: createDefaultBackdropLayer and createDefaultFrame initialize locked: true", () => {
    const backdrop = createDefaultBackdropLayer();
    expect(backdrop.locked).toBe(true);

    const frame = createDefaultFrame();
    expect(frame.layers[0].locked).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // BLK-02 Invariant 2 — Backdrop reorder protection
  // ---------------------------------------------------------------------------
  it("BLK-02 Invariant 2: reorderLayers rejects moving locked backdrop or moving layers to index 0", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAsset]);
    });

    const frame = hookResult.current.activeFrame!;
    expect(frame.layers.length).toBe(2);
    const backdropId = frame.layers[0].id;
    const imageId = frame.layers[1].id;

    // Attempt to move backdrop (index 0) to index 1 -> rejected
    await act(async () => {
      hookResult.current.reorderLayers(0, 1);
    });
    expect(hookResult.current.activeFrame!.layers[0].id).toBe(backdropId);
    expect(hookResult.current.activeFrame!.layers[1].id).toBe(imageId);

    // Attempt to move image layer (index 1) to index 0 -> rejected
    await act(async () => {
      hookResult.current.reorderLayers(1, 0);
    });
    expect(hookResult.current.activeFrame!.layers[0].id).toBe(backdropId);
    expect(hookResult.current.activeFrame!.layers[1].id).toBe(imageId);
  });
});
