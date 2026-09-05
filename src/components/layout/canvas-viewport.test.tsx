// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CanvasViewport } from "./canvas-viewport";
import { StudioProvider } from "../../context/studio-context";
import { loadHydratedProject } from "../../storage/db";

import { createDefaultFrame, createImageLayer } from "../../types/frame";

// Mock ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  private cb: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
  }
  observe = vi.fn(() => {
    this.cb([{ contentRect: { width: 800, height: 600 } } as unknown as ResizeObserverEntry], this);
  });
  unobserve = vi.fn();
  disconnect = vi.fn();
};

// Mock Canvas 2D and WebGL contexts
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((contextId: string) => {
    if (contextId === "2d") {
      return {
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        putImageData: vi.fn(),
        createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
        setTransform: vi.fn(),
        drawImage: vi.fn(),
        save: vi.fn(),
        fillText: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        closePath: vi.fn(),
        stroke: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 })),
        transform: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
      };
    }
    return null;
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

// Mock storage/db
vi.mock("../../storage/db", () => ({
  loadHydratedProject: vi.fn().mockResolvedValue({
    assets: [],
    frames: [],
    activeFrameId: null,
    activeLayerId: null,
    activeImageId: null,
    projectName: "Project Name",
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
  dbSaveFrame: vi.fn().mockResolvedValue(undefined),
  dbSaveFrames: vi.fn().mockResolvedValue(undefined),
  dbDeleteFrame: vi.fn().mockResolvedValue(undefined),
  dbGetAllFrames: vi.fn().mockResolvedValue([]),
}));

describe("CanvasViewport: Main Canvas Empty State (Correction 02.8 — Figma 137:6167)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadHydratedProject).mockResolvedValue({
      assets: [],
      frames: [],
      activeFrameId: null,
      activeLayerId: null,
      activeImageId: null,
      projectName: "Project Name",
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("1. Empty canvas renders the supplied empty-state illustration asset", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const illustration = container.querySelector('[data-slot="empty-state-illustration"]');
    expect(illustration).toBeDefined();

    const img = illustration?.querySelector("img");
    expect(img).toBeDefined();
    expect(img?.getAttribute("src")).toMatch(/(empty_state\.svg|data:image\/svg\+xml)/);
    expect(img?.getAttribute("width")).toBe("70");
    expect(img?.getAttribute("height")).toBe("38");
  });

  it("2. 'No image selected' title renders with correct typography", async () => {
    render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    const title = await screen.findByText("No image selected");
    expect(title).toBeDefined();
    expect(title.className).toContain("text-base");
    expect(title.className).toContain("font-medium");
    expect(title.className).toContain("leading-6");
    expect(title.className).toContain("text-center");
  });

  it("3. Exact description renders as a single centered sentence", async () => {
    render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    const desc = await screen.findByText(
      "Import an image or drag and drop one here to start editing."
    );
    expect(desc).toBeDefined();
    expect(desc.className).toContain("text-xs");
    expect(desc.className).toContain("font-normal");
    expect(desc.className).toContain("leading-4");
    expect(desc.className).toContain("text-center");
  });

  it("4. No import buttons render inside the canvas empty state", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const emptyState = container.querySelector('[data-slot="canvas-empty-state"]');
    expect(emptyState).toBeDefined();

    // Canvas empty state must NOT contain import or library buttons
    const buttons = emptyState?.querySelectorAll("button");
    expect(buttons?.length ?? 0).toBe(0);
    expect(screen.queryByText("Stock library")).toBeNull();
    expect(screen.queryByText("Import media")).toBeNull();
  });

  it("5. No card/border wrapper is introduced", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const emptyState = container.querySelector('[data-slot="canvas-empty-state"]');
    expect(emptyState).toBeDefined();
    expect(emptyState?.className).not.toContain("border");
    expect(emptyState?.className).not.toContain("rounded");
    expect(emptyState?.className).not.toContain("bg-");
    expect(emptyState?.querySelector(".border")).toBeNull();
  });

  it("6. Empty state is centered in the canvas viewport", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const emptyState = container.querySelector('[data-slot="canvas-empty-state"]');
    expect(emptyState).toBeDefined();
    expect(emptyState?.className).toContain("absolute");
    expect(emptyState?.className).toContain("inset-0");
    expect(emptyState?.className).toContain("flex-col");
    expect(emptyState?.className).toContain("items-center");
    expect(emptyState?.className).toContain("justify-center");
    expect(emptyState?.className).toContain("gap-2");
  });

  it("7. Existing drag/drop behavior remains available on main canvas", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const mainCanvas = container.querySelector("main");
    expect(mainCanvas).toBeDefined();

    // Test drag-over
    fireEvent.dragOver(mainCanvas!, {
      dataTransfer: { types: ["Files"] },
    });

    // Check drag-over overlay appears
    expect(screen.getByText(/Drop image to import/i)).toBeDefined();

    // Test drag-leave
    fireEvent.dragLeave(mainCanvas!);
    expect(screen.queryByText(/Drop image to import/i)).toBeNull();
  });

  it("8. Existing canvas controls (CanvasControlDock) remain unaffected", async () => {
    render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByText("No image selected");
    const toolbar = screen.getByRole("toolbar", { name: /Canvas Workspace Controls/i });
    expect(toolbar).toBeDefined();
  });
});

