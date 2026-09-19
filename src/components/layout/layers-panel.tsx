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
  FolderSimpleIcon,
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
import {
  isGroup,
  isLayer,
  flattenItemsToLayers,
  type Layer,
  type ProceduralSource,
} from "../../types/frame";
import type { Asset } from "../../types/asset";
import { DEFAULT_BACKGROUND_STATE } from "../../types/look";
import { GroupRow } from "./group-row";

interface SortableLayerRowProps {
  layer: Layer;
  asset?: Asset;
  isSelected: boolean;
  onSelect: (e?: React.MouseEvent) => void;
  onToggleVisibility: (e: React.MouseEvent) => void;
  onRemove?: (e: React.MouseEvent) => void;
  isLocked?: boolean;
}

function SortableLayerRow({
  layer,
  asset,
  isSelected,
  onSelect,
  onToggleVisibility,
  onRemove,
  isLocked: isLockedProp,
}: SortableLayerRowProps): React.JSX.Element {
  const isLocked = isLockedProp ?? Boolean(layer.locked);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id, disabled: isLocked });

  const isVisible = layer.visible !== false;
  const isProcedural = layer.source?.type === "procedural";
  const procSource = isProcedural ? (layer.source as ProceduralSource) : undefined;

  const bgConfig = procSource
    ? {
        type: (procSource.kind as any) || "solid",
        color: (procSource.parameters?.color as string) || "#000000",
        gradientEndColor:
          (procSource.parameters?.gradientEndColor as string) ||
          (procSource.parameters?.endColor as string) ||
          "#E20000",
        gradientAngle:
          (procSource.parameters?.gradientAngle as number) ||
          (procSource.parameters?.angle as number) ||
          90,
      }
    : DEFAULT_BACKGROUND_STATE;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : !isVisible ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-slot={isLocked ? "layer-row-background" : "layer-row"}
      data-testid={isLocked ? "locked-background-row" : "layer-row"}
      data-layer-id={layer.id}
      onClick={(e) => onSelect(e)}
      className={cn(
        "group relative flex items-center gap-2 px-2.5 h-10 rounded-md border transition-colors cursor-pointer select-none",
        isSelected
          ? "border-[color:var(--primary)] bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] ring-1 ring-[color:var(--primary)]"
          : "border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] bg-[color:var(--card)] hover:border-[color:color-mix(in_oklab,var(--border)_80%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_3%,var(--card))]"
      )}
    >
      {/* 1. Drag Handle vs Locked Indicator */}
      {isLocked ? (
        <div
          className="p-0.5 text-[color:var(--muted-foreground)] shrink-0 opacity-60 flex items-center justify-center"
          title="Layer is locked at base"
        >
          <LockSimpleIcon size={ICON_SIZES.sm} />
        </div>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${layer.name}`}
          className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 rounded-xs shrink-0 touch-none outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--ring)]"
        >
          <DotsSixVerticalIcon size={ICON_SIZES.md} />
        </button>
      )}

      {/* 2. Thumbnail / Swatch */}
      <div className="size-6 rounded-xs bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden shrink-0 border border-[color:color-mix(in_oklab,var(--border)_50%,transparent)] flex items-center justify-center">
        {isProcedural ? (
          bgConfig.type === "solid" ? (
            <div
              className="size-full"
              style={{ backgroundColor: bgConfig.color || "#000000" }}
            />
          ) : bgConfig.type === "linear-gradient" || bgConfig.type === "radial-gradient" ? (
            <div
              className="size-full"
              style={{
                background:
                  bgConfig.type === "radial-gradient"
                    ? `radial-gradient(circle, ${bgConfig.color || "#000000"}, ${bgConfig.gradientEndColor || "#E20000"})`
                    : `linear-gradient(${bgConfig.gradientAngle ?? 90}deg, ${bgConfig.color || "#000000"}, ${bgConfig.gradientEndColor || "#E20000"})`,
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
          )
        ) : asset?.thumbnailUrl ? (
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
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className="text-xs font-medium text-[color:var(--foreground)] truncate">
          {layer.name || (isProcedural ? "Background" : "Layer")}
        </span>
      </div>

      {/* 4. Action Buttons (Remove on hover if not locked, Visibility toggle) */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {!isLocked && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            title="Remove layer"
            aria-label={`Remove ${layer.name}`}
            className="opacity-0 group-hover:opacity-100 text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)] transition-opacity"
          >
            <TrashIcon size={ICON_SIZES.sm} />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onToggleVisibility}
          title={isVisible ? "Hide layer" : "Show layer"}
          aria-label={isVisible ? `Hide ${layer.name}` : `Show ${layer.name}`}
          className={cn(
            "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-opacity",
            !isVisible ? "opacity-100 text-[color:var(--muted-foreground)]" : "opacity-0 group-hover:opacity-100"
          )}
        >
          {isVisible ? (
            <EyeIcon size={ICON_SIZES.sm} />
          ) : (
            <EyeSlashIcon size={ICON_SIZES.sm} />
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
    selectedLayerIds,
    toggleLayerSelection,
    selectLayers,
    createGroup,
    ungroup,
    deleteGroup,
    renameGroup,
    toggleGroupVisibility,
    toggleGroupLock,
    toggleGroupCollapse,
    moveRootItem,
    reorderGroupChild,
    moveLayerToGroup,
    ejectLayerFromGroup,
    updateLayer,
    removeLayer,
    addLayerFromAsset,
    addProceduralLayer,
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

  const items = activeFrame?.items || [];
  const allLayers = React.useMemo(() => {
    return activeFrame ? flattenItemsToLayers(activeFrame.items) : [];
  }, [activeFrame]);

  // Visual stack: items displayed top-to-bottom (reverse of bottom-to-top data storage)
  const visualItems = React.useMemo(() => {
    return [...items].reverse();
  }, [items]);

  const allSortableIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const item of visualItems) {
      ids.push(item.id);
      if (isGroup(item) && !item.collapsed) {
        for (const child of [...item.children].reverse()) {
          ids.push(child.id);
        }
      }
    }
    return ids;
  }, [visualItems]);

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

    const activeId = String(active.id);
    const overId = String(over.id);

    // 1. Check if both are root items
    const fromRootIndex = activeFrame.items.findIndex((i) => i.id === activeId);
    const toRootIndex = activeFrame.items.findIndex((i) => i.id === overId);

    if (fromRootIndex !== -1 && toRootIndex !== -1) {
      // Allow reordering to any index — backdrop is a normal layer
      moveRootItem(fromRootIndex, toRootIndex);
      return;
    }

    // 2. Check if both are within the same group
    for (const item of activeFrame.items) {
      if (isGroup(item)) {
        const fromChildIdx = item.children.findIndex((c) => c.id === activeId);
        const toChildIdx = item.children.findIndex((c) => c.id === overId);
        if (fromChildIdx !== -1 && toChildIdx !== -1) {
          reorderGroupChild(item.id, fromChildIdx, toChildIdx);
          return;
        }
      }
    }

    // 3. Move layer into group if dragged onto group header
    const targetGroup = activeFrame.items.find((i) => isGroup(i) && i.id === overId);
    if (targetGroup && isGroup(targetGroup)) {
      moveLayerToGroup(activeId, targetGroup.id);
      return;
    }

    // 4. Eject layer from group if dragged to root
    if (toRootIndex !== -1) {
      ejectLayerFromGroup(activeId, toRootIndex);
      return;
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
            ({allLayers.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Phase 5 Group Action Button when >= 2 layers selected */}
          {selectedLayerIds.size >= 2 && (
            <Button
              variant="secondary"
              size="xs"
              onClick={() => createGroup()}
              title="Group selected layers"
              aria-label="Group selected layers"
              className="h-6 px-2 text-2xs font-semibold gap-1"
            >
              <FolderSimpleIcon size={ICON_SIZES.xs} />
              <span>Group ({selectedLayerIds.size})</span>
            </Button>
          )}

          {/* Add Layer Popover */}
          <Popover open={isAddPopoverOpen} onOpenChange={setIsAddPopoverOpen}>
            <PopoverTrigger
              render={(triggerProps) => (
                <Button
                  {...triggerProps}
                  variant="ghost"
                  size="icon-sm"
                  title="Add layer"
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
                Add Procedural Layer
              </span>
              <div className="flex flex-col gap-0.5 pb-1 mb-1 border-b border-[color:var(--border)]">
                <button
                  type="button"
                  data-testid="add-procedural-solid-button"
                  onClick={() => {
                    addProceduralLayer("solid");
                    setIsAddPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                >
                  <SquareIcon size={ICON_SIZES.sm} className="text-[color:var(--foreground)]" />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Solid</span>
                </button>
                <button
                  type="button"
                  data-testid="add-procedural-linear-gradient-button"
                  onClick={() => {
                    addProceduralLayer("linear-gradient");
                    setIsAddPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                >
                  <CircleHalfIcon size={ICON_SIZES.sm} className="text-[color:var(--foreground)]" />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Linear Gradient</span>
                </button>
                <button
                  type="button"
                  data-testid="add-procedural-radial-gradient-button"
                  onClick={() => {
                    addProceduralLayer("radial-gradient");
                    setIsAddPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                >
                  <CircleHalfIcon size={ICON_SIZES.sm} className="text-[color:var(--foreground)]" />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Radial Gradient</span>
                </button>
                <button
                  type="button"
                  data-testid="add-procedural-dots-button"
                  onClick={() => {
                    addProceduralLayer("dots");
                    setIsAddPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                >
                  <DotsNineIcon size={ICON_SIZES.sm} className="text-[color:var(--foreground)]" />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Dots</span>
                </button>
                <button
                  type="button"
                  data-testid="add-procedural-grid-button"
                  onClick={() => {
                    addProceduralLayer("grid");
                    setIsAddPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left transition-colors cursor-pointer"
                >
                  <GridFourIcon size={ICON_SIZES.sm} className="text-[color:var(--foreground)]" />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">Grid</span>
                </button>
              </div>

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
      </div>

      {/* Layer Stack Body */}
      <ScrollFade className="flex-1 overflow-y-auto p-3" containerClassName="flex-1 min-h-0">
        <div className="flex flex-col gap-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={allSortableIds}
              strategy={verticalListSortingStrategy}
            >
              {visualItems.map((item) => {
                if (isGroup(item)) {
                  return (
                    <div key={item.id} className="flex flex-col gap-1.5">
                      <GroupRow
                        group={item}
                        isSelected={activeLayerId === item.id}
                        onSelect={() => {
                          selectLayers([]);
                          setActiveLayerId(item.id);
                        }}
                        onToggleCollapse={() => toggleGroupCollapse(item.id)}
                        onToggleVisibility={() => toggleGroupVisibility(item.id)}
                        onToggleLock={() => toggleGroupLock(item.id)}
                        onRename={(newName) => renameGroup(item.id, newName)}
                        onUngroup={() => ungroup(item.id)}
                        onDelete={() => deleteGroup(item.id)}
                      />

                      {/* Single-tier left indentation (pl-4 / 16px) for child layers */}
                      {!item.collapsed && item.children.length > 0 && (
                        <div className="flex flex-col gap-1.5 pl-4">
                          {[...item.children].reverse().map((child) => {
                            const assetId =
                              child.source?.type === "image" ? child.source.assetId : child.assetId;
                            const isChildSelected =
                              activeLayerId === child.id || selectedLayerIds.has(child.id);

                            return (
                              <SortableLayerRow
                                key={child.id}
                                layer={child}
                                asset={assetId ? assetMap.get(assetId) : undefined}
                                isSelected={isChildSelected}
                                isLocked={Boolean(child.locked || item.locked)}
                                onSelect={(e) => {
                                  if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
                                    toggleLayerSelection(child.id);
                                    setActiveLayerId(child.id);
                                  } else {
                                    selectLayers([child.id]);
                                    setActiveLayerId(child.id);
                                  }
                                }}
                                onToggleVisibility={(e) => {
                                  e.stopPropagation();
                                  updateLayer(child.id, {
                                    visible: child.visible === false ? true : false,
                                  });
                                }}
                                onRemove={(e) => {
                                  e.stopPropagation();
                                  removeLayer(child.id);
                                }}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // Root Layer item
                const assetId =
                  item.source?.type === "image" ? item.source.assetId : item.assetId;
                const isSelected =
                  activeLayerId === item.id || selectedLayerIds.has(item.id);

                return (
                  <SortableLayerRow
                    key={item.id}
                    layer={item}
                    asset={assetId ? assetMap.get(assetId) : undefined}
                    isSelected={isSelected}
                    isLocked={Boolean(item.locked)}
                    onSelect={(e) => {
                      if (e?.shiftKey || e?.metaKey || e?.ctrlKey) {
                        toggleLayerSelection(item.id);
                        setActiveLayerId(item.id);
                      } else {
                        selectLayers([item.id]);
                        setActiveLayerId(item.id);
                      }
                    }}
                    onToggleVisibility={(e) => {
                      e.stopPropagation();
                      updateLayer(item.id, {
                        visible: item.visible === false ? true : false,
                      });
                    }}
                    onRemove={
                      item.locked
                        ? undefined
                        : (e) => {
                            e.stopPropagation();
                            removeLayer(item.id);
                          }
                    }
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      </ScrollFade>
    </div>
  );
}
