import type { BlendMode } from "../types/frame";
import type {
  GenerativeParameterSchema,
  GenerativeSublayer,
  GenerativeSublayerDefinition,
  GenerativeSublayerType,
} from "./types";

const VALID_BLEND_MODES: readonly BlendMode[] = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
];

export const GENERATIVE_SUBLAYER_REGISTRY: Record<
  GenerativeSublayerType,
  GenerativeSublayerDefinition
> = {
  solid: {
    type: "solid",
    name: "Solid Color",
    category: "color",
    description: "Uniform solid color fill across the frame.",
    parameters: [
      {
        name: "color",
        label: "Color",
        type: "color",
        defaultValue: "#000000",
        description: "Fill color in hex format.",
      },
    ],
    defaultParameters: {
      color: "#000000",
    },
    requiresSeed: false,
  },
  "linear-gradient": {
    type: "linear-gradient",
    name: "Linear Gradient",
    category: "gradient",
    description: "Two-stop linear directional gradient.",
    parameters: [
      {
        name: "startColor",
        label: "Start Color",
        type: "color",
        defaultValue: "#000000",
        description: "Gradient origin color.",
      },
      {
        name: "endColor",
        label: "End Color",
        type: "color",
        defaultValue: "#3b82f6",
        description: "Gradient destination color.",
      },
      {
        name: "angle",
        label: "Angle",
        type: "number",
        defaultValue: 135,
        min: 0,
        max: 360,
        step: 1,
        unit: "deg",
        description: "Gradient direction angle in degrees.",
      },
    ],
    defaultParameters: {
      startColor: "#000000",
      endColor: "#3b82f6",
      angle: 135,
    },
    requiresSeed: false,
  },
  "radial-gradient": {
    type: "radial-gradient",
    name: "Radial Gradient",
    category: "gradient",
    description: "Two-stop centered radial gradient.",
    parameters: [
      {
        name: "startColor",
        label: "Center Color",
        type: "color",
        defaultValue: "#000000",
        description: "Radial center color.",
      },
      {
        name: "endColor",
        label: "Outer Color",
        type: "color",
        defaultValue: "#3b82f6",
        description: "Radial edge color.",
      },
    ],
    defaultParameters: {
      startColor: "#000000",
      endColor: "#3b82f6",
    },
    requiresSeed: false,
  },
  dots: {
    type: "dots",
    name: "Dot Matrix",
    category: "pattern",
    description: "Geometric dot grid pattern.",
    parameters: [
      {
        name: "dotColor",
        label: "Dot Color",
        type: "color",
        defaultValue: "#ffffff",
        description: "Color of the dot elements.",
      },
      {
        name: "backgroundColor",
        label: "Background Color",
        type: "color",
        defaultValue: "#000000",
        description: "Color behind the dots.",
      },
      {
        name: "spacing",
        label: "Spacing",
        type: "number",
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 1,
        unit: "px",
        description: "Distance between dot centers in pixels.",
      },
      {
        name: "dotSize",
        label: "Dot Size",
        type: "number",
        defaultValue: 2,
        min: 1,
        max: 16,
        step: 1,
        unit: "px",
        description: "Diameter of each dot in pixels.",
      },
    ],
    defaultParameters: {
      dotColor: "#ffffff",
      backgroundColor: "#000000",
      spacing: 24,
      dotSize: 2,
    },
    requiresSeed: false,
  },
  grid: {
    type: "grid",
    name: "Grid Lines",
    category: "pattern",
    description: "Geometric rectangular grid lines.",
    parameters: [
      {
        name: "lineColor",
        label: "Line Color",
        type: "color",
        defaultValue: "#ffffff",
        description: "Color of the grid lines.",
      },
      {
        name: "backgroundColor",
        label: "Background Color",
        type: "color",
        defaultValue: "#000000",
        description: "Color behind the grid.",
      },
      {
        name: "spacing",
        label: "Spacing",
        type: "number",
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 1,
        unit: "px",
        description: "Grid cell spacing in pixels.",
      },
      {
        name: "lineWidth",
        label: "Line Width",
        type: "number",
        defaultValue: 1,
        min: 1,
        max: 8,
        step: 1,
        unit: "px",
        description: "Stroke width of the grid lines in pixels.",
      },
    ],
    defaultParameters: {
      lineColor: "#ffffff",
      backgroundColor: "#000000",
      spacing: 24,
      lineWidth: 1,
    },
    requiresSeed: false,
  },
};

/**
 * Validates and resolves user parameter overrides against the definition schema and defaults.
 * Preserves valid user values, clamps out-of-bounds numbers, rejects invalid options/colors,
 * and leaves the input object unmutated.
 */
export function resolveGenerativeParameters(
  type: GenerativeSublayerType,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  const def = GENERATIVE_SUBLAYER_REGISTRY[type];
  if (!def) {
    return overrides ? { ...overrides } : {};
  }

  const result: Record<string, unknown> = { ...def.defaultParameters };
  if (!overrides || typeof overrides !== "object") {
    return result;
  }

  for (const schema of def.parameters) {
    const userVal = overrides[schema.name];
    if (userVal === undefined || userVal === null) {
      continue;
    }

    switch (schema.type) {
      case "number": {
        const num = Number(userVal);
        if (Number.isFinite(num)) {
          let clamped = num;
          if (schema.min !== undefined) clamped = Math.max(schema.min, clamped);
          if (schema.max !== undefined) clamped = Math.min(schema.max, clamped);
          result[schema.name] = clamped;
        }
        break;
      }
      case "color": {
        if (typeof userVal === "string" && /^#[0-9a-fA-F]{3,8}$/.test(userVal.trim())) {
          result[schema.name] = userVal.trim();
        }
        break;
      }
      case "boolean": {
        result[schema.name] = Boolean(userVal);
        break;
      }
      case "select": {
        if (schema.options && schema.options.length > 0) {
          const isValidOption = schema.options.some((opt) => opt.value === userVal);
          if (isValidOption) {
            result[schema.name] = userVal;
          }
        } else {
          result[schema.name] = userVal;
        }
        break;
      }
    }
  }

  return result;
}

/**
 * Instantiates a new, validated GenerativeSublayer model instance.
 */
export function createGenerativeSublayer(
  type: GenerativeSublayerType,
  overrides?: Partial<GenerativeSublayer>
): GenerativeSublayer {
  const def = GENERATIVE_SUBLAYER_REGISTRY[type];
  const id =
    overrides?.id ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `sublayer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);

  const resolvedParams = resolveGenerativeParameters(type, overrides?.parameters);

  const opacity =
    typeof overrides?.opacity === "number" && Number.isFinite(overrides.opacity)
      ? Math.max(0.0, Math.min(1.0, overrides.opacity))
      : 1.0;

  const blendMode =
    overrides?.blendMode && VALID_BLEND_MODES.includes(overrides.blendMode)
      ? overrides.blendMode
      : "normal";

  const sublayer: GenerativeSublayer = {
    id,
    type,
    enabled: overrides?.enabled !== undefined ? Boolean(overrides.enabled) : true,
    opacity,
    blendMode,
    parameters: resolvedParams,
  };

  if (overrides?.name !== undefined && typeof overrides.name === "string" && overrides.name.trim().length > 0) {
    sublayer.name = overrides.name.trim();
  }

  if (def?.requiresSeed || overrides?.seed !== undefined) {
    sublayer.seed =
      typeof overrides?.seed === "number" && Number.isFinite(overrides.seed)
        ? Math.floor(overrides.seed)
        : Math.floor(Math.random() * 1000000);
  }

  return sublayer;
}