describe("CanvasViewport: Stage 2 Transform Selection Overlay & Interactions", () => {
  const mockAsset = {
    id: "asset-1",
    name: "photo.jpg",
    filename: "photo.jpg",
    mimeType: "image/jpeg",
    fileSize: 1000,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    blob: new Blob([""], { type: "image/jpeg" }),
    objectUrl: "blob:photo.jpg",
    thumbnailUrl: "blob:photo-thumb.jpg",
    format: "jpeg" as const,
    fileSizeBytes: 1000,
    createdAt: Date.now(),
  };

  const testImageLayer = createImageLayer("asset-1", "Image 1", [], "contain", {
    x: 10,
    y: -20,
    scaleX: 1.5,
    scaleY: 1.5,
    rotation: 30,
  });
  const defaultFrame = createDefaultFrame("frame-1", "Frame 1");
  const mockFrame = {
    ...defaultFrame,
    layers: [defaultFrame.layers[0], testImageLayer],
    activeLayerId: testImageLayer.id,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadHydratedProject).mockResolvedValue({
      assets: [mockAsset],
      frames: [mockFrame],
      activeFrameId: "frame-1",
      activeLayerId: testImageLayer.id,
      activeImageId: "asset-1",
      projectName: "Project Name",
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the SVG transform selection overlay when an ImageLayer is active", async () => {
    const { container } = render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    const overlay = await screen.findByTestId("layer-selection-overlay");
    expect(overlay).toBeDefined();

    // Verify 4 corner scale handles exist
    expect(container.querySelector('[data-handle="corner-tl"]')).toBeDefined();
    expect(container.querySelector('[data-handle="corner-tr"]')).toBeDefined();
    expect(container.querySelector('[data-handle="corner-br"]')).toBeDefined();
    expect(container.querySelector('[data-handle="corner-bl"]')).toBeDefined();

    // Verify rotation handle exists
    expect(container.querySelector('[data-handle="rotation"]')).toBeDefined();

    // Verify bounding box polygon exists
    expect(container.querySelector('[data-handle="bounding-box"]')).toBeDefined();
  });

  it("never renders transform selection overlay for GenerativeLayer (protected background)", async () => {
    vi.mocked(loadHydratedProject).mockResolvedValue({
      assets: [mockAsset],
      frames: [{ ...mockFrame, activeLayerId: defaultFrame.layers[0].id }],
      activeFrameId: "frame-1",
      activeLayerId: defaultFrame.layers[0].id, // active is generative layer!
      activeImageId: null,
      projectName: "Project Name",
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    });

    render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    // Generative layer active -> no selection overlay
    expect(screen.queryByTestId("layer-selection-overlay")).toBeNull();
  });

  it("handles keyboard arrow nudges (1px for Arrow, 10px for Shift+Arrow)", async () => {
    render(
      <StudioProvider>
        <CanvasViewport />
      </StudioProvider>
    );

    await screen.findByTestId("layer-selection-overlay");

    // Press ArrowRight (should nudge x by +1)
    fireEvent.keyDown(window, { key: "ArrowRight" });
    // Press ArrowDown with Shift (should nudge y by +10)
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });
    // Press ArrowLeft (should nudge x by -1)
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    // Press ArrowUp with Shift (should nudge y by -10)
    fireEvent.keyDown(window, { key: "ArrowUp", shiftKey: true });
  });
});
