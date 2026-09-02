import * as React from "react";
import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "../../lib/utils";
import { SliderControlContent } from "./slider-parts";
import { useSliderValueState } from "./slider-discrete-state";
import { useSliderInteractionValueChange } from "./slider-interaction";
import { resolveSliderMarkerCount } from "./slider-marker-policy";
import type { SliderProps } from "./slider-types";
import type { SliderRuntimeValue, SliderValue } from "./slider-value";

export function Slider<Value extends SliderRuntimeValue = number>({
  className,
  defaultValue,
  disabled,
  getAriaLabel,
  largeStep,
  markerCount,
  markerValues,
  onValueChange,
  onValueCommitted,
  orientation = "horizontal",
  resetValue,
  showFill = true,
  snapValues,
  step = 1,
  thumbAlignment = "edge",
  variant = "continuous",
  value,
  min = 0,
  max = 100,
  ...props
}: SliderProps<Value>): React.JSX.Element {
  const sliderValue = useSliderValueState({
    defaultValue,
    largeStep,
    max,
    min,
    onValueChange,
    onValueCommitted,
    snapValues,
    step,
    value,
    variant,
  });

  const resolvedMarkerCount = resolveSliderMarkerCount({
    markerCount,
    max,
    min,
    step,
    variant,
  });

  const handleInteractiveValueChange = useSliderInteractionValueChange({
    disabled,
    handleValueChange: sliderValue.handleValueChange,
    max,
    min,
    values: sliderValue.values,
  });

  const handleThumbDoubleClick = React.useCallback(() => {
    if (disabled || resetValue === undefined) return;
    if (onValueChange) {
      onValueChange(resetValue as SliderValue<Value>, {} as any);
    }
  }, [disabled, onValueChange, resetValue]);

  return (
    <SliderPrimitive.Root
      className={cn(
        "data-horizontal:w-full data-vertical:h-full",
        "[--slider-active-color:var(--foreground)] [--slider-track-color:color-mix(in_oklab,var(--muted-foreground)_38%,transparent)]",
        "data-[disabled]:[--slider-active-color:var(--muted-foreground)] data-[disabled]:[--slider-track-color:color-mix(in_oklab,var(--muted-foreground)_20%,transparent)]",
        className,
      )}
      data-slot="slider"
      data-variant={variant}
      defaultValue={sliderValue.isDiscrete ? undefined : (defaultValue as any)}
      value={sliderValue.resolvedValue as any}
      min={min}
      max={max}
      disabled={disabled}
      largeStep={sliderValue.rootLargeStep}
      onValueChange={handleInteractiveValueChange as any}
      onValueCommitted={sliderValue.handleValueCommitted as any}
      orientation={orientation}
      step={sliderValue.rootStep}
      thumbAlignment={thumbAlignment}
      thumbCollisionBehavior="none"
      {...(props as any)}
    >
      <SliderControlContent
        count={sliderValue.values.length}
        disabled={disabled}
        getAriaLabel={getAriaLabel}
        isDiscrete={sliderValue.isDiscrete}
        isPointerDragging={false}
        markerCount={resolvedMarkerCount}
        markerValues={markerValues}
        max={max}
        min={min}
        onThumbDoubleClick={handleThumbDoubleClick}
        orientation={orientation}
        showFill={showFill}
      />
    </SliderPrimitive.Root>
  );
}

export { SliderInteractionProvider } from "./slider-interaction";
export type { SliderInteractionChangeDetails } from "./slider-interaction";
export type { SliderProps, SliderVariant } from "./slider-types";
