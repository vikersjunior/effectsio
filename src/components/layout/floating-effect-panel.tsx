import * as React from "react";
import {
  ArrowCounterClockwiseIcon,
  XIcon,
  SlidersIcon,
} from "@phosphor-icons/react";
import {
  Button,
  SliderControl,
  SelectControl,
  ColorControl,
  BooleanControl,
  ScrollFade,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { getEffectDefinition } from "../../effects/registry";

export function FloatingEffectPanel(): React.JSX.Element | null {
  const {
    activeAsset,
    activeImageId,
    selectedInstance,
    updateInstanceParameters,
    resetInstanceParameters,
    selectInstance,
  } = useStudioStore();

  if (!activeAsset || !activeImageId || !selectedInstance) {
    return null;
  }

  const definition = getEffectDefinition(selectedInstance.effectId);
  if (!definition) return null;

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

  return (
    <div
      role="dialog"
      aria-label={`${definition.name} Parameters`}
      className="floating-popup-surface absolute top-4 left-4 z-20 flex flex-col w-[300px] max-h-[calc(100%-6rem)] rounded-xl border border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] shadow-2xl backdrop-blur-2xl text-[color:var(--foreground)] select-none pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <SlidersIcon size={14} className="text-[color:var(--primary)] shrink-0" />
          <span className="text-xs font-semibold tracking-tight text-[color:var(--foreground)] truncate">
            {definition.name} Parameters
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon-xxs"
            onClick={handleReset}
            title="Reset parameters to defaults"
            aria-label="Reset parameters"
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          >
            <ArrowCounterClockwiseIcon size={11} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xxs"
            onClick={handleClose}
            title="Close floating panel"
            aria-label="Close parameters"
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          >
            <XIcon size={12} />
          </Button>
        </div>
      </div>

      {/* Parameter Controls List */}
      <ScrollFade className="flex-1 overflow-y-auto px-3.5 py-3" containerClassName="flex-1 min-h-0">
        <div className="flex flex-col gap-3.5">
          {definition.parameters.map((schema) => {
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
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          }
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
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          }
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
                    onValueChange={(val: string) => {
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
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
                      if (activeImageId && selectedInstance) {
                        updateInstanceParameters(
                          activeImageId,
                          selectedInstance.instanceId,
                          {
                            [paramName]: val,
                          }
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
