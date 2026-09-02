export function clampSliderValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number(value.toFixed(6))));
}

export function parseSliderValueLabel(label: string): number | null {
  const match = /-?\d+(?:\.\d+)?/.exec(label);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return Number.isNaN(num) ? null : num;
}

export function formatSliderValueWithUnit(value: number, step: number, unit?: string): string {
  const precision = getPrecisionFromStep(step);
  const formatted = precision > 0 ? value.toFixed(precision) : `${Math.round(value)}`;
  return unit ? `${formatted}${unit}` : formatted;
}

export function applySliderValueLabelUnit(label: string, unit?: string): string {
  if (!unit || label.endsWith(unit)) return label;
  return `${label}${unit}`;
}

export function getSliderControlValue(value: number | readonly number[]): number {
  if (Array.isArray(value)) {
    return value[0] ?? 0;
  }
  return value as number;
}

function getPrecisionFromStep(step: number): number {
  const str = step.toString();
  const decimal = str.split(".")[1];
  return decimal ? decimal.length : 0;
}
