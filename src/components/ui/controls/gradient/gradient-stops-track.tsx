"use client";

import type * as React from "react";
import { cn } from "../../lib/utils";
import {
  getStopCssColor,
  parseStopPosition,
  type IndexedGradientStop,
} from "./gradient-control-utils";

function GradientStopPin({
  isDragging,
  isSelected,
  onDoubleClick,
  onKeyDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  stop,
  allowDrag = true,
}: {
  isDragging: boolean;
  isSelected: boolean;
  onDoubleClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  stop: IndexedGradientStop;
  allowDrag?: boolean;
}): React.JSX.Element {
  const stopPosition = parseStopPosition(stop.position);
  const posPercent = Math.round(stopPosition * 100);

  return (
    <button
      aria-label={`Gradient stop ${stop.originalIndex + 1}`}
      aria-pressed={isSelected}
      className={cn(
        "absolute top-1.5 -translate-x-1/2 size-4 rounded-[3px] border-2 border-white shadow-md transition-[box-shadow,transform] touch-none outline-none",
        allowDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && allowDrag && "cursor-grabbing ring-2 ring-[color:var(--ring)] scale-110 z-20",
        isSelected && !isDragging && "ring-2 ring-[color:var(--ring)] scale-105 z-20",
        !isDragging && !isSelected && "hover:scale-105 z-10"
      )}
      onDoubleClick={allowDrag ? onDoubleClick : undefined}
      onKeyDown={allowDrag ? onKeyDown : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={allowDrag ? onPointerMove : undefined}
      onPointerUp={allowDrag ? onPointerUp : undefined}
      onPointerCancel={allowDrag ? onPointerUp : undefined}
      style={{
        left: `${posPercent}%`,
        backgroundColor: getStopCssColor(stop),
      }}
      type="button"
    />
  );
}

export function GradientStopsTrack({
  gradient,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPinPointerMove,
  onPinPointerUp,
  onRemoveStop,
  onRemoveStopByKey,
  onStartDrag,
  onSelectStop,
  selectedIndex,
  stops,
  trackRef,
  draggingIndex,
  allowDrag = true,
  allowAdd = true,
  allowRemove = true,
}: {
  gradient: string;
  draggingIndex: number | null;
  onDragEnd: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPinPointerMove?: (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onPinPointerUp?: (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onRemoveStop: (
    index: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => void;
  onRemoveStopByKey: (
    index: number,
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => void;
  onStartDrag: (
    index: number,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => void;
  onSelectStop?: (index: number) => void;
  selectedIndex: number | null;
  stops: readonly IndexedGradientStop[];
  trackRef: React.RefObject<HTMLDivElement | null>;
  allowDrag?: boolean;
  allowAdd?: boolean;
  allowRemove?: boolean;
}): React.JSX.Element {
  return (
    <div
      aria-label="Gradient stops track"
      data-slot="gradient-stops-track"
      className={cn(
        "app-no-drag relative mt-1 h-10 w-full touch-none select-none",
        allowAdd ? "cursor-crosshair" : "cursor-default"
      )}
      onPointerCancel={allowDrag ? onDragEnd : undefined}
      onPointerDown={allowAdd ? onPointerDown : undefined}
      onPointerMove={allowDrag ? onPointerMove : undefined}
      onPointerUp={allowDrag ? onDragEnd : undefined}
      ref={trackRef}
    >
      <div className="absolute inset-x-0 top-3 h-6 overflow-hidden rounded-md border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] shadow-xs">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[inherit]"
          style={{ background: gradient }}
        />
      </div>
      {stops.map((stop) => (
        <GradientStopPin
          allowDrag={allowDrag}
          isDragging={draggingIndex === stop.originalIndex}
          isSelected={selectedIndex === stop.originalIndex}
          key={stop.originalIndex}
          onDoubleClick={(event) => allowRemove && onRemoveStop(stop.originalIndex, event)}
          onKeyDown={(event) => allowRemove && onRemoveStopByKey(stop.originalIndex, event)}
          onPointerDown={(event) => {
            if (allowDrag) {
              onStartDrag(stop.originalIndex, event);
            } else {
              onSelectStop?.(stop.originalIndex);
            }
          }}
          onPointerMove={
            onPinPointerMove
              ? (event) => onPinPointerMove(stop.originalIndex, event)
              : undefined
          }
          onPointerUp={
            onPinPointerUp
              ? (event) => onPinPointerUp(stop.originalIndex, event)
              : undefined
          }
          stop={stop}
        />
      ))}
    </div>
  );
}
