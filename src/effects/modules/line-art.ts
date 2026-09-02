import {
  clamp,
  createImageData,
  rgbToGrayscale,
} from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface LineArtParameters {
  edgeThreshold?: number;
  invert?: boolean;
  lineWeight?: number;
}

const lineArtParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 45,
    description: "Contour edge detection threshold sensitivity.",
    label: "Edge threshold",
    max: 150,
    min: 10,
    name: "edgeThreshold",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.5,
    description: "Contour line thickness and stroke weight.",
    label: "Line weight",
    max: 5.0,
    min: 0.5,
    name: "lineWeight",
    step: 0.1,
    type: "number",
  },
  {
    defaultValue: false,
    description: "Invert line polarity (white contours on black background).",
    label: "Invert polarity",
    name: "invert",
    type: "boolean",
  },
];

export const lineArtEffect: EffectDefinition<LineArtParameters> = {
  category: "artistic",
  defaultParameters: {
    edgeThreshold: 45,
    invert: false,
    lineWeight: 1.5,
  },
  description: "High-contrast ink contour line extraction with adjustable threshold and stroke weight.",
  id: "line-art",
  name: "Line Art",
  parameterSchema: lineArtParameters,
  parameters: lineArtParameters,
  render(source: ImageData, params?: LineArtParameters): ImageData {
    const edgeThreshold = params?.edgeThreshold ?? 45;
    const lineWeight = params?.lineWeight ?? 1.5;
    const invert = Boolean(params?.invert);

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    // Convert source into grayscale buffer
    const grayBuffer = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      grayBuffer[i] = rgbToGrayscale(srcData[idx], srcData[idx + 1], srcData[idx + 2]);
    }

    for (let y = 0; y < height; y++) {
      const yPrev = Math.max(0, y - 1);
      const yNext = Math.min(height - 1, y + 1);

      for (let x = 0; x < width; x++) {
        const xPrev = Math.max(0, x - 1);
        const xNext = Math.min(width - 1, x + 1);

        const outIdx = (y * width + x) * 4;
        const alpha = srcData[outIdx + 3];

        if (alpha === 0) {
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = 0;
          continue;
        }

        // 3x3 Sobel convolution
        const p00 = grayBuffer[yPrev * width + xPrev];
        const p01 = grayBuffer[yPrev * width + x];
        const p02 = grayBuffer[yPrev * width + xNext];

        const p10 = grayBuffer[y * width + xPrev];
        const p12 = grayBuffer[y * width + xNext];

        const p20 = grayBuffer[yNext * width + xPrev];
        const p21 = grayBuffer[yNext * width + x];
        const p22 = grayBuffer[yNext * width + xNext];

        // Horizontal gradient Gx
        const gx = -p00 - 2 * p10 - p20 + p02 + 2 * p12 + p22;
        // Vertical gradient Gy
        const gy = -p00 - 2 * p01 - p02 + p20 + 2 * p21 + p22;

        const magnitude = Math.hypot(gx, gy);

        // Edge response normalized by threshold and scaled by lineWeight
        const edgeNorm = Math.max(0, (magnitude - edgeThreshold) / Math.max(1, edgeThreshold));
        const edgeStrength = clamp(edgeNorm * lineWeight, 0, 1);

        // By default: black contours (0) on white paper (255)
        let tone: number;
        if (invert) {
          tone = Math.round(edgeStrength * 255);
        } else {
          tone = Math.round((1 - edgeStrength) * 255);
        }

        outData[outIdx] = tone;
        outData[outIdx + 1] = tone;
        outData[outIdx + 2] = tone;
        outData[outIdx + 3] = alpha;
      }
    }

    return output;
  },
};
