// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup, act } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { FloatingEffectPanel } from "./floating-effect-panel";
import type { Asset } from "../../types/asset";

// Mock storage/db to avoid IndexedDB errors in jsdom
vi.mock("../../storage/db", () => ({
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

function TestStudioHost({
  effectId = "duotone",
  initialParameters,
}: {
  effectId?: string;
  initialParameters?: Record<string, unknown>;
}) {
  const store = useStudioStore();
  const selectedInstance = store.selectedInstance;

  return (
    <div className="relative w-full h-full">
      <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
      <span data-testid="active-image">{store.activeImageId ?? "none"}</span>
      <span data-testid="selected-instance">
        {selectedInstance ? selectedInstance.instanceId : "none"}
      </span>
      <span data-testid="instance-params">
        {selectedInstance ? JSON.stringify(selectedInstance.parameters) : "{}"}
      </span>
      <button
        data-testid="setup-effect"
        onClick={async () => {
          await store.addAssets([sampleAsset]);
          store.addEffectToStack(sampleAsset.id, effectId as any, initialParameters);
          const stack = store.effectStacks[sampleAsset.id];
          if (stack && stack.length > 0) {
            store.selectInstance(sampleAsset.id, stack[0].instanceId);
          }
        }}
      >
        Setup
      </button>
      <button
        data-testid="undo-btn"
        onClick={() => {
          store.undo();
        }}
      >
        Undo
      </button>
      <button
        data-testid="redo-btn"
        onClick={() => {
          store.redo();
        }}
      >
        Redo
      </button>
      <FloatingEffectPanel />
    </div>
  );
}

describe("Duotone GradientControl Implementation", () => {
  afterEach(() => {
    cleanup();
  });

  describe("1. Duotone Rendering & Control Substitution", () => {
    it("renders exactly one GradientControl and contrast slider, and omits standalone color controls", async () => {
      render(
        <StudioProvider>
          <TestStudioHost effectId="duotone" />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      // Exactly ONE GradientControl is rendered
      expect(screen.getByText("Gradient")).toBeDefined();
      expect(screen.getByRole("button", { name: /Reverse gradient/i })).toBeDefined();

      // Contrast slider remains visible
      expect(screen.getByText("contrast")).toBeDefined();
      expect(screen.getByRole("button", { name: "Edit contrast value" })).toBeDefined();

      // Standalone Shadow and Highlight ColorControl inputs are NOT rendered
      expect(screen.queryByTestId("color-control-shadowColor")).toBeNull();
      expect(screen.queryByTestId("color-control-highlightColor")).toBeNull();
    });
  });

  describe("2. Fixed Endpoints & No Additional Stops", () => {
    it("enforces exactly two stops: Shadow at 0% and Highlight at 100%, without stop removal or dragging", async () => {
      const { container } = render(
        <StudioProvider>
          <TestStudioHost effectId="duotone" />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      // Labels Shadow and Highlight exist in the ramp list
      expect(screen.getByText("Shadow")).toBeDefined();
      expect(screen.getByText("Highlight")).toBeDefined();

      // Stops track has exactly 2 pins: Gradient stop 1 and Gradient stop 2
      const stop1 = screen.getByRole("button", { name: "Gradient stop 1" });
      const stop2 = screen.getByRole("button", { name: "Gradient stop 2" });
      expect(stop1).toBeDefined();
      expect(stop2).toBeDefined();
      expect(screen.queryByRole("button", { name: "Gradient stop 3" })).toBeNull();

      // No stop removal buttons exist
      expect(screen.queryByRole("button", { name: /Remove stop/i })).toBeNull();

      // No add stop button exists
      expect(screen.queryByRole("button", { name: /Add gradient stop/i })).toBeNull();

      // No spatial geometry controls (Linear/Radial/Angular/Diamond, Angle) exist
      expect(screen.queryByRole("button", { name: /Linear/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Radial/i })).toBeNull();
      expect(screen.queryByRole("spinbutton", { name: /Angle/i })).toBeNull();

      // Clicking track does NOT add a third stop
      const track = container.querySelector('[data-slot="gradient-stops-track"]');
      expect(track).toBeDefined();
      if (track) {
        fireEvent.pointerDown(track, { clientX: 200, clientY: 10, button: 0 });
      }
      expect(screen.queryByRole("button", { name: "Gradient stop 3" })).toBeNull();
    });
  });

  describe("3. Color Editing", () => {
    it("updates shadowColor and highlightColor when colors are edited", async () => {
      render(
        <StudioProvider>
          <TestStudioHost
            effectId="duotone"
            initialParameters={{
              shadowColor: "#000000",
              highlightColor: "#ffffff",
              contrast: 1,
            }}
          />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      // Find the Shadow color text input
      const shadowHexInput = screen.getByRole("textbox", { name: "Shadow hex" });
      expect(shadowHexInput).toBeDefined();

      // Edit Shadow color to red #FF0000
      fireEvent.change(shadowHexInput, { target: { value: "#FF0000" } });
      fireEvent.blur(shadowHexInput);

      await waitFor(() => {
        const params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowColor).toBe("#FF0000");
        expect(params.highlightColor).toBe("#ffffff");
      });

      // Find Highlight color text input and edit to blue #0000FF
      const highlightHexInput = screen.getByRole("textbox", { name: "Highlight hex" });
      fireEvent.change(highlightHexInput, { target: { value: "#0000FF" } });
      fireEvent.blur(highlightHexInput);

      await waitFor(() => {
        const params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowColor).toBe("#FF0000");
        expect(params.highlightColor).toBe("#0000FF");
      });
    });
  });

  describe("4. Reverse Action & Undo / Redo", () => {
    it("Reverse swaps Shadow and Highlight atomically, and Undo/Redo restores states", async () => {
      render(
        <StudioProvider>
          <TestStudioHost
            effectId="duotone"
            initialParameters={{
              shadowColor: "#112233",
              highlightColor: "#AABBCC",
              contrast: 1.25,
            }}
          />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      // Verify Reverse button is present
      const reverseBtn = screen.getByRole("button", { name: /Reverse gradient/i });
      expect(reverseBtn).toBeDefined();

      // Initial state
      let params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
      expect(params.shadowColor).toBe("#112233");
      expect(params.highlightColor).toBe("#AABBCC");
      expect(params.contrast).toBe(1.25);

      // Click Reverse
      fireEvent.click(reverseBtn);

      await waitFor(() => {
        params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowColor).toBe("#AABBCC");
        expect(params.highlightColor).toBe("#112233");
        expect(params.contrast).toBe(1.25); // Contrast unchanged!
      });

      // Undo Reverse
      fireEvent.click(screen.getByTestId("undo-btn"));

      await waitFor(() => {
        params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowColor).toBe("#112233");
        expect(params.highlightColor).toBe("#AABBCC");
      });

      // Redo Reverse
      fireEvent.click(screen.getByTestId("redo-btn"));

      await waitFor(() => {
        params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowColor).toBe("#AABBCC");
        expect(params.highlightColor).toBe("#112233");
      });
    });
  });

  describe("5. Regression Safety for Non-Gradient Effects", () => {
    it("renders standard controls for non-gradient effects (e.g. pixelate)", async () => {
      render(
        <StudioProvider>
          <TestStudioHost effectId="pixelate" />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Pixelate Parameters/i })).toBeDefined();
      });

      // Pixelate should NOT have GradientControl
      expect(screen.queryByText("Gradient")).toBeNull();
      expect(screen.queryByRole("button", { name: /Reverse gradient/i })).toBeNull();

      // Pixelate has blockSize slider
      expect(screen.getByText("blockSize")).toBeDefined();
      expect(screen.getByRole("button", { name: "Edit blockSize value" })).toBeDefined();
    });
  });

  describe("6. Unified Canonical GradientControl & Draggable Stops", () => {
    it("renders canonical GradientStopsTrack with identical stop node visual primitive and draggable states", async () => {
      const { container } = render(
        <StudioProvider>
          <TestStudioHost
            effectId="duotone"
            initialParameters={{
              shadowColor: "#0f172a",
              highlightColor: "#38bdf8",
              shadowPosition: 10,
              highlightPosition: 90,
              contrast: 1,
            }}
          />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      // Track uses canonical data-slot="gradient-stops-track"
      const track = container.querySelector('[data-slot="gradient-stops-track"]');
      expect(track).toBeDefined();
      expect(track).not.toBeNull();

      // Stops track has 2 stop buttons with canonical visual classes
      const stop1 = screen.getByRole("button", { name: "Gradient stop 1" });
      const stop2 = screen.getByRole("button", { name: "Gradient stop 2" });

      expect(stop1.className).toContain("cursor-grab");
      expect(stop1.className).toContain("size-4");
      expect(stop1.className).toContain("rounded-[3px]");
      expect(stop1.className).toContain("border-2");
      expect(stop1.className).toContain("border-white");

      expect(stop2.className).toContain("cursor-grab");
      expect(stop2.className).toContain("size-4");
      expect(stop2.className).toContain("rounded-[3px]");
      expect(stop2.className).toContain("border-2");
      expect(stop2.className).toContain("border-white");

      // Verify stop positions reflected on pins
      expect(stop1.style.left).toBe("10%");
      expect(stop2.style.left).toBe("90%");
    });

    it("dragging Duotone stops updates shadowPosition and highlightPosition in active state", async () => {
      const { container } = render(
        <StudioProvider>
          <TestStudioHost
            effectId="duotone"
            initialParameters={{
              shadowColor: "#0f172a",
              highlightColor: "#38bdf8",
              shadowPosition: 0,
              highlightPosition: 100,
              contrast: 1,
            }}
          />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      const track = container.querySelector('[data-slot="gradient-stops-track"]') as HTMLDivElement;
      expect(track).not.toBeNull();

      // Mock getBoundingClientRect for track to test drag calculation
      track.getBoundingClientRect = () => ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 40,
        width: 200,
        height: 40,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const stop1 = screen.getByRole("button", { name: "Gradient stop 1" });

      // Start drag on Stop 1
      fireEvent.pointerDown(stop1, { pointerId: 1, clientX: 0, clientY: 10, button: 0 });

      // Move pointer to 50px (25% of 200px)
      fireEvent(
        window,
        new PointerEvent("pointermove", {
          pointerId: 1,
          clientX: 50,
          clientY: 10,
        })
      );

      // End drag
      fireEvent(
        window,
        new PointerEvent("pointerup", {
          pointerId: 1,
          clientX: 50,
          clientY: 10,
        })
      );

      await waitFor(() => {
        const params = JSON.parse(screen.getByTestId("instance-params").textContent || "{}");
        expect(params.shadowPosition).toBe(25);
      });
    });

    it("prevents endpoint deletion via double click or delete key", async () => {
      render(
        <StudioProvider>
          <TestStudioHost effectId="duotone" />
        </StudioProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
      });

      fireEvent.click(screen.getByTestId("setup-effect"));

      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: /Duotone Parameters/i })).toBeDefined();
      });

      const stop1 = screen.getByRole("button", { name: "Gradient stop 1" });
      const stop2 = screen.getByRole("button", { name: "Gradient stop 2" });

      // Double-click stop 1
      fireEvent.doubleClick(stop1);
      expect(screen.getByRole("button", { name: "Gradient stop 1" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Gradient stop 2" })).toBeDefined();

      // Keydown Delete on stop 1
      fireEvent.keyDown(stop1, { key: "Delete" });
      expect(screen.getByRole("button", { name: "Gradient stop 1" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Gradient stop 2" })).toBeDefined();

      // Keydown Backspace on stop 2
      fireEvent.keyDown(stop2, { key: "Backspace" });
      expect(screen.getByRole("button", { name: "Gradient stop 1" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Gradient stop 2" })).toBeDefined();
    });
  });
});
