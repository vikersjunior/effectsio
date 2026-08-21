import { cloneImageData } from "../canvas-utils";
import type { EffectDefinition } from "../types";

export const originalEffect: EffectDefinition = {
  category: "artistic",
  defaultParameters: {},
  description: "Pass-through unaltered original image without modifications.",
  id: "original",
  name: "Original",
  parameters: [],
  render: (imageData: ImageData): ImageData => {
    return cloneImageData(imageData);
  },
};
