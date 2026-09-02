import * as React from "react";
import type { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { SliderProps, SliderVariant } from "./slider-types";
import {
  getSliderValues,
  normalizeSliderValueShape,
  snapSliderValue,
  valuesMatch,
  type SliderRuntimeValue,
  type SliderValue,
} from "./slider-value";

type SliderValueStateOptions<Value extends SliderRuntimeValue> = {
  defaultValue?: Value;
  largeStep?: number;
  max: number;
  min: number;
  onValueChange?: SliderProps<Value>["onValueChange"];
  onValueCommitted?: SliderProps<Value>["onValueCommitted"];
  snapValues?: readonly number[];
  step: number;
  value?: Value;
  variant: SliderVariant;
};

export function useSliderValueState<Value extends SliderRuntimeValue>({
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
}: SliderValueStateOptions<Value>): {
  handleValueChange: (nextValue: SliderValue<Value>, eventDetails: SliderPrimitive.Root.ChangeEventDetails) => void;
  handleValueCommitted: (nextValue: SliderValue<Value>, eventDetails: SliderPrimitive.Root.CommitEventDetails) => void;
  isDiscrete: boolean;
  resolvedValue: Value | undefined;
  rootLargeStep: number | undefined;
  rootStep: number;
  values: number[];
} {
  const [discreteValue, setDiscreteValue] = React.useState<Value | undefined>(() =>
    value === undefined ? defaultValue : undefined,
  );
  const lastInternalDiscreteValueRef = React.useRef<Value | undefined>(
    value === undefined ? defaultValue : undefined,
  );
  const lastChangeDetailsRef = React.useRef<SliderPrimitive.Root.ChangeEventDetails | null>(null);
  const isDiscrete = variant === "discrete";
  const resolvedValue = isDiscrete ? (discreteValue ?? value ?? defaultValue) : value;
  const rootStep = isDiscrete ? Math.max((max - min) / 1000, 0.000001) : step;
  const rootLargeStep = isDiscrete ? (largeStep ?? step) : largeStep;
  const values = React.useMemo(
    () => getSliderValues(resolvedValue, defaultValue, min, max),
    [resolvedValue, defaultValue, min, max],
  );

  React.useEffect(() => {
    if (!isDiscrete || value === undefined || discreteValue === undefined) {
      return;
    }

    const lastInternalValue = lastInternalDiscreteValueRef.current;
    if (lastInternalValue !== undefined) {
      if (valuesMatch(value, lastInternalValue)) {
        return;
      }

      const snappedInternalValue = snapSliderValue(lastInternalValue, min, max, step, snapValues);
      if (valuesMatch(value, snappedInternalValue)) {
        return;
      }
    }

    setDiscreteValue(undefined);
  }, [discreteValue, isDiscrete, max, min, snapValues, step, value]);

  const handleValueChange = React.useCallback(
    (nextValue: SliderValue<Value>, eventDetails: SliderPrimitive.Root.ChangeEventDetails) => {
      lastChangeDetailsRef.current = eventDetails;
      if (isDiscrete) {
        const normalizedNextValue = normalizeSliderValueShape(
          nextValue as SliderRuntimeValue,
          value,
          defaultValue,
          min,
        );
        lastInternalDiscreteValueRef.current = normalizedNextValue;
        setDiscreteValue(normalizedNextValue);
        onValueChange?.(
          snapSliderValue(normalizedNextValue, min, max, step, snapValues) as SliderValue<Value>,
          eventDetails,
        );
        return;
      }

      onValueChange?.(nextValue, eventDetails);
    },
    [defaultValue, isDiscrete, max, min, onValueChange, snapValues, step, value],
  );

  const handleValueCommitted = React.useCallback(
    (nextValue: SliderValue<Value>, eventDetails: SliderPrimitive.Root.CommitEventDetails) => {
      if (!isDiscrete) {
        onValueCommitted?.(nextValue, eventDetails);
        return;
      }

      const normalizedNextValue = normalizeSliderValueShape(
        nextValue as SliderRuntimeValue,
        value,
        defaultValue,
        min,
      );
      const snappedValue = snapSliderValue(normalizedNextValue, min, max, step, snapValues);
      lastInternalDiscreteValueRef.current = snappedValue;
      setDiscreteValue(snappedValue);

      if (!valuesMatch(snappedValue, normalizedNextValue) && lastChangeDetailsRef.current) {
        onValueChange?.(snappedValue as SliderValue<Value>, lastChangeDetailsRef.current);
      }

      onValueCommitted?.(snappedValue as SliderValue<Value>, eventDetails);
    },
    [defaultValue, isDiscrete, max, min, onValueChange, onValueCommitted, snapValues, step, value],
  );

  return {
    handleValueChange,
    handleValueCommitted,
    isDiscrete,
    resolvedValue,
    rootLargeStep,
    rootStep,
    values,
  };
}
