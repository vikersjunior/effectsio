export function clamp(val: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, val));
}

export function parseHexColor(
  hex: unknown,
  fallbackHex = "#000000",
): { r: number; g: number; b: number } {
  let colorStr = fallbackHex;

  if (typeof hex === "string" && hex.trim().length > 0) {
    colorStr = hex.trim();
  } else if (hex && typeof hex === "object") {
    const colorObj = hex as Record<string, unknown>;
    const hexVal = colorObj.hex;
    const valueVal = colorObj.value;
    if (typeof hexVal === "string" && hexVal.trim().length > 0) {
      colorStr = hexVal.trim();
    } else if (typeof valueVal === "string" && valueVal.trim().length > 0) {
      colorStr = valueVal.trim();
    } else if (
      typeof colorObj.r === "number" &&
      typeof colorObj.g === "number" &&
      typeof colorObj.b === "number"
    ) {
      return {
        b: clamp(colorObj.b, 0, 255),
        g: clamp(colorObj.g, 0, 255),
        r: clamp(colorObj.r, 0, 255),
      };
    }
  }

  const cleanHex = colorStr.replace(/^#/, "");
  let num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) num = 0;

  if (cleanHex.length === 3) {
    const r = ((num >> 8) & 0xf) * 17;
    const g = ((num >> 4) & 0xf) * 17;
    const b = (num & 0xf) * 17;
    return { b, g, r };
  }

  return {
    b: num & 0xff,
    g: (num >> 8) & 0xff,
    r: (num >> 16) & 0xff,
  };
}

export function rgbToGrayscale(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

export class FallbackImageData {
  readonly colorSpace: PredefinedColorSpace = "srgb";
  readonly data: Uint8ClampedArray;
  readonly height: number;
  readonly width: number;

  constructor(
    dataOrWidth: Uint8ClampedArray | number,
    widthOrHeight: number,
    height?: number,
  ) {
    if (typeof dataOrWidth === "number") {
      this.width = Math.max(1, Math.floor(dataOrWidth));
      this.height = Math.max(1, Math.floor(widthOrHeight));
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = dataOrWidth;
      this.width = Math.max(1, Math.floor(widthOrHeight));
      this.height = Math.max(
        1,
        Math.floor(height ?? dataOrWidth.length / (widthOrHeight * 4)),
      );
    }
  }
}

export function createImageData(
  width: number,
  height: number,
  data?: Uint8ClampedArray,
): ImageData {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  if (typeof globalThis.ImageData !== "undefined") {
    if (data) {
      const ImgDataCtor = globalThis.ImageData as unknown as {
        new (data: Uint8ClampedArray, sw: number, sh?: number): ImageData;
      };
      return new ImgDataCtor(data, w, h);
    }
    return new globalThis.ImageData(w, h);
  }
  if (data) {
    return new FallbackImageData(data, w, h) as unknown as ImageData;
  }
  return new FallbackImageData(w, h) as unknown as ImageData;
}

export function cloneImageData(src: ImageData): ImageData {
  const clonedData = new Uint8ClampedArray(src.data);
  return createImageData(src.width, src.height, clonedData);
}
