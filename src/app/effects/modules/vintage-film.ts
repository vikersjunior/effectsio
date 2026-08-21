import {
  clamp,
  createImageData,
  rgbToGrayscale,
} from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface VintageFilmParameters {
  contrast?: number;
  fade?: number;
  grain?: number;
  saturation?: number;
  vignette?: number;
}

const vintageFilmParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 30,
    description: "Organic analog film grain intensity.",
    label: "Film grain",
    max: 80,
    min: 0,
    name: "grain",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 25,
    description: "Lifted matte black floor level.",
    label: "Faded blacks",
    max: 60,
    min: 0,
    name: "fade",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 1.1,
    description: "Film tonal contrast curve.",
    label: "Contrast",
    max: 2.0,
    min: 0.5,
    name: "contrast",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 0.8,
    description: "Color saturation level.",
    label: "Saturation",
    max: 2.0,
    min: 0.0,
    name: "saturation",
    step: 0.05,
    type: "number",
  },
  {
    defaultValue: 40,
    description: "Radial optical lens edge darkening.",
    label: "Vignette",
    max: 100,
    min: 0,
    name: "vignette",
    step: 1,
    type: "number",
  },
];

export const vintageFilmEffect: EffectDefinition<VintageFilmParameters> = {
  category: "retro",
  defaultParameters: {
    contrast: 1.1,
    fade: 25,
    grain: 30,
    saturation: 0.8,
    vignette: 40,
  },
  description: "Analog film aesthetic with faded blacks, split toning, vintage grain, and lens vignette.",
  id: "vintage-film",
  name: "Vintage Film",
  parameterSchema: vintageFilmParameters,
  parameters: vintageFilmParameters,
  render(source: ImageData, params?: VintageFilmParameters): ImageData {
    const grain = params?.grain ?? 30;
    const fade = params?.fade ?? 25;
    const contrast = params?.contrast ?? 1.1;
    const saturation = params?.saturation ?? 0.8;
    const vignette = params?.vignette ?? 40;

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    const centerX = width * 0.5;
    const centerY = height * 0.5;
    const maxDistSq = (centerX * centerX) + (centerY * centerY);
    const vigStrength = (vignette / 100) * 0.65;

    for (let y = 0; y < height; y++) {
      const dy = y - centerY;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const alpha = srcData[idx + 3];

        if (alpha === 0) {
          outData[idx] = 0;
          outData[idx + 1] = 0;
          outData[idx + 2] = 0;
          outData[idx + 3] = 0;
          continue;
        }

        let r = srcData[idx];
        let g = srcData[idx + 1];
        let b = srcData[idx + 2];

        // 1. Desaturate towards muted vintage tones
        const gray = rgbToGrayscale(r, g, b);
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;

        // 2. Adjust contrast
        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;

        // 3. Vintage color grading: warm highlights, cyan-tinted matte shadows
        const normLuma = clamp(gray, 0, 255) / 255;
        // Lift blacks with matte film fade
        r = r * (1 - fade / 255) + fade * 0.9 + (normLuma * 14);
        g = g * (1 - fade / 255) + fade * 0.95 + (normLuma * 8);
        b = b * (1 - fade / 255) + fade * 1.15;

        // 4. Lens vignette
        if (vigStrength > 0) {
          const dx = x - centerX;
          const distSq = (dx * dx) + (dy * dy);
          const vigFactor = Math.max(0, 1 - (distSq / maxDistSq) * vigStrength);
          r *= vigFactor;
          g *= vigFactor;
          b *= vigFactor;
        }

        // 5. Film grain noise
        if (grain > 0) {
          const pseudoNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 2 - 1;
          const noiseAmount = pseudoNoise * grain * 0.6;
          r += noiseAmount;
          g += noiseAmount;
          b += noiseAmount;
        }

        outData[idx] = clamp(Math.round(r), 0, 255);
        outData[idx + 1] = clamp(Math.round(g), 0, 255);
        outData[idx + 2] = clamp(Math.round(b), 0, 255);
        outData[idx + 3] = alpha;
      }
    }

    return output;
  },
};
