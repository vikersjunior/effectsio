import * as React from "react";
import {
  SparkleIcon,
  StackIcon,
  SlidersIcon,
  PlayIcon,
  DownloadSimpleIcon,
  GearIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
} from "@phosphor-icons/react";
import {
  Button,
  Badge,
  Separator,
  ToggleGroup,
  ToggleGroupItem,
} from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { ExportModal } from "../export/export-modal";

export function TopNav(): React.JSX.Element {
  const { canUndo, canRedo, undo, redo } = useStudioStore();
  const [activeMode, setActiveMode] = React.useState<"assets" | "studio" | "preview">("studio");
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);

  return (
    <header className="h-12 min-h-12 bg-[color:color-mix(in_oklab,var(--card)_80%,transparent)] border-b border-[color:var(--border)] backdrop-blur-2xl flex items-center justify-between px-4 select-none z-20 shadow-none">
      {/* Brand Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-7 rounded-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)]">
          <SparkleIcon size={14} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-[color:var(--foreground)]">
            EffectsIO
          </span>
          <Badge variant="outline" className="text-3xs font-semibold uppercase tracking-wider py-0 px-1.5">
            Studio
          </Badge>
        </div>
      </div>

      {/* Workspace Layout Mode Selector (Canonical ToggleGroup) */}
      <ToggleGroup
        value={[activeMode]}
        onValueChange={(val) => {
          if (val[0]) setActiveMode(val[0] as any);
        }}
        variant="outline"
        size="sm"
        className="hidden sm:flex"
      >
        <ToggleGroupItem value="assets" className="gap-1.5 text-2xs px-2.5 py-1">
          <StackIcon size={12} />
          <span>Assets</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="studio" className="gap-1.5 text-2xs px-2.5 py-1">
          <SlidersIcon size={12} />
          <span>Effects Studio</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="preview" className="gap-1.5 text-2xs px-2.5 py-1">
          <PlayIcon size={12} />
          <span>Preview</span>
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Action Triggers */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo Global Controls */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (⌘Z / Ctrl+Z)"
            aria-label="Undo"
          >
            <ArrowUUpLeftIcon size={13} />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (⌘⇧Z / Ctrl+Y)"
            aria-label="Redo"
          >
            <ArrowUUpRightIcon size={13} />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <Button
          variant="outline"
          title="Project settings"
        >
          <GearIcon size={14} />
          <span>Settings</span>
        </Button>
        <Button
          variant="primary"
          onClick={() => setIsExportModalOpen(true)}
          title="Export composition or batch library"
        >
          <DownloadSimpleIcon size={14} />
          <span>Export</span>
        </Button>
      </div>

      {/* Export Modal Component */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </header>
  );
}
