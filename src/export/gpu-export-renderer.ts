import type { EffectStack } from "../types/asset";
import type { BackgroundState } from "../types/look";
import type { ExportFormat } from "../types/export";
import type { Frame } from "../types/frame";
import { createWebGL2Context } from "../rendering/webgl/webgl-context";
import { GPUEffectPipeline, canExecuteStackOnGPU } from "../rendering/webgl/webgl-effect-pipeline";
import { WebGL2FrameCompositor } from "../rendering/webgl/webgl-frame-compositor";
import type { TextureSource } from "../rendering/webgl/webgl-texture";
import { getMimeTypeForFormat } from "./export-utils";
import { encodeImageDataToBlob } from "./image-encoder";

export interface GPUExportParams {
  source: TextureSource;
  exportWidth: number;
  exportHeight: number;
  stack?: EffectStack | null;
  background?: BackgroundState;
  format: ExportFormat;
  quality?: number;
  time?: number;
  sourceId?: string;
}

export interface GPUExportResult {
  blob: Blob;
  width: number;
  height: number;
  size: number;
  renderedOnGPU: boolean;
}

/**
 * Reads back pixel data from the current WebGL framebuffer and corrects vertical row orientation.
 */
export function readPixelsToImageData(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): ImageData {
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const flipped = new Uint8ClampedArray(width * height * 4);
  const rowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcOffset = y * rowBytes;
    const dstOffset = (height - 1 - y) * rowBytes;
    flipped.set(pixels.subarray(srcOffset, srcOffset + rowBytes), dstOffset);
  }

  return new ImageData(flipped, width, height);
}

/**
 * Encodes an HTMLCanvasElement or WebGL canvas into a Blob with format and quality handling.
 */
export async function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality = 0.92,
): Promise<Blob> {
  const mimeType = getMimeTypeForFormat(format);
  const encQuality = format === "png" ? undefined : Math.max(0.01, Math.min(1, quality));

  if (typeof canvas.toBlob === "function") {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error(`Failed to encode canvas to blob for format: ${format}`));
          }
        },
        mimeType,
        encQuality,
      );
    });
  }

  // Fallback for environments where canvas.toBlob is unavailable
  const dataUrl = canvas.toDataURL(mimeType, encQuality);
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Executes high-fidelity GPU export rendering on a dedicated offscreen WebGL2 canvas.
 * Completely independent of the visible studio DOM viewport.
 */
export async function renderGPUExport(params: GPUExportParams): Promise<GPUExportResult> {
  const {
    source,
    exportWidth,
    exportHeight,
    stack,
    background,
    format,
    quality = 0.92,
    time = 0,
    sourceId = "export-source",
  } = params;

  if (exportWidth <= 0 || exportHeight <= 0) {
    throw new Error(`Invalid export dimensions: ${exportWidth}x${exportHeight}`);
  }

  // Calculate total canvas dimensions including creative background padding
  const padding = background?.padding ?? 0;
  const outWidth = exportWidth + 2 * padding;
  const outHeight = exportHeight + 2 * padding;

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = outWidth;
  offscreenCanvas.height = outHeight;

  const gl = createWebGL2Context(offscreenCanvas, {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });

  if (!gl) {
    offscreenCanvas.width = 0;
    offscreenCanvas.height = 0;
    throw new Error("WebGL2 context unavailable on offscreen export canvas.");
  }

  const maxTexSize =
    typeof gl.getParameter === "function" ? gl.getParameter(gl.MAX_TEXTURE_SIZE) || 8192 : 8192;
  if (outWidth > maxTexSize || outHeight > maxTexSize) {
    offscreenCanvas.width = 0;
    offscreenCanvas.height = 0;
    throw new Error(
      `Requested export dimensions (${outWidth}x${outHeight}) exceed GPU maximum texture size (${maxTexSize}px).`,
    );
  }

  const pipeline = new GPUEffectPipeline(gl);

  try {
    const hasBackground =
      background && (background.type !== "transparent" || padding > 0);

    if (hasBackground) {
      pipeline.renderCompositedStackToCanvas(
        source,
        exportWidth,
        exportHeight,
        stack,
        background,
        sourceId,
        time,
      );
    } else {
      pipeline.renderStackToCanvas(
        source,
        exportWidth,
        exportHeight,
        stack,
        sourceId,
        time,
      );
    }

    let blob: Blob;

    // Direct WebGL canvas blob encoding (preserves GPU resolution and alpha)
    try {
      blob = await encodeCanvasToBlob(offscreenCanvas, format, quality);
    } catch (encodeErr) {
      // Secondary path: Readback pixels and encode via 2D canvas pipeline
      const imgData = readPixelsToImageData(gl, outWidth, outHeight);
      blob = await encodeImageDataToBlob(imgData, format, quality, undefined);
    }

    return {
      blob,
      width: outWidth,
      height: outHeight,
      size: blob.size,
      renderedOnGPU: true,
    };
  } finally {
    // Deterministic resource cleanup with zero VRAM leaks
    try {
      pipeline.dispose();
    } catch (disposeErr) {
      console.warn("Error disposing GPU export pipeline:", disposeErr);
    }

    try {
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
    } catch {
      // Ignored
    }

    offscreenCanvas.width = 0;
    offscreenCanvas.height = 0;
  }
}

export interface GPUFrameExportParams {
  frame: Frame;
  assetSources: Map<string, TextureSource>;
  format: ExportFormat;
  quality?: number;
  time?: number;
}

/**
 * Stage 1B: Executes multi-layer GPU frame export rendering on an offscreen WebGL2 canvas.
 * Renders the complete Frame layer hierarchy (GenerativeLayer backdrop + ImageLayers with effect stacks).
 */
export async function renderGPUFrameExport(
  params: GPUFrameExportParams,
): Promise<GPUExportResult> {
  const { frame, assetSources, format, quality = 0.92, time = 0 } = params;
  const outWidth = frame.dimensions.width;
  const outHeight = frame.dimensions.height;

  if (outWidth <= 0 || outHeight <= 0) {
    throw new Error(`Invalid frame export dimensions: ${outWidth}x${outHeight}`);
  }

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = outWidth;
  offscreenCanvas.height = outHeight;

  const compositor = new WebGL2FrameCompositor(offscreenCanvas);
  try {
    compositor.composeFrame(frame, assetSources, time);
    compositor.renderToCanvas(offscreenCanvas);

    let blob: Blob;
    try {
      blob = await encodeCanvasToBlob(offscreenCanvas, format, quality);
    } catch {
      const gl = compositor.getContext();
      const imgData = readPixelsToImageData(gl, outWidth, outHeight);
      blob = await encodeImageDataToBlob(imgData, format, quality, undefined);
    }

    return {
      blob,
      width: outWidth,
      height: outHeight,
      size: blob.size,
      renderedOnGPU: true,
    };
  } finally {
    try {
      compositor.dispose();
    } catch (err) {
      console.warn("Error disposing GPU frame compositor:", err);
    }

    try {
      const gl = compositor.getContext();
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) {
        ext.loseContext();
      }
    } catch {
      // Ignored
    }

    offscreenCanvas.width = 0;
    offscreenCanvas.height = 0;
  }
}
