import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

export const badgeVariants = cva(
  "group/badge inline-flex h-[18px] w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap transition-all focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_50%,transparent)] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-[color:var(--destructive)] [&>svg]:pointer-events-none [&>svg]:size-2.5!",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--primary)] text-[color:var(--primary-foreground)]",
        secondary:
          "border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--secondary)_12%,transparent)] text-[color:var(--secondary-foreground)]",
        warning:
          "border-[color:color-mix(in_oklab,var(--attention)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--attention)_15%,transparent)] text-[color:var(--attention)]",
        destructive:
          "border-[color:color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)]",
        outline:
          "border-[color:color-mix(in_oklab,var(--border)_12%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] text-[color:var(--foreground)]",
        emphasisOutline:
          "border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] text-[color:color-mix(in_oklab,var(--foreground)_80%,transparent)]",
        mutedOutline:
          "border-[color:color-mix(in_oklab,var(--border)_10%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] text-[color:color-mix(in_oklab,var(--foreground)_40%,transparent)]",
        ghost:
          "hover:bg-[color:var(--muted)] hover:text-[color:var(--muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>;

export function Badge({
  children,
  className,
  variant = "default",
  ...props
}: BadgeProps): React.JSX.Element {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}
