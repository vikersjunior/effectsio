import * as React from "react";
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "../lib/utils";
import {
  PortalLayerContainerProvider,
  type PortalLayerContainer,
  usePortalLayerContainer,
} from "./portal-layer-context";

export function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

export function Tooltip({
  disableHoverablePopup = true,
  ...props
}: TooltipPrimitive.Root.Props): React.JSX.Element {
  return (
    <TooltipPrimitive.Root
      data-slot="tooltip"
      disableHoverablePopup={disableHoverablePopup}
      {...props}
    />
  );
}

export function TooltipTrigger({
  className,
  ...props
}: TooltipPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <TooltipPrimitive.Trigger
      className={className}
      data-slot="tooltip-trigger"
      {...props}
    />
  );
}

export function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  interactive = false,
  portalContainer,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  > & {
    interactive?: boolean;
    portalContainer?: PortalLayerContainer;
  }): React.JSX.Element {
  const resolvedContainer = usePortalLayerContainer(portalContainer);
  const portalNodeRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <TooltipPrimitive.Portal container={resolvedContainer} ref={portalNodeRef}>
      <PortalLayerContainerProvider container={portalNodeRef}>
        <TooltipPrimitive.Positioner
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          className="isolate z-50"
        >
          <TooltipPrimitive.Popup
            data-slot="tooltip-content"
            className={cn(
              "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-lg border border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--card)_95%,transparent)] px-2 py-1 text-xs text-[color:var(--foreground)] shadow-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              interactive ? null : "pointer-events-none",
              className,
            )}
            {...props}
          >
            {children}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </PortalLayerContainerProvider>
    </TooltipPrimitive.Portal>
  );
}
