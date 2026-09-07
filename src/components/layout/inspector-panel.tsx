import * as React from "react";
import {
  PlusIcon,
  MinusIcon,
  EyeIcon,
  EyeSlashIcon,
  DotsSixVerticalIcon,
  DownloadSimpleIcon,
  XIcon,
  DropSimpleIcon,
  PlayIcon,
  SparkleIcon,
  CheckIcon,
  CircleIcon,
  CircleHalfIcon,
  DotsNineIcon,
  GridFourIcon,
  GradientIcon,
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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Button,
  PanelSurface,
  Separator,
  ScrollFade,
  Popover,
  PopoverTrigger,
  PopoverContent,
  SliderControl,
  StaticSelect,
  SegmentedControl,
  Input,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { getEffectDefinition } from "../../effects/registry";
import { EffectBrowserModal } from "../effects/effect-browser-modal";
import { LooksBrowser } from "../looks/looks-browser";
import { ExportModal } from "../export/export-modal";
import type { EffectInstance } from "../../types/asset";
import type { BackgroundType } from "../../types/look";
import { SortableBackgroundRow } from "./sortable-background-row";
import {
  BLEND_MODE_OPTIONS,
  DEFAULT_LAYER_TRANSFORM,
  type BlendMode,
  type ImageLayer,
  type GenerativeLayer,
} from "../../types/frame";

const FIT_OPTIONS = [
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
] as const;

interface SortableEffectRowProps {
  instance: EffectInstance;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
}

function SortableEffectRow({
  instance,
  isSelected,
  onSelect,
  onToggleEnabled,
  onRemove,
}: SortableEffectRowProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.instanceId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const def = getEffectDefinition(instance.effectId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group relative flex items-center justify-between p-2 rounded-lg gap-2 text-xs cursor-pointer transition-colors duration-100 select-none ${
        isSelected
          ? "bg-[color:var(--secondary)] border border-[color:var(--border)] text-[color:var(--foreground)]"
          : "hover:bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:var(--muted-foreground)]"
      } ${!instance.enabled ? "opacity-50" : ""}`}
    >
      {/* Drag handle & Effect Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder effect"
          className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVerticalIcon size={16} />
        </button>
        <span className="font-medium truncate text-xs text-[color:var(--foreground)]">
          {def?.name || instance.effectId}
        </span>
      </div>

      {/* Item Action Controls */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Blending Mode Button (Phosphor DropSimpleIcon) */}
        <Button
          variant="ghost"
          size="icon-xs"
          title="Blending mode"
          aria-label="Blending mode"
          className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 [&_svg]:!size-4 cursor-pointer"
        >
          <DropSimpleIcon size={16} />
        </Button>
        {/* Visibility Toggle Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onToggleEnabled}
          title={instance.enabled ? "Disable effect" : "Enable effect"}
          aria-label={instance.enabled ? "Disable effect" : "Enable effect"}
          className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 [&_svg]:!size-4 cursor-pointer"
        >
          {instance.enabled ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
        </Button>
        {/* Remove Effect Button */}
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onRemove}
          title="Remove effect"
          aria-label="Remove effect"
          className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)] hover:bg-[color:color-mix(in_oklab,var(--destructive)_10%,transparent)] transition-colors [&_svg]:!size-4 cursor-pointer"
        >
          <MinusIcon size={16} />
        </Button>
      </div>
    </div>
  );
}

export interface InspectorPanelProps {
  onClose?: () => void;
}

export function InspectorPanel({ onClose }: InspectorPanelProps): React.JSX.Element {
  const {
    activeAsset,
    activeImageId,
    activeEffectStack,
    activeBackground,
    hasActiveBackground,
    activeBackgrounds,
    selectedBackgroundId,
    setSelectedBackgroundId,
    addBackgroundItem,
    removeBackgroundItem,
    reorderBackgroundItems,
    updateBackgroundItem,
    isBackgroundPanelOpen,
    setIsBackgroundPanelOpen,
    updateActiveBackground,
    resetActiveBackground,
    selectedInstanceId,
    selectedInstance,
    addEffectToStack,
    updateInstanceParameters,
    resetInstanceParameters,
    toggleInstanceEnabled,
    removeInstanceFromStack,
    reorderEffectStack,
    selectInstance,
    timeline,
    setTimelineLoop,
    setTimelineSpeed,
    editorMode,
    setEditorMode,
    isEffectBrowserOpen,
    setIsEffectBrowserOpen,
    theme,
    setTheme,
    appliedLook,
    clearAppliedLook,
    activeFrame,
    activeLayerId,
    activeLayer,
    updateLayer,
  } = useStudioStore();

  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isAccountPopoverOpen, setIsAccountPopoverOpen] = React.useState(false);
  const [isLooksPopoverOpen, setIsLooksPopoverOpen] = React.useState(false);
  const [isLookVisible, setIsLookVisible] = React.useState(true);
  const [isAddBackgroundPopoverOpen, setIsAddBackgroundPopoverOpen] = React.useState(false);

  React.useEffect(() => {
    setIsLookVisible(true);
  }, [appliedLook?.id]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!activeImageId || !over || active.id === over.id) return;

    const oldIndex = activeEffectStack.findIndex((i) => i.instanceId === active.id);
    const newIndex = activeEffectStack.findIndex((i) => i.instanceId === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderEffectStack(activeImageId, oldIndex, newIndex);
    }
  };

  const handleBackgroundDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeBackgrounds.findIndex((b) => b.id === active.id);
    const newIndex = activeBackgrounds.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      reorderBackgroundItems(oldIndex, newIndex);
    }
  };

  const isImageLayerActive = activeLayer?.type === "image" || Boolean(activeAsset);
  const isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative";
  const isPopulated = isImageLayerActive || isGenerativeLayerExplicitlyActive;

  return (
    <PanelSurface
      id="inspector-panel"
      data-testid="inspector-panel"
      className="flex flex-col h-full w-full bg-[color:var(--sidebar)] border-l border-[color:var(--border)] overflow-hidden select-none"
    >
      {/* 1. Header (56px standard height matching Figma 10:920 & 61:1306) */}
      <div className="h-14 min-h-14 px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between shrink-0 bg-[color:var(--sidebar)]">
        {/* Account Avatar with Popover */}
        <Popover open={isAccountPopoverOpen} onOpenChange={setIsAccountPopoverOpen}>
          <PopoverTrigger
            type="button"
            aria-label="Account and appearance settings"
            title="Account and appearance settings"
            className="size-8 rounded-full bg-[color:var(--secondary)] border border-[color:var(--border)] flex items-center justify-center text-xs font-semibold text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--secondary)_80%,transparent)] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
          >
            JD
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            sideOffset={8}
            className="w-56 p-2 flex flex-col gap-1 dark:shadow-xl shadow-none bg-[color:var(--card)] border border-[color:var(--border)]"
          >
            <div className="px-2 py-1.5 flex flex-col">
              <span className="text-xs font-semibold text-[color:var(--foreground)]">John Doe</span>
              <span className="text-2xs text-[color:var(--muted-foreground)]">john@example.com</span>
            </div>
            <Separator className="my-1 border-[color:var(--border)]" />
            <button
              type="button"
              onClick={() => setIsAccountPopoverOpen(false)}
              className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-[color:var(--secondary)] text-[color:var(--foreground)] transition-colors"
            >
              Account Settings
            </button>
            <button
              type="button"
              onClick={() => setIsAccountPopoverOpen(false)}
              className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-[color:var(--secondary)] text-[color:var(--foreground)] transition-colors"
            >
              Saved Projects
            </button>
            <Separator className="my-1 border-[color:var(--border)]" />
            <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
              Appearance
            </div>
            <div className="flex flex-col gap-0.5">
              {(["system", "light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTheme(t);
                  }}
                  className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-md transition-colors ${
                    theme === t
                      ? "bg-[color:var(--secondary)] text-[color:var(--foreground)] font-medium"
                      : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)]"
                  }`}
                >
                  <span className="capitalize">{t}</span>
                  {theme === t && <CheckIcon size={13} className="text-[color:var(--primary)]" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Action */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsExportModalOpen(true)}
            title="Export composition or batch library"
            className="gap-1.5 px-3 h-7 text-xs font-medium rounded-md shadow-xs"
          >
            <DownloadSimpleIcon size={14} className="shrink-0" />
            <span>Export</span>
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close inspector panel"
              className="size-6 rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] [&_svg]:!size-4"
            >
              <XIcon size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* 2. Design / Animate Mode Bar (Matching Assets, Effects, Looks, Background height h-11) */}
      <div className="h-11 min-h-11 px-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0 bg-[color:var(--sidebar)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditorMode("design")}
            className={`px-2.5 py-1 text-sm font-medium rounded-[4px] transition-colors ${
              editorMode === "design"
                ? "bg-[color:var(--secondary)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Design
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("animate")}
            className={`px-2.5 py-1 text-sm font-medium rounded-[4px] transition-colors ${
              editorMode === "animate"
                ? "bg-[color:var(--secondary)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Animate
          </button>
        </div>
      </div>

      {/* 3. Panel Body: Empty State vs Animate vs Populated Stack */}
      {!isPopulated ? (
        /* Empty Inspector State (Figma node 10:920): Header -> Design/Animate -> Empty remaining space */
        <div className="flex-1 min-h-0" data-testid="empty-inspector-space" />
      ) : editorMode === "animate" ? (
        /* Animate Mode Inspector */
        <ScrollFade className="flex-1 overflow-y-auto p-4" containerClassName="flex-1 min-h-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
              <PlayIcon size={14} className="text-[color:var(--primary)]" />
              <span>Animation Timeline</span>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs text-[color:var(--muted-foreground)]">Duration</span>
                <span className="font-mono text-2xs text-[color:var(--foreground)]">
                  {timeline.duration}s
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-2xs text-[color:var(--muted-foreground)]">Loop</span>
                <Button
                  variant={timeline.loop ? "secondary" : "ghost"}
                  size="xs"
                  onClick={() => setTimelineLoop(!timeline.loop)}
                >
                  {timeline.loop ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-2xs text-[color:var(--muted-foreground)]">Playback Speed</span>
                <div className="flex items-center gap-1">
                  {[0.5, 1, 2].map((spd) => (
                    <Button
                      key={spd}
                      variant={timeline.speed === spd ? "secondary" : "ghost"}
                      size="xs"
                      onClick={() => setTimelineSpeed(spd)}
                      className="text-3xs px-2"
                    >
                      {spd}x
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollFade>
      ) : (
        /* Populated Design Mode Inspector (Figma node 61:1306): Stacked Sections */
        <ScrollFade className="flex-1 overflow-y-auto" containerClassName="flex-1 min-h-0">
          <div className="flex flex-col">
            {/* Section 0: Layer Properties (Stage 1C - Opacity, Blend Mode, Fit) */}
            {(activeLayer?.type === "image" || activeLayer?.type === "generative") && (
              <div className="flex flex-col border-b border-[color:var(--border)] p-4 gap-3">
                <span className="text-sm font-medium text-[color:var(--foreground)]">
                  Layer Properties
                </span>

                {/* Opacity */}
                <SliderControl
                  name="Opacity"
                  min={0}
                  max={100}
                  step={1}
                  unit="%"
                  value={Math.round((activeLayer.opacity ?? 1) * 100)}
                  onValueChange={(val) => {
                    updateLayer(activeLayer.id, { opacity: val / 100 });
                  }}
                />

                {/* Blend Mode */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-2xs text-[color:var(--muted-foreground)]">Blend Mode</span>
                  <StaticSelect
                    size="sm"
                    value={activeLayer.blendMode || "normal"}
                    options={BLEND_MODE_OPTIONS}
                    onValueChange={(val) => {
                      updateLayer(activeLayer.id, { blendMode: val as BlendMode });
                    }}
                  />
                </div>

                {/* Fit (Image layers only) */}
                {activeLayer.type === "image" && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-2xs text-[color:var(--muted-foreground)]">Fit</span>
                    <SegmentedControl
                      name="Fit"
                      showLabel={false}
                      value={(activeLayer as ImageLayer).fit || "contain"}
                      options={FIT_OPTIONS}
                      onValueChange={(val) => {
                        updateLayer(activeLayer.id, { fit: val as "contain" | "cover" });
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section 0B: Transform (Stage 2 - Position, Scale, Rotation, Reset) */}
            {activeLayer?.type === "image" && (() => {
              const transform = (activeLayer as ImageLayer).transform ?? DEFAULT_LAYER_TRANSFORM;
              return (
                <div className="flex flex-col border-b border-[color:var(--border)] p-4 gap-3">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">
                    Transform
                  </span>

                  {/* Position */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-2xs text-[color:var(--muted-foreground)]">Position</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[color:var(--muted-foreground)] w-3 shrink-0">X</span>
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type="number"
                            size="sm"
                            value={Math.round(transform.x)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateLayer(activeLayer.id, {
                                transform: {
                                  ...transform,
                                  x: isNaN(val) ? 0 : val,
                                },
                              });
                            }}
                            className="pr-6 text-right font-mono"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-[color:var(--muted-foreground)] pointer-events-none">
                            px
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-[color:var(--muted-foreground)] w-3 shrink-0">Y</span>
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type="number"
                            size="sm"
                            value={Math.round(transform.y)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateLayer(activeLayer.id, {
                                transform: {
                                  ...transform,
                                  y: isNaN(val) ? 0 : val,
                                },
                              });
                            }}
                            className="pr-6 text-right font-mono"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-2xs text-[color:var(--muted-foreground)] pointer-events-none">
                            px
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scale */}
                  <SliderControl
                    name="Scale"
                    min={5}
                    max={500}
                    inputMax={2000}
                    step={1}
                    unit="%"
                    value={Math.round(transform.scaleX * 100)}
                    onValueChange={(val) => {
                      const nextScale = val / 100;
                      updateLayer(activeLayer.id, {
                        transform: {
                          ...transform,
                          scaleX: nextScale,
                          scaleY: nextScale,
                        },
                      });
                    }}
                  />

                  {/* Rotation */}
                  <SliderControl
                    name="Rotation"
                    min={-180}
                    max={180}
                    step={1}
                    unit="°"
                    value={Math.round(transform.rotation)}
                    onValueChange={(val) => {
                      updateLayer(activeLayer.id, {
                        transform: {
                          ...transform,
                          rotation: val,
                        },
                      });
                    }}
                  />

                  {/* Reset Transform */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-1 text-xs"
                    onClick={() => {
                      updateLayer(activeLayer.id, {
                        transform: { ...DEFAULT_LAYER_TRANSFORM },
                      });
                    }}
                  >
                    Reset Transform
                  </Button>
                </div>
              );
            })()}

            {/* Section 1: Effects (shown for image layers) */}
            {!isGenerativeLayerExplicitlyActive && (
              <div className="flex flex-col border-b border-[color:var(--border)]">
                <div className="flex items-center justify-between px-4 h-11 min-h-11 shrink-0">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">Effects</span>
                  <button
                    type="button"
                    onClick={() => setIsEffectBrowserOpen(true)}
                    aria-label="Add effect"
                    title="Add effect"
                    className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] cursor-pointer [&_svg]:!size-4"
                  >
                    <PlusIcon size={16} />
                  </button>
                </div>

                {activeEffectStack.length > 0 && (
                  <div className="flex flex-col gap-1 px-2 pb-2.5">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={activeEffectStack.map((i) => i.instanceId)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activeEffectStack.map((instance, index) => {
                          const isSelected = selectedInstanceId === instance.instanceId;
                          return (
                            <SortableEffectRow
                              key={instance.instanceId}
                              instance={instance}
                              index={index}
                              isSelected={isSelected}
                              onSelect={() =>
                                activeImageId &&
                                selectInstance(
                                  activeImageId,
                                  isSelected ? null : instance.instanceId
                                )
                              }
                              onToggleEnabled={() =>
                                activeImageId &&
                                toggleInstanceEnabled(activeImageId, instance.instanceId)
                              }
                              onRemove={() =>
                                activeImageId &&
                                removeInstanceFromStack(activeImageId, instance.instanceId)
                              }
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}

            {/* Section 2: Looks */}
            {!isGenerativeLayerExplicitlyActive && (
              <div className="flex flex-col border-b border-[color:var(--border)]">
                <div className="flex items-center justify-between px-4 h-11 min-h-11 shrink-0">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">Looks</span>
                  {appliedLook ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={clearAppliedLook}
                      aria-label="Remove applied look"
                      title="Remove applied look"
                      className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors [&_svg]:!size-4 cursor-pointer"
                    >
                      <MinusIcon size={16} />
                    </Button>
                  ) : (
                    <Popover open={isLooksPopoverOpen} onOpenChange={setIsLooksPopoverOpen}>
                      <PopoverTrigger
                        type="button"
                        aria-label="Open looks browser"
                        title="Open looks browser"
                        className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] cursor-pointer [&_svg]:!size-4"
                      >
                        <PlusIcon size={16} />
                      </PopoverTrigger>
                      <PopoverContent
                        side="left"
                        align="start"
                        sideOffset={8}
                        className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col dark:shadow-xl shadow-none bg-[color:var(--card)] border border-[color:var(--border)]"
                      >
                        <LooksBrowser onSelectLook={() => setIsLooksPopoverOpen(false)} />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {appliedLook && (
                  <div className="px-4 pb-2.5 flex items-center gap-1.5">
                    <Popover open={isLooksPopoverOpen} onOpenChange={setIsLooksPopoverOpen}>
                      <PopoverTrigger
                        data-slot="look-row"
                        data-testid="look-row"
                        className="group flex-1 min-w-0 flex items-center gap-2 px-2.5 h-8 rounded-[6px] border border-[color:var(--border)] bg-[color:var(--card)] hover:border-[color:color-mix(in_oklab,var(--foreground)_20%,transparent)] cursor-pointer transition-colors select-none text-left outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                      >
                        <div className="size-4 shrink-0 flex items-center justify-center text-[color:var(--foreground)] [&_svg]:!size-4">
                          <SparkleIcon size={16} />
                        </div>
                        <span className="text-xs font-medium text-[color:var(--foreground)] truncate">
                          {appliedLook.name}
                        </span>
                      </PopoverTrigger>
                      <PopoverContent
                        side="left"
                        align="start"
                        sideOffset={8}
                        className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col dark:shadow-xl shadow-none bg-[color:var(--card)] border border-[color:var(--border)]"
                      >
                        <LooksBrowser onSelectLook={() => setIsLooksPopoverOpen(false)} />
                      </PopoverContent>
                    </Popover>

                    {/* Eye control sits OUTSIDE the bordered Look control */}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => {
                        setIsLookVisible((prev) => {
                          const next = !prev;
                          if (activeImageId && appliedLook) {
                            activeEffectStack.forEach((inst) => {
                              if (inst.enabled !== next) {
                                toggleInstanceEnabled(activeImageId, inst.instanceId);
                              }
                            });
                          }
                          return next;
                        });
                      }}
                      title={isLookVisible ? "Hide look" : "Show look"}
                      aria-label={isLookVisible ? "Hide look" : "Show look"}
                      data-testid="look-eye-button"
                      className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] transition-colors [&_svg]:!size-4 cursor-pointer shrink-0"
                    >
                      {isLookVisible ? <EyeIcon size={16} /> : <EyeSlashIcon size={16} />}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Section 3: Background Stack (shown exclusively when Background Layer is selected) */}
            {isGenerativeLayerExplicitlyActive && (
              <div className="flex flex-col border-b border-[color:var(--border)]">
                <div
                  className="flex items-center justify-between px-4 h-11 min-h-11 shrink-0"
                  data-slot="background-section-header"
                  data-testid="background-section-header"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-[color:var(--foreground)]">Background</span>
                    {activeBackgrounds.length > 0 && (
                      <span className="text-xs text-[color:var(--muted-foreground)]">
                        ({activeBackgrounds.length})
                      </span>
                    )}
                  </div>
                  <Popover open={isAddBackgroundPopoverOpen} onOpenChange={setIsAddBackgroundPopoverOpen}>
                    <PopoverTrigger
                      render={(triggerProps) => (
                        <button
                          {...triggerProps}
                          type="button"
                          aria-label="Add background"
                          title="Add background"
                          data-testid="add-background-button"
                          className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] cursor-pointer [&_svg]:!size-4"
                        >
                          <PlusIcon size={16} />
                        </button>
                      )}
                    />
                    <PopoverContent
                      side="left"
                      align="start"
                      sideOffset={8}
                      className="w-48 p-1.5 flex flex-col gap-0.5 dark:shadow-xl shadow-none bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg"
                    >
                      <span className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        Add Background
                      </span>
                      <button
                        type="button"
                        data-testid="add-bg-solid"
                        onClick={() => {
                          addBackgroundItem("solid");
                          setIsBackgroundPanelOpen(true);
                          setIsAddBackgroundPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left text-xs font-medium text-[color:var(--foreground)] transition-colors cursor-pointer"
                      >
                        <div className="size-4 rounded-xs bg-[#E20000] shrink-0 border border-[color:color-mix(in_oklab,var(--border)_80%,transparent)]" />
                        Solid
                      </button>
                      <button
                        type="button"
                        data-testid="add-bg-linear-gradient"
                        onClick={() => {
                          addBackgroundItem("linear-gradient");
                          setIsBackgroundPanelOpen(true);
                          setIsAddBackgroundPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left text-xs font-medium text-[color:var(--foreground)] transition-colors cursor-pointer"
                      >
                        <div className="size-4 rounded-xs bg-gradient-to-r from-black to-blue-500 shrink-0 border border-[color:color-mix(in_oklab,var(--border)_80%,transparent)]" />
                        Linear Gradient
                      </button>
                      <button
                        type="button"
                        data-testid="add-bg-radial-gradient"
                        onClick={() => {
                          addBackgroundItem("radial-gradient");
                          setIsBackgroundPanelOpen(true);
                          setIsAddBackgroundPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left text-xs font-medium text-[color:var(--foreground)] transition-colors cursor-pointer"
                      >
                        <div className="size-4 rounded-xs bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-black to-blue-500 shrink-0 border border-[color:color-mix(in_oklab,var(--border)_80%,transparent)]" />
                        Radial Gradient
                      </button>
                      <button
                        type="button"
                        data-testid="add-bg-dots"
                        onClick={() => {
                          addBackgroundItem("dots");
                          setIsBackgroundPanelOpen(true);
                          setIsAddBackgroundPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left text-xs font-medium text-[color:var(--foreground)] transition-colors cursor-pointer"
                      >
                        <DotsNineIcon size={16} className="text-[color:var(--muted-foreground)] shrink-0" />
                        Dots
                      </button>
                      <button
                        type="button"
                        data-testid="add-bg-grid"
                        onClick={() => {
                          addBackgroundItem("grid");
                          setIsBackgroundPanelOpen(true);
                          setIsAddBackgroundPopoverOpen(false);
                        }}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[color:var(--secondary)] text-left text-xs font-medium text-[color:var(--foreground)] transition-colors cursor-pointer"
                      >
                        <GridFourIcon size={16} className="text-[color:var(--muted-foreground)] shrink-0" />
                        Grid
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>

                {activeBackgrounds.length === 0 ? (
                  <div className="px-4 py-3 text-center text-xs text-[color:var(--muted-foreground)] select-none">
                    No backgrounds
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 px-2 pb-2.5">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleBackgroundDragEnd}
                    >
                      <SortableContext
                        items={activeBackgrounds.map((b) => b.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activeBackgrounds.map((item, index) => {
                          const isSelected = selectedBackgroundId === item.id;
                          return (
                            <SortableBackgroundRow
                              key={item.id}
                              item={item}
                              index={index}
                              isSelected={isSelected}
                              onSelect={() => {
                                setSelectedBackgroundId(item.id);
                                setIsBackgroundPanelOpen(true);
                              }}
                              onToggleEnabled={() => {
                                updateBackgroundItem(item.id, { enabled: !item.enabled });
                              }}
                              onRemove={() => {
                                removeBackgroundItem(item.id);
                              }}
                            />
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollFade>
      )}

      {/* Global Modals: Export Modal & Effect Browser Modal */}
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <EffectBrowserModal
        isOpen={isEffectBrowserOpen}
        onClose={() => setIsEffectBrowserOpen(false)}
        onSelectEffect={(effectId) => {
          if (activeImageId) {
            addEffectToStack(activeImageId, effectId);
          }
        }}
      />
    </PanelSurface>
  );
}
