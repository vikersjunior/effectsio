import { clamp, createImageData } from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface GlitchParameters {
  distortion?: number;
  intensity?: number;
  noise?: number;
  rgbShift?: number;
  scanlines?: number;
}

const glitchParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 40,
    description: "Overall glitch effect intensity.",
    label: "Intensity",
    max: 100,
    min: 0,
    name: "intensity",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 8,
    description: "Horizontal chromatic RGB channel offset.",
    label: "RGB shift",
    max: 30,
    min: 0,
    name: "rgbShift",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 20,
    description: "Digital noise burst amplitude.",
    label: "Noise spikes",
    max: 60,
    min: 0,
    name: "noise",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 30,
    description: "Horizontal CRT scanline overlay opacity.",
    label: "Scanlines",
    max: 80,
    min: 0,
    name: "scanlines",
    step: 1,
    type: "number",
  },
  {
    defaultValue: 15,
    description: "Horizontal block tear and slice displacement.",
    label: "Distortion",
    max: 50,
    min: 0,
    name: "distortion",
    step: 1,
    type: "number",
  },
];

export const glitchEffect: EffectDefinition<GlitchParameters> = {
  category: "experimental",
  defaultParameters: {
    distortion: 15,
    intensity: 40,
    noise: 20,
    rgbShift: 8,
    scanlines: 30,
  },
  description: "Digital CRT / VHS glitch with RGB channel displacement, scanlines, and noise slicing.",
  id: "glitch",
  name: "Glitch",
  parameterSchema: glitchParameters,
  parameters: glitchParameters,
  render(source: ImageData, params?: GlitchParameters): ImageData {
    const intensity = (params?.intensity ?? 40) / 100;
    const rgbShift = Math.round((params?.rgbShift ?? 8) * intensity);
    const noise = (params?.noise ?? 20) * intensity;
    const scanlines = (params?.scanlines ?? 30) / 100;
    const distortion = (params?.distortion ?? 15) * intensity;

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    // Pre-calculate random horizontal slice displacement offsets per row band
    const bandHeight = Math.max(4, Math.floor(height / 24));
    const bandOffsets = new Map<number, number>();
    for (let b = 0; b < Math.ceil(height / bandHeight); b++) {
      // Periodic slice displacement triggered by pseudo-random seed
      const seed = Math.sin(b * 127.1 + 43.2) * 43758.5453;
      const fract = Math.abs(seed - Math.floor(seed));
      if (fract > 0.65) {
        bandOffsets.set(b, Math.round((fract * 2 - 1) * distortion * 2.5));
      } else {
        bandOffsets.set(b, 0);
      }
    }

    for (let y = 0; y < height; y++) {
      const bandIndex = Math.floor(y / bandHeight);
      const sliceOffset = bandOffsets.get(bandIndex) ?? 0;

      // Scanline darkening factor (even vs odd raster lines)
      const scanlineFactor = y % 2 === 0 ? 1 - scanlines * 0.45 : 1;

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

        // Apply horizontal slice displacement
        const shiftedX = clamp(x + sliceOffset, 0, width - 1);

        // Sample separated RGB channels with chromatic aberration shift
        const redX = clamp(shiftedX + rgbShift, 0, width - 1);
        const greenX = clamp(shiftedX, 0, width - 1);
        const blueX = clamp(shiftedX - rgbShift, 0, width - 1);

        const rIdx = (y * width + redX) * 4;
        const gIdx = (y * width + greenX) * 4;
        const bIdx = (y * width + blueX) * 4;

        let r = srcData[rIdx] * scanlineFactor;
        let g = srcData[gIdx + 1] * scanlineFactor;
        let b = srcData[bIdx + 2] * scanlineFactor;

        // Apply noise spikes
        if (noise > 0) {
          const pseudoNoise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 2 - 1;
          const noiseVal = pseudoNoise * noise * 1.5;
          r += noiseVal;
          g += noiseVal;
          b += noiseVal;
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
