export interface GPUTextureRecord {
  texture: WebGLTexture;
  width: number;
  height: number;
  sourceId: string;
  format: number;
}

export type TextureSource = HTMLImageElement | ImageBitmap | ImageData | HTMLCanvasElement;

/**
 * Uploads an image source to a WebGL2 texture.
 * Reuses or replaces existing texture records deterministically without leaking GPU VRAM.
 */
export function uploadTexture(
  gl: WebGL2RenderingContext,
  source: TextureSource,
  sourceId: string,
  existingRecord?: GPUTextureRecord | null,
): GPUTextureRecord {
  if (!source) {
    throw new Error("No source image provided for WebGL2 texture upload");
  }

  const width =
    "naturalWidth" in source && typeof (source as HTMLImageElement).naturalWidth === "number" && (source as HTMLImageElement).naturalWidth > 0
      ? (source as HTMLImageElement).naturalWidth
      : source.width;
  const height =
    "naturalHeight" in source && typeof (source as HTMLImageElement).naturalHeight === "number" && (source as HTMLImageElement).naturalHeight > 0
      ? (source as HTMLImageElement).naturalHeight
      : source.height;

  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid texture dimensions: ${width}x${height}`);
  }

  // If existing texture matches dimensions and sourceId, reuse it
  if (
    existingRecord &&
    existingRecord.sourceId === sourceId &&
    existingRecord.width === width &&
    existingRecord.height === height
  ) {
    gl.bindTexture(gl.TEXTURE_2D, existingRecord.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    const isImageData = (typeof ImageData !== "undefined" && source instanceof ImageData) || ("data" in source && (source as { data: unknown }).data instanceof Uint8ClampedArray);
    if (isImageData) {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        width,
        height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        (source as ImageData).data,
      );
    } else {
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source as TexImageSource,
      );
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    return existingRecord;
  }

  // Dispose previous texture if replacing
  if (existingRecord) {
    disposeTexture(gl, existingRecord);
  }

  const texture = gl.createTexture();
  if (!texture) {
    throw new Error("Failed to allocate WebGL2 texture on GPU");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set standard WebGL texture orientation and pixel alignment
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

  // Configure non-repeating edge clamping and linear filtering
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const isImageData = (typeof ImageData !== "undefined" && source instanceof ImageData) || ("data" in source && (source as { data: unknown }).data instanceof Uint8ClampedArray);
  if (isImageData) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      (source as ImageData).data,
    );
  } else {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source as TexImageSource,
    );
  }


  gl.bindTexture(gl.TEXTURE_2D, null);

  return {
    texture,
    width,
    height,
    sourceId,
    format: gl.RGBA8,
  };
}

/**
 * Disposes a GPU texture record and releases its VRAM memory.
 */
export function disposeTexture(
  gl: WebGL2RenderingContext,
  record: GPUTextureRecord,
): void {
  if (record && record.texture) {
    gl.deleteTexture(record.texture);
  }
}
