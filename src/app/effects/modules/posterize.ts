import { clamp, cloneImageData } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface PosterizeParameters {
  levels?: number;
}

const posterizeParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 4,
    description: "Number of discrete color levels per RGB channel.",
    label: "Color levels",
    max: 16,
    min: 2,
    name: "levels",
    step: 1,
    type: "number",
  },
];

export const posterizeEffect: EffectDefinition<PosterizeParameters> = {
  category: "graphic",
  defaultParameters: {
    levels: 4,
  },
  description: "Reduces color depth to create high-contrast poster-like color quantization.",
  id: "posterize",
  name: "Posterize",
  parameterSchema: posterizeParameters,
  parameters: posterizeParameters,
  render: (imageData: ImageData, parameters?: PosterizeParameters): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;
    const rawLevels = typeof parameters?.levels === "number" ? parameters.levels : 4;
    const levels = Math.max(2, Math.min(16, Math.round(rawLevels)));
    const step = 255 / (levels - 1);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      data[i] = clamp(Math.round(Math.round(r / step) * step));
      data[i + 1] = clamp(Math.round(Math.round(g / step) * step));
      data[i + 2] = clamp(Math.round(Math.round(b / step) * step));
    }

    return output;
  },
};
