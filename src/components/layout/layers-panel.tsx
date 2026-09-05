import * as React from "react";
import {
  DotsSixVerticalIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  PlusIcon,
  LockSimpleIcon,
  ImageIcon,
  SquareIcon,
  CircleHalfIcon,
  DotsNineIcon,
  GridFourIcon,
} from "@phosphor-icons/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, ScrollFade, Popover, PopoverTrigger, PopoverContent, ICON_SIZES } from "../ui";
import { cn } from "../ui/lib/utils";
import { useStudioStore } from "../../context/studio-context";
import type { ImageLayer, GenerativeLayer } from "../../types/frame";
import type { Asset } from "../../types/asset";

interface SortableLayerRowProps {
  layer: ImageLayer;
  asset?: Asset;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}

function SortableLayerRow({
  layer,
  asset,
  isSelected,
  onSelect,
  onToggleVisibility,
  onRemove,
}: SortableLayerRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : layer.visible === false ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-slot="layer-row"
      data-layer-id={layer.id}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-2 px-2.5 h-10 rounded-md border transition-colors cursor-pointer select-none",
        isSelected
          ? "border-[color:var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] ring-1 ring-[color:var(--primary)]"
          : "border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] bg-[color:var(--card)] hover:border-[color:color-mix(in_oklab,var(--border)_80%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,var(--card))]"
      )}
    >
      {/* 1. Drag Handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${layer.name}`}
        className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 rounded-xs shrink-0 touch-none outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ring)]"
      >
        <DotsSixVerticalIcon size={ICON_SIZES.md} />
      </button>

      {/* 2. Thumbnail */}
      <div className="size-6 rounded-xs bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden shrink-0 border border-[color:color-mix(in_oklab,var(--border)_50%,transparent)] flex items-center justify-center">
        {asset?.thumbnailUrl ? (
          <img
            src={asset.thumbnailUrl}
            alt={layer.name}
            className="size-full object-cover select-none pointer-events-none"
          />
        ) : (
          <ImageIcon size={ICON_SIZES.sm} className="text-[color:var(--muted-foreground)]" />
        )}
      </div>

      {/* 3. Layer Name */}
      <span className="flex-1 min-w-0 text-xs font-medium text-[color:var(--foreground)] truncate">
        {layer.name}
      </span>

      {/* 4. Action Buttons (Remove on hover, Visibility toggle) */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          title="Remove layer"
          aria-label={`Remove ${layer.name}`}
          className="size-6 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:text-[color:var(--destructive)] hover:bg-[color:color-mix(in_oklab,var(--destructive)_10%,transparent)] transition-all p-0"
        >
          <TrashIcon size={ICON_SIZES.sm} />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onToggleVisibility}
          title={layer.visible === false ? "Show layer" : "Hide layer"}
          aria-label={layer.visible === false ? `Show ${layer.name}` : `Hide ${layer.name}`}
          className="size-6 rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors p-0"
        >
          {layer.visible === false ? (
            <EyeSlashIcon size={ICON_SIZES.md} />
          ) : (
            <EyeIcon size={ICON_SIZES.md} />
          )}
        </Button>
      </div>
    </div>
  );
}

interface BackgroundRowProps {
  layer: GenerativeLayer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
}

function BackgroundRow({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
}: BackgroundRowProps): React.JSX.Element {
  const bgConfig = layer.backgroundConfig;
  const isVisible = layer.visible !== false;

  return (
    <div
      data-slot="layer-row-background"
      data-testid="locked-background-row"
      data-layer-id={layer.id}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-2 px-2.5 h-10 rounded-md border transition-colors cursor-pointer select-none",
        isSelected
          ? "border-[color:var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] ring-1 ring-[color:var(--primary)]"
          : "border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] bg-[color:var(--card)] hover:border-[color:color-mix(in_oklab,var(--border)_80%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,var(--card))]"
      )}
      style={{ opacity: isVisible ? 1 : 0.6 }}
    >
      {/* 1. Permanent Locked Icon (cannot be dragged or reordered) */}
      <div
        className="p-0.5 text-[color:var(--muted-foreground)] shrink-0 opacity-60"
        title="Background is locked at base"
      >
        <LockSimpleIcon size={ICON_SIZES.sm} />
      </div>

      {/* 2. Swatch Thumbnail */}
      <div className="size-6 rounded-xs bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden shrink-0 border border-[color:color-mix(in_oklab,var(--border)_50%,transparent)] flex items-center justify-center">
        {bgConfig.type === "solid" ? (
          <div
            className="size-full"
            style={{ backgroundColor: bgConfig.color || "#E20000" }}
          />
        ) : bgConfig.type === "linear-gradient" || bgConfig.type === "radial-gradient" ? (
          <div
            className="size-full"
            style={{
              background: `linear-gradient(${bgConfig.gradientAngle ?? 90}deg, ${bgConfig.color || "#000000"}, ${bgConfig.gradientEndColor || "#E20000"})`,
            }}
          />
        ) : bgConfig.type === "transparent" ? (
          <CircleHalfIcon size={ICON_SIZES.sm} className="text-[color:var(--muted-foreground)]" />
        ) : bgConfig.type === "dots" ? (
          <DotsNineIcon size={ICON_SIZES.sm} className="text-[color:var(--muted-foreground)]" />
        ) : bgConfig.type === "grid" ? (
          <GridFourIcon size={ICON_SIZES.sm} className="text-[color:var(--muted-foreground)]" />
        ) : (
          <SquareIcon size={ICON_SIZES.sm} className="text-[color:var(--muted-foreground)]" />
        )}
      </div>

      {/* 3. Layer Name */}
      <span className="flex-1 min-w-0 text-xs font-medium text-[color:var(--foreground)] truncate">
        {layer.name || "Background"}
      </span>

      {/* 4. Action Buttons (Locked badge & Visibility toggle) */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onToggleVisibility}
          title={isVisible ? "Hide background" : "Show background"}
          aria-label={isVisible ? "Hide background" : "Show background"}
          className="size-6 rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors p-0"
        >
          {isVisible ? (
            <EyeIcon size={ICON_SIZES.md} />
          ) : (
            <EyeSlashIcon size={ICON_SIZES.md} />
          )}
        </Button>
      </div>
    </div>
  );
}

