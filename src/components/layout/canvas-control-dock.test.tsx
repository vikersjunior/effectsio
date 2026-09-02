// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CanvasControlDock } from "./canvas-control-dock";
import { StudioProvider, useStudioStore } from "../../context/studio-context";

describe("CanvasControlDock (Correction 02.2 - Figma node 61:1277)", () => {
  afterEach(() => {
    cleanup();
  });
  it("renders tools in exact Figma order: Hand -> Resize -> Magic Wand -> Compare -> Undo -> Redo -> Zoom", () => {
    const containerRef = { current: document.createElement("div") };

    render(
      <StudioProvider>
        <CanvasControlDock
          isHandToolActive={false}
          setIsHandToolActive={vi.fn()}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      </StudioProvider>
    );

    const toolbar = screen.getByRole("toolbar", { name: /Canvas Workspace Controls/i });
    expect(toolbar).toBeDefined();

    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => b.getAttribute("aria-label") || b.textContent);

    // Verify ordering
    expect(labels[0]).toBe("Hand tool");
    expect(labels[1]).toBe("Frame size");
    expect(labels[2]).toBe("Add visual effect");
    expect(labels[3]).toBe("Split comparison view");
    expect(labels[4]).toBe("Undo");
    expect(labels[5]).toBe("Redo");
    expect(labels[6]).toBe("Zoom options");
  });

  it("does NOT render TimelineBar when in Design mode", () => {
    const containerRef = { current: document.createElement("div") };

    render(
      <StudioProvider>
        <CanvasControlDock
          isHandToolActive={false}
          setIsHandToolActive={vi.fn()}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      </StudioProvider>
    );

    // Playback bar must not be rendered
    expect(screen.queryByLabelText(/Animation Timeline Controls/i)).toBeNull();
    expect(screen.queryByLabelText(/Play animation/i)).toBeNull();
  });

  it("DOES render TimelineBar when inside Animate mode", () => {
    const containerRef = { current: document.createElement("div") };

    function AnimateModeWrapper() {
      const { setEditorMode } = useStudioStore();
      React.useEffect(() => {
        setEditorMode("animate");
      }, [setEditorMode]);

      return (
        <CanvasControlDock
          isHandToolActive={false}
          setIsHandToolActive={vi.fn()}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      );
    }

    render(
      <StudioProvider>
        <AnimateModeWrapper />
      </StudioProvider>
    );

    // In Animate mode, TimelineBar should render
    expect(screen.getByLabelText(/Animation Timeline Controls/i)).toBeDefined();
    expect(screen.getByLabelText(/Play animation/i)).toBeDefined();
  });

  it("toggles Hand tool and renders pink active state", () => {
    const containerRef = { current: document.createElement("div") };
    const setIsHandToolActive = vi.fn();

    const { rerender } = render(
      <StudioProvider>
        <CanvasControlDock
          isHandToolActive={false}
          setIsHandToolActive={setIsHandToolActive}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      </StudioProvider>
    );

    const handBtn = screen.getByLabelText("Hand tool");
    fireEvent.click(handBtn);
    expect(setIsHandToolActive).toHaveBeenCalledTimes(1);

    // When active, should have primary pink background
    rerender(
      <StudioProvider>
        <CanvasControlDock
          isHandToolActive={true}
          setIsHandToolActive={setIsHandToolActive}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      </StudioProvider>
    );

    const activeHandBtn = screen.getByLabelText("Hand tool");
    expect(activeHandBtn.className).toContain("bg-[color:var(--primary)]");
  });

  it("toggles Compare split view state", () => {
    const containerRef = { current: document.createElement("div") };

    function CompareTestHost() {
      const { viewport } = useStudioStore();
      return (
        <div>
          <div data-testid="split-state">{String(viewport.splitView)}</div>
          <CanvasControlDock
            isHandToolActive={false}
            setIsHandToolActive={vi.fn()}
            isSpacePressed={false}
            containerRef={containerRef}
          />
        </div>
      );
    }

    render(
      <StudioProvider>
        <CompareTestHost />
      </StudioProvider>
    );

    expect(screen.getByTestId("split-state").textContent).toBe("false");

    const compareBtn = screen.getByLabelText("Split comparison view");
    fireEvent.click(compareBtn);

    expect(screen.getByTestId("split-state").textContent).toBe("true");
  });

  it("opens EffectBrowserModal when Magic Wand button is clicked", () => {
    const containerRef = { current: document.createElement("div") };

    function MagicWandTestHost() {
      const { isEffectBrowserOpen } = useStudioStore();
      return (
        <div>
          <div data-testid="modal-state">{String(isEffectBrowserOpen)}</div>
          <CanvasControlDock
            isHandToolActive={false}
            setIsHandToolActive={vi.fn()}
            isSpacePressed={false}
            containerRef={containerRef}
          />
        </div>
      );
    }

    render(
      <StudioProvider>
        <MagicWandTestHost />
      </StudioProvider>
    );

    expect(screen.getByTestId("modal-state").textContent).toBe("false");

    const wandBtn = screen.getByLabelText("Add visual effect");
    fireEvent.click(wandBtn);

    expect(screen.getByTestId("modal-state").textContent).toBe("true");
  });

  it("displays zoom percentage and opens zoom popover with fit and 1:1", () => {
    const containerRef = { current: document.createElement("div") };

    render(
      <StudioProvider>
        <CanvasControlDock
          isHandToolActive={false}
          setIsHandToolActive={vi.fn()}
          isSpacePressed={false}
          containerRef={containerRef}
        />
      </StudioProvider>
    );

    // Initial zoom 100%
    const zoomTrigger = screen.getByLabelText("Zoom options");
    expect(zoomTrigger.textContent).toContain("100%");

    // Click popover trigger to open menu
    fireEvent.click(zoomTrigger);

    // Popover content buttons
    expect(screen.getByText("Zoom in")).toBeDefined();
    expect(screen.getByText("Zoom out")).toBeDefined();
    expect(screen.getByText("Fit to screen")).toBeDefined();
    expect(screen.getByText("Actual size")).toBeDefined();
  });
});
