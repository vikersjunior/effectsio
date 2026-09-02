// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as React from "react";
import { renderHook, act } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "./studio-context";
import type { Asset } from "../types/asset";
import type { Look } from "../types/look";

// Mock storage/db
vi.mock("../storage/db", () => ({
  loadHydratedProject: vi.fn().mockResolvedValue({
    assets: [],
    activeImageId: null,
    effectStacks: {},
    backgrounds: {},
    userLooks: [],
  }),
  dbSaveAsset: vi.fn().mockResolvedValue(undefined),
  dbDeleteAsset: vi.fn().mockResolvedValue(undefined),
  dbSaveEffectStack: vi.fn().mockResolvedValue(undefined),
  dbDeleteEffectStack: vi.fn().mockResolvedValue(undefined),
  dbSaveBackground: vi.fn().mockResolvedValue(undefined),
  dbDeleteBackground: vi.fn().mockResolvedValue(undefined),
  dbSaveUserLook: vi.fn().mockResolvedValue(undefined),
  dbDeleteUserLook: vi.fn().mockResolvedValue(undefined),
  dbSaveSessionState: vi.fn().mockResolvedValue(undefined),
}));

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
  {
    id: "asset-3",
    filename: "photo-3.png",
    mimeType: "image/png",
    fileSize: 4096,
    objectUrl: "blob://asset-3",
    width: 1920,
    height: 1080,
    aspectRatio: 1.77,
    thumbnailUrl: "blob://thumb-3",
    createdAt: 3000,
  },
  {
    id: "asset-4",
    filename: "photo-4.png",
    mimeType: "image/png",
    fileSize: 8192,
    objectUrl: "blob://asset-4",
    width: 1000,
    height: 1000,
    aspectRatio: 1.0,
    thumbnailUrl: "blob://thumb-4",
    createdAt: 4000,
  },
];

const sampleLook: Look = {
  id: "test-look-1",
  name: "Test Duotone Look",
  category: "experimental",
  description: "A test look with two effects",
  isBuiltIn: false,
  createdAt: 5000,
  effectStack: [
    {
      instanceId: "tpl-inst-1",
      effectId: "duotone",
      enabled: true,
      parameters: { colorA: "#ff0055", colorB: "#0055ff" },
    },
    {
      instanceId: "tpl-inst-2",
      effectId: "grain",
      enabled: true,
      parameters: { intensity: 15 },
    },
  ],
};

