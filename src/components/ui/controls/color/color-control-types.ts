import type { ControlChangeMeta, ControlValueChangeHandler } from "../control-types";

export type ColorControlInput = {
  className?: string;
  disabled?: boolean;
  hex?: string;
  name: string;
  onValueChange?: (value: any, meta?: ControlChangeMeta) => void;
  showLabel?: boolean;
  value?: string;
};

export type ColorOpacityValue = {
  hex: string;
  opacity: number;
};

export type ColorOpacityControlProps = {
  className?: string;
  disabled?: boolean;
  hex?: string;
  name: string;
  onValueChange?: (value: any, meta?: ControlChangeMeta) => void;
  opacity?: number;
  showLabel?: boolean;
  value?: string;
};

export type ColorControlInputPair = readonly [
  ColorControlInput,
  ColorControlInput,
];

type ColorControlSingleProps = ColorControlInput & {
  inputs?: never;
};

export type ColorControlGroupProps = {
  inputs: ColorControlInputPair;
};

export type ColorControlProps =
  | ColorControlSingleProps
  | ColorControlGroupProps;
