// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, act } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { LayersPanel } from "./layers-panel";
import { InspectorPanel } from "./inspector-panel";
import type { Asset } from "../../types/asset";
import { isGroup, normalizeFrameToUniversalModel, type Group, type Layer } from "../../types/frame";

const sampleAsset: Asset = {
  id: "sample-asset-1",
  filename: "sample.png",
  mimeType: "image/png",
  fileSize: 1024,
  objectUrl: "blob:sample",
  width: 800,
  height: 600,
  aspectRatio: 800 / 600,
  thumbnailUrl: "blob:sample-thumb",
  createdAt: 1000,
};

const sampleAsset2: Asset = {
  id: "sample-asset-2",
  filename: "sample2.png",
  mimeType: "image/png",
  fileSize: 2048,
  objectUrl: "blob:sample2",
  width: 400,
  height: 400,
  aspectRatio: 1,
  thumbnailUrl: "blob:sample2-thumb",
  createdAt: 2000,
};

function TestHost({ onStore }: { onStore?: (store: ReturnType<typeof useStudioStore>) => void }) {
  const store = useStudioStore();
  React.useEffect(() => {
    onStore?.(store);
  }, [store, onStore]);

  return (
    <div className="flex h-[800px] w-[1200px]">
      <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
      <span data-testid="active-target-id">{store.activeLayerId || "none"}</span>
      <span data-testid="active-group-id">{store.activeGroup?.id || "none"}</span>
      <span data-testid="active-layer-id">{store.activeLayer?.id || "none"}</span>
      <div className="w-80 h-full">
        <LayersPanel />
      </div>
      <div className="w-80 h-full">
        <InspectorPanel />
      </div>
    </div>
  );
}

