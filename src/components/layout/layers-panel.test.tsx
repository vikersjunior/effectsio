// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { AssetPanel } from "./asset-panel";
import { LayersPanel } from "./layers-panel";
import { InspectorPanel } from "./inspector-panel";
import { CanvasControlDock } from "./canvas-control-dock";
import type { Asset } from "../../types/asset";
import type { Frame, ImageLayer, GenerativeLayer } from "../../types/frame";
import { createDefaultGenerativeLayer, createImageLayer } from "../../types/frame";

const mockAsset1: Asset = {
  id: "asset-1",
  filename: "hero.png",
  mimeType: "image/png",
  fileSize: 1024 * 100,
  objectUrl: "blob:hero",
  width: 1920,
  height: 1080,
  aspectRatio: 1920 / 1080,
  thumbnailUrl: "blob:hero-thumb",
  createdAt: 1000,
};

const mockAsset2: Asset = {
  id: "asset-2",
  filename: "logo.png",
  mimeType: "image/png",
  fileSize: 1024 * 50,
  objectUrl: "blob:logo",
  width: 500,
  height: 500,
  aspectRatio: 1,
  thumbnailUrl: "blob:logo-thumb",
  createdAt: 2000,
};

describe("Stage 1C — Frame & Layer UI Integration Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. State Invariants & Explicit Layer Creation", () => {
    function TestHost({ onStore }: { onStore: (store: ReturnType<typeof useStudioStore>) => void }) {
      const store = useStudioStore();
      React.useEffect(() => {
        onStore(store);
      }, [store, onStore]);

      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <span data-testid="active-layer-id">{store.activeLayerId || "none"}</span>
          <span data-testid="layer-count">{store.activeFrame?.layers.length ?? 0}</span>
        </div>
      );
    }

    it("selecting an asset via setActiveImageId does NOT create an ImageLayer (Constraint 1)", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Initial state has only the base GenerativeLayer (1 layer)
      expect(currentStore.activeFrame?.layers.length).toBe(1);
      expect(currentStore.activeFrame?.layers[0].type).toBe("generative");

      // Set activeImageId directly (asset library selection)
      currentStore.setActiveImageId("some-asset-id");

      await waitFor(() => {
        // Must NOT have created an ImageLayer
        expect(currentStore.activeFrame?.layers.length).toBe(1);
        expect(currentStore.activeFrame?.layers[0].type).toBe("generative");
      });
    });

    it("explicitly calling addLayerFromAsset creates an ImageLayer above the GenerativeLayer", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Add asset to asset store first
      await currentStore.addAssets([mockAsset1]);

      // Initial import auto-populated first layer on empty frame (2 layers: [generative, image])
      await waitFor(() => {
        expect(currentStore.activeFrame?.layers.length).toBe(2);
      });

      const layer = currentStore.addLayerFromAsset(mockAsset1.id);
      expect(layer).not.toBeNull();
      expect(layer?.type).toBe("image");
      expect(layer?.assetId).toBe(mockAsset1.id);

      await waitFor(() => {
        const frame = currentStore.activeFrame!;
        expect(frame.layers.length).toBe(3);
        expect(frame.layers[0].type).toBe("generative");
        expect(frame.layers[2].id).toBe(layer?.id);
        expect(currentStore.activeLayerId).toBe(layer?.id);
      });
    });

    it("reordering layers strictly preserves GenerativeLayer at index 0 (Constraint 4)", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      await currentStore.addAssets([mockAsset1, mockAsset2]);
      await waitFor(() => {
        expect(currentStore.activeFrame?.layers.length).toBe(2);
      });

      const initialLayerId = currentStore.activeFrame!.layers[1].id;
      const l2 = currentStore.addLayerFromAsset(mockAsset2.id)!;

      await waitFor(() => {
        expect(currentStore.activeFrame?.layers.length).toBe(3);
      });

      // Layers: [0: Generative, 1: initialLayer (mockAsset1), 2: l2 (mockAsset2)]
      expect(currentStore.activeFrame?.layers[0].type).toBe("generative");
      expect(currentStore.activeFrame?.layers[1].id).toBe(initialLayerId);
      expect(currentStore.activeFrame?.layers[2].id).toBe(l2.id);

      // Attempt invalid reorder to move GenerativeLayer (fromIndex 0)
      currentStore.reorderLayers(0, 2);
      expect(currentStore.activeFrame?.layers[0].type).toBe("generative");

      // Attempt invalid reorder to move an ImageLayer into index 0 (toIndex 0)
      currentStore.reorderLayers(2, 0);
      expect(currentStore.activeFrame?.layers[0].type).toBe("generative");

      // Valid reorder among ImageLayers (1 <-> 2)
      currentStore.reorderLayers(1, 2);
      await waitFor(() => {
        expect(currentStore.activeFrame?.layers[0].type).toBe("generative");
        expect(currentStore.activeFrame?.layers[1].id).toBe(l2.id);
        expect(currentStore.activeFrame?.layers[2].id).toBe(initialLayerId);
      });
    });

    it("removing GenerativeLayer (index 0) is strictly rejected (Constraint 4)", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const genLayerId = currentStore.activeFrame!.layers[0].id;
      // Attempt removal of base background layer
      currentStore.removeLayer(genLayerId);

      // Must remain in place
      expect(currentStore.activeFrame?.layers.length).toBe(1);
      expect(currentStore.activeFrame?.layers[0].id).toBe(genLayerId);
    });

    it("removing an ImageLayer updates activeLayerId fallback safely", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      await currentStore.addAssets([mockAsset1]);
      await waitFor(() => {
        expect(currentStore.activeFrame?.layers.length).toBe(2);
      });

      const l1 = currentStore.activeFrame!.layers[1];
      expect(currentStore.activeLayerId).toBe(l1.id);

      currentStore.removeLayer(l1.id);

      await waitFor(() => {
        expect(currentStore.activeFrame?.layers.length).toBe(1);
        expect(currentStore.activeLayerId).toBe(currentStore.activeFrame?.layers[0].id);
      });
    });

    it("updating layer properties (opacity, blendMode, fit, visible) mutates canonical layer", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      await currentStore.addAssets([mockAsset1]);
      const l1 = currentStore.addLayerFromAsset(mockAsset1.id)!;

      currentStore.updateLayer(l1.id, {
        opacity: 0.75,
        blendMode: "multiply",
        visible: false,
      });

      await waitFor(() => {
        const updated = currentStore.activeFrame?.layers.find((l) => l.id === l1.id) as ImageLayer;
        expect(updated.opacity).toBe(0.75);
        expect(updated.blendMode).toBe("multiply");
        expect(updated.visible).toBe(false);
      });
    });

    it("setFrameDimensions updates frame width, height, and presetId", async () => {
      let currentStore!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { currentStore = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      currentStore.setFrameDimensions({
        width: 1920,
        height: 1080,
        presetId: "16:9",
      });

      await waitFor(() => {
        const dims = currentStore.activeFrame!.dimensions;
        expect(dims.width).toBe(1920);
        expect(dims.height).toBe(1080);
        expect(dims.presetId).toBe("16:9");
      });
    });
  });

  describe("2. UI Interaction Suite", () => {
    function FullStudioUiHost({ children }: { children?: React.ReactNode }) {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <button
            data-testid="setup-assets-and-layers"
            onClick={async () => {
              await store.addAssets([mockAsset1]);
            }}
          >
            Setup
          </button>
          <AssetPanel />
          <InspectorPanel />
          <CanvasControlDock
            isHandToolActive={false}
            setIsHandToolActive={vi.fn()}
            isSpacePressed={false}
            containerRef={{ current: document.createElement("div") }}
          />
          {children}
        </div>
      );
    }

    it("renders AssetPanel with Assets and Layers tab switcher", async () => {
      render(
        <StudioProvider>
          <FullStudioUiHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Check tab buttons
      const assetsTab = screen.getByRole("tab", { name: /Assets/i });
      const layersTab = screen.getByRole("tab", { name: /Layers/i });

      expect(assetsTab).toBeDefined();
      expect(layersTab).toBeDefined();
    });

    it("switching to Layers tab renders clean layer rows and locked Background row", async () => {
      render(
        <StudioProvider>
          <FullStudioUiHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-assets-and-layers"));

      await waitFor(() => {
        expect(screen.getByRole("tab", { name: /Layers \(2\)/i })).toBeDefined();
      });

      // Click Layers tab
      const layersTab = screen.getByRole("tab", { name: /Layers \(2\)/i });
      fireEvent.click(layersTab);

      await waitFor(() => {
        // Locked Background row must be present
        const lockedBg = screen.getByTestId("locked-background-row");
        expect(lockedBg).toBeDefined();
        expect(within(lockedBg).getByText("Background")).toBeDefined();
      });
    });

    it("Inspector displays Layer Properties (Opacity, Blend Mode, Fit) when ImageLayer is active", async () => {
      render(
        <StudioProvider>
          <FullStudioUiHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-assets-and-layers"));

      await waitFor(() => {
        expect(screen.getByText("Layer Properties")).toBeDefined();
        expect(screen.getByText("Blend Mode")).toBeDefined();
        expect(screen.getByText("Fit")).toBeDefined();
        expect(screen.getByText("Effects")).toBeDefined();
        expect(screen.getByText("Looks")).toBeDefined();
        expect(screen.getByText("Background")).toBeDefined();
      });
    });

    it("Frame Size popover opens from dock Resize button and shows presets", async () => {
      render(
        <StudioProvider>
          <FullStudioUiHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const resizeBtn = screen.getByLabelText("Frame size");
      expect(resizeBtn).toBeDefined();

      fireEvent.click(resizeBtn);

      await waitFor(() => {
        expect(screen.getByText("Frame Size")).toBeDefined();
        expect(screen.getByText("1:1")).toBeDefined();
        expect(screen.getByText("16:9")).toBeDefined();
        expect(screen.getByText("9:16")).toBeDefined();
        expect(screen.getByText("Custom Dimensions")).toBeDefined();
      });
    });
  });
});
