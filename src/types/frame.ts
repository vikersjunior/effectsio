import type { EffectStack } from "./asset";
import type { BackgroundState, BackgroundType } from "./look";
import { DEFAULT_BACKGROUND_STATE } from "./look";

/**
 * Selected Stage 1 subset of blend modes implemented according to
 * relevant W3C Compositing and Blending Level 1 specifications.
 */
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export interface FrameDimensions {
  width: number;
  height: number;
  presetId?: string | null;
}

export interface FrameSizePreset {
  id: string;
  name: string;
  category: "Square" | "Free" | "Landscape" | "Portrait";
  width: number;
  height: number;
  aspectRatioLabel: string;
}

export interface BaseLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0.0 to 1.0
  blendMode: BlendMode; // Layer-level blend mode interacting with accumulated backdrop
  effectStack: EffectStack;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * ImageLayer represents an imported visual asset placed within a Frame.
 *
 * Stage 1 Constraint: No layer transforms (x, y, scale, rotation).
 * Image layers automatically occupy the defined frame bounds according to `fit`.
 * Interactive drag, scale, rotation handles, and transform state are strictly deferred to future stages.
 */
export interface ImageLayer extends BaseLayer {
  type: "image";
  assetId: string; // References immutable source Asset in assets store
  fit: "contain" | "cover";
}

/**
 * GenerativeLayer represents procedural canvas background content.
 *
 * Stage 1 Constraint: Thin generative layer representing the 6 existing background modes only.
 * Serves as an intentional extension point for future procedural systems without prescribing
 * the Stage 2 generative sub-layer schema.
 */
export interface GenerativeLayer extends BaseLayer {
  type: "generative";
  backgroundMode: BackgroundType;
  backgroundConfig: BackgroundState;
}

export type Layer = ImageLayer | GenerativeLayer;

/**
 * Frame represents a complete, bounded composition document.
 *
 * Ownership Rule: Frame owns ordered layers. The background is owned exclusively
 * by a GenerativeLayer at the base of `layers`. Frame does NOT maintain a separate
 * `background` field.
 */
export interface Frame {
  id: string;
  name: string;
  dimensions: FrameDimensions;
  layers: Layer[]; // Ordered bottom-to-top (index 0 = backdrop, N-1 = foreground)
  activeLayerId: string | null;
  createdAt: number;
  updatedAt: number;
}

export const FRAME_SIZE_PRESETS: readonly FrameSizePreset[] = [
  { id: "1:1", name: "Square", category: "Square", width: 1080, height: 1080, aspectRatioLabel: "1:1" },
  { id: "4:5", name: "Portrait (4:5)", category: "Portrait", width: 1080, height: 1350, aspectRatioLabel: "4:5" },
  { id: "9:16", name: "Story / Reel (9:16)", category: "Portrait", width: 1080, height: 1920, aspectRatioLabel: "9:16" },
  { id: "16:9", name: "Landscape (16:9)", category: "Landscape", width: 1920, height: 1080, aspectRatioLabel: "16:9" },
  { id: "4:3", name: "Standard (4:3)", category: "Landscape", width: 1440, height: 1080, aspectRatioLabel: "4:3" },
  { id: "2:3", name: "Classic 35mm (2:3)", category: "Portrait", width: 1080, height: 1620, aspectRatioLabel: "2:3" },
] as const;

export const DEFAULT_FRAME_DIMENSIONS: FrameDimensions = {
  width: 1080,
  height: 1080,
  presetId: "1:1",
};

/**
 * Creates a default base GenerativeLayer permanently anchored at index 0.
 */
export function createDefaultGenerativeLayer(backgroundConfig?: BackgroundState): GenerativeLayer {
  const now = Date.now();
  const hasExplicitConfig = Boolean(backgroundConfig);
  const config = backgroundConfig ? { ...backgroundConfig } : { ...DEFAULT_BACKGROUND_STATE };
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `gen-${Date.now()}`,
    name: "Background",
    visible: hasExplicitConfig ? (config.visible ?? true) : false,
    opacity: 1.0,
    blendMode: "normal",
    effectStack: [],
    type: "generative",
    backgroundMode: config.type,
    backgroundConfig: config,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates an ImageLayer placed in a Frame referencing an immutable source asset.
 */
export function createImageLayer(
  assetId: string,
  name?: string,
  effectStack: EffectStack = [],
  fit: "contain" | "cover" = "contain"
): ImageLayer {
  const now = Date.now();
  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name || "Image Layer",
    visible: true,
    opacity: 1.0,
    blendMode: "normal",
    effectStack: [...effectStack],
    type: "image",
    assetId,
    fit,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Synthesizes a new default Frame with a protected GenerativeLayer backdrop at index 0.
 */
export function createDefaultFrame(id?: string, name?: string): Frame {
  const now = Date.now();
  const baseBackdrop = createDefaultGenerativeLayer();
  const frameId = id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `frame-${now}`);
  return {
    id: frameId,
    name: name || "Frame 1",
    dimensions: { ...DEFAULT_FRAME_DIMENSIONS },
    layers: [baseBackdrop],
    activeLayerId: baseBackdrop.id,
    createdAt: now,
    updatedAt: now,
  };
}
