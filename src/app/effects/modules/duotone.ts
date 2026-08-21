import { clamp, cloneImageData, parseHexColor, rgbToGrayscale } from "../canvas-utils";
import type { EffectDefinition } from "../types";

export const duotoneEffect: EffectDefinition = {
  category: "graphic",
  defaultParameters: {
    contrast: 1.0,
    highlightColor: "#38bdf8",
    shadowColor: "#0f172a",
  },
  description: "Dual-color gradient mapping between shadow and highlight tones.",
  id: "duotone",
  name: "Duotone",
  parameters: [
    {
      defaultValue: "#0f172a",
      description: "Color mapped to dark shadows.",
      label: "Shadow Color",
      name: "shadowColor",
      type: "color",
    },
    {
      defaultValue: "#38bdf8",
      description: "Color mapped to bright highlights.",
      label: "Highlight Color",
      name: "highlightColor",
      type: "color",
    },
    {
      defaultValue: 1.0,
      description: "Steepness of gradient transition curve.",
      label: "Contrast",
      max: 2.0,
      min: 0.5,
      name: "contrast",
      step: 0.05,
      type: "number",
    },
  ],
  render: (imageData: ImageData, parameters: Record<string, unknown>): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;

    const shadow = parseHexColor(parameters.shadowColor, "#0f172a");
    const highlight = parseHexColor(parameters.highlightColor, "#38bdf8");
    const contrast = typeof parameters.contrast === "number" ? parameters.contrast : 1.0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const gray = rgbToGrayscale(r, g, b);
      let t = gray / 255;

      if (contrast !== 1.0) {
        t = Math.pow(t, contrast);
      }

      data[i] = clamp(Math.round(shadow.r + (highlight.r - shadow.r) * t));
      data[i + 1] = clamp(Math.round(shadow.g + (highlight.g - shadow.g) * t));
      data[i + 2] = clamp(Math.round(shadow.b + (highlight.b - shadow.b) * t));
    }

    return output;
  },
};
