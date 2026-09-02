import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react";
import { Button } from "../primitives/button";
import {
  PortalLayerContainerProvider,
  type PortalLayerContainer,
  usePortalLayerContainer,
} from "../primitives/portal-layer-context";
import { cn } from "../lib/utils";

const DIALOG_SECTION_BORDER_COLOR = "color-mix(in oklab, var(--border) 12%, transparent)";

const DialogLayoutContext = React.createContext<{
  sectioned: boolean;
  showCloseButton: boolean;
}>({
  sectioned: false,
  showCloseButton: false,
});

export function Dialog({ ...props }: DialogPrimitive.Root.Props): React.JSX.Element {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

export function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props): React.JSX.Element {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

export function DialogPortal({
  children,
  container,
  ...props
}: DialogPrimitive.Portal.Props): React.JSX.Element {
  const resolvedContainer = usePortalLayerContainer(container);
  const portalNodeRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={resolvedContainer}
      ref={portalNodeRef}
      {...props}
    >
      <PortalLayerContainerProvider container={portalNodeRef}>
        {children}
      </PortalLayerContainerProvider>
    </DialogPrimitive.Portal>
  );
}

export function DialogClose({ ...props }: DialogPrimitive.Close.Props): React.JSX.Element {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

export function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/60 backdrop-blur-xs duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  layout = "default",
  portalContainer,
  size = "default",
  showCloseButton = true,
  style,
  ...props
}: DialogPrimitive.Popup.Props & {
  layout?: "default" | "sections";
  portalContainer?: PortalLayerContainer;
  size?: "default" | "xl" | "2xl";
  showCloseButton?: boolean;
}): React.JSX.Element {
  const sectioned = layout === "sections";

  return (
    <DialogPortal container={portalContainer}>
      <DialogOverlay />
      <DialogLayoutContext.Provider value={{ sectioned, showCloseButton }}>
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            "floating-popup-surface fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-5 text-xs text-[color:var(--popover-foreground)] duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 shadow-2xl",
            size === "default" && "sm:max-w-md",
            size === "xl" && "sm:max-w-xl",
            size === "2xl" && "sm:max-w-2xl",
            sectioned && "gap-0 p-0",
            className,
          )}
          style={style}
          {...props}
        >
          {children}
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={
                <Button
                  className="absolute top-3 right-3 text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)]"
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <XIcon size={14} />
                  <span className="sr-only">Close</span>
                </Button>
              }
            />
          )}
        </DialogPrimitive.Popup>
      </DialogLayoutContext.Provider>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  const { sectioned, showCloseButton } = React.useContext(DialogLayoutContext);

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-1.5 text-left",
        sectioned && "px-5 pt-5 pb-3",
        showCloseButton && "pr-10",
        className,
      )}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<"div">): React.JSX.Element {
  const { sectioned } = React.useContext(DialogLayoutContext);

  return (
    <div
      data-slot="dialog-body"
      className={cn("flex flex-col gap-4", sectioned && "px-5 py-4", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  showCloseButton = false,
  justify = "end",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  justify?: "between" | "end" | "start";
  showCloseButton?: boolean;
}): React.JSX.Element {
  const { sectioned } = React.useContext(DialogLayoutContext);

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        justify === "start" && "sm:justify-start",
        justify === "between" && "sm:justify-between",
        sectioned && "border-t px-5 py-4",
        className,
      )}
      style={sectioned ? { borderColor: DIALOG_SECTION_BORDER_COLOR } : undefined}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button type="button" variant="outline" size="sm" />}>
          Close
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

export function DialogTitle({ children, className, ...props }: DialogPrimitive.Title.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("min-w-0 text-sm font-semibold text-[color:var(--foreground)] tracking-tight", className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

export function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props): React.JSX.Element {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs leading-relaxed text-[color:var(--muted-foreground)]",
        className,
      )}
      {...props}
    />
  );
}
