import { zipSync } from "fflate";
import type { Asset, EffectStack } from "../types/asset";
import type { BackgroundState } from "../types/look";
import type { ExportOptions, ExportResult, BatchExportProgress } from "../types/export";
import { executeEffectStack } from "../effects/engine";
import {
  decodeAssetToImageData,
  decodeAssetToImageElement,
  encodeImageDataToBlob,
  scaleImageData,
} from "./image-encoder";
import { buildExportFilename, disambiguateFilenames } from "./export-utils";
import { renderGPUExport } from "./gpu-export-renderer";
import { canExecuteStackOnGPU } from "../rendering/webgl/webgl-effect-pipeline";

const MAX_EXPORT_DIMENSION = 16384;

/**
 * Resolves the explicit export dimensions based on native asset size and export options.
 * Supports:
 * - Native: uses unscaled source width and height
 * - Scale: applies scaling factor (e.g. 0.5x, 1x, 2x, 4x)
 * - Custom: uses explicit width and height
 * Clamps safely between 1px and maximum supported texture dimension.
 */
export function resolveExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  options?: ExportOptions,
): { width: number; height: number } {
  const srcW = Math.max(1, Math.round(sourceWidth || 100));
  const srcH = Math.max(1, Math.round(sourceHeight || 100));

  if (!options) {
    return { width: srcW, height: srcH };
  }

  // 1. Explicit Custom Dimensions
  if (typeof options.width === "number" && typeof options.height === "number") {
    return {
      width: Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(options.width))),
      height: Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(options.height))),
    };
  }

  // 2. Proportional Custom Dimension (width only or height only)
  if (typeof options.width === "number" && typeof options.height !== "number") {
    const targetW = Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(options.width)));
    const targetH = Math.min(
      MAX_EXPORT_DIMENSION,
      Math.max(1, Math.round((targetW / srcW) * srcH)),
    );
    return { width: targetW, height: targetH };
  }

  if (typeof options.height === "number" && typeof options.width !== "number") {
    const targetH = Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(options.height)));
    const targetW = Math.min(
      MAX_EXPORT_DIMENSION,
      Math.max(1, Math.round((targetH / srcH) * srcW)),
    );
    return { width: targetW, height: targetH };
  }

  // 3. Multiplier Scale (e.g. 0.5, 1, 2, 4)
  if (typeof options.scale === "number" && options.scale > 0) {
    return {
      width: Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(srcW * options.scale))),
      height: Math.min(MAX_EXPORT_DIMENSION, Math.max(1, Math.round(srcH * options.scale))),
    };
  }

  // 4. Default: Native source resolution
  return { width: srcW, height: srcH };
}

/**
 * Exports a single asset using the high-performance offscreen GPU rendering engine.
 * Automatically falls back to the CPU rendering pipeline if WebGL2 is unavailable or unsupported.
 */
export async function exportSingleAsset(
  asset: Asset,
  effectStack: EffectStack,
  options: ExportOptions,
  background?: BackgroundState,
): Promise<ExportResult> {
  if (!asset) {
    throw new Error("No asset provided for export.");
  }

  const { width: exportWidth, height: exportHeight } = resolveExportDimensions(
    asset.width,
    asset.height,
    options,
  );

  const filename = buildExportFilename(
    options.filenamePrefix || asset.filename,
    options.format,
  );

  // Attempt GPU Offscreen Render Pipeline
  if (canExecuteStackOnGPU(effectStack)) {
    try {
      const sourceImage = await decodeAssetToImageElement(asset);
      const gpuResult = await renderGPUExport({
        source: sourceImage,
        exportWidth,
        exportHeight,
        stack: effectStack,
        background,
        format: options.format,
        quality: options.quality,
        time: options.time ?? 0,
        sourceId: asset.id,
      });

      return {
        filename,
        blob: gpuResult.blob,
        size: gpuResult.size,
        width: gpuResult.width,
        height: gpuResult.height,
      };
    } catch (gpuError) {
      console.warn(
        `GPU export failed for ${asset.filename}, executing CPU fallback:`,
        gpuError,
      );
    }
  }

  // CPU Fallback Pipeline
  const sourceImageData = await decodeAssetToImageData(asset);
  const scaledImageData = scaleImageData(sourceImageData, exportWidth, exportHeight);
  const processedImageData = executeEffectStack(
    scaledImageData,
    effectStack,
    options.time ?? 0,
  );

  const blob = await encodeImageDataToBlob(
    processedImageData,
    options.format,
    options.quality,
    background,
  );

  const padding = background?.padding ?? 0;
  const outWidth = exportWidth + 2 * padding;
  const outHeight = exportHeight + 2 * padding;

  return {
    filename,
    blob,
    size: blob.size,
    width: outWidth,
    height: outHeight,
  };
}

/**
 * Exports multiple assets in batch sequentially as a ZIP archive.
 * Guarantees per-asset resolution calculation, effect stack isolation, and memory cleanup.
 */
export async function exportBatchAssets(
  assets: Asset[],
  effectStacks: Record<string, EffectStack>,
  options: ExportOptions,
  backgrounds?: Record<string, BackgroundState>,
  onProgress?: (progress: BatchExportProgress) => void,
  shouldCancel?: () => boolean,
): Promise<{ zipBlob: Blob; totalExported: number; failedCount: number }> {
  if (!assets || assets.length === 0) {
    throw new Error("No assets provided for batch export.");
  }

  const rawFilenames = assets.map((a) =>
    buildExportFilename(a.filename, options.format),
  );
  const finalFilenames = disambiguateFilenames(rawFilenames);

  const zipFiles: Record<string, Uint8Array> = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < assets.length; i++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error("Batch export cancelled by user.");
    }

    const asset = assets[i]!;
    const filename = finalFilenames[i]!;
    const stack = effectStacks[asset.id] || [];
    const bg = backgrounds ? backgrounds[asset.id] : undefined;

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: assets.length,
        currentFilename: asset.filename,
        percent: Math.round(((i + 1) / assets.length) * 100),
      });
    }

    try {
      const singleResult = await exportSingleAsset(
        asset,
        stack,
        {
          ...options,
          filenamePrefix: filename.replace(/\.[^/.]+$/, ""),
        },
        bg,
      );

      const arrayBuffer = await singleResult.blob.arrayBuffer();
      zipFiles[filename] = new Uint8Array(arrayBuffer);
      successCount++;
    } catch (err) {
      console.error(`Failed to export asset ${asset.filename} in batch:`, err);
      failCount++;
    }

    // Brief yield to ensure responsive UI progress
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  if (successCount === 0) {
    throw new Error("All assets in batch failed to export.");
  }

  const zippedBuffer = zipSync(zipFiles);
  const zipBlob = new Blob([zippedBuffer as unknown as BlobPart], {
    type: "application/zip",
  });

  return {
    zipBlob,
    totalExported: successCount,
    failedCount: failCount,
  };
}
