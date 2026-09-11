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

    it("contains NO Page section, NO canvas ColorControl, and empty body space when background layer is removed", () => {
      function NoLayerHost() {
        const store = useStudioStore();
        return (
          <div>
            <button
              data-testid="delete-bg-layer"
              onClick={() => {
                const bg = store.activeFrame?.layers.find((l) => l.type === "generative");
                if (bg) store.removeLayer(bg.id);
              }}
            >
              Delete BG
            </button>
            <InspectorPanel />
          </div>
        );
      }

      render(
        <StudioProvider>
          <NoLayerHost />
        </StudioProvider>
      );

      fireEvent.click(screen.getByTestId("delete-bg-layer"));

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

    it("renders stacked sections: Effects and Looks when ImageLayer is selected, and Background with universal Effects & Looks when Background Layer is selected", async () => {
      let storeRef!: ReturnType<typeof useStudioStore>;
      function PopulatedHost() {
        const store = useStudioStore();
        storeRef = store;
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
          </div>
        );
      }

      render(
        <StudioProvider>
          <PopulatedHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-populated"));

      await waitFor(() => {
        expect(screen.getByText("Effects")).toBeDefined();
        expect(screen.getByText("Looks")).toBeDefined();
        // Background must NOT be shown when ImageLayer is active!
        expect(screen.queryByText("Background")).toBeNull();
      });

      // When Background Layer is selected, Background section appears AND Effects & Looks are present (UCM Sections 13 & 26)
      const bgLayer = storeRef.activeFrame?.layers.find(
        (l) => l.source?.type === "procedural" || l.type === "generative"
      );
      if (bgLayer) {
        storeRef.setActiveLayerId(bgLayer.id);
        await waitFor(() => {
          expect(screen.getByText("Background")).toBeDefined();
          expect(screen.getByText("Effects")).toBeDefined();
          expect(screen.getByText("Looks")).toBeDefined();
        });
      }
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

    it("renders blending mode button and ensures parameters are not duplicated in inspector panel", async () => {
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

      // Blending mode button with Phosphor DropSimpleIcon
      expect(screen.getByRole("button", { name: /Blending mode/i })).toBeDefined();

      // Invariant: inspector panel does not render duplicate parameters drawer;
      // parameters are managed exclusively via the floating canvas panel.
      expect(screen.queryByText(/Duotone Parameters/i)).toBeNull();
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

  describe("Background Section Interaction (Permanent + and Item Controls)", () => {
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
          <button
            data-testid="select-bg-layer"
            onClick={() => {
              const bg = store.activeFrame?.layers.find((l) => l.type === "generative");
              if (bg) store.setActiveLayerId(bg.id);
            }}
          >
            Select Background Layer
          </button>
          <InspectorPanel />
        </div>
      );
    }

    it("does not render Background section when ImageLayer is selected", async () => {
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
        expect(screen.queryByText("Background")).toBeNull();
        expect(screen.queryByRole("button", { name: /Add background/i })).toBeNull();
      });
    });

    it("renders permanent + button in Background header and adds BackgroundItem via popover", async () => {
      render(
        <StudioProvider>
          <BgTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      // Select Background Layer
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });

      // Click Add background (+)
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

      // Popover opens
      await waitFor(() => {
        expect(screen.getByTestId("add-bg-solid")).toBeDefined();
      });

      // Click Solid
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      // Header STILL has Add background (+), NEVER switches to Remove background (-)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
        expect(screen.queryByRole("button", { name: /Remove background/i })).toBeNull();
        expect(screen.getByText("Solid")).toBeDefined();
      });
    });

    it("removes background item via its own remove button and keeps + in header", async () => {
      render(
        <StudioProvider>
          <BgTestHost />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("select-bg-layer"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });

      // Add Solid
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      // Find item remove button
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Remove Solid/i })).toBeDefined();
      });

      // Click item remove button
      fireEvent.click(screen.getByRole("button", { name: /Remove Solid/i }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Remove Solid/i })).toBeNull();
        expect(screen.getByText("No backgrounds")).toBeDefined();
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

  describe("Correction 02.6 — Looks & Background Section Rework (Figma 135:5361 & 135:5478)", () => {
    function CorrectionTestHost() {
      const store = useStudioStore();
      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <span data-testid="active-layer-id">{store.activeLayerId || "none"}</span>
          <span data-testid="active-layer-type">{store.activeLayer?.type || "none"}</span>
          <span data-testid="active-bg-type">{store.activeBackground.type}</span>
          <span data-testid="active-bg-visible">{String(store.activeBackground.visible !== false)}</span>
          <button
            data-testid="setup-asset"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
            }}
          >
            Setup Asset
          </button>
          <button
            data-testid="select-bg-layer"
            onClick={() => {
              const bg = store.activeFrame?.layers.find((l) => l.type === "generative");
              if (bg) store.setActiveLayerId(bg.id);
            }}
          >
            Select Background Layer
          </button>
          <button
            data-testid="apply-vintage-look"
            onClick={() => {
              store.applyLookToActiveAsset({
                id: "look-vintage-bronze",
                name: "Vintage Bronze",
                category: "retro",
                description: "Warm duotone with film grain",
                isBuiltIn: true,
                createdAt: Date.now(),
                effectStack: [
                  {
                    instanceId: "eff-1",
                    effectId: "duotone",
                    enabled: true,
                    parameters: {},
                  },
                ],
              });
            }}
          >
            Apply Look
          </button>
          <button
            data-testid="set-solid-bg"
            onClick={() => {
              store.updateActiveBackground({
                type: "solid",
                color: "#E20000",
                opacity: 100,
                padding: 0,
                visible: true,
              });
            }}
          >
            Set Solid BG
          </button>
          <button
            data-testid="set-gradient-bg"
            onClick={() => {
              store.updateActiveBackground({
                type: "linear-gradient",
                color: "#000000",
                gradientEndColor: "#E20000",
                gradientType: "linear",
                opacity: 100,
                padding: 0,
                visible: true,
              });
            }}
          >
            Set Gradient BG
          </button>
          <button
            data-testid="set-alpha-bg"
            onClick={() => {
              store.updateActiveBackground({
                type: "transparent",
                color: "#000000",
                padding: 0,
                visible: true,
              });
            }}
          >
            Set Alpha BG
          </button>
          <button
            data-testid="set-dots-bg"
            onClick={() => {
              store.updateActiveBackground({
                type: "dots",
                color: "#FFFFFF",
                opacity: 100,
                padding: 0,
                visible: true,
              });
            }}
          >
            Set Dots BG
          </button>
          <button
            data-testid="set-grid-bg"
            onClick={() => {
              store.updateActiveBackground({
                type: "grid",
                color: "#FFFFFF",
                opacity: 100,
                padding: 0,
                visible: true,
              });
            }}
          >
            Set Grid BG
          </button>
          <InspectorPanel />
        </div>
      );
    }

    it("1. Empty Looks shows + button", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Open looks browser/i })).toBeDefined();
        expect(screen.queryByRole("button", { name: /Remove applied look/i })).toBeNull();
      });
    });

    it("2. + opens Looks Popover", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Open looks browser/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /Open looks browser/i }));

      await waitFor(() => {
        expect(screen.getByText("Looks & Presets")).toBeDefined();
      });
    });

    it("3-5. Selecting/applying a Look displays compact row with Sparkle icon", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));
      fireEvent.click(screen.getByTestId("apply-vintage-look"));

      await waitFor(() => {
        const lookRow = screen.getByTestId("look-row");
        expect(lookRow).toBeDefined();
        expect(lookRow.textContent).toContain("Vintage Bronze");
        expect(lookRow.className).toContain("rounded-[6px]");
        expect(lookRow.className).toContain("border");
        // Sparkle icon is inside the look row
        const svg = lookRow.querySelector("svg");
        expect(svg).toBeDefined();
      });
    });

    it("6. Eye renders OUTSIDE the bordered Look control and toggles visibility", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));
      fireEvent.click(screen.getByTestId("apply-vintage-look"));

      await waitFor(() => {
        const lookRow = screen.getByTestId("look-row");
        const lookEye = screen.getByTestId("look-eye-button");
        expect(lookRow).toBeDefined();
        expect(lookEye).toBeDefined();
        // Eye is NOT a child of lookRow
        expect(lookRow.contains(lookEye)).toBe(false);
        // Initial state is visible
        expect(lookEye.getAttribute("aria-label")).toBe("Hide look");
      });

      // Toggle Eye
      fireEvent.click(screen.getByTestId("look-eye-button"));

      await waitFor(() => {
        expect(screen.getByTestId("look-eye-button").getAttribute("aria-label")).toBe("Show look");
      });
    });

    it("7. − removes the Look and restores +", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));
      fireEvent.click(screen.getByTestId("apply-vintage-look"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Remove applied look/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /Remove applied look/i }));

      await waitFor(() => {
        expect(screen.queryByTestId("look-row")).toBeNull();
        expect(screen.getByRole("button", { name: /Open looks browser/i })).toBeDefined();
      });
    });

    it("8. Image layer has NO Background section", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-asset"));

      await waitFor(() => {
        expect(screen.queryByText("Background")).toBeNull();
        expect(screen.queryByRole("button", { name: /Add background/i })).toBeNull();
        expect(screen.queryByTestId(/^background-row-/)).toBeNull();
      });
    });

    it("9-10. Selecting Background layer shows permanent + and empty state", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      await waitFor(() => {
        expect(screen.getByText("Background")).toBeDefined();
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
        expect(screen.getByText("No backgrounds")).toBeDefined();
      });
    });

    it("11. Adding Solid background displays compact row with preview, opacity and permanent +", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      await waitFor(() => expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        expect(screen.getByText("Solid")).toBeDefined();
        expect(screen.getAllByText("100%").length).toBeGreaterThanOrEqual(1);
        // Header + stays permanently
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
        expect(screen.queryByRole("button", { name: /Remove background$/i })).toBeNull();
      });
    });

    it("12. Background item visibility toggles independently", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => expect(screen.getByRole("button", { name: /Hide Solid/i })).toBeDefined());

      // Click to hide
      fireEvent.click(screen.getByRole("button", { name: /Hide Solid/i }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Show Solid/i })).toBeDefined();
      });

      // Click to show
      fireEvent.click(screen.getByRole("button", { name: /Show Solid/i }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Hide Solid/i })).toBeDefined();
      });
    });

    it("13-14. Removing background item removes only that item and leaves + intact", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => expect(screen.getByRole("button", { name: /Remove Solid/i })).toBeDefined());

      // Click item remove button
      fireEvent.click(screen.getByRole("button", { name: /Remove Solid/i }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: /Remove Solid/i })).toBeNull();
        expect(screen.getByText("No backgrounds")).toBeDefined();
        expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      });
    });

    it("15-16. Visual structure: Background rows have proper alignment and independent action buttons", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      await waitFor(() => {
        const eye = screen.getByRole("button", { name: /Hide Solid/i });
        const remove = screen.getByRole("button", { name: /Remove Solid/i });
        expect(eye).toBeDefined();
        expect(remove).toBeDefined();
      });
    });

    it("17. Handles adding multiple background items to the stack (Solid, Linear Gradient, Dots, Grid)", async () => {
      render(
        <StudioProvider>
          <CorrectionTestHost />
        </StudioProvider>
      );
      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("select-bg-layer"));

      // Add Solid
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-solid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-solid"));

      // Add Linear Gradient
      await waitFor(() => expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-linear-gradient")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-linear-gradient"));

      // Add Dots
      await waitFor(() => expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-dots")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-dots"));

      // Add Grid
      await waitFor(() => expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined());
      fireEvent.click(screen.getByRole("button", { name: /Add background/i }));
      await waitFor(() => expect(screen.getByTestId("add-bg-grid")).toBeDefined());
      fireEvent.click(screen.getByTestId("add-bg-grid"));

      await waitFor(() => {
        expect(screen.getByText("Solid")).toBeDefined();
        expect(screen.getByText("Linear Gradient")).toBeDefined();
        expect(screen.getByText("Dots")).toBeDefined();
        expect(screen.getByText("Grid")).toBeDefined();
      });
    });
  });

  describe("Stage 2D Transform Inspector Section", () => {
    function TransformTestHost() {
      const store = useStudioStore();
      const activeLayer = store.activeFrame?.layers.find((l) => l.id === store.activeFrame?.activeLayerId);
      const transform = activeLayer?.type === "image" ? activeLayer.transform : null;

      return (
        <div>
          <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
          <span data-testid="transform-x">{transform ? String(transform.x) : "none"}</span>
          <span data-testid="transform-y">{transform ? String(transform.y) : "none"}</span>
          <span data-testid="transform-scale">{transform ? String(transform.scaleX) : "none"}</span>
          <span data-testid="transform-rot">{transform ? String(transform.rotation) : "none"}</span>
          <button
            data-testid="setup-image-layer"
            onClick={async () => {
              await store.addAssets([sampleAsset]);
            }}
          >
            Setup Image Layer
          </button>
          <InspectorPanel />
        </div>
      );
    }

    it("renders Transform section with Position, Scale, Rotation, and Reset button for active ImageLayer", async () => {
      render(
        <StudioProvider>
          <TransformTestHost />
        </StudioProvider>
      );

      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-image-layer"));

      await waitFor(() => {
        expect(screen.getByText("Transform")).toBeDefined();
        expect(screen.getByText("Position")).toBeDefined();
        expect(screen.getByText("Scale")).toBeDefined();
        expect(screen.getByText("Rotation")).toBeDefined();
        expect(screen.getByRole("button", { name: "Reset Transform" })).toBeDefined();
      });
    });

    it("updates transform X and Y via numeric inputs and resets transform on Reset button click", async () => {
      render(
        <StudioProvider>
          <TransformTestHost />
        </StudioProvider>
      );

      await waitFor(() => expect(screen.getByTestId("is-hydrated").textContent).toBe("true"));
      fireEvent.click(screen.getByTestId("setup-image-layer"));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Reset Transform" })).toBeDefined();
      });

      // Find position inputs
      const inputs = screen.getAllByRole("spinbutton");
      expect(inputs.length).toBeGreaterThanOrEqual(2);

      // Mutate X input
      fireEvent.change(inputs[0], { target: { value: "150" } });
      await waitFor(() => {
        expect(screen.getByTestId("transform-x").textContent).toBe("150");
      });

      // Mutate Y input
      fireEvent.change(inputs[1], { target: { value: "-80" } });
      await waitFor(() => {
        expect(screen.getByTestId("transform-y").textContent).toBe("-80");
      });

      // Click Reset Transform
      const resetBtn = screen.getByRole("button", { name: "Reset Transform" });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(screen.getByTestId("transform-x").textContent).toBe("0");
        expect(screen.getByTestId("transform-y").textContent).toBe("0");
        expect(screen.getByTestId("transform-scale").textContent).toBe("1");
        expect(screen.getByTestId("transform-rot").textContent).toBe("0");
      });
    });
  });
});
