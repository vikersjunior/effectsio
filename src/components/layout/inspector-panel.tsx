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
      data-slot="sortable-effect-row"
      className={`group relative flex items-center justify-between p-2 rounded-md border transition-all duration-150 cursor-pointer ${
        isDragging
          ? "opacity-60 bg-[color:color-mix(in_oklab,var(--primary)_15%,var(--card))] border-[color:var(--primary)] shadow-lg"
          : isSelected
          ? "bg-[color:color-mix(in_oklab,var(--primary)_10%,var(--card))] border-[color:var(--primary)] shadow-xs"
          : "bg-[color:color-mix(in_oklab,var(--card)_60%,transparent)] border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]"
      } ${instance.enabled ? "opacity-100" : "opacity-50"}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] opacity-40 hover:opacity-100 shrink-0 touch-none outline-hidden"
          title="Drag to reorder"
          aria-label="Drag to reorder effect"
        >
          <DotsSixVerticalIcon size={13} />
        </button>
        <span className="text-2xs font-mono font-bold text-[color:var(--muted-foreground)] w-4 shrink-0">
          #{index + 1}
        </span>
        <div className="flex flex-col min-w-0">
          <span
            className={`text-xs font-semibold truncate ${
              isSelected ? "text-[color:var(--primary)]" : "text-[color:var(--foreground)]"
            }`}
          >
            {def?.name || instance.effectId}
          </span>
          <span className="text-2xs text-[color:var(--muted-foreground)] truncate">
            {def?.category || "Filter"}
          </span>
        </div>
      </div>

      {/* Item Actions */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-xxs"
          disabled={index === 0}
          onClick={onMoveUp}
          aria-label="Move up"
          title="Move up"
        >
          <CaretUpIcon size={11} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xxs"
          disabled={index === totalCount - 1}
          onClick={onMoveDown}
          aria-label="Move down"
          title="Move down"
        >
          <CaretDownIcon size={11} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xxs"
          onClick={onToggleEnabled}
          aria-label={instance.enabled ? "Disable effect" : "Enable effect"}
          title={instance.enabled ? "Disable effect" : "Enable effect"}
        >
          {instance.enabled ? (
            <EyeIcon size={11} className="text-[color:var(--primary)]" />
          ) : (
            <EyeSlashIcon size={11} />
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xxs"
          onClick={onDuplicate}
          aria-label="Duplicate effect layer"
          title="Duplicate effect layer"
        >
          <CopyIcon size={11} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xxs"
          onClick={onRemove}
          aria-label="Remove effect"
          title="Remove effect"
        >
          <TrashIcon
            size={11}
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--destructive)]"
          />
        </Button>
      </div>
    </div>
  );
}

export function InspectorPanel(): React.JSX.Element {
  const {
    activeAsset,
    activeImageId,
    activeEffectStack,
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
  } = useStudioStore();

  const [activeTab, setActiveTab] = React.useState("effects");
  const [isBrowserOpen, setIsBrowserOpen] = React.useState(false);

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
    <PanelSurface className="flex flex-col h-full w-full border-none rounded-none overflow-hidden @container/inspector">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full gap-0">
        {/* Top Tabs */}
        <div className="p-1.5 border-b border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_80%,transparent)]">
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
                    onClick={() => setIsBrowserOpen(true)}
                    disabled={!activeAsset}
                  >
                    <PlusIcon size={14} />
                    <span>Add Effect</span>
                  </Button>
                </div>
              </div>

              {/* DND-Kit Sortable Effect Stack Layers List */}
              <div className="flex flex-col gap-1.5">
                {activeEffectStack.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center gap-2 text-[color:var(--muted-foreground)]">
                    <SparkleIcon size={24} className="opacity-30" />
                    <span className="text-xs font-medium">No effects in stack</span>
                    <span className="text-2xs text-[color:var(--muted-foreground)] opacity-80">
                      Click "Add Effect" or select a Look preset to begin.
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
                      {activeEffectStack.map((instance, index) => (
                        <SortableEffectStackItem
                          key={instance.instanceId}
                          instance={instance}
                          index={index}
                          isSelected={instance.instanceId === selectedInstanceId}
                          totalCount={activeEffectStack.length}
                          onSelect={() => {
                            if (activeImageId) selectInstance(activeImageId, instance.instanceId);
                          }}
                          onMoveUp={() => {
                            if (activeImageId) reorderEffectStack(activeImageId, index, index - 1);
                          }}
                          onMoveDown={() => {
                            if (activeImageId) reorderEffectStack(activeImageId, index, index + 1);
                          }}
                          onToggleEnabled={() => {
                            if (activeImageId) toggleInstanceEnabled(activeImageId, instance.instanceId);
                          }}
                          onDuplicate={() => {
                            if (activeImageId) duplicateInstance(activeImageId, instance.instanceId);
                          }}
                          onRemove={() => {
                            if (activeImageId) removeInstanceFromStack(activeImageId, instance.instanceId);
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* Selected Instance Parameter Controls Section */}
              {selectedInstance && selectedEffectDef && (
                <PanelSection
                  title={`${selectedEffectDef.name} Parameters`}
                  collapsible={true}
                  action={
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeImageId && selectedInstanceId) {
                          resetInstanceParameters(activeImageId, selectedInstanceId);
                        }
                      }}
                      className="gap-1 text-2xs"
                      title="Reset parameters to default"
                    >
                      <ArrowCounterClockwiseIcon size={11} />
                      Reset
                    </Button>
                  }
                >
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
                            onValueChange={(val) => {
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
                            onValueChange={(val) => {
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
                            onValueChange={(val) => {
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
                </PanelSection>
              )}
            </div>
          </ScrollFade>
        </TabsContent>

        {/* Tab 2: Looks Presets Browser */}
        <TabsContent value="looks" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
          <LooksBrowser />
        </TabsContent>

        {/* Tab 3: Background & Framing Controls */}
        <TabsContent value="backdrop" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
          <BackgroundControls />
        </TabsContent>

        {/* Tab 4: Image Details / Metadata */}
        <TabsContent value="details" className="flex-1 flex flex-col min-h-0 overflow-hidden m-0 p-0">
          <ScrollFade className="flex-1 overflow-y-auto p-4" containerClassName="flex-1 min-h-0">
            {activeAsset ? (
              <div className="flex flex-col gap-3">
                <PanelSection title="Asset Specifications">
                  <div className="flex flex-col gap-2 text-2xs">
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">File Name</span>
                      <span className="font-medium text-[color:var(--foreground)] truncate max-w-[160px]">
                        {activeAsset.filename}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">Dimensions</span>
                      <span className="font-mono text-[color:var(--foreground)]">
                        {activeAsset.width} × {activeAsset.height} px
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">File Size</span>
                      <span className="font-mono text-[color:var(--foreground)]">
                        {formatFileSize(activeAsset.fileSize)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">MIME Type</span>
                      <span className="font-mono text-[color:var(--foreground)]">
                        {activeAsset.mimeType}
                      </span>
                    </div>
                  </div>
                </PanelSection>

                <PanelSection title="Pipeline Status">
                  <div className="flex flex-col gap-2 text-2xs">
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">Active Shaders</span>
                      <span className="font-mono text-[color:var(--foreground)]">
                        {activeEffectStack.filter((e) => e.enabled).length} Passes
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[color:color-mix(in_oklab,var(--border)_10%,transparent)]">
                      <span className="text-[color:var(--muted-foreground)]">Render Path</span>
                      <span className="text-[color:var(--primary)] font-semibold">
                        Offscreen WebGL2 GPU
                      </span>
                    </div>
                  </div>
                </PanelSection>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-[color:var(--muted-foreground)]">
                No active image selected.
              </div>
            )}
          </ScrollFade>
        </TabsContent>
      </Tabs>

      {/* Add Effect Browser Modal */}
      <EffectBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        onSelectEffect={(effectId) => {
          if (activeImageId) {
            addEffectToStack(activeImageId, effectId);
          }
        }}
      />
    </PanelSurface>
  );
}
