// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { InspectorPanel } from "./inspector-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
import { LayersPanel } from "./layers-panel";
import type { ProceduralSource } from "../../types/frame";

function TestHost({ onStore }: { onStore?: (store: ReturnType<typeof useStudioStore>) => void }) {
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
        data-testid="open-bg-panel"
        onClick={() => store.setIsProceduralEditorOpen(true)}
      >
        Open BG Panel
      </button>
      <button
        data-testid="undo-btn"
        onClick={() => store.undo()}
      >
        Undo
      </button>
      <button
        data-testid="redo-btn"
        onClick={() => store.redo()}
      >
        Redo
      </button>
      <LayersPanel />
      <InspectorPanel />
      <FloatingBackgroundPanel />
    </div>
  );
}

describe("EffectsIO — Decision A Canonical Procedural Layer Stack Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Procedural Layer Creation & Single Active Selection", () => {
    it("adds multiple independent procedural layers and automatically selects each new layer", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const initialLayers = storeRef.activeFrame?.layers.length ?? 0;
      expect(initialLayers).toBeGreaterThanOrEqual(1);

      // 1. Add Solid layer
      storeRef.addProceduralLayer("solid");
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(initialLayers + 1);
        const added = storeRef.activeFrame?.layers[storeRef.activeFrame.layers.length - 1];
        expect(added?.source.type).toBe("procedural");
        expect((added?.source as ProceduralSource).kind).toBe("solid");
        expect(storeRef.activeLayerId).toBe(added?.id);
      });

      // 2. Add Dots layer
      storeRef.addProceduralLayer("dots");
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(initialLayers + 2);
        const added = storeRef.activeFrame?.layers[storeRef.activeFrame.layers.length - 1];
        expect(added?.source.type).toBe("procedural");
        expect((added?.source as ProceduralSource).kind).toBe("dots");
        expect(storeRef.activeLayerId).toBe(added?.id);
      });

      // 3. Add Grid layer
      storeRef.addProceduralLayer("grid");
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(initialLayers + 3);
        const added = storeRef.activeFrame?.layers[storeRef.activeFrame.layers.length - 1];
        expect(added?.source.type).toBe("procedural");
        expect((added?.source as ProceduralSource).kind).toBe("grid");
        expect(storeRef.activeLayerId).toBe(added?.id);
      });
    });

    it("activeLayerId is the single authoritative source of truth for selection", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      storeRef.addProceduralLayer("solid");
      let solidLayerId = "";
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(2);
        solidLayerId = storeRef.activeLayerId!;
      });

      storeRef.addProceduralLayer("dots");
      let dotsLayerId = "";
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(3);
        dotsLayerId = storeRef.activeLayerId!;
      });

      expect(solidLayerId).not.toBe(dotsLayerId);
      expect(storeRef.activeLayerId).toBe(dotsLayerId);

      // Select solid layer
      storeRef.setActiveLayerId(solidLayerId);
      await waitFor(() => {
        expect(storeRef.activeLayerId).toBe(solidLayerId);
        expect(storeRef.activeLayer?.id).toBe(solidLayerId);
      });
    });
  });

  describe("2. Layer Independence & Parameter Updates", () => {
    it("updating parameters on one procedural layer does NOT mutate other layers", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      storeRef.addProceduralLayer("solid");
      let solidLayerId = "";
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(2);
        solidLayerId = storeRef.activeLayerId!;
      });

      storeRef.addProceduralLayer("dots");
      let dotsLayerId = "";
      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(3);
        dotsLayerId = storeRef.activeLayerId!;
      });

      // Update solid layer parameter
      storeRef.updateLayerSource(solidLayerId, {
        parameters: { color: "#336699" },
      });

      await waitFor(() => {
        const currentSolid = storeRef.activeFrame?.layers.find((l) => l.id === solidLayerId);
        const currentDots = storeRef.activeFrame?.layers.find((l) => l.id === dotsLayerId);

        expect((currentSolid?.source as ProceduralSource).parameters.color).toBe("#336699");
        expect((currentDots?.source as ProceduralSource).parameters.color).toBeUndefined();
      });
    });
  });

  describe("3. Backdrop Protection Invariants", () => {
    it("backdrop at index 0 cannot be removed", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const backdrop = storeRef.activeFrame?.layers[0]!;
      expect(backdrop).toBeDefined();
      expect(backdrop.locked).toBe(true);

      const countBefore = storeRef.activeFrame?.layers.length ?? 0;
      storeRef.removeLayer(backdrop.id);

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(countBefore);
        expect(storeRef.activeFrame?.layers[0].id).toBe(backdrop.id);
      });
    });

    it("backdrop at index 0 cannot be unlocked", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const backdrop = storeRef.activeFrame?.layers[0]!;
      storeRef.updateLayer(backdrop.id, { locked: false });

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers[0].locked).toBe(true);
      });
    });

    it("backdrop at index 0 cannot be reordered away from index 0", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const backdrop = storeRef.activeFrame?.layers[0]!;
      storeRef.addProceduralLayer("dots");
      const dotsLayer = storeRef.activeLayer!;

      // Attempt to move backdrop from index 0 to index 1
      storeRef.reorderLayers(0, 1);

      await waitFor(() => {
        // Invariant: backdrop must remain at index 0
        expect(storeRef.activeFrame?.layers[0].id).toBe(backdrop.id);
      });
    });
  });

  describe("4. Undo / Redo Workflow", () => {
    it("adding a procedural layer and undoing removes it; redoing restores it", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      const countBefore = storeRef.activeFrame?.layers.length ?? 0;

      // Add layer
      storeRef.addProceduralLayer("solid");

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(countBefore + 1);
        expect(storeRef.canUndo).toBe(true);
      });

      // Undo
      fireEvent.click(screen.getByTestId("undo-btn"));

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(countBefore);
        expect(storeRef.canRedo).toBe(true);
      });

      // Redo
      fireEvent.click(screen.getByTestId("redo-btn"));

      await waitFor(() => {
        expect(storeRef.activeFrame?.layers.length).toBe(countBefore + 1);
      });
    });
  });
});
