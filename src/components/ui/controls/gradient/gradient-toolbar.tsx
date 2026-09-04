import {
  Button,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Field,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../primitives";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react";
import * as React from "react";
import type { GradientType } from "../control-types";
import { ControlFieldLabel } from "../../control-layout";
import { ICON_SIZES } from "../../lib/icon-sizes";
import {
  gradientTypeOptions,
  normalizeGradientAngle,
} from "./gradient-control-utils";

export type GradientControlMode = "spatial" | "tonal-ramp";

function GradientTypeSelect({
  onTypeChange,
  type,
}: {
  onTypeChange: (nextType: GradientType) => void;
  type: GradientType;
}): React.JSX.Element {
  const selectedOption =
    gradientTypeOptions.find((option) => option.value === type) ??
    gradientTypeOptions[0];

  return (
    <Select
      items={gradientTypeOptions}
      onValueChange={(nextValue) => onTypeChange(nextValue as GradientType)}
      value={type}
    >
      <SelectTrigger className="w-full justify-between rounded-lg">
        <SelectValue>{() => selectedOption.label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {gradientTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function GradientToolbar({
  angle,
  name,
  onAngleChange,
  onTypeChange,
  type,
  mode = "spatial",
  onReverse,
}: {
  angle: number;
  name: string;
  onAngleChange: (nextAngle: number) => void;
  onTypeChange: (nextType: GradientType) => void;
  type: GradientType;
  mode?: GradientControlMode;
  onReverse?: () => void;
}): React.JSX.Element {
  const [angleDraft, setAngleDraft] = React.useState<string | null>(null);
  const angleBeforeEditRef = React.useRef(angle);
  const displayedAngle = angleDraft ?? String(angle);

  function handleAngleFocus(): void {
    angleBeforeEditRef.current = angle;
    setAngleDraft(String(angle));
  }

  function handleAngleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setAngleDraft(event.target.value);
  }

  function handleAngleBlur(): void {
    const nextDraft = angleDraft?.trim() ?? "";

    if (nextDraft === "" || !Number.isFinite(Number.parseFloat(nextDraft))) {
      onAngleChange(angleBeforeEditRef.current);
      setAngleDraft(null);
      return;
    }

    const nextAngle = normalizeGradientAngle(nextDraft);

    if (nextAngle !== angle) {
      onAngleChange(nextAngle);
    }

    setAngleDraft(null);
  }

  if (mode === "tonal-ramp") {
    return (
      <div
        className="flex items-center justify-between w-full h-7 mb-0.5"
        data-slot="gradient-toolbar-ramp"
      >
        <span className="text-xs font-medium text-[color:var(--foreground)]">
          {name}
        </span>
        {onReverse && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onReverse}
            title="Reverse colors"
            aria-label="Reverse gradient"
            className="size-6 flex items-center justify-center rounded-md text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] hover:bg-[color:var(--secondary)] transition-colors cursor-pointer [&_svg]:!size-4"
          >
            <ArrowsLeftRightIcon size={ICON_SIZES.md} />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="grid min-w-0 gap-x-2.5 gap-y-3 w-full"
      data-slot="gradient-toolbar-grid"
      style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
    >
      <Field className="h-fit min-w-0 gap-2" orientation="vertical">
        <ControlFieldLabel>{name}</ControlFieldLabel>
        <div className="min-w-0 w-full">
          <GradientTypeSelect onTypeChange={onTypeChange} type={type} />
        </div>
      </Field>
      <Field className="h-fit min-w-0 gap-2" orientation="vertical">
        <ControlFieldLabel>Angle</ControlFieldLabel>
        <div className="min-w-0 w-full">
          <InputGroup>
            <InputGroupInput
              aria-label="Gradient angle"
              autoComplete="off"
              className="text-left font-mono"
              inputMode="numeric"
              name="gradient-angle"
              onBlur={handleAngleBlur}
              onChange={handleAngleChange}
              onFocus={handleAngleFocus}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAngleBlur();
                  event.currentTarget.blur();
                  return;
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  setAngleDraft(String(angle));
                  event.currentTarget.blur();
                }
              }}
              type="text"
              value={displayedAngle}
            />
            <InputGroupAddon align="inline-end" className="pr-1.5 pl-0">
              <InputGroupText>°</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Field>
    </div>
  );
}
