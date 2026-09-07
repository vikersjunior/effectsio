import type { BlendMode } from "../types/frame";
import {
  BACKGROUND_ITEM_TYPES,
  type BackgroundItemType,
  type BackgroundItem,
  type GenerativeSublayer,
  type GenerativeSublayerType,
} from "../types/frame";

export {
  BACKGROUND_ITEM_TYPES,
  type BackgroundItemType,
  type BackgroundItem,
  type GenerativeSublayer,
  type GenerativeSublayerType,
};

// Backward-compatible alias
export const GENERATIVE_SUBLAYER_TYPES = BACKGROUND_ITEM_TYPES;

export type BackgroundItemCategory = "color" | "gradient" | "pattern";
export type GenerativeSublayerCategory = BackgroundItemCategory;

export type BackgroundParameterType = "number" | "color" | "boolean" | "select";
export type GenerativeParameterType = BackgroundParameterType;

export interface BackgroundParameterOption {
  label: string;
  value: string | number;
}
export type GenerativeParameterOption = BackgroundParameterOption;

export interface BackgroundParameterSchema {
  name: string;
  label: string;
  type: BackgroundParameterType;
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  description: string;
  options?: readonly BackgroundParameterOption[];
}
export type GenerativeParameterSchema = BackgroundParameterSchema;

export interface BackgroundItemDefinition {
  type: BackgroundItemType;
  name: string;
  category: BackgroundItemCategory;
  description: string;
  parameters: readonly BackgroundParameterSchema[];
  defaultParameters: Record<string, unknown>;
  requiresSeed?: boolean;
}
export type GenerativeSublayerDefinition = BackgroundItemDefinition;
