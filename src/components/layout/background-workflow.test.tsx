// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { InspectorPanel } from "./inspector-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
import { LayersPanel } from "./layers-panel";
import type { Asset } from "../../types/asset";

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
      <span data-testid="bg-count">{store.activeBackgrounds.length}</span>
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
        data-testid="select-background-layer"
        onClick={() => {
          const gen = store.activeFrame?.layers.find((l) => l.type === "generative");
          if (gen) store.setActiveLayerId(gen.id);
        }}
      >
        Select Background Layer
      </button>
      <LayersPanel />
      <InspectorPanel />
      <FloatingBackgroundPanel />
    </div>
  );
}

describe("EffectsIO — Authoritative Background Workflow Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("A. Context Boundary (Image vs Background Selection)", () => {
    it("Image selected -> NO Background section, NO Add Background control", async () => {
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
        expect(screen.getByText("Looks")).toBeDefined();
        // Mandatory Context Boundary: NO Background section
        expect(screen.queryByTestId("add-background-button")).toBeNull();
        expect(screen.queryByRole("dialog", { name: /Background Parameters/i })).toBeNull();
      });
    });

    it("Background selected -> Background section appears with permanent '+' control", async () => {
      render(
        <StudioProvider>
          <FullTestStudioHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Setup image then switch to Background layer
      fireEvent.click(screen.getByTestId("setup-image-asset"));
      await waitFor(() => {
        expect(screen.queryByTestId("add-background-button")).toBeNull();
      });

      fireEvent.click(screen.getByTestId("select-background-layer"));

      await waitFor(() => {
        expect(screen.getByText("Layer Properties")).toBeDefined();
        // Background section is visible exclusively because Background Layer is selected
        expect(screen.getByTestId("add-background-button")).toBeDefined();
      });
    });
  });

  describe("B. Permanent '+' Control & Add Workflow", () => {
    it("'+' button permanently remains '+' after adding backgrounds (never becomes '−')", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-background-layer"));

      await waitFor(() => {
        expect(screen.getByTestId("add-background-button")).toBeDefined();
      });

      // Click '+' to open Add Background Popover
      fireEvent.click(screen.getByTestId("add-background-button"));

      // Popover shows floor primitives
      await waitFor(() => {
        expect(screen.getByTestId("add-bg-solid")).toBeDefined();
        expect(screen.getByTestId("add-bg-linear-gradient")).toBeDefined();
        expect(screen.getByTestId("add-bg-radial-gradient")).toBeDefined();
        expect(screen.getByTestId("add-bg-dots")).toBeDefined();
        expect(screen.getByTestId("add-bg-grid")).toBeDefined();
      });

      // Add Solid
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
        // Header button must PERMANENTLY remain '+'
        expect(screen.getByTestId("add-background-button")).toBeDefined();
        const bgHeader = screen.getByTestId("background-section-header");
        expect(within(bgHeader).queryByRole("button", { name: /remove/i })).toBeNull();
      });

      // Add another background (Linear Gradient)
      fireEvent.click(screen.getByTestId("add-background-button"));
      await waitFor(() => {
        expect(screen.getByTestId("add-bg-linear-gradient")).toBeDefined();
      });
      fireEvent.click(screen.getByTestId("add-bg-linear-gradient"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
        // Header button STILL remains '+'
        expect(screen.getByTestId("add-background-button")).toBeDefined();
      });
    });
  });

  describe("C. Stack Rows & Independent Controls", () => {
    it("each background item has its own remove control, visibility toggle, and compact opacity", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-background-layer"));

      // Add Solid and Grid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(await screen.findByTestId("add-bg-solid"));

      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(await screen.findByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const solidId = storeRef.activeBackgrounds[0].id;
      const gridId = storeRef.activeBackgrounds[1].id;

      const solidRow = screen.getByTestId(`background-row-${solidId}`);
      const gridRow = screen.getByTestId(`background-row-${gridId}`);

      expect(solidRow).toBeDefined();
      expect(gridRow).toBeDefined();

      // Visibility toggle on solid row only
      const solidEye = screen.getByTestId(`visibility-toggle-${solidId}`);
      fireEvent.click(solidEye);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].enabled).toBe(false);
        expect(storeRef.activeBackgrounds[1].enabled).toBe(true);
      });

      // Remove Grid item using its own '-' button
      const gridRemove = screen.getByTestId(`remove-background-${gridId}`);
      fireEvent.click(gridRemove);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
        expect(storeRef.activeBackgrounds[0].id).toBe(solidId);
      });
    });

    it("independent opacity and blend mode per background item", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-background-layer"));

      // Add Solid then Grid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(await screen.findByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(await screen.findByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const [solid, grid] = storeRef.activeBackgrounds;

      // Update grid opacity to 70% and blend mode to overlay
      storeRef.updateBackgroundItem(grid.id, { opacity: 0.7, blendMode: "overlay" });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[1].opacity).toBe(0.7);
        expect(storeRef.activeBackgrounds[1].blendMode).toBe("overlay");
        // Solid remains unchanged at 100% and normal
        expect(storeRef.activeBackgrounds[0].opacity).toBe(1.0);
        expect(storeRef.activeBackgrounds[0].blendMode).toBe("normal");
      });
    });
  });

  describe("D. Floating Parameter Editor", () => {
    it("clicking a background item opens FloatingBackgroundPanel to edit that item's parameters", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-background-layer"));

      // Add Dots background
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(await screen.findByTestId("add-bg-dots"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
        expect(screen.getByRole("dialog", { name: /Background Parameters/i })).toBeDefined();
        expect(screen.getByText("Dot Size")).toBeDefined();
        expect(screen.getByText("Dot Spacing")).toBeDefined();
      });

      // Close floating panel
      fireEvent.click(screen.getByRole("button", { name: /Close parameters/i }));

      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: /Background Parameters/i })).toBeNull();
      });

      // Click stack row to reopen parameter editor
      const dotsId = storeRef.activeBackgrounds[0].id;
      fireEvent.click(screen.getByTestId(`background-row-${dotsId}`));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Background Parameters/i })).toBeDefined();
      });
    });
  });

  describe("E. Background Layer Lifecycle", () => {
    it("preserves base locked backdrop layer and prevents deletion", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <FullTestStudioHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Confirm background layer is present
      const bgRow = screen.getByTestId("locked-background-row");
      expect(bgRow).toBeDefined();

      // Delete button is protected/hidden on locked backdrop layer (BLK-02)
      expect(screen.queryByTestId("remove-background-layer")).toBeNull();

      // Selecting background layer displays Background section in Inspector
      fireEvent.click(screen.getByTestId("select-background-layer"));
      await waitFor(() => {
        expect(screen.getByTestId("background-section-header")).toBeDefined();
      });
    });
  });
});
