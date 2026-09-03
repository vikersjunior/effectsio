import * as React from "react";
import {
  HandIcon,
  ResizeIcon,
  MagicWandIcon,
  ArrowsOutLineHorizontalIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Separator,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "../ui";
import { TimelineBar } from "../timeline/timeline-bar";
import { useStudioStore } from "../../context/studio-context";
import { EffectBrowserModal } from "../effects/effect-browser-modal";

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
    editorMode,
    isEffectBrowserOpen,
    setIsEffectBrowserOpen,
    activeImageId,
    addEffectToStack,
  } = useStudioStore();

  const isHandActive = isHandToolActive || isSpacePressed;

  return (
    <div
      role="toolbar"
      aria-label="Canvas Workspace Controls"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3 max-w-[calc(100%-2rem)] select-none pointer-events-auto"
    >
      {/* Contextual Upper Bar: Timeline Playback Controls (rendered ONLY in Animate context) */}
      {editorMode === "animate" && <TimelineBar />}

      {/* Persistent Bottom Tool Dock: matching Figma node 61:1277 */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="floating-popup-surface flex items-center gap-2 rounded-[16px] border border-[color:var(--border)] p-2 dark:shadow-2xl shadow-none backdrop-blur-2xl text-[color:var(--foreground)] max-w-full"
      >
        {/* GROUP 1: [ Hand ] [ Resize ] [ Magic Wand ] [ Compare ] */}
        <div className="flex items-center gap-1">
          {/* 1. Hand / Pan Tool */}
          <Button
            variant={isHandActive ? "primary" : "ghost"}
            size="icon-md"
            onClick={() => setIsHandToolActive((prev) => !prev)}
            aria-label="Hand tool"
            title="Pan canvas (Spacebar)"
            className={`!size-8 rounded-lg [&_svg]:!size-[18px] ${
              isHandActive
                ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] hover:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)]"
                : ""
            }`}
          >
            <HandIcon size={18} className="shrink-0" />
          </Button>

          {/* 2. Resize / Frame Size */}
          <Button
            variant="ghost"
            size="icon-md"
            aria-label="Frame size"
            title="Resize"
            className="!size-8 rounded-lg [&_svg]:!size-[18px]"
            onClick={() => {
              // Frame size selection entry point: preserved structurally for upcoming feature
            }}
          >
            <ResizeIcon size={18} className="shrink-0" />
          </Button>

          {/* 3. Magic Wand / Effects */}
          <Button
            variant="ghost"
            size="icon-md"
            aria-label="Add visual effect"
            title="Add visual effect"
            className="!size-8 rounded-lg [&_svg]:!size-[18px]"
            onClick={() => setIsEffectBrowserOpen(true)}
          >
            <MagicWandIcon size={18} className="shrink-0" />
          </Button>

          {/* 4. Compare */}
          <Button
            variant={viewport.splitView ? "secondary" : "ghost"}
            size="icon-md"
            onClick={() => setViewport((v) => ({ ...v, splitView: !v.splitView }))}
            aria-label="Split comparison view"
            title="Compare before/after"
            className={`!size-8 rounded-lg [&_svg]:!size-[18px] ${
              viewport.splitView
                ? "bg-[color:color-mix(in_oklab,var(--foreground)_12%,transparent)] text-[color:var(--foreground)]"
                : ""
            }`}
          >
            <ArrowsOutLineHorizontalIcon size={18} className="shrink-0" />
          </Button>
        </div>

        {/* Vertical Divider between Group 1 and Group 2 */}
        <Separator
          orientation="vertical"
          className="h-5 mx-0.5 bg-[color:color-mix(in_oklab,var(--border)_30%,transparent)]"
        />

        {/* GROUP 2: [ Undo ] [ Redo ] */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-md"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (⌘Z)"
            className="!size-8 rounded-lg [&_svg]:!size-[18px] disabled:opacity-30"
          >
            <ArrowUUpLeftIcon size={18} className="shrink-0" />
          </Button>

          <Button
            variant="ghost"
            size="icon-md"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (⌘⇧Z)"
            className="!size-8 rounded-lg [&_svg]:!size-[18px] disabled:opacity-30"
          >
            <ArrowUUpRightIcon size={18} className="shrink-0" />
          </Button>
        </div>

        {/* Vertical Divider between Group 2 and Group 3 */}
        <Separator
          orientation="vertical"
          className="h-5 mx-0.5 bg-[color:color-mix(in_oklab,var(--border)_30%,transparent)]"
        />

        {/* GROUP 3: [ 85% ▼ ] Zoom Options Popover */}
        <Popover>
          <PopoverTrigger
            type="button"
            aria-label="Zoom options"
            title="Zoom options"
            className="flex items-center gap-1 px-2.5 h-8 text-xs font-mono font-medium text-[color:var(--foreground)] rounded-lg hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
          >
            <span className="tabular-nums">{Math.round(viewport.zoom)}%</span>
            <CaretDownIcon size={14} className="opacity-70 shrink-0 !size-3.5" />
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-36 p-1 gap-0.5"
          >
            <button
              type="button"
              onClick={() => zoomViewport(25)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--foreground)] transition-colors cursor-pointer"
            >
              <span>Zoom in</span>
              <span className="text-2xs text-[color:var(--muted-foreground)] font-mono">
                +25%
              </span>
            </button>
            <button
              type="button"
              onClick={() => zoomViewport(-25)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--foreground)] transition-colors cursor-pointer"
            >
              <span>Zoom out</span>
              <span className="text-2xs text-[color:var(--muted-foreground)] font-mono">
                -25%
              </span>
            </button>
            <Separator className="my-1" />
            <button
              type="button"
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
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--foreground)] transition-colors cursor-pointer"
            >
              <span>Fit to screen</span>
              <span className="text-2xs text-[color:var(--muted-foreground)] font-mono">
                Fit
              </span>
            </button>
            <button
              type="button"
              onClick={resetViewportActual}
              className="flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-sm hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--foreground)] transition-colors cursor-pointer"
            >
              <span>Actual size</span>
              <span className="text-2xs text-[color:var(--muted-foreground)] font-mono">
                1:1
              </span>
            </button>
          </PopoverContent>
        </Popover>
      </div>

      {/* Canonical EffectBrowserModal rendered at dock level for full-workspace access */}
      {isEffectBrowserOpen && (
        <EffectBrowserModal
          isOpen={isEffectBrowserOpen}
          onClose={() => setIsEffectBrowserOpen(false)}
          onSelectEffect={(effectId) => {
            if (activeImageId) {
              addEffectToStack(activeImageId, effectId);
            }
            setIsEffectBrowserOpen(false);
          }}
        />
      )}
    </div>
  );
}
