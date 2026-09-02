import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckIcon, CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { outlineControlSurfaceClassName } from "../lib/control-outline";
import { cn } from "../lib/utils";
import {
  PortalLayerContainerProvider,
  usePortalLayerContainer,
} from "./portal-layer-context";
import { pressedSelectedItemClassName } from "./selection-state";

export const Select = SelectPrimitive.Root;

const dropdownHoverBorderClassName =
  "[&:not(:focus):not([aria-expanded=true]):not([data-open]):not([data-popup-open]):not([data-state=open]):hover]:!border-[color:color-mix(in_oklab,var(--border)_20%,transparent)]";

export const selectTriggerVariants = cva(
  "flex w-fit cursor-pointer items-center justify-between gap-1.5 border whitespace-nowrap font-medium transition-colors outline-none select-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[color:var(--destructive)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      placeholderTone: {
        default: "data-placeholder:text-[color:var(--foreground)]",
        muted: "data-placeholder:text-[color:var(--muted-foreground)]",
      },
      radius: {
        default: "rounded-lg",
        full: "rounded-full",
      },
      variant: {
        default: `${outlineControlSurfaceClassName} ${dropdownHoverBorderClassName} focus-visible:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] aria-expanded:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] data-popup-open:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] data-open:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)]`,
        ghost: `border-transparent bg-transparent bg-clip-border text-[color:var(--foreground)] focus-visible:border-[color:var(--ring)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] hover:text-[color:var(--foreground)] active:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] active:text-[color:var(--foreground)] aria-expanded:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] aria-expanded:text-[color:var(--foreground)] data-open:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-open:text-[color:var(--foreground)] data-popup-open:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-popup-open:text-[color:var(--foreground)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-[state=open]:text-[color:var(--foreground)] ${pressedSelectedItemClassName}`,
      },
      size: {
        sm: "h-6 gap-1 px-1.5 pr-1 py-0 text-xs *:data-[slot=select-value]:gap-1 [&_svg]:size-3",
        default: "h-7 px-2 py-0.5 text-xs [&_svg]:size-3.5",
        lg: "h-8 px-2.5 py-1 text-sm [&_svg]:size-4",
        xl: "h-10 px-3 py-1.5 text-base [&_svg]:size-4",
      },
    },
    defaultVariants: {
      placeholderTone: "muted",
      radius: "default",
      variant: "default",
      size: "default",
    },
  },
);

export function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

export function SelectValue({ className, ...props }: SelectPrimitive.Value.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex min-w-0 flex-1 text-left", className)}
      {...props}
    />
  );
}

export function SelectTrigger({
  className,
  placeholderTone = "muted",
  radius = "default",
  size = "default",
  variant = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & VariantProps<typeof selectTriggerVariants>): React.JSX.Element {
  return (
    <SelectPrimitive.Trigger
      data-placeholder-tone={placeholderTone}
      data-radius={radius}
      data-slot="select-trigger"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/select-trigger",
        selectTriggerVariants({ placeholderTone, radius, size, variant }),
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon className="transition-transform duration-150 group-data-[state=open]/select-trigger:rotate-180 group-aria-expanded/select-trigger:rotate-180">
        <CaretDownIcon size={14} className="text-[color:var(--muted-foreground)]" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >): React.JSX.Element {
  const resolvedContainer = usePortalLayerContainer();
  const portalNodeRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <SelectPrimitive.Portal container={resolvedContainer} ref={portalNodeRef}>
      <PortalLayerContainerProvider container={portalNodeRef}>
        <SelectPrimitive.Positioner
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          alignItemWithTrigger={alignItemWithTrigger}
          className="isolate z-50"
        >
          <SelectPrimitive.Popup
            data-slot="select-content"
            data-align-trigger={alignItemWithTrigger}
            className={cn(
              "floating-popup-surface relative isolate z-50 max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border text-xs text-[color:var(--popover-foreground)] duration-100 data-[align-trigger=true]:w-(--anchor-width) data-[align-trigger=false]:w-max data-[align-trigger=false]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 p-1",
              className,
            )}
            {...props}
          >
            <SelectPrimitive.List>{children}</SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </PortalLayerContainerProvider>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md py-1 pr-8 pl-2 text-xs leading-normal tracking-tight font-medium outline-hidden select-none hover:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] focus:bg-[color:color-mix(in_oklab,var(--foreground)_8%,transparent)] focus:text-[color:var(--foreground)] data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText
        className="flex min-w-0 flex-1 gap-2 overflow-hidden whitespace-nowrap"
        data-slot="select-item-text"
      >
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center justify-center">
        <CheckIcon size={12} className="text-[color:var(--primary)]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props): React.JSX.Element {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(
        "-mx-1 my-1 h-px bg-[color:color-mix(in_oklab,var(--border)_12%,transparent)]",
        className,
      )}
      {...props}
    />
  );
}