export interface LayersPanelProps {
  className?: string;
}

export function LayersPanel({ className }: LayersPanelProps): React.JSX.Element {
  const {
    activeFrame,
    activeLayerId,
    setActiveLayerId,
    updateLayer,
    reorderLayers,
    removeLayer,
    addLayerFromAsset,
    assets,
  } = useStudioStore();

  const [isAddPopoverOpen, setIsAddPopoverOpen] = React.useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const layers = activeFrame?.layers || [];
  const baseBackground = layers[0] as GenerativeLayer | undefined;

  // Visual stack: ImageLayers displayed in reverse array order (top layer at top of UI list)
  const imageLayers = React.useMemo(() => {
    return layers.slice(1).filter((l): l is ImageLayer => l.type === "image").reverse();
  }, [layers]);

  const assetMap = React.useMemo(() => {
    const map = new Map<string, Asset>();
    for (const a of assets) {
      map.set(a.id, a);
    }
    return map;
  }, [assets]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id || !activeFrame) return;

    const fromIndex = activeFrame.layers.findIndex((l) => l.id === active.id);
    const toIndex = activeFrame.layers.findIndex((l) => l.id === over.id);

    // Hard invariant: never reorder index 0 (GenerativeLayer)
    if (fromIndex > 0 && toIndex > 0) {
      reorderLayers(fromIndex, toIndex);
    }
  };

  return (
    <div className={cn("flex flex-col h-full w-full select-none overflow-hidden", className)}>
      {/* Layers Section Header (Matching h-11 standard) */}
      <div className="h-11 min-h-11 px-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0 bg-[color:var(--sidebar)]">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tracking-tight text-[color:var(--foreground)]">
            Layers
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            ({layers.length})
          </span>
        </div>

        {/* Add Layer Popover */}
        <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
          <PopoverTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                variant="ghost"
                size="icon-sm"
                title="Add layer from assets"
                aria-label="Add layer"
                className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] [&_svg]:!size-4"
              >
                <PlusIcon size={ICON_SIZES.md} className="shrink-0" />
              </Button>
            )}
          />
          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={8}
            className="w-56 p-2 flex flex-col gap-1 dark:shadow-xl shadow-none bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg"
          >
            <span className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Add Layer from Assets
            </span>
            {assets.length === 0 ? (
              <div className="p-3 text-center text-xs text-[color:var(--muted-foreground)]">
                No assets in library. Import media to add image layers.
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      addLayerFromAsset(asset.id);
                      setIsAddPopoverOpen(false);
                    }}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                  >
                    <div className="size-5 rounded-xs bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden shrink-0 border border-[color:color-mix(in_oklab,var(--border)_50%,transparent)]">
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.filename}
                        className="size-full object-cover"
                      />
                    </div>
                    <span className="text-xs font-medium text-[color:var(--foreground)] truncate">
                      {asset.filename}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Layer Stack Body */}
      <ScrollFade className="flex-1 overflow-y-auto p-3" containerClassName="flex-1 min-h-0">
        <div className="flex flex-col gap-1.5">
          {/* Reorderable ImageLayers */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={imageLayers.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {imageLayers.map((layer) => (
                <SortableLayerRow
                  key={layer.id}
                  layer={layer}
                  asset={assetMap.get(layer.assetId)}
                  isSelected={activeLayerId === layer.id}
                  onSelect={() => setActiveLayerId(layer.id)}
                  onToggleVisibility={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: layer.visible === false ? true : false });
                  }}
                  onRemove={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Locked Background Layer at Bottom */}
          {baseBackground && (
            <BackgroundRow
              layer={baseBackground}
              isSelected={activeLayerId === baseBackground.id}
              onSelect={() => setActiveLayerId(baseBackground.id)}
              onToggleVisibility={(e) => {
                e.stopPropagation();
                updateLayer(baseBackground.id, {
                  visible: baseBackground.visible === false ? true : false,
                });
              }}
            />
          )}
        </div>
      </ScrollFade>
    </div>
  );
}
