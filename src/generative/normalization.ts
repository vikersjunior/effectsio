import { DEFAULT_BACKGROUND_STATE, type BackgroundState } from "../types/look";
import type { GenerativeLayer } from "../types/frame";
import { createGenerativeSublayer, resolveGenerativeParameters } from "./registry";
import { GENERATIVE_SUBLAYER_TYPES, type GenerativeSublayer } from "./types";

/**
 * Converts a legacy BackgroundState into an array of GenerativeSublayers.
 * Transparent background normalizes to an empty sublayers array ([]).
 */
export function normalizeLegacyBackgroundToSublayers(
  config?: BackgroundState
): GenerativeSublayer[] {
  if (!config || config.type === "transparent") {
    return [];
  }

  const isVisible = config.visible !== false;
  const rawOpacity = typeof config.opacity === "number" ? config.opacity : 100;
  const opacity = Math.max(0.0, Math.min(1.0, rawOpacity / 100));

  switch (config.type) {
    case "solid": {
      return [
        createGenerativeSublayer("solid", {
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
        createGenerativeSublayer("linear-gradient", {
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
        createGenerativeSublayer("radial-gradient", {
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
        createGenerativeSublayer("dots", {
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
        createGenerativeSublayer("grid", {
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

/**
 * Derives a read-only legacy BackgroundState from the canonical GenerativeSublayer stack.
 * Returns the state of the topmost enabled sublayer (or transparent if no sublayers or all disabled).
 */
export function deriveLegacyBackgroundFromSublayers(
  sublayers?: readonly GenerativeSublayer[]
): BackgroundState {
  if (!sublayers || sublayers.length === 0) {
    return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }

  // Canonical ordering: index 0 is bottom, last is top.
  // Find topmost enabled sublayer; if none enabled, use topmost sublayer with visible = false.
  const topEnabled = [...sublayers].reverse().find((s) => s.enabled);
  const targetSublayer = topEnabled || sublayers[sublayers.length - 1];

  if (!targetSublayer) {
    return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }

  const opacityPercent = Math.round(targetSublayer.opacity * 100);

  switch (targetSublayer.type) {
    case "solid": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "solid",
        color: String(targetSublayer.parameters.color || "#000000"),
        opacity: opacityPercent,
        visible: targetSublayer.enabled,
      };
    }
    case "linear-gradient": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "linear-gradient",
        color: String(targetSublayer.parameters.startColor || "#000000"),
        gradientEndColor: String(targetSublayer.parameters.endColor || "#3b82f6"),
        gradientAngle: Number(targetSublayer.parameters.angle ?? 135),
        opacity: opacityPercent,
        visible: targetSublayer.enabled,
      };
    }
    case "radial-gradient": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "radial-gradient",
        color: String(targetSublayer.parameters.startColor || "#000000"),
        gradientEndColor: String(targetSublayer.parameters.endColor || "#3b82f6"),
        opacity: opacityPercent,
        visible: targetSublayer.enabled,
      };
    }
    case "dots": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "dots",
        color: String(targetSublayer.parameters.dotColor || "#ffffff"),
        patternBackgroundColor: String(targetSublayer.parameters.backgroundColor || "#000000"),
        patternSpacing: Number(targetSublayer.parameters.spacing ?? 24),
        opacity: opacityPercent,
        visible: targetSublayer.enabled,
      };
    }
    case "grid": {
      return {
        ...DEFAULT_BACKGROUND_STATE,
        type: "grid",
        color: String(targetSublayer.parameters.lineColor || "#ffffff"),
        patternBackgroundColor: String(targetSublayer.parameters.backgroundColor || "#000000"),
        patternSpacing: Number(targetSublayer.parameters.spacing ?? 24),
        opacity: opacityPercent,
        visible: targetSublayer.enabled,
      };
    }
    default:
      return { ...DEFAULT_BACKGROUND_STATE, type: "transparent" };
  }
}

/**
 * Normalizes a GenerativeLayer document for hydration and backward compatibility.
 * If sublayers already exist, validates and sanitizes them without overwriting from legacy fields.
 * If sublayers do not exist, deterministically converts legacy backgroundConfig to sublayers.
 * Idempotent: normalizeGenerativeLayer(normalizeGenerativeLayer(layer)) is identical.
 */
export function normalizeGenerativeLayer(layer: GenerativeLayer): GenerativeLayer {
  if (Array.isArray(layer.sublayers)) {
    const sanitizedSublayers: GenerativeSublayer[] = layer.sublayers.map((s, idx) => {
      const type = GENERATIVE_SUBLAYER_TYPES.includes(s.type) ? s.type : "solid";
      const resolvedParams = resolveGenerativeParameters(type, s.parameters);
      const opacity =
        typeof s.opacity === "number" && Number.isFinite(s.opacity)
          ? Math.max(0.0, Math.min(1.0, s.opacity))
          : 1.0;
      const enabled = s.enabled !== undefined ? Boolean(s.enabled) : true;
      const id = s.id || `sublayer-${Date.now()}-${idx}`;

      const sanitized: GenerativeSublayer = {
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

    return {
      ...layer,
      sublayers: sanitizedSublayers,
    };
  }

  // Legacy GenerativeLayer without sublayers
  const legacyConfig = layer.backgroundConfig || DEFAULT_BACKGROUND_STATE;
  const sublayers = normalizeLegacyBackgroundToSublayers(legacyConfig);

  return {
    ...layer,
    sublayers,
  };
}
