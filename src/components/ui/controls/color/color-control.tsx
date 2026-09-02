"use client";

import * as React from "react";

import { ControlFieldLabel } from "../../control-layout";
import { Field } from "../../primitives";
import { cn } from "../../lib/utils";
import type { ControlChangeMeta } from "../control-types";
import {
  ColorOpacityInput,
  parseOpacityValue,
} from "./color-opacity-input";
import type {
  ColorControlGroupProps,
  ColorControlInput,
  ColorControlProps,
  ColorOpacityControlProps,
} from "./color-control-types";
import { ColorValueControl } from "./color-value-control";

export type {
  ColorControlInput,
  ColorControlInputPair,
  ColorControlProps,
  ColorOpacityControlProps,
  ColorOpacityValue,
} from "./color-control-types";
export { ColorValueControl } from "./color-value-control";

function isColorControlGroupProps(
  props: ColorControlProps,
): props is ColorControlGroupProps {
  return Array.isArray((props as ColorControlGroupProps).inputs);
}

function ColorControlField({
  className,
  disabled = false,
  fullWidth = false,
  hex,
  name,
  onValueChange,
  showLabel = false,
  value,
}: ColorControlInput & { fullWidth?: boolean }): React.JSX.Element {
  const activeColor = hex ?? value ?? "var(--foreground)";

  function updateColor(nextColor: string, meta?: ControlChangeMeta): void {
    if (!onValueChange) return;

    if (value !== undefined) {
      // Caller passed simple string `value`
      (onValueChange as (val: string) => void)(nextColor);
    } else {
      // Caller passed object `{ hex }` handler
      const nextValue = { hex: nextColor };
      if (meta) {
        (onValueChange as (val: { hex: string }, meta?: ControlChangeMeta) => void)(nextValue, meta);
      } else {
        (onValueChange as (val: { hex: string }) => void)(nextValue);
      }
    }
  }

  return (
    <Field
      className={cn("h-fit min-w-0 justify-start gap-2", className)}
      data-disabled={disabled}
    >
      {showLabel ? <ControlFieldLabel>{name}</ControlFieldLabel> : null}
      <div className={cn("min-w-0", fullWidth ? "w-full" : "w-1/2 shrink-0")}>
        <ColorValueControl
          color={activeColor}
          label={name}
          onColorChange={updateColor}
        />
      </div>
    </Field>
  );
}

export function ColorControl(props: ColorControlProps): React.JSX.Element {
  if (isColorControlGroupProps(props)) {
    return (
      <div
        className="grid min-w-0 gap-[10px]"
        data-slot="color-control-grid"
        style={{
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        }}
      >
        {props.inputs.map((input, index) => (
          <ColorControlField
            fullWidth
            key={`${input.name}-${index}`}
            {...input}
          />
        ))}
      </div>
    );
  }

  return <ColorControlField {...props} />;
}

export function ColorOpacityControl({
  className,
  disabled = false,
  hex,
  name,
  onValueChange,
  opacity,
  showLabel = false,
  value,
}: ColorOpacityControlProps): React.JSX.Element {
  const activeColor = hex ?? value ?? "var(--foreground)";
  const activeOpacity = parseOpacityValue(opacity);

  function updateColor(nextColor: string, meta?: ControlChangeMeta): void {
    const nextValue = {
      hex: nextColor,
      opacity: activeOpacity,
    };

    if (meta) {
      (onValueChange as any)?.(nextValue, meta);
      return;
    }

    (onValueChange as any)?.(nextValue);
  }

  function updateOpacity(nextOpacity: number, meta?: ControlChangeMeta): void {
    const nextValue = {
      hex: activeColor,
      opacity: nextOpacity,
    };

    if (meta) {
      (onValueChange as any)?.(nextValue, meta);
      return;
    }

    (onValueChange as any)?.(nextValue);
  }

  return (
    <Field
      className={cn("h-fit min-w-0 justify-start gap-2", className)}
      data-disabled={disabled}
    >
      {showLabel ? <ControlFieldLabel>{name}</ControlFieldLabel> : null}
      <div className="min-w-0 w-full">
        <ColorValueControl
          color={activeColor}
          label={name}
          onColorChange={updateColor}
        >
          <ColorOpacityInput
            label={name}
            name={`${name.toLowerCase().replace(/\s+/g, "-")}-opacity`}
            onOpacityChange={updateOpacity}
            opacity={activeOpacity}
          />
        </ColorValueControl>
      </div>
    </Field>
  );
}
