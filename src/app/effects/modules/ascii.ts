import {
  clamp,
  createImageData,
  rgbToGrayscale,
} from "../canvas-utils";
import type { EffectDefinition, EffectParameterSchema } from "../types";

export interface AsciiParameters {
  characterDensity?: "standard" | "blocks" | "minimal";
  colorMode?: "monochrome" | "color" | "greenPhosphor" | "amberCRT";
  fontSize?: number;
}

// 5x7 bitmap font glyph definitions (7 rows of 5-bit masks)
const GLYPH_MAP: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  "#": [0b01010, 0b11111, 0b01010, 0b11111, 0b01010, 0b01010, 0],
  "%": [0b11001, 0b11010, 0b00100, 0b01000, 0b01011, 0b10011, 0],
  "*": [0, 0b10101, 0b01110, 0b11111, 0b01110, 0b10101, 0],
  "+": [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  "-": [0, 0, 0, 0b11111, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ":": [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  "=": [0, 0b11111, 0, 0b11111, 0, 0, 0],
  "@": [0b01110, 0b10001, 0b10111, 0b10101, 0b10110, 0b10000, 0b01111],
  "░": [0b00100, 0, 0b10001, 0, 0b00100, 0, 0b10001],
  "▒": [0b01010, 0b10001, 0b00100, 0b01010, 0b10001, 0b00100, 0b01010],
  "▓": [0b10101, 0b01010, 0b10101, 0b01010, 0b10101, 0b01010, 0b10101],
  "█": [0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111, 0b11111],
};

const CHARACTER_SETS: Record<string, string[]> = {
  blocks: ["█", "▓", "▒", "░", " "],
  minimal: ["#", "+", "-", ".", " "],
  standard: ["@", "%", "#", "*", "+", "=", "-", ":", ".", " "],
};

const asciiParameters: readonly EffectParameterSchema[] = [
  {
    defaultValue: 10,
    description: "ASCII character matrix cell font size in pixels.",
    label: "Font size",
    max: 24,
    min: 6,
    name: "fontSize",
    step: 1,
    type: "number",
  },
  {
    defaultValue: "standard",
    description: "Character density ramp.",
    label: "Character ramp",
    name: "characterDensity",
    options: [
      { label: "Standard (@%#*+=-:.)", value: "standard" },
      { label: "Blocks (█▓▒░)", value: "blocks" },
      { label: "Minimal (#+-.)", value: "minimal" },
    ],
    type: "select",
  },
  {
    defaultValue: "monochrome",
    description: "CRT phosphor and chromatic palette color mode.",
    label: "Color mode",
    name: "colorMode",
    options: [
      { label: "Monochrome (White / Black)", value: "monochrome" },
      { label: "Full Color (RGB sampling)", value: "color" },
      { label: "Green Phosphor CRT", value: "greenPhosphor" },
      { label: "Amber Terminal CRT", value: "amberCRT" },
    ],
    type: "select",
  },
];

export const asciiEffect: EffectDefinition<AsciiParameters> = {
  category: "retro",
  defaultParameters: {
    characterDensity: "standard",
    colorMode: "monochrome",
    fontSize: 10,
  },
  description: "Monochrome or chromatic character matrix text rendering based on luminance density.",
  id: "ascii",
  name: "ASCII Art",
  parameterSchema: asciiParameters,
  parameters: asciiParameters,
  render(source: ImageData, params?: AsciiParameters): ImageData {
    const rawFontSize = params?.fontSize ?? 10;
    const fontSize = Math.max(6, Math.min(24, Math.round(rawFontSize)));
    const rampKey = params?.characterDensity ?? "standard";
    const chars = CHARACTER_SETS[rampKey] ?? CHARACTER_SETS.standard;
    const colorMode = params?.colorMode ?? "monochrome";

    const width = source.width;
    const height = source.height;
    const srcData = source.data;
    const output = createImageData(width, height);
    const outData = output.data;

    // Dark terminal background RGB
    const bgR = 12;
    const bgG = 13;
    const bgB = 14;

    const cellW = Math.max(4, Math.round(fontSize * 0.7));
    const cellH = fontSize;
    const charCount = chars.length;

    for (let by = 0; by < height; by += cellH) {
      const curH = Math.min(cellH, height - by);

      for (let bx = 0; bx < width; bx += cellW) {
        const curW = Math.min(cellW, width - bx);

        // Calculate average color and luminance within cell
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalAlpha = 0;
        let count = 0;

        for (let dy = 0; dy < curH; dy++) {
          for (let dx = 0; dx < curW; dx++) {
            const idx = ((by + dy) * width + (bx + dx)) * 4;
            totalR += srcData[idx];
            totalG += srcData[idx + 1];
            totalB += srcData[idx + 2];
            totalAlpha += srcData[idx + 3];
            count++;
          }
        }

        if (count === 0) continue;

        const avgR = Math.round(totalR / count);
        const avgG = Math.round(totalG / count);
        const avgB = Math.round(totalB / count);
        const avgAlpha = Math.round(totalAlpha / count);
        const gray = rgbToGrayscale(avgR, avgG, avgB);

        // Map luminance to character index (inverted: light tones = dense chars)
        const norm = clamp(gray, 0, 255) / 255;
        const charIdx = Math.min(charCount - 1, Math.floor((1 - norm) * charCount));
        const char = chars[charIdx] ?? " ";
        const glyph = GLYPH_MAP[char] ?? GLYPH_MAP[" "];

        // Determine glyph foreground color
        let fgR = gray;
        let fgG = gray;
        let fgB = gray;

        switch (colorMode) {
          case "color":
            fgR = avgR;
            fgG = avgG;
            fgB = avgB;
            break;
          case "greenPhosphor":
            fgR = Math.round(gray * 0.2);
            fgG = gray;
            fgB = Math.round(gray * 0.3);
            break;
          case "amberCRT":
            fgR = gray;
            fgG = Math.round(gray * 0.7);
            fgB = Math.round(gray * 0.15);
            break;
          case "monochrome":
          default:
            fgR = gray;
            fgG = gray;
            fgB = gray;
            break;
        }

        // Render 5x7 bitmap font cell to output
        for (let dy = 0; dy < curH; dy++) {
          const glyphRow = Math.min(6, Math.floor((dy / curH) * 7));
          const rowMask = glyph[glyphRow] ?? 0;

          for (let dx = 0; dx < curW; dx++) {
            const glyphCol = Math.min(4, Math.floor((dx / curW) * 5));
            const isSet = ((rowMask >> (4 - glyphCol)) & 1) === 1;

            const outIdx = ((by + dy) * width + (bx + dx)) * 4;

            if (isSet) {
              outData[outIdx] = fgR;
              outData[outIdx + 1] = fgG;
              outData[outIdx + 2] = fgB;
            } else {
              outData[outIdx] = bgR;
              outData[outIdx + 1] = bgG;
              outData[outIdx + 2] = bgB;
            }
            outData[outIdx + 3] = avgAlpha;
          }
        }
      }
    }

    return output;
  },
};
