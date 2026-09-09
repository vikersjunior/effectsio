// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "./studio-context";
import type { Frame, Layer, ImageLayer, GenerativeLayer } from "../types/frame";
import type { Asset } from "../types/asset";
import { createDefaultGenerativeLayer, createImageLayer, createDefaultFrame } from "../types/frame";
import { loadHydratedProject } from "../storage/db";

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

const sampleAssets: Asset[] = [
  {
    id: "asset-1",
    filename: "photo-1.png",
    mimeType: "image/png",
    fileSize: 1024,
    objectUrl: "blob://asset-1",
    width: 800,
    height: 600,
    aspectRatio: 1.33,
    thumbnailUrl: "blob://thumb-1",
    createdAt: 1000,
  },
  {
    id: "asset-2",
    filename: "photo-2.png",
    mimeType: "image/png",
    fileSize: 2048,
    objectUrl: "blob://asset-2",
    width: 1200,
    height: 800,
    aspectRatio: 1.5,
    thumbnailUrl: "blob://thumb-2",
    createdAt: 2000,
  },
];

describe("Phase 3 — Studio Context & Active Editing State Suite", () => {
  let hookResult: { current: ReturnType<typeof useStudioStore> };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { __setMockHydratedProject } = (await import("../storage/db")) as any;
    __setMockHydratedProject({
      assets: [],
      frames: [],
      activeFrameId: null,
      activeLayerId: null,
      activeImageId: null,
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });

    const { result } = renderHook(() => useStudioStore(), {
      wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider>,
    });
    hookResult = result;

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  });

  // 1. Active Frame Authority
  it("1. Active frame authority: activeFrame strictly matches activeFrameId with zero fallback", () => {
    const defaultFrame = hookResult.current.activeFrame;
    expect(defaultFrame).not.toBeNull();
    expect(hookResult.current.activeFrameId).toBe(defaultFrame?.id);

    // Setting activeFrameId to null produces null activeFrame (no || frames[0] fallback)
    act(() => {
      hookResult.current.setActiveFrameId(null);
    });
    expect(hookResult.current.activeFrameId).toBeNull();
    expect(hookResult.current.activeFrame).toBeNull();

    // Setting activeFrameId to a non-existent ID produces null activeFrame
    act(() => {
      hookResult.current.setActiveFrameId("non-existent-frame");
    });
    expect(hookResult.current.activeFrameId).toBe("non-existent-frame");
    expect(hookResult.current.activeFrame).toBeNull();
  });

  // 2. Active Layer Authority
  it("2. Active layer authority: activeLayer strictly matches activeLayerId within activeFrame", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const currentFrame = hookResult.current.activeFrame!;
    expect(currentFrame.layers.length).toBeGreaterThan(0);
    const topLayer = currentFrame.layers[currentFrame.layers.length - 1];

    expect(hookResult.current.activeLayerId).toBe(topLayer.id);
    expect(hookResult.current.activeLayer?.id).toBe(topLayer.id);

    // Setting activeLayerId to null produces null activeLayer (no fallback to firstImage or layers[0])
    act(() => {
      hookResult.current.setActiveLayerId(null);
    });
    expect(hookResult.current.activeLayerId).toBeNull();
    expect(hookResult.current.activeLayer).toBeNull();

    // Setting activeLayerId to non-existent ID produces null activeLayer
    act(() => {
      hookResult.current.setActiveLayerId("non-existent-layer");
    });
    expect(hookResult.current.activeLayerId).toBe("non-existent-layer");
    expect(hookResult.current.activeLayer).toBeNull();
  });

  // 3. Frame Selection Memory
  it("3. Frame selection memory: switching frames restores the target frame's remembered activeLayerId", async () => {
    await act(async () => {
      await hookResult.current.addAssets(sampleAssets);
    });

    expect(hookResult.current.frames.length).toBe(2);
    const frameA = hookResult.current.frames[0];
    const frameB = hookResult.current.frames[1];

    // Select backdrop layer (index 0) on frame A
    act(() => {
      hookResult.current.setActiveFrameId(frameA.id);
    });
    act(() => {
      hookResult.current.setActiveLayerId(frameA.layers[0].id);
    });
    expect(hookResult.current.activeLayerId).toBe(frameA.layers[0].id);

    // Switch to frame B; select image layer (index 1) on frame B
    act(() => {
      hookResult.current.setActiveFrameId(frameB.id);
    });
    expect(hookResult.current.activeLayerId).toBe(frameB.layers[1].id);

    // Switch back to frame A: Frame A's remembered selection (layer 0) is restored
    act(() => {
      hookResult.current.setActiveFrameId(frameA.id);
    });
    expect(hookResult.current.activeLayerId).toBe(frameA.layers[0].id);

    // Switch back to frame B: Frame B's remembered selection (layer 1) is restored
    act(() => {
      hookResult.current.setActiveFrameId(frameB.id);
    });
    expect(hookResult.current.activeLayerId).toBe(frameB.layers[1].id);
  });

  // 4. Invalid Layer Recovery
  it("4. Invalid layer recovery: switching to a frame with an invalid activeLayerId repairs to top-most layer", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const frame = hookResult.current.activeFrame!;
    // Corrupt the frame's stored activeLayerId
    act(() => {
      hookResult.current.setActiveLayerId("corrupted-layer-id");
    });

    // Switch to a new frame and switch back: repair should select the top-most layer
    act(() => {
      hookResult.current.setActiveFrameId(frame.id);
    });

    const expectedTopLayerId = frame.layers[frame.layers.length - 1].id;
    expect(hookResult.current.activeLayerId).toBe(expectedTopLayerId);
    expect(hookResult.current.activeLayer?.id).toBe(expectedTopLayerId);
  });

  // 5. Empty Frame
  it("5. Empty frame resilience: empty frame produces null activeLayer, null activeImageId, and empty activeEffectStack without throwing", () => {
    const frame = hookResult.current.activeFrame!;

    // Remove all layers from the frame
    for (const layer of [...frame.layers]) {
      act(() => {
        hookResult.current.removeLayer(layer.id);
      });
    }

    expect(hookResult.current.activeFrame?.layers.length).toBe(0);
    expect(hookResult.current.activeLayerId).toBeNull();
    expect(hookResult.current.activeLayer).toBeNull();
    expect(hookResult.current.activeImageId).toBeNull();
    expect(hookResult.current.activeEffectStack).toEqual([]);
  });

  // 6. Active Layer Deletion
  it("6. Active layer deletion: deleting the active layer selects an adjacent remaining layer", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const frame = hookResult.current.activeFrame!;
    expect(frame.layers.length).toBe(2);
    const bottomLayer = frame.layers[0];
    const topLayer = frame.layers[1];

    expect(hookResult.current.activeLayerId).toBe(topLayer.id);

    // Delete active top layer
    act(() => {
      hookResult.current.removeLayer(topLayer.id);
    });

    // Adjacent layer below (bottomLayer) is selected
    expect(hookResult.current.activeLayerId).toBe(bottomLayer.id);
    expect(hookResult.current.activeLayer?.id).toBe(bottomLayer.id);
  });

  // 7. Complete Layer Deletion
  it("7. Complete layer deletion: deleting the only layer in a frame sets activeLayerId to null cleanly", () => {
    const frame = hookResult.current.activeFrame!;
    expect(frame.layers.length).toBe(1);
    const onlyLayer = frame.layers[0];

    act(() => {
      hookResult.current.removeLayer(onlyLayer.id);
    });

    expect(hookResult.current.activeLayerId).toBeNull();
    expect(hookResult.current.activeLayer).toBeNull();
    expect(hookResult.current.activeFrame?.activeLayerId).toBeNull();
  });

  // 8. Layer Addition Selection
  it("8. Layer addition selection: adding a layer automatically makes it active and updates activeFrame.activeLayerId", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const initialLayerId = hookResult.current.activeLayerId;
    let addedLayer: ImageLayer | null = null;

    act(() => {
      addedLayer = hookResult.current.addLayerFromAsset("asset-1");
    });

    expect(addedLayer).not.toBeNull();
    expect(addedLayer!.id).not.toBe(initialLayerId);
    expect(hookResult.current.activeLayerId).toBe(addedLayer!.id);
    expect(hookResult.current.activeFrame?.activeLayerId).toBe(addedLayer!.id);
  });

  // 9. activeImageId for ImageSource
  it("9. activeImageId for ImageSource: returns image assetId when active layer has source.type === 'image'", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    expect(hookResult.current.activeLayer?.source.type).toBe("image");
    expect(hookResult.current.activeImageId).toBe("asset-1");
  });

  // 10. activeImageId for ProceduralSource
  it("10. activeImageId for ProceduralSource: returns null when active layer has source.type === 'procedural'", () => {
    // Default frame has a procedural backdrop layer at index 0
    const defaultLayer = hookResult.current.activeFrame!.layers[0];
    expect(defaultLayer.source.type).toBe("procedural");

    act(() => {
      hookResult.current.setActiveLayerId(defaultLayer.id);
    });

    expect(hookResult.current.activeLayer?.source.type).toBe("procedural");
    expect(hookResult.current.activeImageId).toBeNull();
  });

  // 11. No Unrelated Image Fallback
  it("11. No unrelated image fallback: activeImageId never falls back to another image in the frame when a procedural layer is active", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const frame = hookResult.current.activeFrame!;
    const proceduralLayer = frame.layers.find((l) => l.source.type === "procedural")!;
    const imageLayer = frame.layers.find((l) => l.source.type === "image")!;

    expect(proceduralLayer).toBeDefined();
    expect(imageLayer).toBeDefined();

    // Select procedural layer
    act(() => {
      hookResult.current.setActiveLayerId(proceduralLayer.id);
    });

    expect(hookResult.current.activeLayerId).toBe(proceduralLayer.id);
    // MUST NOT fall back to imageLayer.assetId
    expect(hookResult.current.activeImageId).toBeNull();
  });

  // 12. setActiveImageId with Placed Image
  it("12. setActiveImageId with placed image: selects the matching layer in the active frame", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const frame = hookResult.current.activeFrame!;
    const imageLayer = frame.layers.find((l) => l.source.type === "image")!;

    // Deselect layer first
    act(() => {
      hookResult.current.setActiveLayerId(null);
    });
    expect(hookResult.current.activeLayerId).toBeNull();

    // Call setActiveImageId with placed asset ID
    act(() => {
      hookResult.current.setActiveImageId("asset-1");
    });
    expect(hookResult.current.activeLayerId).toBe(imageLayer.id);
  });

  // 13. setActiveImageId with Unplaced Image
  it("13. setActiveImageId with unplaced image: is a no-op that does not steal focus, switch frames, or deselect layer", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const initialFrameId = hookResult.current.activeFrameId;
    const initialLayerId = hookResult.current.activeLayerId;

    // Call setActiveImageId with an asset not in this frame
    act(() => {
      hookResult.current.setActiveImageId("unplaced-asset-999");
    });

    // Canvas editing target remains unchanged
    expect(hookResult.current.activeFrameId).toBe(initialFrameId);
    expect(hookResult.current.activeLayerId).toBe(initialLayerId);
  });

  // 14. Asset Library Selection Isolation
  it("14. Asset library selection isolation: selecting an asset in the library updates selectedAssetIds only without altering activeLayerId or activeFrameId", async () => {
    await act(async () => {
      await hookResult.current.addAssets(sampleAssets);
    });

    const frameA = hookResult.current.frames[0];
    act(() => {
      hookResult.current.setActiveFrameId(frameA.id);
    });

    const activeFrameIdBefore = hookResult.current.activeFrameId;
    const activeLayerIdBefore = hookResult.current.activeLayerId;

    // Click asset-2 in library
    act(() => {
      hookResult.current.selectAsset("asset-2", true);
    });

    // Library selection updated
    expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(true);
    expect(hookResult.current.selectedAssetIds.size).toBe(1);

    // Canvas editing target completely isolated
    expect(hookResult.current.activeFrameId).toBe(activeFrameIdBefore);
    expect(hookResult.current.activeLayerId).toBe(activeLayerIdBefore);
  });

  // 15. Universal Effect Stack Behavior
  it("15. Universal effect stack behavior: exposes and mutates effectStack on procedural layers as well as image layers", () => {
    const proceduralLayer = hookResult.current.activeFrame!.layers[0];
    expect(proceduralLayer.source.type).toBe("procedural");

    act(() => {
      hookResult.current.setActiveLayerId(proceduralLayer.id);
    });

    expect(hookResult.current.activeEffectStack).toEqual([]);

    // Add effect to procedural layer
    act(() => {
      hookResult.current.addEffectToStack(proceduralLayer.id, "duotone");
    });

    expect(hookResult.current.activeEffectStack.length).toBe(1);
    expect(hookResult.current.activeEffectStack[0].effectId).toBe("duotone");
  });

  // 16. Cross-Frame Active Layer Rejection
  it("16. Cross-frame active layer rejection: activeLayerId belonging to Frame B yields null activeLayer when Frame A is active", async () => {
    await act(async () => {
      await hookResult.current.addAssets(sampleAssets);
    });

    const frameA = hookResult.current.frames[0];
    const frameB = hookResult.current.frames[1];
    const layerB = frameB.layers[1];

    act(() => {
      hookResult.current.setActiveFrameId(frameA.id);
    });

    // Attempt to set activeLayerId to layer from frame B
    act(() => {
      hookResult.current.setActiveLayerId(layerB.id);
    });

    expect(hookResult.current.activeFrameId).toBe(frameA.id);
    expect(hookResult.current.activeLayerId).toBe(layerB.id);
    // Strict lookup: layerB is not in frameA.layers, so activeLayer is null
    expect(hookResult.current.activeLayer).toBeNull();
  });

  // 17. Divergent StudioContext.activeLayerId / Frame.activeLayerId Synchronization
  it("17. Synchronization: setActiveLayerId synchronizes activeFrame.activeLayerId", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const frame = hookResult.current.activeFrame!;
    const targetLayer = frame.layers[0];

    act(() => {
      hookResult.current.setActiveLayerId(targetLayer.id);
    });

    expect(hookResult.current.activeLayerId).toBe(targetLayer.id);
    expect(hookResult.current.activeFrame?.activeLayerId).toBe(targetLayer.id);
  });

  // 18. Canonical Persisted IDs Overriding Legacy activeImageId
  it("18. Canonical precedence: persisted activeFrameId and activeLayerId override legacy activeImageId during hydration", async () => {
    const frame1: Frame = {
      id: "frame-custom-1",
      name: "Custom Frame 1",
      dimensions: { width: 1080, height: 1080 },
      layers: [
        createDefaultGenerativeLayer(),
        createImageLayer("asset-1", "photo-1.png"),
      ],
      activeLayerId: null,
      createdAt: 1000,
      updatedAt: 1000,
    };
    frame1.layers[1].id = "layer-img-target";

    const { __setMockHydratedProject } = (await import("../storage/db")) as any;
    __setMockHydratedProject({
      assets: [sampleAssets[0]],
      frames: [frame1],
      activeFrameId: "frame-custom-1",
      activeLayerId: "layer-img-target",
      // Stale legacy ID for a different asset
      activeImageId: "asset-legacy-stale",
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });

    const { result } = renderHook(() => useStudioStore(), {
      wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider>,
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 15));
    });

    expect(result.current.activeFrameId).toBe("frame-custom-1");
    expect(result.current.activeLayerId).toBe("layer-img-target");
    // activeImageId is derived from the canonical layer
    expect(result.current.activeImageId).toBe("asset-1");
  });

  // 19. Hydration Recovery
  it("19. Hydration recovery: repairs missing or invalid activeLayerId to top-most layer", async () => {
    const frame1: Frame = {
      id: "frame-custom-2",
      name: "Custom Frame 2",
      dimensions: { width: 1080, height: 1080 },
      layers: [
        createDefaultGenerativeLayer(),
        createImageLayer("asset-1", "photo-1.png"),
      ],
      activeLayerId: null,
      createdAt: 1000,
      updatedAt: 1000,
    };
    const topLayerId = frame1.layers[1].id;

    const { __setMockHydratedProject } = (await import("../storage/db")) as any;
    __setMockHydratedProject({
      assets: [sampleAssets[0]],
      frames: [frame1],
      activeFrameId: "frame-custom-2",
      activeLayerId: "invalid-orphaned-layer-id",
      activeImageId: null,
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });

    const { result } = renderHook(() => useStudioStore(), {
      wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider>,
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 15));
    });

    expect(result.current.activeFrameId).toBe("frame-custom-2");
    // Repaired to top-most layer
    expect(result.current.activeLayerId).toBe(topLayerId);
    expect(result.current.activeLayer?.id).toBe(topLayerId);
  });

  // 20. Undo / Redo Restoration
  it("20. Undo / Redo restoration: restores canonical activeFrameId and activeLayerId cleanly", async () => {
    await act(async () => {
      await hookResult.current.addAssets([sampleAssets[0]]);
    });

    const initialLayerId = hookResult.current.activeLayerId;

    // Perform an undoable operation (add another layer)
    let secondLayer: ImageLayer | null = null;
    act(() => {
      secondLayer = hookResult.current.addLayerFromAsset("asset-1");
    });
    expect(hookResult.current.activeLayerId).toBe(secondLayer!.id);

    // Undo: should restore activeLayerId to initialLayerId
    act(() => {
      hookResult.current.undo();
    });
    expect(hookResult.current.activeLayerId).toBe(initialLayerId);

    // Redo: should restore activeLayerId to secondLayer.id
    act(() => {
      hookResult.current.redo();
    });
    expect(hookResult.current.activeLayerId).toBe(secondLayer!.id);
  });
});
