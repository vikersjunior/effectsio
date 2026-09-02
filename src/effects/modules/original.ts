import { cloneImageData } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

const originalParameters: readonly EffectParameterSchema[] = [];

export const originalEffect: EffectDefinition = {
  category: "artistic",
  defaultParameters: {},
  description: "Pass-through unaltered original image without modifications.",
  id: "original",
  name: "Original",
  parameterSchema: originalParameters,
  parameters: originalParameters,
  render: (imageData: ImageData): ImageData => {
    return cloneImageData(imageData);
  },
};
