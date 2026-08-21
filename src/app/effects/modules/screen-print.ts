import {
  clamp,
  createImageData,
  parseHexColor,
  rgbToGrayscale,
} from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface ScreenPrintParameters {
  contrast?: number;
  grain?: number;
  halftoneSize?: number;
  inkColor1?: string;
  inkColor2?: string;
  inkDensity?: number;
  registrationOffset?: number;
}

const screenPrintParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: "#e11d48",
    description: "Primary screen ink color.",
    label: "Primary ink",
    name: "inkColor1",
    type: "color",
  },
  {
    defaultValue: "#0284c7",
    description: "Secondary screen ink color.",
    label: "Secondary ink",
    name: "inkColor2",
    type: "color",
  },
  {
    defaultValue: 1.0,
    description: "Ink saturation density.",
    label: "Ink density",
    max: 2.0,
    min: 0.5,
    name: "inkDensity",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 8,
    description: "Halftone dot grid size.",
    label: "Halftone size",
    max: 20,
    min: 2,
    name: "halftoneSize",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 20,
    description: "Paper and ink fiber noise texture.",
    label: "Ink texture grain",
    max: 60,
    min: 0,
    name: "grain",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.4,
    description: "Separation plate tonal contrast curve.",
    label: "Contrast",
    max: 2.5,
    min: 0.5,
    name: "contrast",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 3,
    description: "Misaligned color registration offset in pixels.",
    label: "Registration offset",
    max: 12,
    min: 0,
    name: "registrationOffset",
    step: 1,
    type: "number",
  },
];

export const screenPrintEffect: EffectDefinition<ScreenPrintParameters> = {
  category: "artistic",
  defaultParameters: {
    contrast: 1.4,
    grain: 20,
    halftoneSize: 8,
    inkColor1: "#e11d48",
    inkColor2: "#0284c7",
    inkDensity: 1.0,
    registrationOffset: 3,
  },
  description: "Multi-plate serigraphy screen print with ink registration offset and paper texture.",
  id: "screen-print",
  name: "Screen Print",
  parameterSchema: screenPrintParameters,
  parameters: screenPrintParameters,
  render(source: ImageData, params?: ScreenPrintParameters): ImageData {
    const inkColor1 = parseHexColor(params?.inkColor1, "#e11d48");
    const inkColor2 = parseHexColor(params?.inkColor2, "#0284c7");
    const inkDensity = params?.inkDensity ?? 1.0;
    const halftoneSize = params?.halftoneSize ?? 8;
    const grain = params?.grain ?? 20;
    const contrast = params?.contrast ?? 1.4;
    const registrationOffset = params?.registrationOffset ?? 3;

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    // Angles for plate separation (15° and 75°)
    const rad1 = (15 * Math.PI) / 180;
    const cos1 = Math.cos(rad1);
    const sin1 = Math.sin(rad1);

    const rad2 = (75 * Math.PI) / 180;
    const cos2 = Math.cos(rad2);
    const sin2 = Math.sin(rad2);

    const stepSize = Math.max(2, halftoneSize / Math.max(0.1, inkDensity));
    const maxRadius = (halftoneSize * Math.SQRT2) / 2;

    // Paper base tone (warm natural paper)
    const paperR = 250;
    const paperG = 248;
    const paperB = 244;

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

        // Plate 1: Primary ink (Shadows/Midtones)
        const rx1 = x * cos1 + y * sin1;
        const ry1 = -x * sin1 + y * cos1;
        const cell1Rx = (Math.floor(rx1 / stepSize) + 0.5) * stepSize;
        const cell1Ry = (Math.floor(ry1 / stepSize) + 0.5) * stepSize;
        const cx1 = Math.max(0, Math.min(width - 1, Math.round(cell1Rx * cos1 - cell1Ry * sin1)));
        const cy1 = Math.max(0, Math.min(height - 1, Math.round(cell1Rx * sin1 + cell1Ry * cos1)));

        const c1Idx = (cy1 * width + cx1) * 4;
        const gray1 = rgbToGrayscale(srcData[c1Idx], srcData[c1Idx + 1], srcData[c1Idx + 2]);
        const contrasted1 = (gray1 - 128) * contrast + 128;
        const norm1 = clamp(contrasted1, 0, 255) / 255;
        const dotRadius1 = (1 - norm1) * maxRadius;
        const dist1 = Math.hypot(x - cx1, y - cy1);
        const cov1 = clamp((dotRadius1 - dist1 + 0.5), 0, 1) * inkDensity;

        // Plate 2: Secondary ink (Offset registration & Midtones)
        const offX = x - registrationOffset;
        const offY = y + Math.round(registrationOffset * 0.5);
        const rx2 = offX * cos2 + offY * sin2;
        const ry2 = -offX * sin2 + offY * cos2;
        const cell2Rx = (Math.floor(rx2 / stepSize) + 0.5) * stepSize;
        const cell2Ry = (Math.floor(ry2 / stepSize) + 0.5) * stepSize;
        const cx2 = Math.max(0, Math.min(width - 1, Math.round(cell2Rx * cos2 - cell2Ry * sin2)));
        const cy2 = Math.max(0, Math.min(height - 1, Math.round(cell2Rx * sin2 + cell2Ry * cos2)));

        const c2Idx = (cy2 * width + cx2) * 4;
        const gray2 = rgbToGrayscale(srcData[c2Idx], srcData[c2Idx + 1], srcData[c2Idx + 2]);
        // Plate 2 maps midtone richness
        const contrasted2 = (Math.abs(gray2 - 128) * 2 - 128) * contrast + 128;
        const norm2 = clamp(255 - contrasted2, 0, 255) / 255;
        const dotRadius2 = norm2 * maxRadius * 0.85;
        const dist2 = Math.hypot(offX - cx2, offY - cy2);
        const cov2 = clamp((dotRadius2 - dist2 + 0.5), 0, 1) * inkDensity;

        // Subtractive ink multiplication onto paper base
        let r = (paperR / 255) * (1 - cov1 * (1 - inkColor1.r / 255)) * (1 - cov2 * (1 - inkColor2.r / 255)) * 255;
        let g = (paperG / 255) * (1 - cov1 * (1 - inkColor1.g / 255)) * (1 - cov2 * (1 - inkColor2.g / 255)) * 255;
        let b = (paperB / 255) * (1 - cov1 * (1 - inkColor1.b / 255)) * (1 - cov2 * (1 - inkColor2.b / 255)) * 255;

        // Add organic tactile paper/ink grain
        if (grain > 0) {
          const pseudoNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 2 - 1;
          const noiseOffset = pseudoNoise * grain * 0.5;
          r += noiseOffset;
          g += noiseOffset;
          b += noiseOffset;
        }

        outData[outIdx] = clamp(Math.round(r), 0, 255);
        outData[outIdx + 1] = clamp(Math.round(g), 0, 255);
        outData[outIdx + 2] = clamp(Math.round(b), 0, 255);
        outData[outIdx + 3] = alpha;
      }
    }

    return output;
  },
};
