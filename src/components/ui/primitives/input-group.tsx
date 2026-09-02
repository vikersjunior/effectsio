"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "./button";
import { Input } from "./input";
import { cn } from "../lib/utils";

const outlineControlSurfaceClassName = "bg-[color:color-mix(in_oklab,var(--card)_60%,transparent)]";

type InputGroupSize = "sm" | "default" | "lg" | "xl";

const InputGroupSizeContext = React.createContext<InputGroupSize>("default");

function useInputGroupSize(): InputGroupSize {
  return React.useContext(InputGroupSizeContext);
}

const inputGroupVariants = cva(
  cn(
    "group/input-group relative flex w-full min-w-0 items-center rounded-lg border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-data-[align=block-end]:rounded-lg has-data-[align=block-start]:rounded-lg has-[[data-slot][aria-invalid=true]]:border-[color:var(--destructive)] has-[textarea]:rounded-lg has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
    "[&:not(:focus-within):hover]:!border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] [&:not(:focus-within):hover]:text-[color:var(--foreground)]",
  ),
  {
    variants: {
      size: {
        sm: "h-6",
        default: "h-7",
        lg: "h-8",
        xl: "h-10",
      },
      surfaceStyle: {
        default: outlineControlSurfaceClassName,
        transparent: "bg-transparent dark:bg-transparent",
        "toolbar-address": "",
      },
      focusStyle: {
        default:
          "has-[[data-slot=input-group-control]:focus]:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] in-data-[slot=combobox-content]:has-[[data-slot=input-group-control]:focus]:border-inherit",
        none: "",
        "toolbar-address": "",
      },
    },
    defaultVariants: {
      size: "default",
      surfaceStyle: "default",
      focusStyle: "default",
    },
  },
);

function InputGroup({
  className,
  surfaceStyle,
  focusStyle,
  size = "default",
  ...props
}: React.ComponentProps<"div"> &
  Omit<VariantProps<typeof inputGroupVariants>, "size"> & {
    size?: InputGroupSize;
  }) {
  return (
    <InputGroupSizeContext.Provider value={size}>
      <div
        data-slot="input-group"
        data-size={size}
        className={cn(inputGroupVariants({ size, surfaceStyle, focusStyle }), className)}
        {...props}
      />
    </InputGroupSizeContext.Provider>
  );
}

const inputGroupAddonVariants = cva(
  "flex items-center justify-center text-xs text-[color:var(--muted-foreground)] select-none",
  {
    variants: {
      align: {
        "inline-start": "pl-2 pr-1",
        "inline-end": "pr-2 pl-1",
        "block-start": "pt-1.5 px-2 w-full",
        "block-end": "pb-1.5 px-2 w-full",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      {...props}
    />
  );
}

function InputGroupText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="input-group-text"
      className={cn("text-xs text-[color:var(--muted-foreground)] font-mono", className)}
      {...props}
    />
  );
}

function InputGroupButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      size="icon-xxs"
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}

const inputGroupInputVariants = cva(
  "flex-1 min-w-0 bg-transparent border-0 ring-0 focus-visible:ring-0 focus-visible:outline-none text-xs text-[color:var(--foreground)] px-2",
  {
    variants: {
      size: {
        sm: "h-6 text-2xs",
        default: "h-7 text-xs",
        lg: "h-8 text-sm",
        xl: "h-10 text-base",
      },
      surfaceStyle: {
        default: "",
        transparent: "",
        "toolbar-address": "",
      },
      typographyStyle: {
        default: "",
        mono: "font-mono",
      },
    },
    defaultVariants: {
      size: "default",
      surfaceStyle: "default",
      typographyStyle: "default",
    },
  },
);

function InputGroupInput({
  className,
  surfaceStyle,
  typographyStyle,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> &
  Omit<VariantProps<typeof inputGroupInputVariants>, "size">) {
  const size = useInputGroupSize();

  return (
    <input
      data-surface-style={surfaceStyle ?? undefined}
      data-typography-style={typographyStyle ?? undefined}
      data-slot="input-group-control"
      className={cn(
        inputGroupInputVariants({ size, surfaceStyle, typographyStyle }),
        className,
      )}
      {...props}
    />
  );
}

const InputGroupTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(function InputGroupTextarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:outline-none text-xs text-[color:var(--foreground)] p-2",
        className,
      )}
      {...props}
    />
  );
});

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
};
