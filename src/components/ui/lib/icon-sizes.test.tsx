// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { ICON_SIZES } from "./icon-sizes";
import { GradientToolbar } from "../controls/gradient/gradient-toolbar";
import { AssetPanel } from "../../layout/asset-panel";
import { StudioProvider } from "../../../context/studio-context";

const { mockSampleAsset } = vi.hoisted(() => ({
  mockSampleAsset: {
    id: "asset-1",
    filename: "test-image.png",
    mimeType: "image/png",
    fileSize: 2048,
    objectUrl: "blob:test-image",
    width: 800,
    height: 600,
    aspectRatio: 1.33,
    thumbnailUrl: "blob:thumb-1",
    createdAt: 1000,
  },
}));

vi.mock("../../../storage/db", () => ({
  loadHydratedProject: vi.fn().mockResolvedValue({
    assets: [mockSampleAsset],
    activeImageId: "asset-1",
    projectName: "Project Name",
    effectStacks: {},
    backgrounds: {},
    userLooks: [],
  }),
  dbSaveSessionState: vi.fn().mockResolvedValue(undefined),
  dbSaveEffectStack: vi.fn().mockResolvedValue(undefined),
  dbSaveBackground: vi.fn().mockResolvedValue(undefined),
  dbDeleteBackground: vi.fn().mockResolvedValue(undefined),
  dbSaveLook: vi.fn().mockResolvedValue(undefined),
  dbDeleteLook: vi.fn().mockResolvedValue(undefined),
  dbGetRecentAssets: vi.fn().mockResolvedValue([]),
  dbGetAllLooks: vi.fn().mockResolvedValue([]),
  dbClearAll: vi.fn().mockResolvedValue(undefined),
}));

describe("Canonical Icon Sizing System (ICON_SIZES)", () => {
  it("defines all canonical icon sizing tokens with precise numerical pixel values", () => {
    expect(ICON_SIZES.micro).toBe(11);
    expect(ICON_SIZES.xs).toBe(12);
    expect(ICON_SIZES.compact).toBe(13);
    expect(ICON_SIZES.sm).toBe(14);
    expect(ICON_SIZES.md).toBe(16);
    expect(ICON_SIZES.lg).toBe(18);
    expect(ICON_SIZES.xl).toBe(20);
    expect(ICON_SIZES.hero).toBe(24);
  });

  it("renders Reverse Gradient button in GradientToolbar with canonical 16px (ICON_SIZES.md) icon", () => {
    const onReverse = () => {};
    render(
      <GradientToolbar
        name="Gradient"
        mode="tonal-ramp"
        type="linear"
        angle={90}
        onTypeChange={() => {}}
        onAngleChange={() => {}}
        onReverse={onReverse}
      />
    );

    const reverseBtn = screen.getByRole("button", { name: /reverse gradient/i });
    expect(reverseBtn).toBeDefined();

    const svg = reverseBtn.querySelector("svg");
    expect(svg).toBeDefined();
    // Phosphor icons assign width/height attributes or style from the size prop
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
    // Button container applies canonical [&_svg]:!size-4 class
    expect(reverseBtn.className).toContain("[&_svg]:!size-4");
  });

  it("renders Assets section header Import media (+) button with canonical 16px (ICON_SIZES.md) icon", async () => {
    render(
      <StudioProvider>
        <AssetPanel />
      </StudioProvider>
    );

    const importBtn = await screen.findByRole("button", { name: /import media/i });
    expect(importBtn).toBeDefined();

    const svg = importBtn.querySelector("svg");
    expect(svg).toBeDefined();
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
    expect(importBtn.className).toContain("[&_svg]:!size-4");
  });
});
