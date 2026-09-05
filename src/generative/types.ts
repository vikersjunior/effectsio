import type { BlendMode } from "../types/frame";

export const GENERATIVE_SUBLAYER_TYPES = [
  "solid",
  "linear-gradient",
  "radial-gradient",
  "dots",
  "grid",
] as const;

export type GenerativeSublayerType = (typeof GENERATIVE_SUBLAYER_TYPES)[number];

export type GenerativeSublayerCategory = "color" | "gradient" | "pattern";

export type GenerativeParameterType = "number" | "color" | "boolean" | "select";

export interface GenerativeParameterOption {
  label: string;
  value: string | number;
}

export interface GenerativeParameterSchema {
  name: string;
  label: string;
  type: GenerativeParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description: string;
  options?: readonly GenerativeParameterOption[];
}

export interface GenerativeSublayerDefinition {
  type: GenerativeSublayerType;
  name: string;
  category: GenerativeSublayerCategory;
  description: string;
  parameters: readonly GenerativeParameterSchema[];
  defaultParameters: Record<string, unknown>;
  requiresSeed?: boolean;
}

/**
 * Minimal persisted instance model for an individual generative sublayer.
 * Belongs inside GenerativeLayer.sublayers.
 */
export interface GenerativeSublayer {
  id: string;
  type: GenerativeSublayerType;
  enabled: boolean;
  opacity: number; // Clamped to [0.0, 1.0]
  blendMode: BlendMode; // W3C blend mode over preceding sublayers
  parameters: Record<string, unknown>;
  name?: string;
  seed?: number;
}
