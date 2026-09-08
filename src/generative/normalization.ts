import { DEFAULT_BACKGROUND_STATE, type BackgroundState } from "../types/look";
import type { GenerativeLayer, BackgroundItem, BackgroundItemType } from "../types/frame";
import { BACKGROUND_ITEM_TYPES } from "../types/frame";
import { createBackgroundItem, resolveBackgroundItemParameters } from "./registry";

/**
 * Converts a legacy BackgroundState into an array of BackgroundItems.
 * Transparent background normalizes to an empty backgrounds array ([]).
 */
export function normalizeLegacyBackgroundToBackgrounds(
  config?: BackgroundState
): BackgroundItem[] {
  if (!config || config.type === "transparent") {
    return [];
  }

  const isVisible = config.visible !== false;
  const rawOpacity = typeof config.opacity === "number" ? config.opacity : 100;
  const opacity = Math.max(0.0, Math.min(1.0, rawOpacity / 100));

  switch (config.type) {
    case "solid": {
      return [
        createBackgroundItem("solid", {
          enabled: isVisible,
          opacity,
          blendMode: "normal",
          parameters: {
            color: config.color || "#000000",
          },
        }),
      ];
    }
    case "linear-gradient": {
      return [
        createBackgroundItem("linear-gradient", {
          enabled: isVisible,
          opacity,
          blendMode: "normal",
          parameters: {
            startColor: config.color || "#000000",
            endColor: config.gradientEndColor || "#3b82f6",
            angle: config.gradientAngle ?? 135,
          },
        }),
      ];
    }
    case "radial-gradient": {
      return [
        createBackgroundItem("radial-gradient", {
          enabled: isVisible,
          opacity,
          blendMode: "normal",
          parameters: {
            startColor: config.color || "#000000",
            endColor: config.gradientEndColor || "#3b82f6",
          },
        }),
      ];
    }
    case "dots": {
      return [
        createBackgroundItem("dots", {
          enabled: isVisible,
          opacity,
          blendMode: "normal",
          parameters: {
            dotColor: config.color || "#ffffff",
            backgroundColor: config.patternBackgroundColor || "#000000",
            spacing: config.patternSpacing ?? 24,
            dotSize: 2,
          },
        }),
      ];
    }
    case "grid": {
      return [
        createBackgroundItem("grid", {
          enabled: isVisible,
          opacity,
          blendMode: "normal",
          parameters: {
            lineColor: config.color || "#ffffff",
            backgroundColor: config.patternBackgroundColor || "#000000",
            spacing: config.patternSpacing ?? 24,
            lineWidth: 1,
          },
        }),
      ];
    }
    default:
      return [];
  }
}
export const normalizeLegacyBackgroundToSublayers = normalizeLegacyBackgroundToBackgrounds;

/**
 * Derives a read-only legacy BackgroundState from the canonical BackgroundItem stack.
 * Returns the state of the topmost enabled background (or transparent if no items or all disabled).
 */
export function deriveLegacyBackgroundFromBackgrounds(
  backgrounds?: readonly BackgroundItem[]
): BackgroundState {
  if (!backgrounds || backgrounds.length === 0) {
    return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }

  // Canonical ordering: index 0 is bottom, last is top.
  // Find topmost enabled background; if none enabled, use topmost background with visible = false.
  const topEnabled = [...backgrounds].reverse().find((s) => s.enabled);
  const targetBackground = topEnabled || backgrounds[backgrounds.length - 1];

  if (!targetBackground) {
    return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }

  const opacityPercent = Math.round(targetBackground.opacity * 100);

  switch (targetBackground.type) {
    case "solid": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "solid",
        color: String(targetBackground.parameters.color || "#000000"),
        opacity: opacityPercent,
        visible: targetBackground.enabled,
      };
    }
    case "linear-gradient": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "linear-gradient",
        color: String(targetBackground.parameters.startColor || "#000000"),
        gradientEndColor: String(targetBackground.parameters.endColor || "#3b82f6"),
        gradientAngle: Number(targetBackground.parameters.angle ?? 135),
        opacity: opacityPercent,
        visible: targetBackground.enabled,
      };
    }
    case "radial-gradient": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "radial-gradient",
        color: String(targetBackground.parameters.startColor || "#000000"),
        gradientEndColor: String(targetBackground.parameters.endColor || "#3b82f6"),
        opacity: opacityPercent,
        visible: targetBackground.enabled,
      };
    }
    case "dots": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "dots",
        color: String(targetBackground.parameters.dotColor || "#ffffff"),
        patternBackgroundColor: String(targetBackground.parameters.backgroundColor || "#000000"),
        patternSpacing: Number(targetBackground.parameters.spacing ?? 24),
        opacity: opacityPercent,
        visible: targetBackground.enabled,
      };
    }
    case "grid": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "grid",
        color: String(targetBackground.parameters.lineColor || "#ffffff"),
        patternBackgroundColor: String(targetBackground.parameters.backgroundColor || "#000000"),
        patternSpacing: Number(targetBackground.parameters.spacing ?? 24),
        opacity: opacityPercent,
        visible: targetBackground.enabled,
      };
    }
    default:
      return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }
}
export const deriveLegacyBackgroundFromSublayers = deriveLegacyBackgroundFromBackgrounds;

