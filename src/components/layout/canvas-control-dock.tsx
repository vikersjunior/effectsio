import * as React from "react";
import {
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  CornersOutIcon,
  HandIcon,
  SquareSplitHorizontalIcon,
  GridFourIcon,
  EyeIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
} from "@phosphor-icons/react";
import { Button, Separator } from "../ui";
import { TimelineBar } from "../timeline/timeline-bar";
import { useStudioStore } from "../../context/studio-context";

export interface CanvasControlDockProps {
  isHandToolActive: boolean;
  setIsHandToolActive: React.Dispatch<React.SetStateAction<boolean>>;
  isSpacePressed: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function CanvasControlDock({
  isHandToolActive,
  setIsHandToolActive,
  isSpacePressed,
  containerRef,
}: CanvasControlDockProps): React.JSX.Element {
  const {
    viewport,
    setViewport,
    zoomViewport,
    resetViewportFit,
    resetViewportActual,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useStudioStore();

  return (
    <div
      role="toolbar"
      aria-label="Canvas Workspace Controls"
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 max-w-[calc(100%-2rem)] select-none pointer-events-auto"
    >
      {/* Upper Bar: Timeline Playback Controls */}
      <TimelineBar />

      {/* Lower Bar: Viewport Control Dock matching Figma grouping & order */}
      <div className="floating-popup-surface flex items-center gap-1 rounded-xl border border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] px-2 py-1 shadow-2xl backdrop-blur-2xl text-[color:var(--foreground)] max-w-full overflow-x-auto">
        {/* Group 1: Zoom Controls */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => zoomViewport(-25)}
          aria-label="Zoom out"
          title="Zoom out (-25%)"
        >
          <MagnifyingGlassMinusIcon size={13} />
        </Button>

        <span className="font-mono text-2xs text-[color:var(--foreground)] min-w-[2.75rem] text-center tabular-nums px-0.5">
          {Math.round(viewport.zoom)}%
        </span>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => zoomViewport(25)}
          aria-label="Zoom in"
          title="Zoom in (+25%)"
        >
          <MagnifyingGlassPlusIcon size={13} />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        {/* Group 2: Framing Modes (Fit / 1:1) */}
        <Button
          variant={viewport.fitMode === "contain" ? "secondary" : "ghost"}
          size="xs"
          onClick={() => {
            if (containerRef.current) {
              resetViewportFit(
                containerRef.current.clientWidth,
                containerRef.current.clientHeight
              );
            } else {
              resetViewportFit();
            }
          }}
          className="gap-1 text-2xs px-2 h-6"
          title="Fit to Viewport"
        >
          <CornersOutIcon size={12} />
          Fit
        </Button>

        <Button
          variant={viewport.fitMode === "1:1" ? "secondary" : "ghost"}
          size="xs"
          onClick={resetViewportActual}
          className="text-2xs px-2 h-6 font-mono"
          title="Actual Size 1:1"
        >
          1:1
        </Button>

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        {/* Group 3: Viewport & Canvas Inspection Tools */}
        <Button
          variant={isHandToolActive || isSpacePressed ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => setIsHandToolActive((prev) => !prev)}
          title="Pan Hand Tool (Spacebar)"
          aria-label="Pan Tool"
        >
          <HandIcon size={13} />
        </Button>

        <Button
          variant={viewport.splitView ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() =>
            setViewport((v) => ({ ...v, splitView: !v.splitView }))
          }
          title="Split Comparison View"
          aria-label="Split View"
        >
          <SquareSplitHorizontalIcon size={13} />
        </Button>

        <Button
          variant={viewport.showGrid ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() => setViewport((v) => ({ ...v, showGrid: !v.showGrid }))}
          title="Viewport Grid Overlay"
          aria-label="Grid Overlay"
        >
          <GridFourIcon size={13} />
        </Button>

        <Button
          variant={viewport.showCheckerboard ? "secondary" : "ghost"}
          size="icon-xs"
          onClick={() =>
            setViewport((v) => ({
              ...v,
              showCheckerboard: !v.showCheckerboard,
            }))
          }
          title="Transparency Checkerboard Preview"
          aria-label="Transparency Checkerboard"
        >
          <EyeIcon size={13} />
        </Button>

        <Separator orientation="vertical" className="h-4 mx-0.5" />

        {/* Group 4: Undo / Redo History */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
          aria-label="Undo"
          className="disabled:opacity-30"
        >
          <ArrowUUpLeftIcon size={13} />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
          aria-label="Redo"
          className="disabled:opacity-30"
        >
          <ArrowUUpRightIcon size={13} />
        </Button>
      </div>
    </div>
  );
}
