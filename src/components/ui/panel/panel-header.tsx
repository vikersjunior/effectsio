import * as React from "react";
import { ArrowCounterClockwiseIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { cn } from "../lib/utils";
import {
  PanelIconButton,
  stopPanelHeaderButtonPointerDown,
} from "./panel-icon-button";

export type PanelHeaderProps = {
  collapsed?: boolean;
  collapseLabel?: string;
  expandLabel?: string;
  onResetControls?: () => void;
  onToggleCollapsed?: () => void;
  title: string;
  icon?: React.ReactNode;
  count?: number | string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function PanelHeader({
  collapsed = false,
  collapseLabel = "Collapse controls",
  expandLabel = "Expand controls",
  onResetControls,
  onToggleCollapsed,
  title,
  icon,
  count,
  action,
  children,
  className,
}: PanelHeaderProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "shrink-0 border-b border-[color:var(--border)] bg-[color:color-mix(in_oklab,var(--card)_80%,transparent)]",
        className,
      )}
      data-slot="properties-panel-header-shell"
    >
      <div
        className="flex h-10 touch-none items-center justify-between gap-3 px-4"
        data-panel-drag-handle=""
        data-slot="properties-panel-header"
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && <span className="shrink-0">{icon}</span>}
          <p className="m-0 min-w-0 truncate text-xs font-semibold text-[color:var(--foreground)] tracking-tight">
            {title}
          </p>
          {count !== undefined && (
            <span className="text-2xs text-[color:var(--muted-foreground)]">
              ({count})
            </span>
          )}
        </div>
        <div className="inline-flex shrink-0 items-center gap-1">
          {action}
          {collapsed || !onResetControls ? null : (
            <PanelIconButton
              label="Reset controls"
              onClick={onResetControls}
              onPointerDown={stopPanelHeaderButtonPointerDown}
              spinOnClick
            >
              <ArrowCounterClockwiseIcon size={12} />
            </PanelIconButton>
          )}
          {onToggleCollapsed && (
            <PanelIconButton
              label={collapsed ? expandLabel : collapseLabel}
              onClick={onToggleCollapsed}
              onPointerDown={stopPanelHeaderButtonPointerDown}
            >
              {collapsed ? <CaretDownIcon size={14} /> : <CaretUpIcon size={14} />}
            </PanelIconButton>
          )}
        </div>
      </div>
      {children && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
}

