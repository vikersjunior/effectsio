import * as React from "react";
import { cn } from "../lib/utils";
import { PanelHeader } from "./panel-header";
import { PanelContentSurface, PanelSurface } from "./panel-surface";

export type PanelProps = {
  children: React.ReactNode;
  className?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onResetControls?: () => void;
  stickyFooter?: React.ReactNode;
  title: string;
};

export function Panel({
  children,
  className,
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  onResetControls,
  stickyFooter,
  title,
}: PanelProps): React.JSX.Element {
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const resolvedCollapsed = collapsed ?? internalCollapsed;

  function toggleCollapsed(): void {
    const nextCollapsed = !resolvedCollapsed;
    setInternalCollapsed(nextCollapsed);
    onCollapsedChange?.(nextCollapsed);
  }

  return (
    <PanelSurface
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden rounded-lg p-0",
        className,
      )}
    >
      <PanelHeader
        collapsed={resolvedCollapsed}
        onResetControls={onResetControls}
        onToggleCollapsed={toggleCollapsed}
        title={title}
      />
      {!resolvedCollapsed && (
        <PanelContentSurface stickyFooter={stickyFooter}>
          {children}
        </PanelContentSurface>
      )}
    </PanelSurface>
  );
}
