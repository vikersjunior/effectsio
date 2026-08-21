export type EffectId =
  | "original"
  | "black-and-white"
  | "duotone"
  | "posterize"
  | "grain";

export type EffectCategory =
  | "artistic"
  | "graphic"
  | "retro"
  | "experimental";

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

export interface EffectDefinition {
  id: EffectId;
  name: string;
  category: EffectCategory;
  description: string;
  parameters: readonly EffectParameterSchema[];
  defaultParameters: Record<string, unknown>;
  render: (imageData: ImageData, parameters: Record<string, unknown>) => ImageData;
}
