import * as React from "react";
import { ScrollFade } from "../primitives/scroll-fade";
import { cn } from "../lib/utils";

export const panelDividerClassName =
  "border-t border-[color:color-mix(in_oklab,var(--border)_8%,transparent)]";

export const PanelSurface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(function PanelSurface({ children, className, ...props }, ref) {
  return (
    <div
      {...props}
      ref={ref}
      className={cn(
        "floating-popup-surface isolate border text-[color:var(--popover-foreground)] backdrop-blur-2xl",
        className,
      )}
    >
      {children}
    </div>
  );
});

export const PanelContentSurface = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    stickyFooter?: React.ReactNode;
    stickyFooterActive?: boolean;
    stickyFooterProgress?: number | null;
  }
>(function PanelContentSurface(
  {
    children,
    className,
    stickyFooter,
    stickyFooterActive = false,
    stickyFooterProgress = null,
    ...props
  },
  ref,
) {
  const hasStickyFooter = React.Children.count(stickyFooter) > 0;

  return (
    <div className={cn("flex flex-1 min-h-0 flex-col overflow-hidden", className)}>
      <ScrollFade
        {...props}
        className="flex min-h-0 flex-col overflow-y-auto"
        containerClassName="flex-1 min-h-0"
      >
        {children}
      </ScrollFade>
      {hasStickyFooter && (
        <div className="shrink-0 border-t border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] p-2">
          {stickyFooter}
        </div>
      )}
    </div>
  );
});
