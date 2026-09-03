import type { EffectStack } from "./asset";

export type LookCategory = "editorial" | "retro" | "experimental" | "monochrome" | "custom";

export interface Look {
  id: string;
  name: string;
  category: LookCategory;
  description: string;
  isBuiltIn: boolean;
  effectStack: EffectStack;
  createdAt: number;
}

export type BackgroundType =
  | "transparent"
  | "solid"
  | "linear-gradient"
  | "radial-gradient"
  | "dots"
  | "grid";

export interface BackgroundState {
  type: BackgroundType;
  color: string;                  // Solid color or primary gradient/pattern color (Hex)
  opacity?: number;               // Color opacity in percent (0 to 100)
  gradientEndColor?: string;      // Second color stop for linear/radial gradient
  gradientAngle?: number;         // 0° to 360° for linear gradient
  patternSpacing?: number;        // Grid or dot spacing in pixels (8px to 64px)
  padding?: number;               // Canvas framing padding in pixels (0px to 120px)
  borderRadius?: number;          // Framed image corner radius in pixels (0px to 48px)
  shadowBlur?: number;            // Drop shadow blur in pixels (0px to 64px)
  shadowOpacity?: number;         // Drop shadow opacity (0.0 to 1.0)
  visible?: boolean;              // Background visibility toggle (eye icon)
  gradientType?: "linear" | "radial" | "angular" | "diamond";
  gradientStops?: readonly { color: string; position: string; opacity?: number }[];
}

export const DEFAULT_BACKGROUND_STATE: BackgroundState = {
  type: "transparent",
  color: "#000000",
  opacity: 100,
  gradientEndColor: "#3b82f6",
  gradientAngle: 135,
  patternSpacing: 24,
  padding: 0,
  borderRadius: 0,
  shadowBlur: 16,
  shadowOpacity: 0.4,
};
