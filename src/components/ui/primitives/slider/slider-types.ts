import type * as React from "react";
import type { Slider as SliderPrimitive } from "@base-ui/react/slider";
import type { SliderRuntimeValue, SliderValue } from "./slider-value";

export type SliderVariant = "continuous" | "discrete";

export type SliderThumbDoubleClickHandler = (
  event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>,
  index: number,
) => void;

export type SliderProps<Value extends SliderRuntimeValue = number> = Omit<
  SliderPrimitive.Root.Props<Value>,
  "defaultValue" | "value" | "onValueChange" | "onValueCommitted"
> & {
  className?: string;
  defaultValue?: Value;
  disabled?: boolean;
  getAriaLabel?: (index: number) => string;
  largeStep?: number;
  markerCount?: number;
  markerValues?: readonly number[];
  onValueChange?: (
    value: SliderValue<Value>,
    eventDetails: SliderPrimitive.Root.ChangeEventDetails,
  ) => void;
  onValueCommitted?: (
    value: SliderValue<Value>,
    eventDetails: SliderPrimitive.Root.CommitEventDetails,
  ) => void;
  resetValue?: Value;
  showFill?: boolean;
  snapValues?: readonly number[];
  step?: number;
  thumbAlignment?: "center" | "edge";
  value?: Value;
  variant?: SliderVariant;
};