describe("Phase 7.8 Multi-Asset Selection, Batch Looks & Global History Suite", () => {
  let hookResult: { current: ReturnType<typeof useStudioStore> };

  beforeEach(async () => {
    const { result } = renderHook(() => useStudioStore(), {
      wrapper: ({ children }) => <StudioProvider>{children}</StudioProvider>,
    });
    hookResult = result;

    // Let hydration resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Populate test assets
    await act(async () => {
      await hookResult.current.addAssets(sampleAssets);
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Multi-Asset Selection Suite
  // ---------------------------------------------------------------------------
  describe("1. Multi-Asset Selection", () => {
    it("initializes with newly added asset selected and coexists with activeImageId", () => {
      expect(hookResult.current.activeImageId).toBe("asset-4");
      expect(hookResult.current.selectedAssetIds.has("asset-4")).toBe(true);
      expect(hookResult.current.selectedAssetIds.size).toBe(1);
    });

    it("supports single asset selection via selectAsset(id, true)", () => {
      act(() => {
        hookResult.current.selectAsset("asset-2", true);
      });
      expect(hookResult.current.activeImageId).toBe("asset-2");
      expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(true);
      expect(hookResult.current.selectedAssetIds.size).toBe(1);
    });

    it("supports modifier toggle selection via toggleAssetSelection(id)", () => {
      act(() => {
        hookResult.current.selectAsset("asset-1", true);
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(1);

      // Toggle asset-2 into selection
      act(() => {
        hookResult.current.toggleAssetSelection("asset-2");
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(2);
      expect(hookResult.current.selectedAssetIds.has("asset-1")).toBe(true);
      expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(true);
      expect(hookResult.current.activeImageId).toBe("asset-2");

      // Toggle asset-1 out of selection
      act(() => {
        hookResult.current.toggleAssetSelection("asset-1");
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(1);
      expect(hookResult.current.selectedAssetIds.has("asset-1")).toBe(false);
      expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(true);
    });

    it("supports Shift range selection via selectAssetRange", () => {
      act(() => {
        hookResult.current.selectAssetRange("asset-1", "asset-3", sampleAssets);
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(3);
      expect(hookResult.current.selectedAssetIds.has("asset-1")).toBe(true);
      expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(true);
      expect(hookResult.current.selectedAssetIds.has("asset-3")).toBe(true);
      expect(hookResult.current.selectedAssetIds.has("asset-4")).toBe(false);
      expect(hookResult.current.activeImageId).toBe("asset-3");
    });

    it("supports selectAllAssets and clearAssetSelection", () => {
      act(() => {
        hookResult.current.selectAllAssets();
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(4);

      act(() => {
        hookResult.current.clearAssetSelection();
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(0);
    });

    it("cleans up selectedAssetIds when an asset is removed", () => {
      act(() => {
        hookResult.current.selectAllAssets();
      });
      expect(hookResult.current.selectedAssetIds.size).toBe(4);

      act(() => {
        hookResult.current.removeAsset("asset-2");
      });
      expect(hookResult.current.selectedAssetIds.has("asset-2")).toBe(false);
      expect(hookResult.current.selectedAssetIds.size).toBe(3);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Batch Look Application Suite
  // ---------------------------------------------------------------------------
  describe("2. Batch Look Application", () => {
    it("applies a Look to multiple assets with isolated cloned instances", () => {
      const targetIds = ["asset-1", "asset-2", "asset-3"];
      act(() => {
        hookResult.current.applyLookToAssets(targetIds, sampleLook);
      });

      // Verify all target assets received the cloned stack
      const stack1 = hookResult.current.effectStacks["asset-1"];
      const stack2 = hookResult.current.effectStacks["asset-2"];
      const stack3 = hookResult.current.effectStacks["asset-3"];

      expect(stack1).toBeDefined();
      expect(stack2).toBeDefined();
      expect(stack3).toBeDefined();
      expect(stack1.length).toBe(2);
      expect(stack2.length).toBe(2);
      expect(stack3.length).toBe(2);

      // Verify instance IDs are unique across all asset stacks
      expect(stack1[0].instanceId).not.toBe(stack2[0].instanceId);
      expect(stack2[0].instanceId).not.toBe(stack3[0].instanceId);
      expect(stack1[0].instanceId).not.toBe(sampleLook.effectStack[0].instanceId);

      // Verify unselected asset-4 remains untouched
      expect(hookResult.current.effectStacks["asset-4"]).toBeUndefined();
    });

    it("creates exactly one history snapshot for a batch look operation across 3 assets", () => {
      const targetIds = ["asset-1", "asset-2", "asset-3"];
      act(() => {
        hookResult.current.applyLookToAssets(targetIds, sampleLook);
      });

      expect(hookResult.current.canUndo).toBe(true);

      // Undo should revert all 3 assets at once
      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.effectStacks["asset-1"] || []).toEqual([]);
      expect(hookResult.current.effectStacks["asset-2"] || []).toEqual([]);
      expect(hookResult.current.effectStacks["asset-3"] || []).toEqual([]);

      // Redo should reapply look to all 3 assets
      act(() => {
        hookResult.current.redo();
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(2);
      expect(hookResult.current.effectStacks["asset-2"].length).toBe(2);
      expect(hookResult.current.effectStacks["asset-3"].length).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Global Undo / Redo History Suite
  // ---------------------------------------------------------------------------
  describe("3. Global Undo / Redo History", () => {
    it("records discrete effect stack operations (add, parameter, toggle, reorder, delete)", () => {
      // 1. Add effect
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "halftone");
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);
      expect(hookResult.current.canUndo).toBe(true);

      // 2. Toggle enabled
      const instId = hookResult.current.effectStacks["asset-1"][0].instanceId;
      act(() => {
        hookResult.current.toggleInstanceEnabled("asset-1", instId);
      });
      expect(hookResult.current.effectStacks["asset-1"][0].enabled).toBe(false);

      // Undo toggle
      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.effectStacks["asset-1"][0].enabled).toBe(true);

      // Undo addition
      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.effectStacks["asset-1"] || []).toEqual([]);
      expect(hookResult.current.canRedo).toBe(true);

      // Redo addition
      act(() => {
        hookResult.current.redo();
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);
    });

    it("clears redo stack (future) when a new mutation occurs after undo", () => {
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "duotone");
      });
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "grain");
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(2);

      // Undo once
      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);
      expect(hookResult.current.canRedo).toBe(true);

      // New mutation
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "pixelate");
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(2);
      expect(hookResult.current.canRedo).toBe(false); // Future cleared!
    });

    it("enforces MAX_HISTORY_LIMIT = 40 entries", () => {
      for (let i = 0; i < 50; i++) {
        act(() => {
          hookResult.current.addEffectToStack("asset-1", "grain", { intensity: i });
        });
      }

      // Can undo at most 40 times
      let undoCount = 0;
      while (hookResult.current.canUndo) {
        act(() => {
          hookResult.current.undo();
        });
        undoCount++;
      }

      expect(undoCount).toBe(40);
    });

    it("handles continuous slider parameter updates with debounce window", () => {
      vi.useFakeTimers();

      act(() => {
        hookResult.current.addEffectToStack("asset-1", "posterize", { levels: 4 });
      });
      const instId = hookResult.current.effectStacks["asset-1"][0].instanceId;

      // Simulate dragging a slider: 5 rapid calls in 50ms
      for (let lvl = 5; lvl <= 10; lvl++) {
        act(() => {
          hookResult.current.updateInstanceParameters("asset-1", instId, { levels: lvl });
        });
      }

      // Advance debounce timer so interaction settles
      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(hookResult.current.effectStacks["asset-1"][0].parameters.levels).toBe(10);

      // One undo should revert back to levels: 4 (before the drag began)
      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.effectStacks["asset-1"][0].parameters.levels).toBe(4);

      vi.useRealTimers();
    });

    it("supports background updates and undo/redo", () => {
      act(() => {
        hookResult.current.setActiveImageId("asset-1");
        hookResult.current.resetActiveBackground();
      });

      act(() => {
        hookResult.current.updateActiveBackground({ color: "#ff0077", type: "solid" });
      });
      expect(hookResult.current.backgrounds["asset-1"]?.color).toBe("#ff0077");

      act(() => {
        hookResult.current.undo();
      });
      expect(hookResult.current.backgrounds["asset-1"]?.color).not.toBe("#ff0077");
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Keyboard Shortcuts Suite
  // ---------------------------------------------------------------------------
  describe("4. Global Keyboard Shortcuts", () => {
    it("triggers undo on Cmd+Z / Ctrl+Z and redo on Cmd+Shift+Z", () => {
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "glitch");
      });
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);

      // Trigger Undo event
      act(() => {
        const undoEvent = new KeyboardEvent("keydown", {
          key: "z",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(undoEvent);
      });

      expect(hookResult.current.effectStacks["asset-1"] || []).toEqual([]);

      // Trigger Redo event
      act(() => {
        const redoEvent = new KeyboardEvent("keydown", {
          key: "z",
          metaKey: true,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        });
        window.dispatchEvent(redoEvent);
      });

      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);
    });

    it("does not trigger undo/redo when typing inside an input element", () => {
      act(() => {
        hookResult.current.addEffectToStack("asset-1", "glitch");
      });

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      act(() => {
        const event = new KeyboardEvent("keydown", {
          key: "z",
          metaKey: true,
          bubbles: true,
        });
        input.dispatchEvent(event);
      });

      // Effect should NOT have been undone
      expect(hookResult.current.effectStacks["asset-1"].length).toBe(1);
      document.body.removeChild(input);
    });
  });
});
