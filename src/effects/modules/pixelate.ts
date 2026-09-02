import { createImageData } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface PixelateParameters {
  blockSize?: number;
}

const pixelateParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 12,
    description: "Pixel block grid dimension in pixels.",
    label: "Block size",
    max: 64,
    min: 2,
    name: "blockSize",
    step: 1,
    type: "number",
  },
];

export const pixelateEffect: EffectDefinition<PixelateParameters> = {
  category: "graphic",
  defaultParameters: {
    blockSize: 12,
  },
  description: "Retro 8-bit mosaic pixelation with adjustable block size.",
  id: "pixelate",
  name: "Pixelate",
  parameterSchema: pixelateParameters,
  parameters: pixelateParameters,
  render(source: ImageData, params?: PixelateParameters): ImageData {
    const rawBlockSize = params?.blockSize ?? 12;
    const blockSize = Math.max(2, Math.min(64, Math.round(rawBlockSize)));

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    for (let blockY = 0; blockY < height; blockY += blockSize) {
      const currentBlockH = Math.min(blockSize, height - blockY);

      for (let blockX = 0; blockX < width; blockX += blockSize) {
        const currentBlockW = Math.min(blockSize, width - blockX);

        // Calculate average color in block
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalA = 0;
        let count = 0;

        for (let dy = 0; dy < currentBlockH; dy++) {
          for (let dx = 0; dx < currentBlockW; dx++) {
            const idx = ((blockY + dy) * width + (blockX + dx)) * 4;
            totalR += srcData[idx];
            totalG += srcData[idx + 1];
            totalB += srcData[idx + 2];
            totalA += srcData[idx + 3];
            count++;
          }
        }

        const avgR = count > 0 ? Math.round(totalR / count) : 0;
        const avgG = count > 0 ? Math.round(totalG / count) : 0;
        const avgB = count > 0 ? Math.round(totalB / count) : 0;
        const avgA = count > 0 ? Math.round(totalA / count) : 0;

        // Fill entire block with average color
        for (let dy = 0; dy < currentBlockH; dy++) {
          for (let dx = 0; dx < currentBlockW; dx++) {
            const outIdx = ((blockY + dy) * width + (blockX + dx)) * 4;
            outData[outIdx] = avgR;
            outData[outIdx + 1] = avgG;
            outData[outIdx + 2] = avgB;
            outData[outIdx + 3] = avgA;
          }
        }
      }
    }

    return output;
  },
};
