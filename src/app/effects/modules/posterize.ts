import { clamp, cloneImageData, rgbToGrayscale } from "../canvas-utils";
import type { EffectDefinition } from "../types";

export const posterizeEffect: EffectDefinition = {
  category: "graphic",
  defaultParameters: {
    levels: 4,
    saturation: 1.0,
  },
  description: "Channel quantization reducing color steps per RGB channel.",
  id: "posterize",
  name: "Posterize",
  parameters: [
    {
      defaultValue: 4,
      description: "Number of color steps per RGB channel.",
      label: "Color Levels",
      max: 16,
      min: 2,
      name: "levels",
      step: 1,
      type: "number",
    },
    {
      defaultValue: 1.0,
      description: "Pre-quantization saturation adjustment.",
      label: "Saturation",
      max: 2.0,
      min: 0.5,
      name: "saturation",
      step: 0.1,
      type: "number",
    },
  ],
  render: (imageData: ImageData, parameters: Record<string, unknown>): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;

    const levels = Math.max(2, Math.min(16, typeof parameters.levels === "number" ? Math.round(parameters.levels) : 4));
    const saturation = typeof parameters.saturation === "number" ? parameters.saturation : 1.0;
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]!;
      let g = data[i + 1]!;
      let b = data[i + 2]!;

      // Apply saturation if needed
      if (saturation !== 1.0) {
        const gray = rgbToGrayscale(r, g, b);
        r = clamp(Math.round(gray + (r - gray) * saturation));
        g = clamp(Math.round(gray + (g - gray) * saturation));
        b = clamp(Math.round(gray + (b - gray) * saturation));
      }

      // Quantize
      data[i] = clamp(Math.round(Math.round(r / step) * step));
      data[i + 1] = clamp(Math.round(Math.round(g / step) * step));
      data[i + 2] = clamp(Math.round(Math.round(b / step) * step));
    }

    return output;
  },
};