describe("EffectsIO — Group Compositing & Backdrop Semantics Correction Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Group Compositing Container", () => {
    it("selecting a group exposes dedicated Group Inspector with Name, Compositing, Transform, and Effects", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Import assets and create two image layers
      await act(async () => {
        await storeRef.addAssets([sampleAsset, sampleAsset2]);
      });

      let layer1!: Layer;
      let layer2!: Layer;
      act(() => {
        layer1 = storeRef.addLayerFromAsset(sampleAsset.id)!;
        layer2 = storeRef.addLayerFromAsset(sampleAsset2.id)!;
      });

      expect(layer1).toBeDefined();
      expect(layer2).toBeDefined();

      // Create a group containing both layers
      act(() => {
        storeRef.selectLayers([layer1.id, layer2.id]);
        storeRef.createGroup("Test Group", [layer1.id, layer2.id]);
      });

      const group = storeRef.activeFrame?.items.find(isGroup) as Group;
      expect(group).toBeDefined();
      const groupId = group.id;

      // Select the Group in the Layers panel
      act(() => {
        storeRef.setActiveLayerId(groupId);
      });

      await waitFor(() => {
        expect(storeRef.activeGroup?.id).toBe(groupId);
        expect(storeRef.activeLayer).toBeNull();
      });

      // Verify Inspector renders Group sections
      expect(screen.getByText("Compositing")).toBeDefined();
      expect(screen.getByText("Transform")).toBeDefined();
      expect(screen.getByText("Effects")).toBeDefined();

      // Test Group Opacity mutation
      act(() => {
        storeRef.setGroupOpacity(groupId, 0.75);
      });
      expect(storeRef.activeGroup?.opacity).toBe(0.75);

      // Test Group BlendMode mutation
      act(() => {
        storeRef.setGroupBlendMode(groupId, "multiply");
      });
      expect(storeRef.activeGroup?.blendMode).toBe("multiply");

      // Test Group Transform mutation
      act(() => {
        storeRef.updateGroupTransform(groupId, { x: 50, y: 100, scaleX: 1.5, scaleY: 1.5, rotation: 45 });
      });
      expect(storeRef.activeGroup?.transform?.x).toBe(50);
      expect(storeRef.activeGroup?.transform?.y).toBe(100);
      expect(storeRef.activeGroup?.transform?.scaleX).toBe(1.5);
      expect(storeRef.activeGroup?.transform?.rotation).toBe(45);

      // Test Reset Group Transform
      act(() => {
        storeRef.resetGroupTransform(groupId);
      });
      expect(storeRef.activeGroup?.transform?.x).toBe(0);
      expect(storeRef.activeGroup?.transform?.y).toBe(0);
      expect(storeRef.activeGroup?.transform?.scaleX).toBe(1);

      // Test Group Effects stack
      act(() => {
        storeRef.addEffectToStack(groupId, "pixelate");
      });
      expect(storeRef.activeGroup?.effectStack.length).toBe(1);
      expect(storeRef.activeGroup?.effectStack[0].effectId).toBe("pixelate");
      expect(storeRef.activeEffectStack.length).toBe(1);
    });

    it("locking a group inherits lock to all controls and blocks property mutations", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      await act(async () => {
        await storeRef.addAssets([sampleAsset, sampleAsset2]);
      });

      let layer1!: Layer;
      let layer2!: Layer;
      act(() => {
        layer1 = storeRef.addLayerFromAsset(sampleAsset.id)!;
        layer2 = storeRef.addLayerFromAsset(sampleAsset2.id)!;
      });

      act(() => {
        storeRef.selectLayers([layer1.id, layer2.id]);
        storeRef.createGroup("Test Group", [layer1.id, layer2.id]);
      });

      const group = storeRef.activeFrame?.items.find(isGroup) as Group;
      expect(group).toBeDefined();
      const groupId = group.id;

      // Lock the group
      act(() => {
        storeRef.toggleGroupLock(groupId);
      });
      expect(storeRef.activeFrame?.items.find((i) => i.id === groupId)?.locked).toBe(true);

      // Select the group
      act(() => {
        storeRef.setActiveLayerId(groupId);
      });

      await waitFor(() => {
        expect(storeRef.activeGroup?.locked).toBe(true);
      });

      // Verify "Locked" badge appears in Group Inspector
      expect(screen.getByText("Locked")).toBeDefined();

      // Attempting to mutate group opacity when locked is rejected by tree-operations
      const initialOpacity = storeRef.activeGroup?.opacity ?? 1;
      act(() => {
        storeRef.setGroupOpacity(groupId, 0.2);
      });
      expect(storeRef.activeGroup?.opacity).toBe(initialOpacity);

      // Selecting a child of the locked group also has isLocked = true
      act(() => {
        storeRef.setActiveLayerId(layer1.id);
      });

      await waitFor(() => {
        expect(storeRef.activeLayer?.id).toBe(layer1.id);
      });

      // Child controls are disabled (e.g. blend mode combobox and number inputs)
      const blendModeSelect = screen.getByRole("combobox");
      expect(blendModeSelect.getAttribute("disabled")).not.toBeNull();

      const spinButtons = screen.getAllByRole("spinbutton");
      expect(spinButtons[0].getAttribute("disabled")).not.toBeNull();

      // Attempting to update child layer directly is rejected by tree operations
      const initialChildOpacity = storeRef.activeLayer?.opacity;
      act(() => {
        storeRef.updateLayer(layer1.id, { opacity: 0.1 });
      });
      expect(storeRef.activeLayer?.opacity).toBe(initialChildOpacity);
    });
  });

  describe("2. Procedural Backdrop as Normal Layer", () => {
    it("backdrop can be unlocked, reordered, edited, and deleted without auto-recreation", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Initial state has only the default backdrop
      expect(storeRef.activeFrame?.items.length).toBe(1);
      const backdrop = storeRef.activeFrame?.items[0] as Layer;
      expect(backdrop.type).toBe("procedural");
      expect(backdrop.locked).toBe(true);

      // 1. Select and inspect backdrop
      act(() => {
        storeRef.setActiveLayerId(backdrop.id);
      });
      expect(storeRef.activeLayer?.id).toBe(backdrop.id);

      // 2. Add an image layer so there are 2 layers
      let imageLayer!: Layer;
      await act(async () => {
        await storeRef.addAssets([sampleAsset]);
      });
      act(() => {
        imageLayer = storeRef.addLayerFromAsset(sampleAsset.id)!;
      });
      const currentCount = storeRef.activeFrame?.items.length;
      expect(currentCount).toBeGreaterThan(1);

      // 3. Unlock the backdrop
      act(() => {
        storeRef.updateLayer(backdrop.id, { locked: false });
      });
      expect(storeRef.activeFrame?.items.find((i) => i.id === backdrop.id)?.locked).toBe(false);

      // 4. Reorder unlocked backdrop to index 1 (above image layer)
      act(() => {
        storeRef.reorderLayers(0, 1);
      });
      expect(storeRef.activeFrame?.items[1].id).toBe(backdrop.id);

      // 5. Apply effect to backdrop layer
      act(() => {
        storeRef.addEffectToStack(backdrop.id, "grain");
      });
      const updatedBackdrop = storeRef.activeFrame?.items.find((i) => i.id === backdrop.id) as Layer;
      expect(updatedBackdrop.effectStack.length).toBe(1);
      expect(updatedBackdrop.effectStack[0].effectId).toBe("grain");

      // 6. Delete the backdrop layer
      act(() => {
        storeRef.removeLayer(backdrop.id);
      });

      // Backdrop must be removed
      expect(storeRef.activeFrame?.items.some((i) => i.id === backdrop.id)).toBe(false);

      // 7. Delete all remaining layers -> frame items length reaches 0 (does NOT auto-recreate backdrop)
      act(() => {
        const remaining = [...(storeRef.activeFrame?.items || [])];
        remaining.forEach((item) => storeRef.removeLayer(item.id));
      });
      expect(storeRef.activeFrame?.items.length).toBe(0);

      // 8. Normalization preserves empty items array without creating a backdrop
      const normalized = normalizeFrameToUniversalModel(storeRef.activeFrame);
      expect(normalized.items).toEqual([]);
      expect(normalized.items.length).toBe(0);
      expect(normalized.activeLayerId).toBeNull();

      // 9. Adding a new layer to the empty frame adds the new layer without synthesizing a backdrop
      let newLayer!: Layer;
      act(() => {
        newLayer = storeRef.addLayerFromAsset(sampleAsset.id)!;
      });
      expect(storeRef.activeFrame?.items.length).toBe(1);
      expect(storeRef.activeFrame?.items[0].id).toBe(newLayer.id);
    });
  });
});
