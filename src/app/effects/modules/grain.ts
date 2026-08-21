import { clamp, cloneImageData } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface GrainParameters {
  intensity?: number;
}

const grainParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 35,
    description: "Noise amplitude percentage.",
    label: "Intensity",
    max: 100,
    min: 5,
    name: "intensity",
    step: 1,
    type: "number",
  },
];

export const grainEffect: EffectDefinition<GrainParameters> = {
  category: "retro",
  defaultParameters: {
    intensity: 35,
  },
  description: "Applies organic monochromatic film noise over the image.",
  id: "grain",
  name: "Film Grain",
  parameterSchema: grainParameters,
  parameters: grainParameters,
  render: (imageData: ImageData, parameters?: GrainParameters): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;
    const intensity = typeof parameters?.intensity === "number" ? parameters.intensity : 35;
    const maxNoise = (intensity / 100) * 128;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * maxNoise;
      data[i] = clamp(Math.round(data[i]! + noise));
      data[i + 1] = clamp(Math.round(data[i + 1]! + noise));
      data[i + 2] = clamp(Math.round(data[i + 2]! + noise));
    }

    return output;
  },
};
