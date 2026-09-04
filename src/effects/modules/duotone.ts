import { clamp, cloneImageData, parseHexColor, rgbToGrayscale } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface DuotoneParameters {
  contrast?: number;
  highlightColor?: string;
  shadowColor?: string;
  shadowPosition?: number;
  highlightPosition?: number;
}

const duotoneParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: "#0f172a",
    description: "Color mapped to dark shadow tones.",
    label: "Shadow color",
    name: "shadowColor",
    type: "color",
  },
  {
    defaultValue: "#38bdf8",
    description: "Color mapped to bright highlight tones.",
    label: "Highlight color",
    name: "highlightColor",
    type: "color",
  },
  {
    defaultValue: 0,
    description: "Tonal threshold position for shadow color (0-100%).",
    label: "Shadow position",
    max: 100,
    min: 0,
    name: "shadowPosition",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 100,
    description: "Tonal threshold position for highlight color (0-100%).",
    label: "Highlight position",
    max: 100,
    min: 0,
    name: "highlightPosition",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.0,
    description: "Steepness of the gradient transition curve.",
    label: "Contrast",
    max: 2.0,
    min: 0.5,
    name: "contrast",
    step: 0.05,
    type: "number",
  },
];

export const duotoneEffect: EffectDefinition<DuotoneParameters> = {
  category: "artistic",
  defaultParameters: {
    contrast: 1.0,
    highlightColor: "#38bdf8",
    shadowColor: "#0f172a",
    shadowPosition: 0,
    highlightPosition: 100,
  },
  description: "Two-color gradient tone mapping between shadow and highlight tones.",
  id: "duotone",
  name: "Duotone",
  gradientColorParams: {
    startColorParam: "shadowColor",
    endColorParam: "highlightColor",
    startPositionParam: "shadowPosition",
    endPositionParam: "highlightPosition",
    startLabel: "Shadow",
    endLabel: "Highlight",
    label: "Gradient",
  },
  parameterSchema: duotoneParameters,
  parameters: duotoneParameters,
  render: (imageData: ImageData, parameters?: DuotoneParameters): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;
    const shadow = parseHexColor(parameters?.shadowColor, "#0f172a");
    const highlight = parseHexColor(parameters?.highlightColor, "#38bdf8");
    const contrast = typeof parameters?.contrast === "number" ? parameters.contrast : 1.0;
    const shadowPos = (typeof parameters?.shadowPosition === "number" ? parameters.shadowPosition : 0) / 100;
    const highlightPos = (typeof parameters?.highlightPosition === "number" ? parameters.highlightPosition : 100) / 100;
    const range = highlightPos - shadowPos;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const gray = rgbToGrayscale(r, g, b);
      const grayNorm = gray / 255;
      let t = Math.abs(range) < 0.0001
        ? (grayNorm >= shadowPos ? 1 : 0)
        : clamp((grayNorm - shadowPos) / range, 0, 1);

      if (contrast !== 1.0) {
        t = clamp(Math.pow(t, contrast), 0, 1);
      }

      data[i] = clamp(Math.round(shadow.r + (highlight.r - shadow.r) * t));
      data[i + 1] = clamp(Math.round(shadow.g + (highlight.g - shadow.g) * t));
      data[i + 2] = clamp(Math.round(shadow.b + (highlight.b - shadow.b) * t));
    }

    return output;
  },
};
