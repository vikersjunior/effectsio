export const EFFECT_IDS = [
  "original",
  "black-and-white",
  "duotone",
  "posterize",
  "grain",
  "halftone",
  "screen-print",
  "vintage-film",
  "glitch",
  "pixelate",
  "line-art",
  "ascii",
] as const;

export type EffectId = (typeof EFFECT_IDS)[number];

export const EFFECT_CATEGORIES = [
  "artistic",
  "graphic",
  "retro",
  "experimental",
] as const;

export type EffectCategory = (typeof EFFECT_CATEGORIES)[number];

export type EffectParameterType = "number" | "color" | "boolean" | "select";

export interface EffectParameterOption {
  label: string;
  value: string | number;
}

export interface EffectParameterSchema {
  name: string;
  label: string;
  type: EffectParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description: string;
  options?: EffectParameterOption[];
}

export interface GradientColorParamsConfig {
  startColorParam: string;
  endColorParam: string;
  startPositionParam?: string;
  endPositionParam?: string;
  startLabel?: string;
  endLabel?: string;
  label?: string;
}

export interface EffectDefinition<TParams = Record<string, unknown>> {
  id: EffectId;
  name: string;
  category: EffectCategory;
  description: string;
  parameters: readonly EffectParameterSchema[];
  parameterSchema?: readonly EffectParameterSchema[];
  defaultParameters: Record<string, unknown>;
  gradientColorParams?: GradientColorParamsConfig;
  render: (imageData: ImageData, parameters?: TParams) => ImageData;
}
