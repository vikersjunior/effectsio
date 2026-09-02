import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  PortalLayerContainerProvider,
  type PortalLayerContainer,
  usePortalLayerContainer,
} from "./portal-layer-context";
import { cn } from "../lib/utils";

const popoverContentSurfaceClassName =
  "floating-popup-surface z-50 flex w-72 origin-(--transform-origin) flex-col gap-4 rounded-lg border p-2.5 text-xs text-[color:var(--popover-foreground)] outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

export function Popover({ ...props }: PopoverPrimitive.Root.Props): React.JSX.Element {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props): React.JSX.Element {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  anchor,
  portalContainer,
  side = "bottom",
  sideOffset = 4,
  children,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "alignOffset" | "anchor" | "side" | "sideOffset"
  > & {
    portalContainer?: PortalLayerContainer;
  }): React.JSX.Element {
  const resolvedContainer = usePortalLayerContainer(portalContainer);
  const portalNodeRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <PopoverPrimitive.Portal container={resolvedContainer} ref={portalNodeRef}>
      <PortalLayerContainerProvider container={portalNodeRef}>
        <PopoverPrimitive.Positioner
          align={align}
          alignOffset={alignOffset}
          anchor={anchor}
          side={side}
          sideOffset={sideOffset}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup
            className={cn(popoverContentSurfaceClassName, className)}
            {...props}
          >
            {children}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PortalLayerContainerProvider>
    </PopoverPrimitive.Portal>
  );
}

export function PopoverHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-xs", className)}
      {...props}
    />
  );
}

export function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props): React.JSX.Element {
  return (
    <PopoverPrimitive.Title
      data-slot="popover-title"
      className={cn("text-xs font-medium text-[color:var(--foreground)]", className)}
      {...props}
    />
  );
}

export function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props): React.JSX.Element {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-[color:var(--muted-foreground)] text-xs", className)}
      {...props}
    />
  );
}
