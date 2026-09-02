import * as React from "react";
import {
  CloudArrowUpIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ImagesIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Input,
  ScrollFade,
  PanelSurface,
  PanelHeader,
} from "../ui";
import { selectedAssetRingClassName } from "../ui/primitives/selection-state";
import { useStudioStore } from "../../context/studio-context";
import type { Asset } from "../../types/asset";

export function AssetPanel(): React.JSX.Element {
  const {
    assets,
    activeImageId,
    selectedAssetIds,
    addAssets,
    removeAsset,
    isImporting,
    importError,
    clearImportError,
    selectAsset,
    toggleAssetSelection,
    selectAssetRange,
  } = useStudioStore();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const anchorAssetIdRef = React.useRef<string | null>(null);

  // Filter assets based on prominent inline search
  const filteredAssets = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) => asset.filename.toLowerCase().includes(query));
  }, [assets, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addAssets(e.target.files);
      e.target.value = "";
    }
  };

  const handleTileClick = (e: React.MouseEvent, asset: Asset) => {
    if (e.metaKey || e.ctrlKey) {
      toggleAssetSelection(asset.id);
      anchorAssetIdRef.current = asset.id;
    } else if (e.shiftKey) {
      const anchorId =
        anchorAssetIdRef.current ||
        activeImageId ||
        (filteredAssets.length > 0 ? filteredAssets[0].id : asset.id);
      selectAssetRange(anchorId, asset.id, filteredAssets);
    } else {
      selectAsset(asset.id, true);
      anchorAssetIdRef.current = asset.id;
    }
  };

  return (
    <PanelSurface id="asset-library-panel" className="flex flex-col h-full overflow-hidden select-none">
      {/* Hidden File Input for Native File System Dialog */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Panel Header: Assets (N) */}
      <PanelHeader
        title="Assets"
        count={assets.length}
      />

      {/* Import Error Alert Banner */}
      {importError && (
        <div className="m-2 p-2 rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,var(--card))] border border-[color:var(--destructive)] flex items-start justify-between gap-2">
          <div className="flex items-start gap-1.5 min-w-0">
            <WarningCircleIcon
              size={13}
              className="text-[color:var(--destructive)] mt-0.5 shrink-0"
            />
            <span className="text-2xs text-[color:var(--foreground)] truncate">
              {importError}
            </span>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={clearImportError}>
            <XIcon size={11} />
          </Button>
        </div>
      )}

      {/* Panel Body: State A (Empty Dropzone) vs State B (Populated Grid) */}
      <ScrollFade className="flex-1 overflow-y-auto p-4" containerClassName="flex-1 min-h-0">
        {assets.length === 0 ? (
          /* State A: Clean Utility Dropzone */
          <div className="flex flex-col gap-2 pt-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group/file-upload relative flex min-h-[140px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[color:color-mix(in_oklab,var(--border)_18%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] transition-[background-color,border-color] duration-150 ease-out cursor-pointer p-4 text-center"
            >
              {isImporting ? (
                <>
                  <SpinnerGapIcon
                    size={22}
                    className="text-[color:var(--primary)] animate-spin"
                  />
                  <span className="text-xs font-medium text-[color:var(--foreground)]">
                    Importing image...
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center size-9 rounded-full bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] text-[color:var(--muted-foreground)] group-hover/file-upload:text-[color:var(--foreground)] transition-colors">
                    <CloudArrowUpIcon size={18} weight="light" />
                  </div>
                  <div className="flex flex-col gap-0.5 max-w-[200px]">
                    <span className="text-xs font-semibold text-[color:var(--foreground)]">
                      Add media
                    </span>
                    <span className="text-2xs text-[color:var(--muted-foreground)] leading-normal">
                      Drag here, import from your computer
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="mt-1"
                  >
                    Import media
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          /* State B: Populated Searchable 4-Column Square Thumbnail Grid */
          <div className="flex flex-col gap-2.5">
            {/* Prominent Search Control */}
            <div className="relative flex items-center">
              <MagnifyingGlassIcon
                size={12}
                className="absolute left-2.5 text-[color:var(--muted-foreground)] pointer-events-none"
              />
              <Input
                type="text"
                placeholder="Find..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-7 h-7 text-2xs w-full"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xxs"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                >
                  <XIcon size={11} />
                </Button>
              )}
            </div>

            {/* 4-Column Square Thumbnail Grid */}
            <div className="grid grid-cols-4 gap-2">
              {filteredAssets.map((asset) => {
                const isSelected =
                  selectedAssetIds.has(asset.id) ||
                  (selectedAssetIds.size === 0 && asset.id === activeImageId);
                return (
                  <div
                    key={asset.id}
                    onClick={(e) => handleTileClick(e, asset)}
                    className={`group relative aspect-square w-full rounded-[calc(var(--radius-lg)-4px)] bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? selectedAssetRingClassName
                        : "hover:opacity-90 border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]"
                    }`}
                    title={`${asset.filename} (${asset.width}×${asset.height})`}
                  >
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.filename}
                      className="size-full object-cover select-none pointer-events-none"
                    />

                    {/* Delete Button on Hover */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Remove asset"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAsset(asset.id);
                      }}
                      className="absolute top-1 right-1 size-5 rounded-xs bg-black/60 text-white/80 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-100 p-0"
                    >
                      <TrashIcon size={11} />
                    </Button>
                  </div>
                );
              })}

              {/* Add Image '+' Tile (Final Item in the 4-Column Grid) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square w-full rounded-[calc(var(--radius-lg)-4px)] bg-[color:color-mix(in_oklab,var(--foreground)_3%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] border border-dashed border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_40%,transparent)] flex flex-col items-center justify-center cursor-pointer transition-all duration-150 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                title="Add image"
              >
                {isImporting ? (
                  <SpinnerGapIcon
                    size={16}
                    className="text-[color:var(--primary)] animate-spin"
                  />
                ) : (
                  <PlusIcon size={18} />
                )}
              </div>
            </div>

            {filteredAssets.length === 0 && searchQuery && (
              <div className="pt-6 text-center text-2xs text-[color:var(--muted-foreground)] flex flex-col items-center gap-1.5">
                <ImagesIcon size={18} className="opacity-30" />
                <span>No matching images found</span>
              </div>
            )}
          </div>
        )}
      </ScrollFade>
    </PanelSurface>
  );
}
