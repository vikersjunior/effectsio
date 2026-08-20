// Color utility functions for Duotone and Tint processing

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace("#", "");
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split("").map((c) => c + c).join("") : cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyDuotoneToImageData(
  imageData: ImageData,
  shadowHex: string,
  highlightHex: string,
  contrast: number,
  brightness: number
): ImageData {
  const data = imageData.data;
  const shadow = hexToRgb(shadowHex);
  const highlight = hexToRgb(highlightHex);

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness adjustment
    if (brightness !== 0) {
      r = Math.min(255, Math.max(0, r + brightness * 2.55));
      g = Math.min(255, Math.max(0, g + brightness * 2.55));
      b = Math.min(255, Math.max(0, b + brightness * 2.55));
    }

    // Contrast adjustment
    if (contrast !== 0) {
      r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
      g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
      b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));
    }

    // Calculate luminance (0 to 1)
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Map luminance to shadow and highlight colors
    data[i] = Math.round(shadow.r + lum * (highlight.r - shadow.r));
    data[i + 1] = Math.round(shadow.g + lum * (highlight.g - shadow.g));
    data[i + 2] = Math.round(shadow.b + lum * (highlight.b - shadow.b));
  }

  return imageData;
}
