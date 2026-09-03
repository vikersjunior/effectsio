import * as React from "react";
import {
  PlusIcon,
  MinusIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ArrowCounterClockwiseIcon,
  DotsSixVerticalIcon,
  DownloadSimpleIcon,
  XIcon,
  SlidersIcon,
  PlayIcon,
  SparkleIcon,
  CheckIcon,
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
  SelectControl,
  ColorControl,
  BooleanControl,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { getEffectDefinition } from "../../effects/registry";
import { EffectBrowserModal } from "../effects/effect-browser-modal";
import { LooksBrowser } from "../looks/looks-browser";
import { BackgroundControls } from "../background/background-controls";
import { ExportModal } from "../export/export-modal";
import type { EffectInstance } from "../../types/asset";
import type { BackgroundType } from "../../types/look";

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
      className={`group relative flex items-center justify-between h-8 px-2 py-1 rounded-lg gap-2 text-xs cursor-pointer transition-colors duration-100 select-none ${
        isSelected
          ? "bg-[color:var(--secondary)] border border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] text-[color:var(--foreground)]"
          : "hover:bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:var(--muted-foreground)]"
      } ${!instance.enabled ? "opacity-50" : ""}`}
    >
      {/* Drag handle & Effect Name */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder effect"
          className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] p-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVerticalIcon size={14} />
        </button>
        <span className="font-medium truncate text-xs text-[color:var(--foreground)]">
          {def?.name || instance.effectId}
        </span>
      </div>

      {/* Item Action Controls */}
      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onSelect}
          title="Toggle effect parameters"
          aria-label="Toggle effect parameters"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <SlidersIcon size={12} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onToggleEnabled}
          title={instance.enabled ? "Disable effect" : "Enable effect"}
          aria-label={instance.enabled ? "Disable effect" : "Enable effect"}
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          {instance.enabled ? <EyeIcon size={12} /> : <EyeSlashIcon size={12} />}
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onRemove}
          title="Remove effect"
          aria-label="Remove effect"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]"
        >
          <TrashIcon size={12} />
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
  } = useStudioStore();

  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isAccountPopoverOpen, setIsAccountPopoverOpen] = React.useState(false);
  const [isLooksPopoverOpen, setIsLooksPopoverOpen] = React.useState(false);
  const [isBgPopoverOpen, setIsBgPopoverOpen] = React.useState(false);

  const selectedEffectDef = React.useMemo(() => {
    if (!selectedInstance) return null;
    return getEffectDefinition(selectedInstance.effectId);
  }, [selectedInstance]);

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

  return (
    <PanelSurface
      id="inspector-panel"
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
            className="w-56 p-2 flex flex-col gap-1 shadow-xl bg-[color:var(--card)] border border-[color:var(--border)]"
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
              className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            >
              <XIcon size={14} />
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
      {!activeAsset ? (
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
            {/* Section 1: Effects */}
            <div className="flex flex-col border-b border-[color:var(--border)]">
              <div className="flex items-center justify-between px-4 h-11 min-h-11 shrink-0">
                <span className="text-sm font-medium text-[color:var(--foreground)]">Effects</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setIsEffectBrowserOpen(true)}
                  aria-label="Add effect"
                  title="Add effect"
                  className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
                >
                  <PlusIcon size={14} />
                </Button>
              </div>

              {activeEffectStack.length > 0 && (
                <div className="flex flex-col gap-1 px-4 pb-2.5">
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
                          <div key={instance.instanceId} className="flex flex-col">
                            <SortableEffectRow
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

                            {/* Disclosed Parameters Drawer */}
                            {isSelected && selectedEffectDef && (
                              <div className="mt-1 mb-2 px-3 py-2.5 rounded-lg bg-[color:var(--secondary)] border border-[color:var(--border)] flex flex-col gap-3">
                                <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                                  <span>{selectedEffectDef.name} Parameters</span>
                                  <Button
                                    variant="ghost"
                                    size="icon-xxs"
                                    onClick={() =>
                                      activeImageId &&
                                      resetInstanceParameters(
                                        activeImageId,
                                        instance.instanceId
                                      )
                                    }
                                    title="Reset parameters"
                                    aria-label="Reset parameters"
                                  >
                                    <ArrowCounterClockwiseIcon size={12} />
                                  </Button>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                  {selectedEffectDef.parameters.map((schema) => {
                                    const paramName = schema.name;
                                    const currentValue =
                                      instance.parameters[paramName] !== undefined
                                        ? instance.parameters[paramName]
                                        : schema.defaultValue;

                                    switch (schema.type) {
                                      case "number":
                                        return (
                                          <SliderControl
                                            key={paramName}
                                            name={paramName}
                                            value={Number(currentValue)}
                                            min={schema.min ?? 0}
                                            max={schema.max ?? 100}
                                            step={schema.step ?? 1}
                                            onValueChange={(val: number) => {
                                              if (activeImageId) {
                                                updateInstanceParameters(
                                                  activeImageId,
                                                  instance.instanceId,
                                                  { [paramName]: val }
                                                );
                                              }
                                            }}
                                          />
                                        );

                                      case "select":
                                        return (
                                          <SelectControl
                                            key={paramName}
                                            name={paramName}
                                            value={String(currentValue)}
                                            options={(schema.options ?? []).map((opt) => ({
                                              label: opt.label,
                                              value: String(opt.value),
                                            }))}
                                            onValueChange={(val: string) => {
                                              if (activeImageId) {
                                                updateInstanceParameters(
                                                  activeImageId,
                                                  instance.instanceId,
                                                  { [paramName]: val }
                                                );
                                              }
                                            }}
                                          />
                                        );

                                      case "color":
                                        return (
                                          <ColorControl
                                            key={paramName}
                                            name={paramName}
                                            value={String(currentValue)}
                                            onValueChange={(val) => {
                                              if (activeImageId) {
                                                updateInstanceParameters(
                                                  activeImageId,
                                                  instance.instanceId,
                                                  {
                                                    [paramName]:
                                                      typeof val === "string" ? val : val?.hex,
                                                  }
                                                );
                                              }
                                            }}
                                          />
                                        );

                                      case "boolean":
                                        return (
                                          <BooleanControl
                                            key={paramName}
                                            name={paramName}
                                            value={Boolean(currentValue)}
                                            onValueChange={(val: boolean) => {
                                              if (activeImageId) {
                                                updateInstanceParameters(
                                                  activeImageId,
                                                  instance.instanceId,
                                                  { [paramName]: val }
                                                );
                                              }
                                            }}
                                          />
                                        );

                                      default:
                                        return null;
                                    }
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                </div>
              )}
            </div>

            {/* Section 2: Looks */}
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
                    className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
                  >
                    <MinusIcon size={14} />
                  </Button>
                ) : (
                  <Popover open={isLooksPopoverOpen} onOpenChange={setIsLooksPopoverOpen}>
                    <PopoverTrigger
                      type="button"
                      aria-label="Open looks browser"
                      title="Open looks browser"
                      className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                    >
                      <PlusIcon size={14} />
                    </PopoverTrigger>
                    <PopoverContent
                      side="left"
                      align="start"
                      sideOffset={8}
                      className="w-80 p-0 max-h-[420px] overflow-hidden flex flex-col shadow-xl bg-[color:var(--card)] border border-[color:var(--border)]"
                    >
                      <LooksBrowser onSelectLook={() => setIsLooksPopoverOpen(false)} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {appliedLook && (
                <div className="px-4 pb-3 flex items-center gap-2 text-xs font-medium text-[color:var(--foreground)]">
                  <SparkleIcon size={14} className="text-[color:var(--primary)] shrink-0" />
                  <span className="truncate">{appliedLook.name}</span>
                </div>
              )}
            </div>

            {/* Section 3: Background */}
            <div className="flex flex-col border-b border-[color:var(--border)]">
              <div className="flex items-center justify-between px-4 h-11 min-h-11 shrink-0">
                <span className="text-sm font-medium text-[color:var(--foreground)]">Background</span>
                {activeBackground && activeBackground.type !== "transparent" ? (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={resetActiveBackground}
                    aria-label="Remove background"
                    title="Remove background"
                    className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                  >
                    <MinusIcon size={14} />
                  </Button>
                ) : (
                  <Popover open={isBgPopoverOpen} onOpenChange={setIsBgPopoverOpen}>
                    <PopoverTrigger
                      type="button"
                      aria-label="Add background"
                      title="Add background"
                      className="size-6 flex items-center justify-center rounded-md hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
                    >
                      <PlusIcon size={14} />
                    </PopoverTrigger>
                    <PopoverContent
                      side="left"
                      align="start"
                      sideOffset={8}
                      className="w-52 p-1.5 flex flex-col gap-0.5 shadow-xl bg-[color:var(--card)] border border-[color:var(--border)]"
                    >
                      <div className="px-2 py-1 text-2xs font-semibold uppercase tracking-wider text-[color:var(--muted-foreground)]">
                        Choose Background
                      </div>
                      {[
                        { type: "solid", label: "Solid Color" },
                        { type: "linear-gradient", label: "Linear Gradient" },
                        { type: "radial-gradient", label: "Radial Gradient" },
                        { type: "dots", label: "Dots Pattern" },
                        { type: "grid", label: "Grid Pattern" },
                      ].map((bgOption) => (
                        <button
                          key={bgOption.type}
                          type="button"
                          onClick={() => {
                            updateActiveBackground({
                              type: bgOption.type as BackgroundType,
                              padding: activeBackground.padding ?? 32,
                            });
                            setIsBgPopoverOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-[color:var(--secondary)] text-[color:var(--foreground)] transition-colors"
                        >
                          {bgOption.label}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {activeBackground && activeBackground.type !== "transparent" && (
                <div className="px-4 pb-3">
                  <BackgroundControls />
                </div>
              )}
            </div>
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
