import {
  clamp,
  createImageData,
  rgbToGrayscale,
} from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface HalftoneParameters {
  angle?: number;
  brightness?: number;
  contrast?: number;
  density?: number;
  dotSize?: number;
}

const halftoneParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 6,
    description: "Diameter of printed halftone dots.",
    label: "Dot size",
    max: 24,
    min: 2,
    name: "dotSize",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.3,
    description: "Steepness of dot size contrast curve.",
    label: "Contrast",
    max: 2.5,
    min: 0.5,
    name: "contrast",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 45,
    description: "Screen rotation angle in degrees.",
    label: "Pattern angle",
    max: 90,
    min: 0,
    name: "angle",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.0,
    description: "Density spacing multiplier of halftone grid cells.",
    label: "Density",
    max: 2.0,
    min: 0.5,
    name: "density",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 0,
    description: "Luminance tone offset before dot sizing.",
    label: "Brightness",
    max: 50,
    min: -50,
    name: "brightness",
    step: 1,
    type: "number",
  },
];

export const halftoneEffect: EffectDefinition<HalftoneParameters> = {
  category: "artistic",
  defaultParameters: {
    angle: 45,
    brightness: 0,
    contrast: 1.3,
    density: 1.0,
    dotSize: 6,
  },
  description: "Classic newspaper and comic book monochrome halftone dot pattern.",
  id: "halftone",
  name: "Halftone",
  parameterSchema: halftoneParameters,
  parameters: halftoneParameters,
  render(source: ImageData, params?: HalftoneParameters): ImageData {
    const dotSize = params?.dotSize ?? 6;
    const contrast = params?.contrast ?? 1.3;
    const angle = params?.angle ?? 45;
    const density = params?.density ?? 1.0;
    const brightness = params?.brightness ?? 0;

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    const rad = (angle * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    const stepSize = Math.max(2, dotSize / Math.max(0.1, density));
    const maxRadius = (dotSize * Math.SQRT2) / 2;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const outIdx = (y * width + x) * 4;
        const alpha = srcData[outIdx + 3];

        if (alpha === 0) {
          outData[outIdx] = 0;
          outData[outIdx + 1] = 0;
          outData[outIdx + 2] = 0;
          outData[outIdx + 3] = 0;
          continue;
        }

        // Project coordinate into rotated grid space
        const rx = x * cosA + y * sinA;
        const ry = -x * sinA + y * cosA;

        // Find nearest grid cell center
        const cellRx = (Math.floor(rx / stepSize) + 0.5) * stepSize;
        const cellRy = (Math.floor(ry / stepSize) + 0.5) * stepSize;

        // Map back cell center to pixel space
        const cx = Math.max(0, Math.min(width - 1, Math.round(cellRx * cosA - cellRy * sinA)));
        const cy = Math.max(0, Math.min(height - 1, Math.round(cellRx * sinA + cellRy * cosA)));

        // Sample source luminance at cell center
        const centerIdx = (cy * width + cx) * 4;
        const r = srcData[centerIdx];
        const g = srcData[centerIdx + 1];
        const b = srcData[centerIdx + 2];

        let gray = rgbToGrayscale(r, g, b) + brightness;
        gray = (gray - 128) * contrast + 128;
        const normalized = clamp(gray, 0, 255) / 255;

        // Darker regions have larger dot radius
        const dotRadius = (1 - normalized) * maxRadius;

        // Distance from current pixel to cell center
        const dist = Math.hypot(x - cx, y - cy);
        const delta = dist - dotRadius;

        let tone: number;
        if (delta <= -0.5) {
          tone = 0;
        } else if (delta >= 0.5) {
          tone = 255;
        } else {
          tone = Math.round((delta + 0.5) * 255);
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
