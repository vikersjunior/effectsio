import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  MinusIcon,
  DotsNineIcon,
  GridFourIcon,
} from "@phosphor-icons/react";
import { Button } from "../ui/primitives/button";
import { ICON_SIZES } from "../ui/lib/icon-sizes";
import { cn } from "../ui/lib/utils";
import type { BackgroundItem } from "../../types/frame";
import { BACKGROUND_ITEM_REGISTRY } from "../../generative/registry";

export interface SortableBackgroundRowProps {
  item: BackgroundItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  onOpacityChange?: (opacity: number) => void;
  className?: string;
  showDragHandle?: boolean;
}

export function SortableBackgroundRow({
  item,
  isSelected,
  onSelect,
  onToggleEnabled,
  onRemove,
  onOpacityChange,
  className,
  showDragHandle = true,
}: SortableBackgroundRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const def = BACKGROUND_ITEM_REGISTRY[item.type];
  const params = item.parameters || {};

  const getLabel = () => {
    if (item.name) return item.name;
    switch (item.type) {
      case "solid":
        return "Solid";
      case "linear-gradient":
        return "Linear Gradient";
      case "radial-gradient":
        return "Radial Gradient";
      case "dots":
        return "Dots";
      case "grid":
        return "Grid";
      default:
        return def?.name || item.type;
    }
  };

  const name = getLabel();
  const opacityPercent = Math.round((typeof item.opacity === "number" ? item.opacity : 1) * 100);
  const [draft, setDraft] = React.useState(`${opacityPercent}%`);
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setDraft(`${opacityPercent}%`);
    }
  }, [opacityPercent, isFocused]);

  const commit = (valueToCommit?: string) => {
    const val = typeof valueToCommit === "string" ? valueToCommit : draft;
    const rawDigits = val.replace(/[^0-9.-]/g, "").trim();
    const parsed = parseFloat(rawDigits);
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
      const nextOpacity = clamped / 100;
      if (nextOpacity !== item.opacity) {
        onOpacityChange?.(nextOpacity);
      }
      setDraft(`${clamped}%`);
    } else {
      setDraft(`${opacityPercent}%`);
    }
    setIsFocused(false);
  };

  const revert = () => {
    setDraft(`${opacityPercent}%`);
    setIsFocused(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      data-slot="background-item-row"
      data-background-id={item.id}
      data-testid={`background-row-${item.id}`}
      className={cn(
        "group relative flex items-center justify-between px-2 h-8 rounded-md gap-2 text-xs cursor-pointer transition-colors duration-100 select-none",
        isSelected
          ? "bg-[color:var(--secondary)] border border-[color:var(--border)] text-[color:var(--foreground)]"
          : "hover:bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:var(--muted-foreground)] border border-transparent",
        !item.enabled && "opacity-50",
        className
      )}
    >
      {/* Drag handle & Preview thumbnail */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {showDragHandle && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${name}`}
            className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <DotsSixVerticalIcon size={ICON_SIZES.md} />
          </button>
        )}

        {/* Thumbnail Preview */}
        <div className="size-4 rounded-xs shrink-0 border border-[color:color-mix(in_oklab,var(--border)_80%,transparent)] overflow-hidden flex items-center justify-center bg-[color:var(--card)]">
          {item.type === "solid" ? (
            <div
              className="size-full"
              style={{ backgroundColor: (params.color as string) || "#000000" }}
            />
          ) : item.type === "linear-gradient" ? (
            <div
              className="size-full"
              style={{
                background: `linear-gradient(${params.angle ?? 135}deg, ${(params.startColor as string) || "#000000"}, ${(params.endColor as string) || "#3b82f6"})`,
              }}
            />
          ) : item.type === "radial-gradient" ? (
            <div
              className="size-full"
              style={{
                background: `radial-gradient(circle, ${(params.startColor as string) || "#000000"}, ${(params.endColor as string) || "#3b82f6"})`,
              }}
            />
          ) : item.type === "dots" ? (
            <DotsNineIcon size={12} className="text-[color:var(--muted-foreground)]" />
          ) : (
            <GridFourIcon size={12} className="text-[color:var(--muted-foreground)]" />
          )}
        </div>

        {/* Label */}
        <span className="font-medium truncate text-xs text-[color:var(--foreground)]">
          {name}
        </span>
      </div>

      {/* Action Controls & Inline Opacity */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editable Opacity Input */}
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          data-slot="background-opacity-input"
          data-testid={`background-opacity-input-${item.id}`}
          aria-label={`Opacity for ${name}`}
          title={`Opacity: ${opacityPercent}%`}
          onFocus={(e) => {
            setIsFocused(true);
            setDraft(String(opacityPercent));
            e.currentTarget.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              commit(e.currentTarget.value);
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              e.preventDefault();
              revert();
              e.currentTarget.blur();
            } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const step = e.shiftKey ? 10 : 1;
              const direction = e.key === "ArrowUp" ? 1 : -1;
              const rawDigits = draft.replace(/[^0-9.-]/g, "").trim();
              const currentVal = Number.isFinite(parseFloat(rawDigits)) ? parseFloat(rawDigits) : opacityPercent;
              const nextVal = Math.max(0, Math.min(100, Math.round(currentVal + direction * step)));
              const nextOpacity = nextVal / 100;
              setDraft(`${nextVal}%`);
              if (nextOpacity !== item.opacity) {
                onOpacityChange?.(nextOpacity);
              }
            }
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "h-5 w-9 shrink-0 text-right font-sans text-xs tabular-nums leading-none bg-transparent border-0 outline-none cursor-text select-text p-0 m-0 transition-colors",
            isFocused
              ? "text-[color:var(--foreground)]"
              : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          )}
        />

        {/* Visibility Toggle Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-testid={`visibility-toggle-${item.id}`}
          onClick={onToggleEnabled}
          title={item.enabled ? `Hide ${name}` : `Show ${name}`}
          aria-label={item.enabled ? `Hide ${name}` : `Show ${name}`}
          className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors p-0 cursor-pointer"
        >
          {item.enabled ? (
            <EyeIcon size={ICON_SIZES.md} />
          ) : (
            <EyeSlashIcon size={ICON_SIZES.md} />
          )}
        </Button>

        {/* Remove Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          data-testid={`remove-background-${item.id}`}
          onClick={onRemove}
          title={`Remove ${name}`}
          aria-label={`Remove ${name}`}
          className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)] hover:bg-[color:color-mix(in_oklab,var(--destructive)_10%,transparent)] transition-colors p-0 cursor-pointer"
        >
          <MinusIcon size={ICON_SIZES.md} />
        </Button>
      </div>
    </div>
  );
}
