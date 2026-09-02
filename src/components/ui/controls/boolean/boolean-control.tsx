import * as React from "react";
import { ControlFieldLabel } from "../../control-layout";
import { Field } from "../../primitives/field";
import { Switch } from "../../primitives/switch";
import { cn } from "../../lib/utils";

export type BooleanControlProps = {
  className?: string;
  disabled?: boolean;
  name: string;
  onValueChange?: (value: boolean) => void;
  showLabel?: boolean;
  value: boolean;
};

export function BooleanControl({
  className,
  disabled = false,
  name,
  onValueChange,
  showLabel = true,
  value,
}: BooleanControlProps): React.JSX.Element {
  return (
    <Field
      className={cn("flex flex-row items-center justify-between min-w-0 gap-2", className)}
      data-disabled={disabled}
    >
      {showLabel && <ControlFieldLabel>{name}</ControlFieldLabel>}
      <Switch
        checked={value}
        onCheckedChange={(checked) => onValueChange?.(checked)}
        disabled={disabled}
        size="default"
        aria-label={name}
      />
    </Field>
  );
}
