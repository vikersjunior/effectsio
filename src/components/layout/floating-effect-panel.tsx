import * as React from 'react';
import {
  ArrowCounterClockwiseIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  Button,
  SliderControl,
  SelectControl,
  ColorControl,
  BooleanControl,
  ScrollFade,
  GradientControl,
  type GradientStop,
} from '../ui';
import { useStudioStore } from '../../context/studio-context';
import { getEffectDefinition } from '../../effects/registry';
import { parseStopPosition } from '../ui/controls/gradient/gradient-control-utils';

export function FloatingEffectPanel(): React.JSX.Element | null {
  const {
    activeAsset,
    activeImageId,
    selectedInstance,
    updateInstanceParameters,
    resetInstanceParameters,
    selectInstance,
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
    const panelWidth = panelRef.current?.offsetWidth ?? 300;
    const panelHeight = panelRef.current?.offsetHeight ?? 240;

    let targetY = 96;
    if (typeof document !== "undefined") {
      const effectsHeader =
        document.querySelector('[data-slot="effects-section-header"]') ||
        document.querySelector('button[aria-label="Add effect"]');
      if (effectsHeader && parent) {
        const headerRect = effectsHeader.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        targetY = Math.max(16, headerRect.top - parentRect.top);
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
  }, [selectedInstance?.instanceId, getDefaultPosition]);

  const definition = selectedInstance
    ? getEffectDefinition(selectedInstance.effectId)
    : undefined;
  const gradientConfig = definition?.gradientColorParams;
  const startColor =
    gradientConfig && selectedInstance
      ? String(
          selectedInstance.parameters[gradientConfig.startColorParam] ??
            definition?.defaultParameters[gradientConfig.startColorParam] ??
            "#0f172a"
        )
      : "";
  const endColor =
    gradientConfig && selectedInstance
      ? String(
          selectedInstance.parameters[gradientConfig.endColorParam] ??
            definition?.defaultParameters[gradientConfig.endColorParam] ??
            "#38bdf8"
        )
      : "";

  const shadowPos =
    gradientConfig?.startPositionParam && selectedInstance
      ? typeof selectedInstance.parameters[gradientConfig.startPositionParam] === "number"
        ? Number(selectedInstance.parameters[gradientConfig.startPositionParam])
        : Number(definition?.defaultParameters[gradientConfig.startPositionParam] ?? 0)
      : 0;
  const highlightPos =
    gradientConfig?.endPositionParam && selectedInstance
      ? typeof selectedInstance.parameters[gradientConfig.endPositionParam] === "number"
        ? Number(selectedInstance.parameters[gradientConfig.endPositionParam])
        : Number(definition?.defaultParameters[gradientConfig.endPositionParam] ?? 100)
      : 100;

  const gradientStops: readonly GradientStop[] = React.useMemo(() => {
    if (!gradientConfig) return [];
    return [
      { color: startColor, position: `${shadowPos}%`, opacity: 100 },
      { color: endColor, position: `${highlightPos}%`, opacity: 100 },
    ];
  }, [gradientConfig, startColor, endColor, shadowPos, highlightPos]);

  const parametersToRender = React.useMemo(() => {
    if (!definition) return [];
    if (!gradientConfig) return definition.parameters;
    return definition.parameters.filter(
      (p) =>
        p.name !== gradientConfig.startColorParam &&
        p.name !== gradientConfig.endColorParam &&
        p.name !== gradientConfig.startPositionParam &&
        p.name !== gradientConfig.endPositionParam
    );
  }, [definition, gradientConfig]);

  if (!activeAsset || !activeImageId || !selectedInstance || !definition) {
    return null;
  }

  const handleClose = () => {
    if (activeImageId) {
      selectInstance(activeImageId, null);
    }
  };

  const handleReset = () => {
    if (activeImageId && selectedInstance) {
      resetInstanceParameters(activeImageId, selectedInstance.instanceId);
    }
  };

  const defaultPos = getDefaultPosition();
  const currentX = position?.x ?? defaultPos.x;
  const currentY = position?.y ?? defaultPos.y;

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

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
    const panelWidth = panelRef.current?.offsetWidth ?? 300;
    const panelHeight = panelRef.current?.offsetHeight ?? 200;

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

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${definition.name} Parameters`}
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        left: `${currentX}px`,
        top: `${currentY}px`,
      }}
      className="floating-popup-surface absolute z-20 flex flex-col w-[300px] max-h-[calc(100%-6rem)] rounded-xl border border-[color:var(--border)] dark:shadow-2xl shadow-none backdrop-blur-2xl text-[color:var(--foreground)] select-none pointer-events-auto transition-shadow duration-150 animate-in fade-in zoom-in-95"
    >
      {/* Draggable Panel Header */}
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        className="flex items-center justify-between px-3.5 h-10 border-b border-[color:var(--border)] shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center min-w-0">
          <span className="text-xs font-semibold tracking-tight text-[color:var(--foreground)] truncate">
            {definition.name} Parameters
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleReset}
            title="Reset parameters to defaults"
            aria-label="Reset parameters"
            className="size-6 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] cursor-pointer [&_svg]:!size-4"
          >
            <ArrowCounterClockwiseIcon size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleClose}
            title="Close floating panel"
            aria-label="Close parameters"
            className="size-6 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] cursor-pointer [&_svg]:!size-4"
          >
            <XIcon size={16} />
          </Button>
        </div>
      </div>

      {/* Parameter Controls List */}
      <ScrollFade
        className="flex-1 overflow-y-auto px-3.5 py-3"
        containerClassName="flex-1 min-h-0"
      >
        <div className="flex flex-col gap-3.5">
          {gradientConfig && (
            <GradientControl
              name={gradientConfig.label ?? "Gradient"}
              mode="tonal-ramp"
              stops={gradientStops}
              stopLabels={[
                gradientConfig.startLabel ?? "Shadow",
                gradientConfig.endLabel ?? "Highlight",
              ]}
              onReverse={() => {
                if (activeImageId && selectedInstance) {
                  updateInstanceParameters(
                    activeImageId,
                    selectedInstance.instanceId,
                    {
                      [gradientConfig.startColorParam]: endColor,
                      [gradientConfig.endColorParam]: startColor,
                    }
                  );
                }
              }}
              onValueChange={({ stops: nextStops }) => {
                if (activeImageId && selectedInstance) {
                  const nextStart = nextStops[0]?.color;
                  const nextEnd = nextStops[nextStops.length - 1]?.color;
                  const nextStartPos =
                    nextStops[0]?.position !== undefined
                      ? Math.round(parseStopPosition(nextStops[0].position) * 100)
                      : undefined;
                  const nextEndPos =
                    nextStops[nextStops.length - 1]?.position !== undefined
                      ? Math.round(parseStopPosition(nextStops[nextStops.length - 1].position) * 100)
                      : undefined;

                  const updates: Record<string, unknown> = {};
                  if (nextStart) updates[gradientConfig.startColorParam] = nextStart;
                  if (nextEnd) updates[gradientConfig.endColorParam] = nextEnd;
                  if (gradientConfig.startPositionParam && nextStartPos !== undefined) {
                    updates[gradientConfig.startPositionParam] = nextStartPos;
                  }
                  if (gradientConfig.endPositionParam && nextEndPos !== undefined) {
                    updates[gradientConfig.endPositionParam] = nextEndPos;
                  }

                  updateInstanceParameters(
                    activeImageId,
                    selectedInstance.instanceId,
                    updates
                  );
                }
              }}
            />
          )}

          {parametersToRender.map((schema) => {
            const paramName = schema.name;
            const currentValue =
              selectedInstance.parameters[paramName] !== undefined
                ? selectedInstance.parameters[paramName]
                : schema.defaultValue;

            switch (schema.type) {
              case 'number':
                return (
                  <SliderControl
                    key={paramName}
                    name={paramName}
                    value={Number(currentValue)}
                    min={schema.min ?? 0}
                    max={schema.max ?? 100}
                    step={schema.step ?? 1}
                    onValueChange={(val: number) => {
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          },
                        );
                      }
                    }}
                  />
                );

              case 'select':
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
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          },
                        );
                      }
                    }}
                  />
                );

              case 'color':
                return (
                  <ColorControl
                    key={paramName}
                    name={paramName}
                    value={String(currentValue)}
                    onValueChange={(val: string) => {
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          },
                        );
                      }
                    }}
                  />
                );

              case 'boolean':
                return (
                  <BooleanControl
                    key={paramName}
                    name={paramName}
                    value={Boolean(currentValue)}
                    onValueChange={(val: boolean) => {
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          },
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
      </ScrollFade>
    </div>
  );
}
