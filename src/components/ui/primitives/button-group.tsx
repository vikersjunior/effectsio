import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Separator } from "./separator";

export const buttonGroupVariants = cva(
  "flex w-fit items-stretch *:focus:relative *:focus:z-10 *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot]]:relative [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          "*:data-slot:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-md! [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]:has(~[data-slot])]:border-r-0",
        vertical:
          "flex-col *:data-slot:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-md! [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]:has(~[data-slot])]:border-b-0",
      },
      adjacentBorderTone: {
        default: null,
        subtle: null,
      },
    },
    compoundVariants: [
      {
        adjacentBorderTone: "default",
        className:
          "[&>[data-slot]:not([data-slot=button-group-separator]):hover+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator]):focus+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[aria-expanded=true]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_45%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-open]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_45%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-popup-open]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_45%,transparent)]",
        orientation: "horizontal",
      },
      {
        adjacentBorderTone: "subtle",
        className:
          "[&>[data-slot]:not([data-slot=button-group-separator]):hover+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator]):focus+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[aria-expanded=true]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-open]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-popup-open]+[data-slot]]:!border-l-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
        orientation: "horizontal",
      },
      {
        adjacentBorderTone: "default",
        className:
          "[&>[data-slot]:not([data-slot=button-group-separator]):hover+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator]):focus+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[aria-expanded=true]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_45%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-open]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_45%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-popup-open]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_45%,transparent)]",
        orientation: "vertical",
      },
      {
        adjacentBorderTone: "subtle",
        className:
          "[&>[data-slot]:not([data-slot=button-group-separator]):hover+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator]):focus+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[aria-expanded=true]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-open]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_30%,transparent)] [&>[data-slot]:not([data-slot=button-group-separator])[data-popup-open]+[data-slot]]:!border-t-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
        orientation: "vertical",
      },
    ],
    defaultVariants: {
      adjacentBorderTone: "default",
      orientation: "horizontal",
    },
  },
);

export function ButtonGroup({
  adjacentBorderTone,
  className,
  orientation,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>): React.JSX.Element {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        buttonGroupVariants({ adjacentBorderTone, orientation }),
        className,
      )}
      {...props}
    />
  );
}

export function ButtonGroupSeparator({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Separator>): React.JSX.Element {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
        "relative self-stretch bg-[color:var(--input)] data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className,
      )}
      {...props}
    />
  );
}

export function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="button-group-text"
      className={cn(
        "flex items-center gap-2 rounded-md border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:var(--muted)] px-2.5 text-xs/relaxed font-medium [&_svg]:pointer-events-none [&_svg]:size-3.5",
        className,
      )}
      {...props}
    />
  );
}
