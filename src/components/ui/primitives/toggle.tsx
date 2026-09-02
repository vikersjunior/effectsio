import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { toggleSelectedItemClassName } from "./selection-state";
import { cn } from "../lib/utils";

export const toggleVariants = cva(
  `group/toggle inline-flex cursor-pointer items-center justify-center gap-1 rounded-md text-xs font-medium whitespace-nowrap transition-all outline-none hover:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)] focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_50%,transparent)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-[color:var(--destructive)] ${toggleSelectedItemClassName} [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3.5`,
  {
    variants: {
      variant: {
        default:
          "bg-transparent text-[color:color-mix(in_oklab,var(--foreground)_72%,transparent)]",
        outline: `border border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_5%,transparent)] text-[color:color-mix(in_oklab,var(--foreground)_72%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] hover:text-[color:var(--foreground)] ${toggleSelectedItemClassName}`,
      },
      size: {
        default: "h-7 min-w-7 px-2",
        sm: "h-6 min-w-6 px-1.5 text-xs [&_svg]:size-3",
        lg: "h-8 min-w-8 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>): React.JSX.Element {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}
