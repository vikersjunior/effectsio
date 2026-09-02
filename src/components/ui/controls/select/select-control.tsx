import * as React from "react";
import { ControlFieldLabel } from "../../control-layout";
import { cn } from "../../lib/utils";
import {
  Field,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives";
import type { ControlOption } from "../control-types";

export type SelectControlProps = {
  className?: string;
  disabled?: boolean;
  name: string;
  onValueChange?: (value: string) => void;
  options: readonly ControlOption[];
  showLabel?: boolean;
  value: string;
};

export type StaticSelectProps = {
  className?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  options: readonly ControlOption[];
  scrollFadeValue?: boolean;
  size?: "sm" | "default" | "lg" | "xl";
  triggerClassName?: string;
  value: string;
};

export function StaticSelect({
  disabled = false,
  onValueChange,
  options,
  size = "default",
  triggerClassName,
  value,
}: StaticSelectProps): React.JSX.Element {
  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(val) => {
        if (typeof val === "string") {
          onValueChange?.(val);
        }
      }}
    >
      <SelectTrigger size={size as any} className={cn("w-full", triggerClassName)}>
        <SelectValue>{selectedOption?.label ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectGroup>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function SelectControl({
  className,
  disabled = false,
  name,
  onValueChange,
  options,
  showLabel = true,
  value,
}: SelectControlProps): React.JSX.Element {
  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  return (
    <Field className={cn("min-w-0 gap-1.5", className)} data-disabled={disabled}>
      {showLabel && <ControlFieldLabel>{name}</ControlFieldLabel>}
      <Select
        disabled={disabled}
        value={value}
        onValueChange={(val) => {
          if (typeof val === "string") {
            onValueChange?.(val);
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue>{selectedOption?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
