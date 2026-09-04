import * as React from 'react';
import {
  CloudArrowUpIcon,
  SpinnerGapIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ImagesIcon,
  CaretDownIcon,
  CaretUpIcon,
} from '@phosphor-icons/react';
import { Button, Input, ScrollFade, PanelSurface } from '../ui';
import { cn } from '../ui/lib/utils';
import { selectedAssetRingClassName } from '../ui/primitives/selection-state';
import { useStudioStore } from '../../context/studio-context';
import { formatFileSize } from '../../utils/image-ingestion';
import { BrandLogo } from './brand-logo';
import { ProjectNameInput } from './project-name-input';
import { AssetSearch } from './asset-search';
import type { Asset } from '../../types/asset';

export interface AssetPanelProps {
  onClose?: () => void;
}

export function AssetPanel({ onClose }: AssetPanelProps): React.JSX.Element {
  const {
    assets,
    activeAsset,
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
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isSpecsOpen, setIsSpecsOpen] = React.useState<boolean>(false);
  const anchorAssetIdRef = React.useRef<string | null>(null);

  // Filter assets based on search query
  const filteredAssets = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter((asset) =>
      asset.filename.toLowerCase().includes(query),
    );
  }, [assets, searchQuery]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addAssets(e.target.files);
      e.target.value = '';
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

  // Sample stock images placeholder trigger
  const handleStockSample = () => {
    // Trigger file picker as fallback
    fileInputRef.current?.click();
  };

  return (
    <PanelSurface
      id="asset-library-panel"
      className="flex flex-col h-full w-full bg-[color:var(--sidebar)] border-r border-[color:var(--border)] overflow-hidden select-none"
    >
      {/* Hidden File Input for Native File System Dialog */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Top Section: Project Identity (Matching Inspector header height h-14) */}
      <div className="h-14 min-h-14 px-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandLogo size={22} />
          <ProjectNameInput />
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            aria-label="Close assets panel"
            className="text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
          >
            <XIcon size={14} />
          </Button>
        )}
      </div>

      {/* Assets Section Header (Matching Design/Animate, Effects, Looks, Background height h-11) */}
      <div className="h-11 min-h-11 px-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold tracking-tight text-[color:var(--foreground)]">
            Assets
          </span>
          <span className="text-xs text-[color:var(--muted-foreground)]">
            ({assets.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => fileInputRef.current?.click()}
          title="Import media"
          aria-label="Import media"
          className="hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
        >
          <PlusIcon size={14} className="shrink-0 !size-3.5" />
        </Button>
      </div>

      {/* Import Error Alert Banner */}
      {importError && (
        <div className="m-3 p-2.5 rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,var(--card))] border border-[color:var(--destructive)] flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-start gap-1.5 min-w-0">
            <WarningCircleIcon
              size={14}
              className="text-[color:var(--destructive)] mt-0.5 shrink-0"
            />
            <span className="text-2xs text-[color:var(--foreground)] truncate">
              {importError}
            </span>
          </div>
          <Button variant="ghost" size="icon-xxs" onClick={clearImportError}>
            <XIcon size={11} />
          </Button>
        </div>
      )}

      {/* Panel Body: State A (Empty Dropzone) vs State B (Populated Grid) */}
      <ScrollFade
        className={cn(
          "flex-1 overflow-y-auto",
          assets.length === 0 ? "p-0" : "px-4 py-3",
        )}
        containerClassName="flex-1 min-h-0"
      >
        {assets.length === 0 ? (
          /* State A: Figma-aligned Empty State Composition (Figma node 50:1165) */
          <div
            data-slot="asset-empty-state"
            className="flex flex-col w-full p-4 gap-[14px] select-none"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                addAssets(e.dataTransfer.files);
              }
            }}
          >
            {isImporting ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <SpinnerGapIcon
                  size={24}
                  className="text-[color:var(--primary)] animate-spin"
                />
                <span className="text-xs font-medium text-[color:var(--foreground)]">
                  Importing image...
                </span>
              </div>
            ) : (
              <>
                {/* Main Content Group */}
                <div className="flex flex-col items-center justify-center text-center gap-2">
                  <CloudArrowUpIcon
                    size={24}
                    className="text-[color:var(--foreground)] shrink-0"
                    data-slot="cloud-upload-icon"
                  />
                  <h3 className="text-base font-medium leading-6 text-[color:var(--foreground)] text-center">
                    Add media
                  </h3>
                  <p className="text-xs font-normal leading-4 text-[color:var(--muted-foreground)] text-center max-w-[210px]">
                    Drag here, import from your computer or choose from a stock image
                  </p>
                </div>

                {/* Button Group */}
                <div className="flex flex-col gap-2 w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleStockSample}
                    className="h-8 w-full rounded-[6px] border-0 bg-[color:var(--secondary)] px-3 py-2 text-xs font-medium text-[color:var(--secondary-foreground)] hover:bg-[color:color-mix(in_oklab,var(--secondary)_85%,white)] active:bg-[color:color-mix(in_oklab,var(--secondary)_75%,white)]"
                  >
                    Stock library
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-full rounded-[6px] px-3 py-2 text-xs font-medium shadow-xs"
                  >
                    Import media
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* State B: Populated 4-Column Square Thumbnail Grid */
          <div className="flex flex-col gap-4">
            {/* Search Control */}
            <AssetSearch value={searchQuery} onChange={setSearchQuery} />

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
                    className={`group relative aspect-square w-full rounded-md bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] overflow-hidden cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? selectedAssetRingClassName
                        : 'hover:opacity-90 border border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)]'
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

              {/* Add Image '+' Tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add asset"
                title="Add asset"
                className="aspect-square w-full rounded-md border border-dashed border-[color:color-mix(in_oklab,var(--border)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--foreground)_4%,transparent)] text-[color:var(--muted-foreground)] hover:border-[color:color-mix(in_oklab,var(--foreground)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_9%,transparent)] hover:text-[color:var(--foreground)] focus-visible:border-[color:var(--ring)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] focus-visible:outline-none flex items-center justify-center cursor-pointer transition-[background-color,border-color,color] duration-150 ease-out p-0"
              >
                {isImporting ? (
                  <SpinnerGapIcon
                    size={19}
                    className="text-[color:var(--primary)] animate-spin shrink-0"
                  />
                ) : (
                  <PlusIcon size={19} className="shrink-0" />
                )}
              </button>
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

      {/* Asset Specifications Footer: Anchored to Bottom via margin-top: auto */}
      <div className="mt-auto border-t border-[color:var(--border)] shrink-0 bg-[color:var(--sidebar)]">
        <button
          type="button"
          onClick={() => setIsSpecsOpen((prev) => !prev)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors"
        >
          <span>Asset Specifications</span>
          {isSpecsOpen ? (
            <CaretUpIcon size={12} />
          ) : (
            <CaretDownIcon size={12} />
          )}
        </button>

        {isSpecsOpen && (
          <div className="px-4 pb-3 pt-1 flex flex-col gap-1.5 text-2xs text-[color:var(--muted-foreground)] border-t border-[color:color-mix(in_oklab,var(--border)_50%,transparent)]">
            {activeAsset ? (
              <>
                <div className="flex justify-between">
                  <span>Dimensions:</span>
                  <span className="font-mono text-[color:var(--foreground)]">
                    {activeAsset.width} × {activeAsset.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>File size:</span>
                  <span className="font-mono text-[color:var(--foreground)]">
                    {formatFileSize(activeAsset.fileSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="uppercase text-[color:var(--foreground)]">
                    {activeAsset.mimeType.replace('image/', '')}
                  </span>
                </div>
              </>
            ) : (
              <span className="italic text-[color:var(--muted-foreground)] opacity-70">
                No active asset selected
              </span>
            )}
          </div>
        )}
      </div>
    </PanelSurface>
  );
}
