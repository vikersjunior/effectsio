import * as React from "react";
import {
  DownloadSimpleIcon,
  SpinnerGapIcon,
  CheckIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Field,
  Label,
  Input,
  SegmentedControl,
  SliderControl,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { exportSingleAsset, exportBatchAssets } from "../../export/export-engine";
import { triggerBlobDownload } from "../../export/export-utils";
import type { ExportFormat, BatchExportProgress } from "../../types/export";

type ExportScopeTarget = "current" | "selected" | "all";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps): React.JSX.Element {
  const {
    assets,
    activeAsset,
    selectedAssetIds,
    effectStacks,
    activeEffectStack,
    backgrounds,
    activeBackground,
    timeline,
  } = useStudioStore();

  const [target, setTarget] = React.useState<ExportScopeTarget>("current");
  const [format, setFormat] = React.useState<ExportFormat>("png");
  const [quality, setQuality] = React.useState<number>(92);
  const [filenamePrefix, setFilenamePrefix] = React.useState<string>("");

  const [isExporting, setIsExporting] = React.useState<boolean>(false);
  const [exportProgress, setExportProgress] = React.useState<BatchExportProgress | null>(null);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [exportSuccessMessage, setExportSuccessMessage] = React.useState<string | null>(null);

  const isCancelledRef = React.useRef<boolean>(false);

  const hasMultiSelection = selectedAssetIds.size > 1;

  React.useEffect(() => {
    if (isOpen) {
      setTarget(hasMultiSelection ? "selected" : "current");
      setExportError(null);
      setExportSuccessMessage(null);
      setIsExporting(false);
      setExportProgress(null);
      isCancelledRef.current = false;

      if (activeAsset) {
        setFilenamePrefix(activeAsset.filename.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [isOpen, activeAsset, hasMultiSelection]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccessMessage(null);
    setExportProgress(null);
    isCancelledRef.current = false;

    try {
      if (target === "current") {
        if (!activeAsset) {
          throw new Error("No active image selected to export.");
        }

        const result = await exportSingleAsset(
          activeAsset,
          activeEffectStack,
          {
            target: "current",
            format,
            quality: quality / 100,
            filenamePrefix: filenamePrefix.trim() || undefined,
            time: timeline.currentTime,
          },
          activeBackground
        );

        triggerBlobDownload(result.blob, result.filename);
        setExportSuccessMessage(`Exported ${result.filename} successfully.`);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        const targetAssets =
          target === "selected"
            ? assets.filter((a) => selectedAssetIds.has(a.id))
            : assets;

        if (targetAssets.length === 0) {
          throw new Error(
            target === "selected"
              ? "No selected assets available to export."
              : "No assets available in the library to export."
          );
        }

        const batchResult = await exportBatchAssets(
          targetAssets,
          effectStacks,
          {
            target: "all",
            format,
            quality: quality / 100,
            time: timeline.currentTime,
          },
          backgrounds,
          (progress) => {
            setExportProgress(progress);
          },
          () => isCancelledRef.current
        );

        triggerBlobDownload(batchResult.zipBlob, "effectsio-export.zip");
        setExportSuccessMessage(
          `Exported ${batchResult.totalExported} image${batchResult.totalExported > 1 ? "s" : ""} to effectsio-export.zip.`
        );
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      if (isCancelledRef.current) {
        setExportError("Export was cancelled.");
      } else {
        setExportError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during export."
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    if (isExporting) {
      isCancelledRef.current = true;
    } else {
      onClose();
    }
  };

  const scopeOptions = React.useMemo(() => {
    const opts = [{ label: "Active Image", value: "current" }];
    if (hasMultiSelection) {
      opts.push({
        label: `Selected (${selectedAssetIds.size})`,
        value: "selected",
      });
    }
    opts.push({
      label: `All Images (${assets.length})`,
      value: "all",
    });
    return opts;
  }, [hasMultiSelection, selectedAssetIds.size, assets.length]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isExporting && !open && onClose()}>
      <DialogContent size="default" layout="sections">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DownloadSimpleIcon size={16} className="text-[color:var(--primary)]" />
            <DialogTitle>Export Composition</DialogTitle>
          </div>
        </DialogHeader>

        <DialogBody className="gap-3.5">
          {/* Target Selection */}
          <SegmentedControl
            name="Export Scope"
            value={target}
            options={scopeOptions}
            onValueChange={(val) => setTarget(val as ExportScopeTarget)}
            disabled={isExporting}
          />

          {/* Format Selection */}
          <SegmentedControl
            name="Output Format"
            value={format}
            options={[
              { label: "PNG", value: "png" },
              { label: "JPEG", value: "jpeg" },
              { label: "WEBP", value: "webp" },
            ]}
            onValueChange={(val) => setFormat(val as ExportFormat)}
          />

          {/* Quality Slider (for lossy formats) */}
          {(format === "jpeg" || format === "webp") && (
            <SliderControl
              name="Quality"
              value={quality}
              min={10}
              max={100}
              step={1}
              unit="%"
              onValueChange={(val) => setQuality(val)}
            />
          )}

          {/* Filename Prefix (for single export) */}
          {target === "current" && (
            <Field className="gap-1.5">
              <Label className="text-2xs font-semibold text-[color:var(--muted-foreground)] uppercase tracking-wider">
                File Name Prefix
              </Label>
              <Input
                type="text"
                value={filenamePrefix}
                onChange={(e) => setFilenamePrefix(e.target.value)}
                placeholder="File name prefix..."
                className="h-8 text-xs font-mono"
              />
            </Field>
          )}

          {/* Progress / Status feedback */}
          {isExporting && exportProgress && (
            <div className="flex flex-col gap-1.5 p-2.5 rounded-md bg-[color:color-mix(in_oklab,var(--card)_60%,transparent)] border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)]">
              <div className="flex justify-between text-2xs">
                <span className="text-[color:var(--muted-foreground)]">Processing {exportProgress.currentFilename}</span>
                <span className="font-mono text-[color:var(--primary)]">{exportProgress.current} / {exportProgress.total}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[color:var(--background)] overflow-hidden">
                <div
                  className="h-full bg-[color:var(--primary)] transition-all duration-150"
                  style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {exportSuccessMessage && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-[color:color-mix(in_oklab,#10b981_12%,var(--card))] border border-[#10b981] text-[#10b981] text-xs">
              <CheckIcon size={14} />
              <span>{exportSuccessMessage}</span>
            </div>
          )}

          {exportError && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-[color:color-mix(in_oklab,var(--destructive)_12%,var(--card))] border border-[color:var(--destructive)] text-[color:var(--destructive)] text-xs">
              <WarningCircleIcon size={14} />
              <span>{exportError}</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" type="button" onClick={handleCancel}>
            {isExporting ? "Cancel" : "Close"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExport}
            disabled={
              isExporting ||
              (target === "current" && !activeAsset) ||
              (target === "selected" && selectedAssetIds.size === 0) ||
              (target === "all" && assets.length === 0)
            }
            className="gap-1.5"
          >
            {isExporting ? (
              <>
                <SpinnerGapIcon size={13} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <DownloadSimpleIcon size={13} />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
