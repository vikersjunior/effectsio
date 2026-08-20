import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

export function getSourceImageAssets(
  mediaAssets: readonly ToolcraftMediaAsset[],
): ToolcraftMediaAsset[] {
  return mediaAssets.filter((asset) => asset.sourceTarget === "source.image");
}

export function resolveActiveImageId(
  value: unknown,
  sourceAssets: readonly ToolcraftMediaAsset[],
): string | null {
  if (typeof value === "string" && sourceAssets.some((asset) => asset.id === value)) {
    return value;
  }

  return sourceAssets[0]?.id ?? null;
}

export function resolveActiveImage(
  value: unknown,
  sourceAssets: readonly ToolcraftMediaAsset[],
): ToolcraftMediaAsset | null {
  const activeImageId = resolveActiveImageId(value, sourceAssets);
  return sourceAssets.find((asset) => asset.id === activeImageId) ?? null;
}
