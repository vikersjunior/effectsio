import * as React from "react";
import { ControlFieldLabel } from "../../control-layout";
import { Field } from "../../primitives/field";
import { ToggleGroup, ToggleGroupItem } from "../../primitives/toggle-group";
import type { ControlOption } from "../control-types";

export type SegmentedControlVariant = "default" | "dots";

export type SegmentedControlOption = ControlOption & {
  indicatorColor?: string;
};

export type SegmentedControlProps = {
  ariaLabel?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  options: readonly SegmentedControlOption[];
  showLabel?: boolean;
  value: string;
  variant?: SegmentedControlVariant;
};

export function SegmentedControl({
  ariaLabel,
  disabled = false,
  name,
  onValueChange,
  options,
  showLabel = true,
  value,
  variant = "default",
}: SegmentedControlProps): React.JSX.Element {
  return (
    <Field className="min-w-0 gap-1.5" data-disabled={disabled}>
      {name && showLabel && <ControlFieldLabel>{name}</ControlFieldLabel>}
      <ToggleGroup
        aria-label={ariaLabel ?? name}
        className="w-full"
        disabled={disabled}
        value={[value]}
        onValueChange={(val) => {
          const first = val[0];
          if (first && first !== value) {
            onValueChange?.(first);
          }
        }}
        variant="outline"
        size="default"
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            aria-label={opt.label}
            className={
              variant === "dots"
                ? "min-w-0 flex-1 gap-1.5 text-2xs py-1"
                : "min-w-0 flex-1 text-2xs py-1"
            }
          >
            {variant === "dots" ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: opt.indicatorColor ?? "currentColor",
                }}
              />
            ) : null}
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
