// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { StudioProvider, useStudioStore } from "../../context/studio-context";
import { InspectorPanel } from "./inspector-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
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

function BackgroundTestHost() {
  const store = useStudioStore();
  return (
    <div className="relative w-full h-full">
      <span data-testid="is-hydrated">{String(store.isHydrated)}</span>
      <span data-testid="has-bg">{String(store.hasActiveBackground)}</span>
      <span data-testid="bg-type">{store.activeBackground.type}</span>
      <button
        data-testid="setup-asset"
        onClick={async () => {
          await store.addAssets([sampleAsset]);
        }}
      >
        Setup Asset
      </button>
      <InspectorPanel />
      <FloatingBackgroundPanel />
    </div>
  );
}

describe("Correction 02.4 — Background Section & Floating Parameter Panel", () => {
  afterEach(() => {
    cleanup();
  });

  it("1. Background section renders with + when no background is active", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    await waitFor(() => {
      expect(screen.getByText("Background")).toBeDefined();
      expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /Remove background/i })).toBeNull();
    });
  });

  it("2-4. Clicking + directly opens floating Add Background panel without intermediate popover", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
    });

    // Directly click Background +
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    // Directly opens floating Add Background panel!
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Add Background/i })).toBeDefined();
      expect(screen.getByText("Add Background")).toBeDefined();
      // Verify all 5 controls in exact order: Alpha, Solid, Gradient, Dot Pattern, Grid Pattern
      const buttons = screen.getAllByRole("button").filter((b) => {
        const ariaLabel = b.getAttribute("aria-label") || "";
        return ["Alpha", "Solid", "Gradient", "Dot Pattern", "Grid Pattern"].includes(ariaLabel);
      });
      expect(buttons.length).toBe(5);
      expect(buttons[0].getAttribute("aria-label")).toBe("Alpha");
      expect(buttons[1].getAttribute("aria-label")).toBe("Solid");
      expect(buttons[2].getAttribute("aria-label")).toBe("Gradient");
      expect(buttons[3].getAttribute("aria-label")).toBe("Dot Pattern");
      expect(buttons[4].getAttribute("aria-label")).toBe("Grid Pattern");
    });
  });

  it("5-9. Activating background changes + to −, displays active row, and − removes background", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
    });

    // Click Background +
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    // Now active: + becomes − and row is visible
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Remove background/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /Add background/i })).toBeNull();
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      expect(screen.getByTestId("bg-type").textContent).toBe("solid");
      expect(screen.getByRole("dialog", { name: /Add Background/i })).toBeDefined();
    });

    // Clicking − in Inspector removes background
    fireEvent.click(screen.getByRole("button", { name: /Remove background/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /Remove background/i })).toBeNull();
      expect(screen.getByTestId("has-bg").textContent).toBe("false");
      // Floating panel closes
      expect(screen.queryByRole("dialog", { name: /Add Background/i })).toBeNull();
    });
  });

  it("10-13. Floating editor close (X) closes editor without removing background, and clicking row reopens it", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Add background/i })).toBeDefined();
    });

    // Add Solid
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Add Background/i })).toBeDefined();
    });

    // Close floating panel via X
    fireEvent.click(screen.getByRole("button", { name: /Close parameters/i }));

    await waitFor(() => {
      // Panel closed
      expect(screen.queryByRole("dialog", { name: /Add Background/i })).toBeNull();
      // Background remains active!
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      expect(screen.getByRole("button", { name: /Remove background/i })).toBeDefined();
    });

    // Reopen by clicking the active background row in inspector
    const row = screen.getByText(/#E20000/i).closest('[role="button"]')!;
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Add Background/i })).toBeDefined();
    });
  });

  it("14-15. Switching background type maintains single active background and updates parameters in place", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    // Add Solid
    await waitFor(() => screen.getByRole("button", { name: /Add background/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    await waitFor(() => {
      expect(screen.getByTestId("bg-type").textContent).toBe("solid");
      expect(screen.getByRole("dialog", { name: /Add Background/i })).toBeDefined();
    });

    // Switch to Gradient using toolbar icon in floating panel
    const gradientBtn = screen.getByRole("button", { name: "Gradient" });
    fireEvent.click(gradientBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bg-type").textContent).toBe("linear-gradient");
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      // Gradient controls are visible
      expect(screen.getByText("Steps")).toBeDefined();
      expect(screen.getByRole("button", { name: /Reverse Gradient/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Reset Gradient/i })).toBeDefined();
    });

    // Switch to Alpha
    const alphaBtn = screen.getByRole("button", { name: "Alpha" });
    fireEvent.click(alphaBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bg-type").textContent).toBe("transparent");
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      expect(screen.getByText(/Transparent alpha background active/i)).toBeDefined();
    });

    // Switch to Dot Pattern
    const dotBtn = screen.getByRole("button", { name: "Dot Pattern" });
    fireEvent.click(dotBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bg-type").textContent).toBe("dots");
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      expect(screen.getByText("Dot Spacing")).toBeDefined();
    });

    // Switch to Grid Pattern
    const gridBtn = screen.getByRole("button", { name: "Grid Pattern" });
    fireEvent.click(gridBtn);

    await waitFor(() => {
      expect(screen.getByTestId("bg-type").textContent).toBe("grid");
      expect(screen.getByTestId("has-bg").textContent).toBe("true");
      expect(screen.getByText("Grid Spacing")).toBeDefined();
    });
  });

  it("16-20. All 5 type buttons in floating panel toolbar have accessible tooltips/labels", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    // Add Solid
    await waitFor(() => screen.getByRole("button", { name: /Add background/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Alpha" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Solid" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Gradient" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Dot Pattern" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Grid Pattern" })).toBeDefined();
    });
  });

  it("21-34. Gradient editor: supports interactive stop nodes on track, Steps +, Reverse, and Reset", async () => {
    render(
      <StudioProvider>
        <BackgroundTestHost />
      </StudioProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-hydrated").textContent).toBe("true");
    });

    fireEvent.click(screen.getByTestId("setup-asset"));

    // Add Background and switch to Gradient
    await waitFor(() => screen.getByRole("button", { name: /Add background/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add background/i }));

    await waitFor(() => screen.getByRole("button", { name: "Gradient" }));
    fireEvent.click(screen.getByRole("button", { name: "Gradient" }));

    await waitFor(() => {
      expect(screen.getByText("Steps")).toBeDefined();
      expect(screen.getByRole("button", { name: /Reverse Gradient/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Reset Gradient/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /Add gradient stop/i })).toBeDefined();
      // Track stop nodes
      expect(screen.getByRole("button", { name: "Gradient stop 1" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Gradient stop 2" })).toBeDefined();
    });

    // Add Stop via Steps +
    fireEvent.click(screen.getByRole("button", { name: /Add gradient stop/i }));

    await waitFor(() => {
      // 3 stop nodes on the track
      expect(screen.getByRole("button", { name: "Gradient stop 3" })).toBeDefined();
      // 3 stop rows in Steps
      const removeButtons = screen.getAllByRole("button", { name: /Remove stop/i });
      expect(removeButtons.length).toBe(3);
    });

    // Reverse gradient
    fireEvent.click(screen.getByRole("button", { name: /Reverse Gradient/i }));

    // Reset gradient
    fireEvent.click(screen.getByRole("button", { name: /Reset Gradient/i }));
    await waitFor(() => {
      const removeButtons = screen.getAllByRole("button", { name: /Remove stop/i });
      expect(removeButtons.length).toBe(2);
    });
  });
});
