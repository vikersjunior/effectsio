import { clamp, cloneImageData } from "../canvas-utils";
import type { EffectDefinition } from "../types";

// Linear congruential generator for reproducible pseudo-random noise
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export const grainEffect: EffectDefinition = {
  category: "retro",
  defaultParameters: {
    intensity: 35,
    size: 1,
  },
  description: "Organic film grain texture noise synthesis.",
  id: "grain",
  name: "Film Grain",
  parameters: [
    {
      defaultValue: 35,
      description: "Film grain noise amplitude.",
      label: "Intensity",
      max: 100,
      min: 5,
      name: "intensity",
      step: 1,
      type: "number",
    },
    {
      defaultValue: 1,
      description: "Grain particle cluster scaling.",
      label: "Particle Size",
      max: 4,
      min: 1,
      name: "size",
      step: 1,
      type: "number",
    },
  ],
  render: (imageData: ImageData, parameters: Record<string, unknown>): ImageData => {
    const output = cloneImageData(imageData);
    const data = output.data;
    const width = imageData.width;
    const height = imageData.height;

    const intensity = typeof parameters.intensity === "number" ? parameters.intensity : 35;
    const size = Math.max(1, Math.min(4, typeof parameters.size === "number" ? Math.round(parameters.size) : 1));
    const noiseScale = intensity * 1.5;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // Block coordinates for particle size
        const bx = Math.floor(x / size);
        const by = Math.floor(y / size);
        const seed = by * 9301 + bx * 49297 + 1337;
        const noise = (pseudoRandom(seed) - 0.5) * noiseScale;

        data[i] = clamp(Math.round(data[i]! + noise));
        data[i + 1] = clamp(Math.round(data[i + 1]! + noise));
        data[i + 2] = clamp(Math.round(data[i + 2]! + noise));
      }
    }

    return output;
  },
};
