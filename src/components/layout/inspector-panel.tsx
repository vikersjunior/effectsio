import * as React from "react";
import {
  SparkleIcon,
  PlusIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  ArrowCounterClockwiseIcon,
  CaretUpIcon,
  CaretDownIcon,
  CopyIcon,
  StackIcon,
  PaletteIcon,
  InfoIcon,
  DotsSixVerticalIcon,
  DownloadSimpleIcon,
  XIcon,
  SlidersIcon,
  PlayIcon,
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  PanelSurface,
  PanelSection,
  SliderControl,
  SelectControl,
  ColorControl,
  BooleanControl,
  Separator,
  ScrollFade,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { getEffectDefinition } from "../../effects/registry";
import { formatFileSize } from "../../utils/image-ingestion";
import { EffectBrowserModal } from "../effects/effect-browser-modal";
import { LooksBrowser } from "../looks/looks-browser";
import { BackgroundControls } from "../background/background-controls";
import { ExportModal } from "../export/export-modal";
import type { EffectInstance } from "../../types/asset";

interface SortableEffectStackItemProps {
  instance: EffectInstance;
  index: number;
  isSelected: boolean;
  totalCount: number;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableEffectStackItem({
  instance,
  index,
  isSelected,
  totalCount,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onDuplicate,
  onRemove,
}: SortableEffectStackItemProps): React.JSX.Element {
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
      className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-all duration-100 select-none ${
        isSelected
          ? "bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] border-[color:var(--primary)] text-[color:var(--foreground)]"
          : "bg-[color:var(--card)] border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] text-[color:var(--foreground)]"
      } ${!instance.enabled ? "opacity-50" : ""}`}
    >
      {/* Drag handle & Effect Name */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] -ml-1 p-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <DotsSixVerticalIcon size={12} />
        </button>
        <span className="font-medium truncate text-2xs">
          {def?.name || instance.effectId}
        </span>
      </div>

      {/* Item Action Controls */}
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onMoveUp}
          disabled={index === 0}
          title="Move effect up"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <CaretUpIcon size={10} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onMoveDown}
          disabled={index === totalCount - 1}
          title="Move effect down"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <CaretDownIcon size={10} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onToggleEnabled}
          title={instance.enabled ? "Disable effect" : "Enable effect"}
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          {instance.enabled ? <EyeIcon size={11} /> : <EyeSlashIcon size={11} />}
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onDuplicate}
          title="Duplicate effect"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <CopyIcon size={10} />
        </Button>
        <Button
          variant="ghost"
          size="icon-xxs"
          onClick={onRemove}
          title="Remove effect"
          className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]"
        >
          <TrashIcon size={10} />
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
    selectedInstanceId,
    selectedInstance,
    addEffectToStack,
    updateInstanceParameters,
    resetInstanceParameters,
    toggleInstanceEnabled,
    removeInstanceFromStack,
    removeAllInstancesFromStack,
    reorderEffectStack,
    duplicateInstance,
    selectInstance,
    viewport,
    setViewport,
    zoomViewport,
    timeline,
    setTimelineDuration,
    setTimelineLoop,
    setTimelineSpeed,
  } = useStudioStore();

  const [editorMode, setEditorMode] = React.useState<"design" | "animate">("design");
  const [activeTab, setActiveTab] = React.useState("effects");
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [isPageSectionOpen, setIsPageSectionOpen] = React.useState(true);

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
    <PanelSurface id="inspector-panel" className="flex flex-col h-full w-full bg-[color:var(--sidebar)] border-l border-[color:var(--border)] overflow-hidden select-none @container/inspector">
      {/* Top Header Row: [ JD ] Avatar on Left, [ Export ] Button on Right */}
      <div className="h-12 min-h-12 px-3.5 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-full bg-[color:var(--secondary)] border border-[color:var(--border)] flex items-center justify-center text-[11px] font-semibold text-[color:var(--foreground)] tracking-tight cursor-default"
            title="User Profile: JD"
          >
            JD
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="primary"
            size="default"
            onClick={() => setIsExportModalOpen(true)}
            title="Export composition or batch library"
            className="gap-1 px-3 text-xs font-semibold shadow-xs"
          >
            <DownloadSimpleIcon size={14} />
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

      {/* Editor Mode Bar: [ Design ]  Animate           85% ˅ */}
      <div className="h-10 min-h-10 px-3.5 border-b border-[color:var(--border)] flex items-center justify-between shrink-0 bg-[color:var(--sidebar)]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditorMode("design")}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
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
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              editorMode === "animate"
                ? "bg-[color:var(--secondary)] text-[color:var(--foreground)]"
                : "text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
            }`}
          >
            Animate
          </button>
        </div>

        {/* Zoom display pill */}
        <div className="flex items-center gap-1 text-xs text-[color:var(--muted-foreground)] font-mono">
          <span>{Math.round(viewport.zoom)}%</span>
          <CaretDownIcon size={11} className="opacity-70" />
        </div>
      </div>

      {/* Empty State: Page / Canvas Configuration (when !activeAsset) */}
      {!activeAsset ? (
        <ScrollFade className="flex-1 overflow-y-auto p-4" containerClassName="flex-1 min-h-0">
          <div className="flex flex-col gap-4">
            {/* Page Section */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsPageSectionOpen((prev) => !prev)}
                className="flex items-center justify-between text-xs font-semibold text-[color:var(--foreground)] py-1"
              >
                <span>Page</span>
                {isPageSectionOpen ? <CaretUpIcon size={12} /> : <CaretDownIcon size={12} />}
              </button>

              {isPageSectionOpen && (
                <div className="flex flex-col gap-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-medium text-[color:var(--muted-foreground)]">
                      Color
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeBackground.color || "#030303"}
                        onChange={(e) =>
                          updateActiveBackground({ type: "solid", color: e.target.value })
                        }
                        className="size-6 rounded-md border border-[color:var(--border)] cursor-pointer bg-transparent p-0"
                        title="Canvas Background Color"
                      />
                      <span className="font-mono text-2xs text-[color:var(--foreground)] uppercase">
                        {activeBackground.color || "#030303"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollFade>
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
        /* Design Mode Inspector (Asset Selected) */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full gap-0">
          {/* Sub Navigation Tabs */}
          <div className="p-1.5 border-b border-[color:var(--border)] bg-[color:var(--sidebar)]">
            <TabsList className="w-full grid grid-cols-4 gap-0.5 p-0.5" variant="control">
              <TabsTrigger value="effects" className="flex items-center justify-center gap-1 text-[11px] px-1 py-1" title="Effect Stack">
                <SparkleIcon size={13} className="shrink-0" />
                <span className="hidden @[280px]/inspector:inline truncate">Effects</span>
              </TabsTrigger>
              <TabsTrigger value="looks" className="flex items-center justify-center gap-1 text-[11px] px-1 py-1" title="Looks & Presets">
                <PaletteIcon size={13} className="shrink-0" />
                <span className="hidden @[280px]/inspector:inline truncate">Looks</span>
              </TabsTrigger>
              <TabsTrigger value="backdrop" className="flex items-center justify-center gap-1 text-[11px] px-1 py-1" title="Backdrop & Framing">
                <StackIcon size={13} className="shrink-0" />
                <span className="hidden @[280px]/inspector:inline truncate">Backdrop</span>
              </TabsTrigger>
              <TabsTrigger value="details" className="flex items-center justify-center gap-1 text-[11px] px-1 py-1" title="Asset Details">
                <InfoIcon size={13} className="shrink-0" />
                <span className="hidden @[280px]/inspector:inline truncate">Details</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Effect Stack & Parameter Controls */}
          <TabsContent value="effects" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
            <ScrollFade className="flex-1 overflow-y-auto" containerClassName="flex-1 min-h-0">
              <div className="flex flex-col gap-3 p-4">
                {/* Stack Header & Add Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                      Effect Stack
                    </span>
                    <span className="text-2xs font-mono text-[color:var(--muted-foreground)]">
                      ({activeEffectStack.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeEffectStack.length > 0 && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => activeImageId && removeAllInstancesFromStack(activeImageId)}
                        className="text-2xs text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]"
                        title="Clear all effects"
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="default"
                      onClick={() => setIsBrowserOpen(true)}
                      disabled={!activeAsset}
                      className="font-semibold shadow-xs"
                    >
                      <PlusIcon size={14} />
                      <span>Add Effect</span>
                    </Button>
                  </div>
                </div>

                {/* Effect Stack Items */}
                {activeEffectStack.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] rounded-lg text-[color:var(--muted-foreground)] gap-2">
                    <SparkleIcon size={24} className="opacity-40" />
                    <span className="text-xs font-medium text-[color:var(--foreground)]">No effects in stack</span>
                    <span className="text-2xs leading-relaxed max-w-[180px]">
                      Click &quot;Add Effect&quot; or select a Look preset to begin.
                    </span>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={activeEffectStack.map((i) => i.instanceId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-1.5">
                        {activeEffectStack.map((instance, index) => (
                          <SortableEffectStackItem
                            key={instance.instanceId}
                            instance={instance}
                            index={index}
                            isSelected={selectedInstanceId === instance.instanceId}
                            totalCount={activeEffectStack.length}
                            onSelect={() => activeImageId && selectInstance(activeImageId, instance.instanceId)}
                            onMoveUp={() => activeImageId && reorderEffectStack(activeImageId, index, index - 1)}
                            onMoveDown={() => activeImageId && reorderEffectStack(activeImageId, index, index + 1)}
                            onToggleEnabled={() => activeImageId && toggleInstanceEnabled(activeImageId, instance.instanceId)}
                            onDuplicate={() => activeImageId && duplicateInstance(activeImageId, instance.instanceId)}
                            onRemove={() => activeImageId && removeInstanceFromStack(activeImageId, instance.instanceId)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}

                {/* Parameters Section for Selected Effect */}
                {selectedInstance && selectedEffectDef && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[color:var(--border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <SlidersIcon size={14} className="text-[color:var(--primary)]" />
                        <span className="text-xs font-semibold text-[color:var(--foreground)]">
                          {selectedEffectDef.name} Parameters
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xxs"
                        onClick={() => activeImageId && resetInstanceParameters(activeImageId, selectedInstance.instanceId)}
                        title="Reset effect parameters"
                        className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                      >
                        <ArrowCounterClockwiseIcon size={11} />
                      </Button>
                    </div>

                    {/* Parameter Controls */}
                    <div className="flex flex-col gap-3.5">
                      {selectedEffectDef.parameters.map((schema) => {
                        const paramName = schema.name;
                        const currentValue =
                          selectedInstance.parameters[paramName] !== undefined
                            ? selectedInstance.parameters[paramName]
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
                                  if (activeImageId && selectedInstanceId) {
                                    updateInstanceParameters(activeImageId, selectedInstanceId, {
                                      [paramName]: val,
                                    });
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
                                  if (activeImageId && selectedInstanceId) {
                                    updateInstanceParameters(activeImageId, selectedInstanceId, {
                                      [paramName]: val,
                                    });
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
                                  if (activeImageId && selectedInstanceId) {
                                    updateInstanceParameters(activeImageId, selectedInstanceId, {
                                      [paramName]: typeof val === "string" ? val : val?.hex,
                                    });
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
                                  if (activeImageId && selectedInstanceId) {
                                    updateInstanceParameters(activeImageId, selectedInstanceId, {
                                      [paramName]: val,
                                    });
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
            </ScrollFade>
          </TabsContent>

          {/* Tab 2: Looks & Presets */}
          <TabsContent value="looks" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
            <ScrollFade className="flex-1 overflow-y-auto" containerClassName="flex-1 min-h-0">
              <LooksBrowser />
            </ScrollFade>
          </TabsContent>

          {/* Tab 3: Backdrop & Framing */}
          <TabsContent value="backdrop" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
            <ScrollFade className="flex-1 overflow-y-auto" containerClassName="flex-1 min-h-0">
              <BackgroundControls />
            </ScrollFade>
          </TabsContent>

          {/* Tab 4: Asset Details */}
          <TabsContent value="details" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
            <ScrollFade className="flex-1 overflow-y-auto" containerClassName="flex-1 min-h-0">
              <div className="flex flex-col gap-3 p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]">
                  Active Asset Details
                </span>
                <div className="flex flex-col gap-2 rounded-md border border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] bg-[color:var(--card)] p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[color:var(--muted-foreground)]">File Name:</span>
                    <span className="font-medium text-[color:var(--foreground)] truncate max-w-[140px]" title={activeAsset.filename}>
                      {activeAsset.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--muted-foreground)]">Dimensions:</span>
                    <span className="font-mono text-[color:var(--foreground)]">
                      {activeAsset.width} × {activeAsset.height} px
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--muted-foreground)]">File Size:</span>
                    <span className="font-mono text-[color:var(--foreground)]">
                      {formatFileSize(activeAsset.fileSize)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[color:var(--muted-foreground)]">MIME Type:</span>
                    <span className="uppercase font-medium text-[color:var(--foreground)]">
                      {activeAsset.mimeType}
                    </span>
                  </div>
                </div>
              </div>
            </ScrollFade>
          </TabsContent>
        </Tabs>
      )}

      {/* Modals */}
      <EffectBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelectEffect={(effectId) => {
          if (activeImageId) {
            addEffectToStack(activeImageId, effectId);
            setIsBrowserOpen(false);
          }
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </PanelSurface>
  );
}
