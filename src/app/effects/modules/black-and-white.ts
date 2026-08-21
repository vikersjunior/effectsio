import { clamp, cloneImageData, rgbToGrayscale } from "../canvas-utils";
import type { EffectDefinition } from "../types";

export const blackAndWhiteEffect: EffectDefinition = {
  category: "graphic",
  defaultParameters: {
    contrast: 1.2,
    warmth: 0,
  },
  description: "Monochrome luminance conversion with contrast and warmth tint.",
  id: "black-and-white",
  name: "Black & White",
  parameters: [
    {
      defaultValue: 1.2,
      description: "Monochrome contrast balance.",
      label: "Contrast",
      max: 2.5,
      min: 0.5,
      name: "contrast",
      step: 0.05,
      type: "number",
    },
    {
      defaultValue: 0,
      description: "Warm (sepia-leaning) or cool (cyan-leaning) tone offset.",
      label: "Warmth",
      max: 50,
      min: -50,
      name: "warmth",
      step: 1,
      type: "number",
    },
  ],
  render: (imageData: ImageData, parameters: Record<string, unknown>): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;
    const contrast = typeof parameters.contrast === "number" ? parameters.contrast : 1.2;
    const warmth = typeof parameters.warmth === "number" ? parameters.warmth : 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      let gray = rgbToGrayscale(r, g, b);
      // Contrast adjustment centered at 128
      gray = clamp(Math.round((gray - 128) * contrast + 128));

      // Apply warmth offset
      data[i] = clamp(gray + warmth);
      data[i + 1] = clamp(gray + Math.round(warmth * 0.5));
      data[i + 2] = clamp(gray - warmth);
    }

    return output;
  },
};