/**
 * Normalizes a GenerativeLayer document for hydration and backward compatibility.
 * If backgrounds or legacy sublayers exist, validates and sanitizes them into canonical backgrounds.
 * If neither exists, deterministically converts legacy backgroundConfig to backgrounds.
 * Idempotent: normalizeGenerativeLayer(normalizeGenerativeLayer(layer)) is identical.
 */
export function normalizeGenerativeLayer(
  layer: GenerativeLayer | (Partial<GenerativeLayer> & { type: "generative" })
): GenerativeLayer {
  const sourceItems =
    Array.isArray(layer.backgrounds) && layer.backgrounds.length > 0
      ? layer.backgrounds
      : Array.isArray(layer.sublayers) && layer.sublayers.length > 0
      ? layer.sublayers
      : Array.isArray(layer.backgrounds)
      ? layer.backgrounds
      : Array.isArray(layer.sublayers)
      ? layer.sublayers
      : null;

  if (sourceItems) {
    const sanitizedBackgrounds: BackgroundItem[] = sourceItems.map((s, idx) => {
      const type = BACKGROUND_ITEM_TYPES.includes(s.type as BackgroundItemType)
        ? (s.type as BackgroundItemType)
        : "solid";
      const resolvedParams = resolveBackgroundItemParameters(type, s.parameters);
      const opacity =
        typeof s.opacity === "number" && Number.isFinite(s.opacity)
          ? Math.max(0.0, Math.min(1.0, s.opacity))
          : 1.0;
      const enabled = s.enabled !== undefined ? Boolean(s.enabled) : true;
      const id = s.id || `bg-${Date.now()}-${idx}`;

      const sanitized: BackgroundItem = {
        id,
        type,
        enabled,
        opacity,
        blendMode: s.blendMode || "normal",
        parameters: resolvedParams,
      };

      if (s.name) sanitized.name = s.name;
      if (s.seed !== undefined && Number.isFinite(s.seed)) sanitized.seed = Math.floor(s.seed);

      return sanitized;
    });

    const primaryBg = sanitizedBackgrounds[0];
    const defaultSource = primaryBg
      ? {
          type: "procedural" as const,
          kind: primaryBg.type,
          parameters: { ...primaryBg.parameters },
          seed: primaryBg.seed,
        }
      : {
          type: "procedural" as const,
          kind: "solid",
          parameters: { color: "#000000" },
        };

    return {
      id: layer.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `gen-${Date.now()}`),
      name: layer.name || "Background",
      visible: layer.visible ?? true,
      opacity: typeof layer.opacity === "number" ? layer.opacity : 1.0,
      blendMode: layer.blendMode || "normal",
      effectStack: layer.effectStack || [],
      createdAt: layer.createdAt || Date.now(),
      updatedAt: layer.updatedAt || Date.now(),
      ...layer,
      source: (layer as any).source ?? defaultSource,
      type: "generative",
      backgrounds: sanitizedBackgrounds,
      sublayers: sanitizedBackgrounds,
    };
  }

  // Legacy GenerativeLayer without backgrounds or sublayers
  const legacyConfig = layer.backgroundConfig || DEFAULT_BACKGROUND_STATE;
  const backgrounds = normalizeLegacyBackgroundToBackgrounds(legacyConfig);
  const primaryBg = backgrounds[0];
  const defaultSource = primaryBg
    ? {
        type: "procedural" as const,
        kind: primaryBg.type,
        parameters: { ...primaryBg.parameters },
        seed: primaryBg.seed,
      }
    : {
        type: "procedural" as const,
        kind: "solid",
        parameters: { color: "#000000" },
      };

  return {
    id: layer.id || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `gen-${Date.now()}`),
    name: layer.name || "Background",
    visible: layer.visible ?? true,
    opacity: typeof layer.opacity === "number" ? layer.opacity : 1.0,
    blendMode: layer.blendMode || "normal",
    effectStack: layer.effectStack || [],
    createdAt: layer.createdAt || Date.now(),
    updatedAt: layer.updatedAt || Date.now(),
    ...layer,
    source: (layer as any).source ?? defaultSource,
    type: "generative",
    backgrounds,
    sublayers: backgrounds,
  };
}
