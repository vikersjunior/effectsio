// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { InspectorPanel } from "./inspector-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
import { LayersPanel } from "./layers-panel";
import type { Asset } from "../../types/asset";
import type { ProceduralSource } from "../../types/frame";

const sampleAsset: Asset = {
  id: "test-asset-1",
  filename: "sample-photo.png",
  mimeType: "image/png",
  fileSize: 1024 * 500,
  objectUrl: "blob:sample",
  width: 1200,
  height: 800,
  aspectRatio: 1200 / 800,
  thumbnailUrl: "blob:sample-thumb",
  createdAt: Date.now(),
};

function FullTestStudioHost({ onStore }: { onStore?: (store: ReturnType<typeof useStudioStore>) => void }) {
  const store = useStudioStore();
  React.useEffect(() => {
    onStore?.(store);
  }, [store, onStore]);

  return (
    <div className="relative w-full h-full">
      <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
      <span data-testid="active-layer-id">{store.activeLayerId || "none"}</span>
      <span data-testid="layer-count">{store.activeFrame?.layers.length ?? 0}</span>
      <button
        data-testid="setup-image-asset"
        onClick={async () => {
          await store.addAssets([sampleAsset]);
          store.addLayerFromAsset(sampleAsset.id);
        }}
      >
        Setup Image Layer
      </button>
      <button
        data-testid="select-backdrop-layer"
        onClick={() => {
          if (store.activeFrame?.layers[0]) {
            store.setActiveLayerId(store.activeFrame.layers[0].id);
          }
        }}
      >
        Select Backdrop Layer
      </button>
      <button
        data-testid="add-procedural-dots"
        onClick={() => {
          store.addProceduralLayer("dots");
        }}
      >
        Add Procedural Dots
      </button>
      <LayersPanel />
      <InspectorPanel />
      <FloatingBackgroundPanel />
    </div>
  );
}

describe("EffectsIO — Decision A Canonical Procedural Layer Workflow Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("A. Context Boundary (Image vs Procedural Layer Selection)", () => {
    it("Image selected -> displays Image properties, no procedural edit button", async () => {
      render(
        <StudioProvider>
          <FullTestStudioHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Add image layer and select it
      fireEvent.click(screen.getByTestId("setup-image-asset"));

      await waitFor(() => {
        expect(screen.getByText("Layer Properties")).toBeDefined();
        expect(screen.getByText("Transform")).toBeDefined();
        expect(screen.getByText("Effects")).toBeDefined();
        // Mandatory Context Boundary: NO procedural Edit Parameters button
        expect(screen.queryByTestId("open-procedural-editor")).toBeNull();
        expect(screen.queryByTestId("floating-background-panel")).toBeNull();
      });
    });

    it("Procedural layer selected -> displays Source section with [Edit Parameters] button", async () => {
      render(
        <StudioProvider>
          <FullTestStudioHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select backdrop (procedural layer at index 0)
      fireEvent.click(screen.getByTestId("select-backdrop-layer"));

      await waitFor(() => {
        expect(screen.getByText("Layer Properties")).toBeDefined();
        expect(screen.getByTestId("open-procedural-editor")).toBeDefined();
      });
    });
  });

  describe("B. Floating Procedural Parameter Editor", () => {
    it("clicking [Edit Parameters] opens floating parameter editor for active procedural layer", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-backdrop-layer"));

      await waitFor(() => {
        expect(screen.getByTestId("open-procedural-editor")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("open-procedural-editor"));

      await waitFor(() => {
        expect(screen.getByTestId("floating-background-panel")).toBeDefined();
        expect(storeRef.isProceduralEditorOpen).toBe(true);
      });

      // Close button closes the panel
      fireEvent.click(screen.getByTestId("close-background-panel"));

      await waitFor(() => {
        expect(screen.queryByTestId("floating-background-panel")).toBeNull();
        expect(storeRef.isProceduralEditorOpen).toBe(false);
      });
    });

    it("switching procedural primitive updates activeLayer.source.kind", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Add a procedural dots layer
      fireEvent.click(screen.getByTestId("add-procedural-dots"));

      await waitFor(() => {
        expect(storeRef.activeLayer?.source.type).toBe("procedural");
        expect((storeRef.activeLayer?.source as ProceduralSource).kind).toBe("dots");
      });

      // Open parameter editor
      fireEvent.click(screen.getByTestId("open-procedural-editor"));

      await waitFor(() => {
        expect(screen.getByTestId("floating-background-panel")).toBeDefined();
      });

      // Click Grid primitive button
      fireEvent.click(screen.getByTestId("primitive-grid"));

      await waitFor(() => {
        expect((storeRef.activeLayer?.source as ProceduralSource).kind).toBe("grid");
      });
    });
  });

  describe("C. Backdrop Invariants & Canonical Layer Deletion", () => {
    it("backdrop at index 0 cannot be deleted via alpha button, but upper procedural layers can", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // 1. Select backdrop
      fireEvent.click(screen.getByTestId("select-backdrop-layer"));
      fireEvent.click(screen.getByTestId("open-procedural-editor"));

      await waitFor(() => {
        expect(screen.getByTestId("floating-background-panel")).toBeDefined();
      });

      const initialCount = storeRef.activeFrame?.layers.length ?? 0;

      // Click alpha on backdrop -> backdrop must NOT be deleted
      fireEvent.click(screen.getByTestId("primitive-transparent"));

      expect(storeRef.activeFrame?.layers.length).toBe(initialCount);

      // 2. Add an upper procedural layer
      fireEvent.click(screen.getByTestId("add-procedural-dots"));

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(initialCount + 1);
      });

      // Open editor for upper procedural layer
      fireEvent.click(screen.getByTestId("open-procedural-editor"));

      await waitFor(() => {
        expect(screen.getByTestId("floating-background-panel")).toBeDefined();
      });

      // Click alpha on upper procedural layer -> must be deleted
      fireEvent.click(screen.getByTestId("primitive-transparent"));

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(initialCount);
      });
    });
  });
});
