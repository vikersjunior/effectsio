// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { InspectorPanel } from "./inspector-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
import { LayersPanel } from "./layers-panel";
import type { GenerativeLayer } from "../../types/frame";

function TestHost({ onStore }: { onStore?: (store: ReturnType<typeof useStudioStore>) => void }) {
  const store = useStudioStore();
  React.useEffect(() => {
    onStore?.(store);
  }, [store, onStore]);

  return (
    <div className="relative w-full h-full">
      <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
      <span data-testid="selected-bg-id">{store.selectedBackgroundId || "none"}</span>
      <span data-testid="bg-count">{store.activeBackgrounds.length}</span>
      <button
        data-testid="open-bg-panel"
        onClick={() => store.setIsBackgroundPanelOpen(true)}
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

describe("EffectsIO — Stackable Background System Suite", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Background Creation & Stack Management", () => {
    it("adds multiple independent backgrounds via + popover and automatically selects each new item", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer to show Background Stack in InspectorPanel
      fireEvent.click(screen.getByTestId("locked-background-row"));

      await waitFor(() => {
        expect(screen.getByTestId("add-background-button")).toBeDefined();
      });

      // 1. Add Solid Color via + popover
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
        expect(storeRef.activeBackgrounds[0].type).toBe("solid");
        expect(storeRef.selectedBackgroundId).toBe(storeRef.activeBackgrounds[0].id);
      });

      // 2. Add Linear Gradient
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-linear-gradient"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
        expect(storeRef.activeBackgrounds[1].type).toBe("linear-gradient");
        expect(storeRef.selectedBackgroundId).toBe(storeRef.activeBackgrounds[1].id);
      });

      // 3. Add Grid Pattern
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(3);
        expect(storeRef.activeBackgrounds[2].type).toBe("grid");
        expect(storeRef.selectedBackgroundId).toBe(storeRef.activeBackgrounds[2].id);
      });

      // Verify all 3 appear in the background stack list as independent rows
      const rows = screen.getAllByTestId(/^background-row-/);
      expect(rows).toHaveLength(3);

      // Verify FloatingBackgroundPanel is active for editing parameters
      expect(screen.getByLabelText("Background Parameters")).toBeDefined();
    });

    it("supports selection between background stack items", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add two items
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-dots"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const solidId = storeRef.activeBackgrounds[0].id;
      const dotsId = storeRef.activeBackgrounds[1].id;

      // Click solid row to select it
      const solidRow = screen.getByTestId(`background-row-${solidId}`);
      fireEvent.click(solidRow);

      await waitFor(() => {
        expect(storeRef.selectedBackgroundId).toBe(solidId);
      });

      // Click dots row to select it
      const dotsRow = screen.getByTestId(`background-row-${dotsId}`);
      fireEvent.click(dotsRow);

      await waitFor(() => {
        expect(storeRef.selectedBackgroundId).toBe(dotsId);
      });
    });

    it("toggles visibility independently per background item", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
        expect(storeRef.activeBackgrounds[0].enabled).toBe(true);
      });

      const solidId = storeRef.activeBackgrounds[0].id;
      const toggleBtn = screen.getByTestId(`visibility-toggle-${solidId}`);
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].enabled).toBe(false);
      });

      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].enabled).toBe(true);
      });
    });

    it("reorders background items and updates canonical array", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add Solid then Grid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const id0 = storeRef.activeBackgrounds[0].id;
      const id1 = storeRef.activeBackgrounds[1].id;

      // Reorder 0 to 1
      storeRef.reorderBackgroundItems(0, 1);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].id).toBe(id1);
        expect(storeRef.activeBackgrounds[1].id).toBe(id0);
      });
    });
  });

  describe("2. Selection Recovery on Item Deletion", () => {
    it("handles selection recovery when deleting top, middle, and bottom items", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add 3 items: Solid, Linear Gradient, Grid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-linear-gradient"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(3);
      });

      const [item0, item1, item2] = storeRef.activeBackgrounds;

      // Case A: Select middle item (item1) and remove it -> neighbor selected
      storeRef.setSelectedBackgroundId(item1.id);
      storeRef.removeBackgroundItem(item1.id);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds).toHaveLength(2);
        expect(storeRef.selectedBackgroundId).toBe(item2.id);
      });

      // Case B: Select bottom/last item (item2) and remove it -> preceding neighbor (item0) selected
      storeRef.removeBackgroundItem(item2.id);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds).toHaveLength(1);
        expect(storeRef.selectedBackgroundId).toBe(item0.id);
      });

      // Case C: Remove only remaining item -> selection becomes null
      storeRef.removeBackgroundItem(item0.id);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds).toHaveLength(0);
        expect(storeRef.selectedBackgroundId).toBeNull();
      });
    });
  });

  describe("3. Independent Opacity & Blend Mode", () => {
    it("adjusts opacity independently per background item without affecting others", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const [solidItem, gridItem] = storeRef.activeBackgrounds;

      // Update gridItem opacity to 0.7
      storeRef.updateBackgroundItem(gridItem.id, { opacity: 0.7 });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[1].opacity).toBe(0.7);
        // Solid remains unchanged at 1.0
        expect(storeRef.activeBackgrounds[0].opacity).toBe(1.0);
      });

      // Update solidItem opacity to 0.35
      storeRef.updateBackgroundItem(solidItem.id, { opacity: 0.35 });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.35);
        expect(storeRef.activeBackgrounds[1].opacity).toBe(0.7);
      });
    });

    it("adjusts blend mode independently per background item", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      const [solidItem, gridItem] = storeRef.activeBackgrounds;

      // Set grid blend mode to overlay
      storeRef.updateBackgroundItem(gridItem.id, { blendMode: "overlay" });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[1].blendMode).toBe("overlay");
        // Solid remains normal
        expect(storeRef.activeBackgrounds[0].blendMode).toBe("normal");
      });
    });

    it("renders editable opacity input in background row, updating item opacity with clamping and undo/redo", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add Radial Gradient
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-radial-gradient"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
      });

      const radial = storeRef.activeBackgrounds[0];
      const opacityInput = screen.getByTestId(`background-opacity-input-${radial.id}`) as HTMLInputElement;
      expect(opacityInput).toBeDefined();
      expect(opacityInput.tagName).toBe("INPUT");
      expect(opacityInput.value).toBe("100%");

      // Focus and change opacity to 65%
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "65%" } });
      fireEvent.blur(opacityInput);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.65);
        expect(opacityInput.value).toBe("65%");
      });

      // Clamp high values: 150 -> 100%
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "150" } });
      fireEvent.keyDown(opacityInput, { key: "Enter" });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(1.0);
        expect(opacityInput.value).toBe("100%");
      });

      // Clamp negative values: -10 -> 0%
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "-10" } });
      fireEvent.keyDown(opacityInput, { key: "Enter" });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.0);
        expect(opacityInput.value).toBe("0%");
      });

      // Revert on Escape
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "50" } });
      fireEvent.keyDown(opacityInput, { key: "Escape" });

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.0);
        expect(opacityInput.value).toBe("0%");
      });

      // Arrow stepping: ArrowUp -> 1%
      fireEvent.keyDown(opacityInput, { key: "ArrowUp" });
      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.01);
        expect(opacityInput.value).toBe("1%");
      });

      // Arrow stepping with Shift: Shift+ArrowUp -> +10% -> 11%
      fireEvent.keyDown(opacityInput, { key: "ArrowUp", shiftKey: true });
      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.11);
        expect(opacityInput.value).toBe("11%");
      });

      // Undo reverts to previous discrete state
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "75%" } });
      fireEvent.blur(opacityInput);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.75);
      });

      fireEvent.click(screen.getByTestId("undo-btn"));
      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.11);
        expect(opacityInput.value).toBe("11%");
      });

      // Redo restores 75%
      fireEvent.click(screen.getByTestId("redo-btn"));
      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.75);
        expect(opacityInput.value).toBe("75%");
      });
    });

    it("synchronizes opacity bidirectionally between row input and FloatingBackgroundPanel", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add Dots
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-dots"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(1);
      });

      const dots = storeRef.activeBackgrounds[0];
      const opacityInput = screen.getByTestId(`background-opacity-input-${dots.id}`) as HTMLInputElement;

      // 1. Change opacity via row input -> verify FloatingBackgroundPanel updates
      fireEvent.focus(opacityInput);
      fireEvent.change(opacityInput, { target: { value: "50%" } });
      fireEvent.blur(opacityInput);

      await waitFor(() => {
        expect(storeRef.activeBackgrounds[0].opacity).toBe(0.5);
      });

      // 2. Change opacity via store/FloatingBackgroundPanel update -> verify row input updates
      storeRef.updateBackgroundItem(dots.id, { opacity: 0.82 });

      await waitFor(() => {
        expect(opacityInput.value).toBe("82%");
      });
    });
  });

  describe("4. Floor Primitive Parameter Editing", () => {
    it("updates parameters for all 5 primitive types", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // 1. Solid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));
      await waitFor(() => expect(storeRef.activeBackgrounds.length).toBe(1));
      const solidId = storeRef.activeBackgrounds[0].id;
      storeRef.updateBackgroundItemParameters(solidId, { color: "#abcdef" });
      await waitFor(() => expect(storeRef.activeBackgrounds[0].parameters.color).toBe("#abcdef"));

      // 2. Linear Gradient
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-linear-gradient"));
      await waitFor(() => expect(storeRef.activeBackgrounds.length).toBe(2));
      const linId = storeRef.activeBackgrounds[1].id;
      storeRef.updateBackgroundItemParameters(linId, { angle: 180 });
      await waitFor(() => expect(storeRef.activeBackgrounds[1].parameters.angle).toBe(180));

      // 3. Radial Gradient
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-radial-gradient"));
      await waitFor(() => expect(storeRef.activeBackgrounds.length).toBe(3));
      const radId = storeRef.activeBackgrounds[2].id;
      storeRef.updateBackgroundItemParameters(radId, { startColor: "#333333" });
      await waitFor(() => expect(storeRef.activeBackgrounds[2].parameters.startColor).toBe("#333333"));

      // 4. Dots
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-dots"));
      await waitFor(() => expect(storeRef.activeBackgrounds.length).toBe(4));
      const dotsId = storeRef.activeBackgrounds[3].id;
      storeRef.updateBackgroundItemParameters(dotsId, { spacing: 32, dotSize: 4 });
      await waitFor(() => {
        expect(storeRef.activeBackgrounds[3].parameters.spacing).toBe(32);
        expect(storeRef.activeBackgrounds[3].parameters.dotSize).toBe(4);
      });

      // 5. Grid
      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-grid"));
      await waitFor(() => expect(storeRef.activeBackgrounds.length).toBe(5));
      const gridId = storeRef.activeBackgrounds[4].id;
      storeRef.updateBackgroundItemParameters(gridId, { lineWidth: 3 });
      await waitFor(() => expect(storeRef.activeBackgrounds[4].parameters.lineWidth).toBe(3));
    });
  });

  describe("5. History (Undo / Redo) Integration", () => {
    it("undoes and redoes adding a background item", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      const initialCount = storeRef.activeBackgrounds.length;

      fireEvent.click(screen.getByTestId("add-background-button"));
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(initialCount + 1);
      });

      // Undo
      fireEvent.click(screen.getByTestId("undo-btn"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(initialCount);
      });

      // Redo
      fireEvent.click(screen.getByTestId("redo-btn"));

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(initialCount + 1);
      });
    });
  });

  describe("6. Terminology & LayersPanel Boundary", () => {
    it("verifies zero user-facing 'Sublayer' terminology exists in the Background UI", async () => {
      render(
        <StudioProvider>
          <TestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Confirm no element mentions "Sublayer", "Sublayers", or "Generative Sublayer"
      expect(screen.queryByText(/sublayer/i)).toBeNull();
      expect(screen.queryByText(/generative sublayer/i)).toBeNull();
    });

    it("verifies LayersPanel shows clean Background row with count badge and no nested sublayer tree", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      render(
        <StudioProvider>
          <TestHost onStore={(s) => { storeRef = s; }} />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("locked-background-row"));

      // Add two backgrounds
      storeRef.addBackgroundItem("solid");
      storeRef.addBackgroundItem("grid");

      await waitFor(() => {
        expect(storeRef.activeBackgrounds.length).toBe(2);
      });

      // Locked background row in LayersPanel
      const bgRow = screen.getByTestId("locked-background-row");
      expect(within(bgRow).getByText("Background")).toBeDefined();
      expect(within(bgRow).getByTestId("background-count-badge").textContent).toBe("2");

      // Verify no nested sublayer rows exist in LayersPanel
      expect(screen.queryByTestId("sublayer-row")).toBeNull();
    });
  });
});
