// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { InspectorPanel } from "./inspector-panel";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
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

describe("InspectorPanel (Correction 02.3 - Figma nodes 10:920 & 61:1306)", () => {
  afterEach(() => {
    cleanup();
  });

  describe("Empty State (Figma node 10:920)", () => {
    it("renders 56px header with 32px avatar (JD) and pink Export button", () => {
      render(
        <StudioProvider>
          <InspectorPanel />
        </StudioProvider>
      );

      const avatar = screen.getByRole("button", { name: /Account and appearance settings/i });
      expect(avatar).toBeDefined();
      expect(avatar.textContent).toBe("JD");

      const exportBtn = screen.getByRole("button", { name: /Export/i });
      expect(exportBtn).toBeDefined();
    });

    it("renders Design and Animate tabs in editor mode row", () => {
      render(
        <StudioProvider>
          <InspectorPanel />
        </StudioProvider>
      );

      const designTab = screen.getByRole("button", { name: "Design" });
      const animateTab = screen.getByRole("button", { name: "Animate" });

      expect(designTab).toBeDefined();
      expect(animateTab).toBeDefined();
    });

    it("contains NO Page section, NO canvas ColorControl, and empty body space", () => {
      render(
        <StudioProvider>
          <InspectorPanel />
        </StudioProvider>
      );

      // Verify NO Page or canvas background color controls
      expect(screen.queryByText("Page")).toBeNull();
      expect(screen.queryByTitle(/Canvas Background Color/i)).toBeNull();

      // Verify NO placeholder effect stack or looks content
      expect(screen.queryByText("Effects")).toBeNull();
      expect(screen.queryByText("Looks")).toBeNull();
      expect(screen.queryByText("Background")).toBeNull();

      // Verify empty space container is rendered
      const emptySpace = screen.getByTestId("empty-inspector-space");
      expect(emptySpace).toBeDefined();
    });
  });

  describe("Account & Theme Menu", () => {
    it("opens popover with account info and System, Light, Dark appearance options", () => {
      render(
        <StudioProvider>
          <InspectorPanel />
        </StudioProvider>
      );

      const avatar = screen.getByRole("button", { name: /Account and appearance settings/i });
      fireEvent.click(avatar);

      expect(screen.getByText("John Doe")).toBeDefined();
      expect(screen.getByText("john@example.com")).toBeDefined();
      expect(screen.getByRole("button", { name: "Account Settings" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Saved Projects" })).toBeDefined();

      const systemOption = screen.getByRole("button", { name: /System/i });
      const lightOption = screen.getByRole("button", { name: /Light/i });
      const darkOption = screen.getByRole("button", { name: /Dark/i });

      expect(systemOption).toBeDefined();
      expect(lightOption).toBeDefined();
      expect(darkOption).toBeDefined();
    });

    it("switches theme between Light, Dark, and System", () => {
      function ThemeTestHost() {
        const { theme } = useStudioStore();
        return (
          <div>
            <span data-testid="current-theme">{theme}</span>
            <InspectorPanel />
          </div>
        );
      }

      render(
        <StudioProvider>
          <ThemeTestHost />
        </StudioProvider>
      );

      const avatar = screen.getByRole("button", { name: /Account and appearance settings/i });
      fireEvent.click(avatar);

      // Select Light
      const lightOption = screen.getByRole("button", { name: /Light/i });
      fireEvent.click(lightOption);
      expect(screen.getByTestId("current-theme").textContent).toBe("light");

      // Select Dark
      const darkOption = screen.getByRole("button", { name: /Dark/i });
      fireEvent.click(darkOption);
      expect(screen.getByTestId("current-theme").textContent).toBe("dark");

      // Select System
      const systemOption = screen.getByRole("button", { name: /System/i });
      fireEvent.click(systemOption);
      expect(screen.getByTestId("current-theme").textContent).toBe("system");
    });
  });

  describe("Populated State (Figma node 61:1306)", () => {
    function PopulatedTestHost({ children }: { children?: React.ReactNode }) {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <button
            data-testid="setup-populated"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
              store.addEffectToStack(sampleAsset.id, "duotone");
            }}
          >
            Setup
          </button>
          <InspectorPanel />
          {children}
        </div>
      );
    }

    it("renders stacked sections: Effects, Looks, and Background", async () => {
      render(
        <StudioProvider>
          <PopulatedTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-populated"));

      await waitFor(() => {
        expect(screen.getByText("Effects")).toBeDefined();
        expect(screen.getByText("Looks")).toBeDefined();
        expect(screen.getByText("Background")).toBeDefined();
      });
    });

    it("renders real effect stack with title, reorder handle, visibility, and remove buttons", async () => {
      render(
        <StudioProvider>
          <PopulatedTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-populated"));

      await waitFor(() => {
        expect(screen.getByText("Duotone")).toBeDefined();
      });

      expect(screen.getByRole("button", { name: /Reorder effect/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Disable effect/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Remove effect/i })).toBeDefined();
    });

    it("toggles effect visibility and removes effect from stack", async () => {
      render(
        <StudioProvider>
          <PopulatedTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-populated"));

      await waitFor(() => {
        expect(screen.getByText("Duotone")).toBeDefined();
      });

      // Toggle visibility
      const visibilityBtn = screen.getByRole("button", { name: /Disable effect/i });
      fireEvent.click(visibilityBtn);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Enable effect/i })).toBeDefined();
      });

      // Remove effect
      const removeBtn = screen.getByRole("button", { name: /Remove effect/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.queryByText("Duotone")).toBeNull();
        expect(screen.queryByText("No active effects")).toBeNull();
        expect(screen.getByText("Effects")).toBeDefined();
      });
    });

    it("discloses parameter drawer and toggles with sliders icon", async () => {
      render(
        <StudioProvider>
          <PopulatedTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-populated"));

      await waitFor(() => {
        expect(screen.getByText("Duotone")).toBeDefined();
        // Newly added effect is auto-selected, so parameters are initially disclosed
        expect(screen.getByText(/Duotone Parameters/i)).toBeDefined();
      });

      // Click disclosure to collapse
      const slidersBtn = screen.getByRole("button", { name: /Toggle effect parameters/i });
      fireEvent.click(slidersBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Duotone Parameters/i)).toBeNull();
      });

      // Click disclosure again to expand
      fireEvent.click(slidersBtn);

      await waitFor(() => {
        expect(screen.getByText(/Duotone Parameters/i)).toBeDefined();
      });
    });
  });

  describe("Looks Section Interaction (+ / −)", () => {
    function LooksTestHost() {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <button
            data-testid="setup-asset"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
            }}
          >
            Setup Asset
          </button>
          <button
            data-testid="apply-look"
            onClick={() => {
              store.applyLookToActiveAsset({
                id: "test-look",
                name: "Vintage Bronze",
                category: "retro",
                description: "Warm retro bronze look",
                isBuiltIn: true,
                createdAt: Date.now(),
                effectStack: [],
              });
            }}
          >
            Apply Look
          </button>
          <InspectorPanel />
        </div>
      );
    }

    it("opens Looks Popover when + is clicked", async () => {
      render(
        <StudioProvider>
          <LooksTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Open looks browser/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /Open looks browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Looks & Presets")).toBeDefined();
      });
    });

    it("displays applied look and clears it with − button", async () => {
      render(
        <StudioProvider>
          <LooksTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-asset"));
      fireEvent.click(screen.getByTestId("apply-look"));

      await waitFor(() => {
        expect(screen.getByText("Vintage Bronze")).toBeDefined();
        expect(screen.getByRole("button", { name: /Remove applied look/i })).toBeDefined();
      });

      // Click − to clear
      fireEvent.click(screen.getByRole("button", { name: /Remove applied look/i }));

      await waitFor(() => {
        expect(screen.queryByText("Vintage Bronze")).toBeNull();
        expect(screen.getByRole("button", { name: /Open looks browser/i })).toBeDefined();
      });
    });
  });

  describe("Background Section Interaction (+ / −)", () => {
    function BgTestHost() {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <button
            data-testid="setup-asset"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
            }}
          >
            Setup Asset
          </button>
          <InspectorPanel />
        </div>
      );
    }

    it("opens Background Type Picker when + is clicked and applies selection", async () => {
      render(
        <StudioProvider>
          <BgTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

      await waitFor(() => {
        expect(screen.getByText("Choose Background")).toBeDefined();
        expect(screen.getByRole("button", { name: "Solid Color" })).toBeDefined();
        expect(screen.getByRole("button", { name: "Linear Gradient" })).toBeDefined();
      });

      // Select Solid Color
      fireEvent.click(screen.getByRole("button", { name: "Solid Color" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Remove background/i })).toBeDefined();
      });
    });

    it("removes background when − is clicked and restores + button", async () => {
      render(
        <StudioProvider>
          <BgTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });

      // Open background picker and select Solid Color
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Solid Color" })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: "Solid Color" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Remove background/i })).toBeDefined();
      });

      // Click Remove background
      fireEvent.click(screen.getByRole("button", { name: /Remove background/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });
    });
  });

  describe("Editor Mode Switching", () => {
    function ModeTestHost() {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <button
            data-testid="setup-asset"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
            }}
          >
            Setup
          </button>
          <span data-testid="current-mode">{store.editorMode}</span>
          <InspectorPanel />
        </div>
      );
    }

    it("switches to Animate mode rendering Animation Timeline, and returns to Design mode", async () => {
      render(
        <StudioProvider>
          <ModeTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByText("Effects")).toBeDefined();
      });

      // Switch to Animate
      const animateTab = screen.getByRole("button", { name: "Animate" });
      fireEvent.click(animateTab);

      await waitFor(() => {
        expect(screen.getByTestId("current-mode").textContent).toBe("animate");
        expect(screen.getByText("Animation Timeline")).toBeDefined();
        expect(screen.getByText("Duration")).toBeDefined();
        expect(screen.getByText("Playback Speed")).toBeDefined();
      });

      // Design controls are hidden
      expect(screen.queryByText("Effects")).toBeNull();

      // Switch back to Design
      const designTab = screen.getByRole("button", { name: "Design" });
      fireEvent.click(designTab);

      await waitFor(() => {
        expect(screen.getByTestId("current-mode").textContent).toBe("design");
        expect(screen.getByText("Effects")).toBeDefined();
      });
    });
  });
});
