import * as React from "react";
import {
  XIcon,
  CircleHalfIcon,
  CircleIcon,
  GradientIcon,
  DotsNineIcon,
  GridFourIcon,
  ArrowsLeftRightIcon,
  ArrowCounterClockwiseIcon,
  PlusIcon,
  MinusIcon,
  DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import {
  Button,
  ColorControl,
  ColorValueControl,
  ColorOpacityInput,
  SliderControl,
  ScrollFade,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import type { BackgroundType, BackgroundState } from "../../types/look";
import type { GradientStop, GradientType } from "../ui/controls/control-types";
import {
  gradientTypeOptions,
  parseStopPosition,
} from "../ui/controls/gradient/gradient-control-utils";

function hexToRgba(hex: string, alpha = 1): string {
  const cleanHex = (hex || "#000000").replace(/^#/, "");
  let num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) num = 0;
  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 3) {
    r = ((num >> 8) & 0xf) * 17;
    g = ((num >> 4) & 0xf) * 17;
    b = (num & 0xf) * 17;
  } else {
    r = (num >> 16) & 0xff;
    g = (num >> 8) & 0xff;
    b = num & 0xff;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function FloatingBackgroundPanel(): React.JSX.Element | null {
  const {
    activeAsset,
    activeImageId,
    activeBackground,
    hasActiveBackground,
    isBackgroundPanelOpen,
    setIsBackgroundPanelOpen,
    updateActiveBackground,
  } = useStudioStore();

  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const hasUserDraggedRef = React.useRef(false);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const dragStartRef = React.useRef<{
    pointerX: number;
    pointerY: number;
    posX: number;
    posY: number;
  } | null>(null);

  const getDefaultPosition = React.useCallback(() => {
    const parent = panelRef.current?.parentElement;
    const parentWidth = parent ? parent.clientWidth : (typeof window !== "undefined" ? window.innerWidth : 800);
    const parentHeight = parent ? parent.clientHeight : (typeof window !== "undefined" ? window.innerHeight : 600);
    const panelWidth = panelRef.current?.offsetWidth ?? 304;
    const panelHeight = panelRef.current?.offsetHeight ?? 340;

    let targetY = 280;
    if (typeof document !== "undefined") {
      const bgHeader =
        document.querySelector('[data-slot="background-section-header"]') ||
        document.querySelector('button[aria-label="Add background"]') ||
        document.querySelector('button[aria-label="Remove background"]') ||
        document.querySelector('[data-slot="background-row"]');
      if (bgHeader && parent) {
        const bgRect = bgHeader.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        targetY = Math.max(16, bgRect.top - parentRect.top);
      }
    }

    const newX = Math.max(16, parentWidth - panelWidth - 16);
    const newY = Math.max(16, Math.min(parentHeight - panelHeight - 16, targetY));
    return { x: newX, y: newY };
  }, []);

  React.useEffect(() => {
    if (!hasUserDraggedRef.current) {
      setPosition(getDefaultPosition());
    }
  }, [isBackgroundPanelOpen, getDefaultPosition]);

  // Gradient state management
  const defaultStops: GradientStop[] = React.useMemo(
    () => [
      { color: activeBackground.color || "#000000", position: "0%", opacity: 100 },
      { color: activeBackground.gradientEndColor || "#E20000", position: "100%", opacity: 100 },
    ],
    [activeBackground.color, activeBackground.gradientEndColor]
  );

  const stops: GradientStop[] = React.useMemo(() => {
    if (activeBackground.gradientStops && activeBackground.gradientStops.length >= 2) {
      return [...activeBackground.gradientStops];
    }
    return defaultStops;
  }, [activeBackground.gradientStops, defaultStops]);

  const gradientType: GradientType = activeBackground.gradientType ?? (
    activeBackground.type === "radial-gradient" ? "radial" : "linear"
  );

  const gradientCssString = React.useMemo(() => {
    const stopStrs = stops.map((s) => {
      const op = typeof s.opacity === "number" ? s.opacity / 100 : 1;
      const col = hexToRgba(s.color, op);
      return `${col} ${s.position}`;
    });
    return `linear-gradient(90deg, ${stopStrs.join(", ")})`;
  }, [stops]);

  // Track dragging state for stops
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [activeDragStopIdx, setActiveDragStopIdx] = React.useState<number | null>(null);

  const defaultPos = getDefaultPosition();
  const currentX = position?.x ?? defaultPos.x;
  const currentY = position?.y ?? defaultPos.y;

  if (!activeAsset || !activeImageId || !hasActiveBackground || !isBackgroundPanelOpen) {
    return null;
  }

  const handleClose = () => {
    setIsBackgroundPanelOpen(false);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;

    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: currentX,
      posY: currentY,
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleHeaderPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    e.preventDefault();
    hasUserDraggedRef.current = true;

    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;

    const parent = panelRef.current?.parentElement;
    const parentWidth = parent ? parent.clientWidth : window.innerWidth;
    const parentHeight = parent ? parent.clientHeight : window.innerHeight;
    const panelWidth = panelRef.current?.offsetWidth ?? 304;
    const panelHeight = panelRef.current?.offsetHeight ?? 340;

    const newX = Math.max(8, Math.min(parentWidth - panelWidth - 8, dragStartRef.current.posX + deltaX));
    const newY = Math.max(8, Math.min(parentHeight - panelHeight - 8, dragStartRef.current.posY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handleHeaderPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Switch background type in-place
  const handleSelectType = (newType: BackgroundType) => {
    if (newType === "transparent") {
      updateActiveBackground({
        type: "transparent",
        padding: activeBackground.padding ?? 0,
      });
    } else if (newType === "solid") {
      updateActiveBackground({
        type: "solid",
        color: activeBackground.color && activeBackground.color !== "#000000" ? activeBackground.color : "#E20000",
        opacity: activeBackground.opacity ?? 100,
        padding: activeBackground.padding ?? 0,
      });
    } else if (newType === "linear-gradient") {
      updateActiveBackground({
        type: "linear-gradient",
        gradientType: activeBackground.gradientType || "linear",
        color: activeBackground.color || "#000000",
        gradientEndColor: activeBackground.gradientEndColor || "#E20000",
        gradientAngle: activeBackground.gradientAngle ?? 90,
        gradientStops: stops,
        padding: activeBackground.padding ?? 0,
      });
    } else if (newType === "dots") {
      updateActiveBackground({
        type: "dots",
        color: activeBackground.color || "#A1A1AA",
        opacity: activeBackground.opacity ?? 100,
        patternBackgroundColor: activeBackground.patternBackgroundColor ?? "#000000",
        patternBackgroundOpacity: activeBackground.patternBackgroundOpacity ?? 100,
        patternSpacing: activeBackground.patternSpacing ?? 24,
        padding: activeBackground.padding ?? 32,
      });
    } else if (newType === "grid") {
      updateActiveBackground({
        type: "grid",
        color: activeBackground.color || "#A1A1AA",
        opacity: activeBackground.opacity ?? 100,
        patternBackgroundColor: activeBackground.patternBackgroundColor ?? "#000000",
        patternBackgroundOpacity: activeBackground.patternBackgroundOpacity ?? 100,
        patternSpacing: activeBackground.patternSpacing ?? 32,
        padding: activeBackground.padding ?? 32,
      });
    }
  };

  const handleReverseGradient = () => {
    const reversed = stops.map((stop) => {
      const posVal = parseStopPosition(stop.position);
      const newPos = `${Math.round((1 - posVal) * 100)}%`;
      return { ...stop, position: newPos };
    });
    reversed.sort((a, b) => parseStopPosition(a.position) - parseStopPosition(b.position));

    updateActiveBackground({
      color: reversed[0]?.color ?? activeBackground.gradientEndColor ?? "#E20000",
      gradientEndColor: reversed[reversed.length - 1]?.color ?? activeBackground.color ?? "#000000",
      gradientStops: reversed,
    });
  };

  const handleResetGradient = () => {
    const defaultResetStops: GradientStop[] = [
      { color: "#000000", position: "0%", opacity: 100 },
      { color: "#E20000", position: "100%", opacity: 100 },
    ];
    updateActiveBackground({
      type: "linear-gradient",
      gradientType: "linear",
      gradientAngle: 90,
      color: "#000000",
      gradientEndColor: "#E20000",
      gradientStops: defaultResetStops,
    });
  };

  const handleGradientTypeChange = (newGradType: GradientType) => {
    const newBgType: BackgroundType = newGradType === "radial" ? "radial-gradient" : "linear-gradient";
    updateActiveBackground({
      type: newBgType,
      gradientType: newGradType,
    });
  };

  const handleAddStop = () => {
    if (stops.length >= 8) return;
    const sorted = [...stops].sort(
      (a, b) => parseStopPosition(a.position) - parseStopPosition(b.position)
    );
    let maxGap = 0;
    let insertPos = 50;
    for (let i = 0; i < sorted.length - 1; i++) {
      const pos1 = Math.round(parseStopPosition(sorted[i].position) * 100);
      const pos2 = Math.round(parseStopPosition(sorted[i + 1].position) * 100);
      const gap = pos2 - pos1;
      if (gap > maxGap) {
        maxGap = gap;
        insertPos = Math.round(pos1 + gap / 2);
      }
    }
    const newStop: GradientStop = {
      color: "#71717A",
      position: `${insertPos}%`,
      opacity: 100,
    };
    const nextStops = [...stops, newStop].sort(
      (a, b) => parseStopPosition(a.position) - parseStopPosition(b.position)
    );
    updateActiveBackground({
      gradientStops: nextStops,
    });
  };

  const handleRemoveStop = (index: number) => {
    if (stops.length <= 2) return;
    const nextStops = stops.filter((_, idx) => idx !== index);
    updateActiveBackground({
      color: nextStops[0].color,
      gradientEndColor: nextStops[nextStops.length - 1].color,
      gradientStops: nextStops,
    });
  };

  const handleUpdateStopColor = (index: number, newColor: string) => {
    const nextStops = stops.map((stop, idx) => (idx === index ? { ...stop, color: newColor } : stop));
    const updates: Partial<BackgroundState> = { gradientStops: nextStops };
    if (index === 0) updates.color = newColor;
    if (index === stops.length - 1) updates.gradientEndColor = newColor;
    updateActiveBackground(updates);
  };

  const handleUpdateStopPosition = (index: number, newPosition: string) => {
    const nextStops = stops.map((stop, idx) => (idx === index ? { ...stop, position: newPosition } : stop));
    const updates: Partial<BackgroundState> = { gradientStops: nextStops };
    updateActiveBackground(updates);
  };

  const handleUpdateStopOpacity = (index: number, newOpacity: number) => {
    const nextStops = stops.map((stop, idx) => (idx === index ? { ...stop, opacity: newOpacity } : stop));
    const updates: Partial<BackgroundState> = { gradientStops: nextStops };
    updateActiveBackground(updates);
  };

  const handleStopPinPointerDown = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setActiveDragStopIdx(index);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleStopPinPointerMove = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragStopIdx !== index || !trackRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const clampedPercent = Math.round(ratio * 100);
    handleUpdateStopPosition(index, `${clampedPercent}%`);
  };

  const handleStopPinPointerUp = (index: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (activeDragStopIdx === index) {
      setActiveDragStopIdx(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const clickedPercent = Math.round(ratio * 100);

    let nearestIdx = 0;
    let minDiff = 999;
    stops.forEach((s, idx) => {
      const posVal = Math.round(parseStopPosition(s.position) * 100);
      const diff = Math.abs(posVal - clickedPercent);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = idx;
      }
    });
    handleUpdateStopPosition(nearestIdx, `${clickedPercent}%`);
  };

  // Determine which of the 5 types is active
  const isAlphaActive = activeBackground.type === "transparent";
  const isSolidActive = activeBackground.type === "solid";
  const isGradientActive =
    activeBackground.type === "linear-gradient" || activeBackground.type === "radial-gradient";
  const isDotsActive = activeBackground.type === "dots";
  const isGridActive = activeBackground.type === "grid";

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Add Background"
      data-floating-surface=""
      className="app-no-drag absolute z-30 flex flex-col w-[304px] rounded-[16px] border border-[color:var(--border)] bg-[color:var(--sidebar)]/95 backdrop-blur-2xl shadow-xl select-none overflow-hidden"
      style={{
        left: `${currentX}px`,
        top: `${currentY}px`,
      }}
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        className="flex items-center justify-between px-3.5 h-10 border-b border-[color:var(--border)] cursor-grab active:cursor-grabbing shrink-0"
      >
        <span className="text-xs font-semibold text-[color:var(--foreground)] tracking-tight">
          Add Background
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleClose}
          title="Close parameters"
          aria-label="Close parameters"
          className="size-6 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] cursor-pointer [&_svg]:!size-4"
        >
          <XIcon size={16} />
        </Button>
      </div>

      {/* 5 Background Type Toolbar (Figma 113:4657) */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[color:var(--border)] shrink-0">
        {/* 1. Alpha */}
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="Alpha"
            onClick={() => handleSelectType("transparent")}
            className={`size-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
              isAlphaActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            <CircleHalfIcon size={18} />
          </TooltipTrigger>
          <TooltipContent side="top">Alpha</TooltipContent>
        </Tooltip>

        {/* 2. Solid */}
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="Solid"
            onClick={() => handleSelectType("solid")}
            className={`size-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
              isSolidActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            <CircleIcon size={18} />
          </TooltipTrigger>
          <TooltipContent side="top">Solid</TooltipContent>
        </Tooltip>

        {/* 3. Gradient */}
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="Gradient"
            onClick={() => handleSelectType("linear-gradient")}
            className={`size-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
              isGradientActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            <GradientIcon size={18} />
          </TooltipTrigger>
          <TooltipContent side="top">Gradient</TooltipContent>
        </Tooltip>

        {/* 4. Dot Pattern */}
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="Dot Pattern"
            onClick={() => handleSelectType("dots")}
            className={`size-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
              isDotsActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            <DotsNineIcon size={18} />
          </TooltipTrigger>
          <TooltipContent side="top">Dot Pattern</TooltipContent>
        </Tooltip>

        {/* 5. Grid Pattern */}
        <Tooltip>
          <TooltipTrigger
            type="button"
            aria-label="Grid Pattern"
            onClick={() => handleSelectType("grid")}
            className={`size-8 flex items-center justify-center rounded-[8px] transition-colors cursor-pointer ${
              isGridActive
                ? "bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]"
            }`}
          >
            <GridFourIcon size={18} />
          </TooltipTrigger>
          <TooltipContent side="top">Grid Pattern</TooltipContent>
        </Tooltip>
      </div>

      {/* Contextual Parameter Controls List */}
      <ScrollFade className="flex-1 overflow-y-auto px-3.5 py-3" containerClassName="flex-1 min-h-0">
        <div className="flex flex-col gap-3.5">
          {/* Alpha Parameters */}
          {isAlphaActive && (
            <div className="flex flex-col gap-3">
              <div className="py-1">
                <span className="text-xs text-[color:var(--muted-foreground)] leading-relaxed">
                  Transparent alpha background active. Canvas background is preserved.
                </span>
              </div>

              {/* Full-width Border Divider spanning to the edges */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Sliders Section: Padding & Shadow */}
              <div className="flex flex-col gap-3">
                <SliderControl
                  name="Padding"
                  value={activeBackground.padding ?? 0}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ padding: val })}
                />
                <SliderControl
                  name="Shadow"
                  value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onValueChange={(val) => updateActiveBackground({ shadowOpacity: val / 100 })}
                />
              </div>
            </div>
          )}

          {/* Solid Parameters */}
          {isSolidActive && (
            <div className="flex flex-col gap-3">
              {/* Color & Opacity Row */}
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ColorValueControl
                    color={activeBackground.color || "#E20000"}
                    label="Color"
                    onColorChange={(val) => updateActiveBackground({ color: val })}
                  />
                </div>
                <ColorOpacityInput
                  label="Color"
                  opacity={activeBackground.opacity ?? 100}
                  onOpacityChange={(op: number) => updateActiveBackground({ opacity: op })}
                  className="w-14 rounded-md"
                />
              </div>

              {/* Full-width Border Divider spanning to the edges */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Sliders Section: Padding & Shadow */}
              <div className="flex flex-col gap-3">
                <SliderControl
                  name="Padding"
                  value={activeBackground.padding ?? 0}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ padding: val })}
                />
                <SliderControl
                  name="Shadow"
                  value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onValueChange={(val) => updateActiveBackground({ shadowOpacity: val / 100 })}
                />
              </div>
            </div>
          )}

          {/* Gradient Parameters (Figma 113:4774) */}
          {isGradientActive && (
            <div className="flex flex-col gap-3">
              {/* Type Select & Action Icons Row */}
              <div className="flex items-center justify-between gap-2">
                <div className="w-32">
                  <Select
                    items={gradientTypeOptions}
                    value={gradientType}
                    onValueChange={(nextVal) => handleGradientTypeChange(nextVal as GradientType)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs justify-between rounded-lg">
                      <SelectValue>
                        {() =>
                          gradientTypeOptions.find((opt) => opt.value === gradientType)?.label ?? "Linear"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        {gradientTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      aria-label="Reverse Gradient"
                      onClick={handleReverseGradient}
                      className="size-7 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--secondary)] transition-colors cursor-pointer [&_svg]:!size-4"
                    >
                      <ArrowsLeftRightIcon size={16} />
                    </TooltipTrigger>
                    <TooltipContent side="top">Reverse Gradient</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      aria-label="Reset Gradient"
                      onClick={handleResetGradient}
                      className="size-7 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--secondary)] transition-colors cursor-pointer [&_svg]:!size-4"
                    >
                      <ArrowCounterClockwiseIcon size={16} />
                    </TooltipTrigger>
                    <TooltipContent side="top">Reset Gradient</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Gradient Preview Strip with Real Interactive Draggable Stop Nodes */}
              <div
                ref={trackRef}
                onPointerDown={handleTrackPointerDown}
                className="relative pt-3 pb-1 cursor-pointer select-none"
              >
                {/* Visual Track */}
                <div
                  className="h-6 w-full rounded-md border border-[color:var(--border)] shadow-xs overflow-hidden"
                  style={{ background: gradientCssString }}
                />

                {/* Real interactive draggable stop nodes on track */}
                {stops.map((stop, idx) => {
                  const posPercent = Math.round(parseStopPosition(stop.position) * 100);
                  const isDraggingThis = activeDragStopIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Gradient stop ${idx + 1}`}
                      onPointerDown={(e) => handleStopPinPointerDown(idx, e)}
                      onPointerMove={(e) => handleStopPinPointerMove(idx, e)}
                      onPointerUp={(e) => handleStopPinPointerUp(idx, e)}
                      onPointerCancel={(e) => handleStopPinPointerUp(idx, e)}
                      className={`absolute top-1.5 -translate-x-1/2 size-4 rounded-[3px] border-2 border-white shadow-md transition-[box-shadow,transform] touch-none ${
                        isDraggingThis ? "cursor-grabbing ring-2 ring-[color:var(--ring)] scale-110 z-20" : "cursor-grab hover:scale-105 z-10"
                      }`}
                      style={{
                        left: `${posPercent}%`,
                        backgroundColor: hexToRgba(
                          stop.color,
                          typeof stop.opacity === "number" ? stop.opacity / 100 : 1
                        ),
                      }}
                    />
                  );
                })}
              </div>

              {/* Full-width Border Divider spanning to the edges */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Steps Section */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Steps</span>
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      aria-label="Add gradient stop"
                      onClick={handleAddStop}
                      disabled={stops.length >= 8}
                      className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--secondary)] disabled:opacity-40 transition-colors cursor-pointer [&_svg]:!size-4"
                    >
                      <PlusIcon size={16} />
                    </TooltipTrigger>
                    <TooltipContent side="top">Add stop</TooltipContent>
                  </Tooltip>
                </div>

                {/* Steps List */}
                <div className="flex flex-col gap-2">
                  {stops.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <DotsSixVerticalIcon size={16} className="text-[color:var(--muted-foreground)] shrink-0 cursor-grab" />
                      <span className="text-xs text-[color:var(--muted-foreground)] w-8 text-right shrink-0">
                        {stop.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <ColorValueControl
                          label={`Stop ${idx + 1}`}
                          color={stop.color}
                          onColorChange={(newCol) => handleUpdateStopColor(idx, newCol)}
                          size="sm"
                        />
                      </div>
                      <ColorOpacityInput
                        label={`Stop ${idx + 1}`}
                        opacity={stop.opacity ?? 100}
                        onOpacityChange={(newOpacity: number) => handleUpdateStopOpacity(idx, newOpacity)}
                        size="sm"
                        className="w-14 rounded-md"
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={stops.length <= 2}
                        onClick={() => handleRemoveStop(idx)}
                        title="Remove stop"
                        aria-label={`Remove stop ${idx + 1}`}
                        className="size-7 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--secondary)] disabled:opacity-30 shrink-0 cursor-pointer [&_svg]:!size-4"
                      >
                        <MinusIcon size={16} className="shrink-0" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full-width Border Divider below Steps Section */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Sliders Section: Padding & Shadow */}
              <div className="flex flex-col gap-3">
                <SliderControl
                  name="Padding"
                  value={activeBackground.padding ?? 0}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ padding: val })}
                />
                <SliderControl
                  name="Shadow"
                  value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onValueChange={(val) => updateActiveBackground({ shadowOpacity: val / 100 })}
                />
              </div>
            </div>
          )}

          {/* Dot Pattern Parameters */}
          {isDotsActive && (
            <div className="flex flex-col gap-3">
              {/* Pattern Color & Opacity Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[color:var(--muted-foreground)] leading-none">Pattern</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ColorValueControl
                      color={activeBackground.color || "#A1A1AA"}
                      label="Pattern Color"
                      onColorChange={(val) => updateActiveBackground({ color: val })}
                    />
                  </div>
                  <ColorOpacityInput
                    label="Pattern Color"
                    opacity={activeBackground.opacity ?? 100}
                    onOpacityChange={(op: number) => updateActiveBackground({ opacity: op })}
                    className="w-14 rounded-md"
                  />
                </div>
              </div>

              {/* Background Color & Opacity Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[color:var(--muted-foreground)] leading-none">Background</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ColorValueControl
                      color={activeBackground.patternBackgroundColor || "#000000"}
                      label="Background Color"
                      onColorChange={(val) => updateActiveBackground({ patternBackgroundColor: val })}
                    />
                  </div>
                  <ColorOpacityInput
                    label="Background Color"
                    opacity={activeBackground.patternBackgroundOpacity ?? 100}
                    onOpacityChange={(op: number) => updateActiveBackground({ patternBackgroundOpacity: op })}
                    className="w-14 rounded-md"
                  />
                </div>
              </div>

              {/* Full-width Border Divider spanning to the edges */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Sliders Section: Dot Spacing, Padding & Shadow */}
              <div className="flex flex-col gap-3">
                <SliderControl
                  name="Dot Spacing"
                  value={activeBackground.patternSpacing ?? 24}
                  min={8}
                  max={64}
                  step={2}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ patternSpacing: val })}
                />
                <SliderControl
                  name="Padding"
                  value={activeBackground.padding ?? 32}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ padding: val })}
                />
                <SliderControl
                  name="Shadow"
                  value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onValueChange={(val) => updateActiveBackground({ shadowOpacity: val / 100 })}
                />
              </div>
            </div>
          )}

          {/* Grid Pattern Parameters */}
          {isGridActive && (
            <div className="flex flex-col gap-3">
              {/* Grid Color & Opacity Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[color:var(--muted-foreground)] leading-none">Pattern</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ColorValueControl
                      color={activeBackground.color || "#A1A1AA"}
                      label="Grid Color"
                      onColorChange={(val) => updateActiveBackground({ color: val })}
                    />
                  </div>
                  <ColorOpacityInput
                    label="Grid Color"
                    opacity={activeBackground.opacity ?? 100}
                    onOpacityChange={(op: number) => updateActiveBackground({ opacity: op })}
                    className="w-14 rounded-md"
                  />
                </div>
              </div>

              {/* Background Color & Opacity Row */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-[color:var(--muted-foreground)] leading-none">Background</span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <ColorValueControl
                      color={activeBackground.patternBackgroundColor || "#000000"}
                      label="Background Color"
                      onColorChange={(val) => updateActiveBackground({ patternBackgroundColor: val })}
                    />
                  </div>
                  <ColorOpacityInput
                    label="Background Color"
                    opacity={activeBackground.patternBackgroundOpacity ?? 100}
                    onOpacityChange={(op: number) => updateActiveBackground({ patternBackgroundOpacity: op })}
                    className="w-14 rounded-md"
                  />
                </div>
              </div>

              {/* Full-width Border Divider spanning to the edges */}
              <div className="-mx-3.5 border-b border-[color:var(--border)] my-1" />

              {/* Sliders Section: Grid Spacing, Padding & Shadow */}
              <div className="flex flex-col gap-3">
                <SliderControl
                  name="Grid Spacing"
                  value={activeBackground.patternSpacing ?? 32}
                  min={8}
                  max={64}
                  step={2}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ patternSpacing: val })}
                />
                <SliderControl
                  name="Padding"
                  value={activeBackground.padding ?? 32}
                  min={0}
                  max={120}
                  step={1}
                  unit="px"
                  onValueChange={(val) => updateActiveBackground({ padding: val })}
                />
                <SliderControl
                  name="Shadow"
                  value={Math.round((activeBackground.shadowOpacity ?? 0.4) * 100)}
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  onValueChange={(val) => updateActiveBackground({ shadowOpacity: val / 100 })}
                />
              </div>
            </div>
          )}
        </div>
      </ScrollFade>
    </div>
  );
}
