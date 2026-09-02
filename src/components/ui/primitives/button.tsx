import * as React from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { pressedSelectedItemClassName } from "./selection-state";
import { cn } from "../lib/utils";

function interactiveStateClassName(params: {
  active: string;
  hover: string;
  persistent: string;
}): string {
  const focus = params.hover.replaceAll("hover:", "focus:");
  return [params.hover, focus, params.active, params.persistent].join(" ");
}

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-[color:var(--ring)] focus-visible:ring-2 focus-visible:ring-[color:color-mix(in_oklab,var(--ring)_30%,transparent)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      motion: {
        default: "active:scale-[0.98] transition-transform duration-75",
        none: "",
      },
      radius: {
        default: "rounded-md",
        full: "rounded-full",
        lg: "rounded-lg",
        md: "rounded-md",
        sm: "rounded-sm",
        xs: "rounded-xs",
        none: "rounded-none",
      },
      variant: {
        default: `bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-xs ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]",
            hover:
              "hover:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)]",
            persistent:
              "aria-expanded:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] aria-pressed:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)] data-open:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-popup-open:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-[pressed]:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]",
          },
        )}`,
        primary: `bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-xs ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]",
            hover:
              "hover:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)]",
            persistent:
              "aria-expanded:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] aria-pressed:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)] data-open:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-popup-open:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--primary)_90%,white)] data-[pressed]:bg-[color:color-mix(in_oklab,var(--primary)_80%,black)]",
          },
        )}`,
        secondary: `border-[color:color-mix(in_oklab,var(--border)_15%,transparent)] bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] text-[color:var(--foreground)] ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--input)_20%,transparent)] active:text-[color:var(--foreground)]",
            hover:
              "hover:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] hover:text-[color:var(--foreground)]",
            persistent: `aria-expanded:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] aria-expanded:text-[color:var(--foreground)] data-open:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] data-open:text-[color:var(--foreground)] data-popup-open:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] data-popup-open:text-[color:var(--foreground)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] data-[state=open]:text-[color:var(--foreground)] ${pressedSelectedItemClassName}`,
          },
        )}`,
        outline: `border-[color:color-mix(in_oklab,var(--border)_20%,transparent)] bg-transparent text-[color:var(--foreground)] ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--input)_15%,transparent)] active:text-[color:var(--foreground)]",
            hover:
              "hover:border-[color:color-mix(in_oklab,var(--border)_35%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] hover:text-[color:var(--foreground)]",
            persistent: `aria-expanded:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] aria-expanded:text-[color:var(--foreground)] data-open:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-open:text-[color:var(--foreground)] data-popup-open:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-popup-open:text-[color:var(--foreground)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--input)_10%,transparent)] data-[state=open]:text-[color:var(--foreground)] ${pressedSelectedItemClassName}`,
          },
        )}`,
        ghost: `bg-transparent text-[color:var(--muted-foreground)] ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)] active:text-[color:var(--foreground)]",
            hover:
              "hover:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] hover:text-[color:var(--foreground)]",
            persistent: `aria-expanded:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] aria-expanded:text-[color:var(--foreground)] data-open:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] data-open:text-[color:var(--foreground)] data-popup-open:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] data-popup-open:text-[color:var(--foreground)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)] data-[state=open]:text-[color:var(--foreground)] ${pressedSelectedItemClassName}`,
          },
        )}`,
        destructive: `border-[color:color-mix(in_oklab,var(--destructive)_30%,transparent)] bg-[color:color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color:var(--destructive)] ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] active:text-[color:var(--destructive)]",
            hover:
              "hover:border-[color:color-mix(in_oklab,var(--destructive)_60%,transparent)] hover:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] hover:text-[color:var(--destructive)]",
            persistent:
              "aria-expanded:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] aria-expanded:text-[color:var(--destructive)] aria-pressed:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] aria-pressed:text-[color:var(--destructive)] data-open:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] data-open:text-[color:var(--destructive)] data-popup-open:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] data-popup-open:text-[color:var(--destructive)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] data-[state=open]:text-[color:var(--destructive)] data-[pressed]:bg-[color:color-mix(in_oklab,var(--destructive)_25%,transparent)] data-[pressed]:text-[color:var(--destructive)]",
          },
        )} focus-visible:border-[color:var(--destructive)] focus-visible:ring-[color:color-mix(in_oklab,var(--destructive)_20%,transparent)]`,
        "link-solid": `bg-[color:var(--link)] text-[color:var(--background)] ${interactiveStateClassName(
          {
            active:
              "active:bg-[color:color-mix(in_oklab,var(--link)_82%,black)]",
            hover: "hover:bg-[color:color-mix(in_oklab,var(--link)_88%,black)]",
            persistent:
              "aria-expanded:bg-[color:color-mix(in_oklab,var(--link)_88%,black)] aria-pressed:bg-[color:color-mix(in_oklab,var(--link)_82%,black)] data-open:bg-[color:color-mix(in_oklab,var(--link)_88%,black)] data-popup-open:bg-[color:color-mix(in_oklab,var(--link)_88%,black)] data-[state=open]:bg-[color:color-mix(in_oklab,var(--link)_88%,black)] data-[pressed]:bg-[color:color-mix(in_oklab,var(--link)_82%,black)]",
          },
        )}`,
        link: `text-[color:var(--primary)] underline-offset-4 ${interactiveStateClassName(
          {
            active: "active:underline",
            hover: "hover:underline",
            persistent:
              "aria-expanded:underline aria-pressed:underline data-open:underline data-popup-open:underline data-[state=open]:underline data-[pressed]:underline",
          },
        )}`,
      },
      size: {
        default:
          "h-7 gap-1 px-2 text-[13px] leading-[1.125rem] [&_svg]:size-3.5",
        xxs: "h-[18px] gap-1 px-1.5 text-[11px] [&_svg]:size-2.5",
        xs: "h-[22px] gap-1 px-2 text-[12px] [&_svg]:size-2.5",
        sm: "h-6 gap-1 px-2 text-xs/relaxed [&_svg]:size-3",
        md: "h-7 gap-1 px-2 text-[13px] leading-[1.125rem] [&_svg]:size-3.5",
        lg: "h-[34px] gap-1 px-3.5 text-sm/relaxed tracking-tight [&_svg]:size-3.5",
        xl: "h-10 gap-1.5 px-3 text-sm/relaxed [&_svg]:size-4",
        icon: "size-7 text-[13px] leading-[1.125rem] [&_svg]:size-3.5",
        "icon-tight": "h-7 px-1.5 text-[13px] leading-[1.125rem] [&_svg]:size-3.5",
        "icon-xxs": "size-[18px] text-[11px] [&_svg]:size-2.5",
        "icon-xs": "size-[22px] text-[12px] [&_svg]:size-2.5",
        "icon-sm": "size-6 text-xs/relaxed [&_svg]:size-3",
        "icon-md": "size-7 text-[13px] leading-[1.125rem] [&_svg]:size-3.5",
        "icon-lg": "size-[34px] text-sm/relaxed tracking-tight [&_svg]:size-4",
        "icon-xl": "size-10 text-sm/relaxed [&_svg]:size-5",
      },
    },
    defaultVariants: {
      motion: "default",
      radius: "default",
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    "data-slot"?: string;
    icon?: React.ReactNode;
  };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      "aria-label": ariaLabel,
      "data-slot": dataSlot,
      children,
      className,
      disabled,
      icon,
      motion = "default",
      radius = "default",
      size = "default",
      variant = "default",
      ...props
    },
    ref,
  ) {
    const resolvedRadius =
      radius === "default" && (size === "xxs" || size === "icon-xxs")
        ? "sm"
        : radius;

    return (
      <ButtonPrimitive
        {...props}
        aria-label={ariaLabel}
        data-slot={dataSlot ?? "button"}
        data-radius={resolvedRadius ?? undefined}
        data-size={size ?? undefined}
        data-variant={variant ?? undefined}
        disabled={disabled}
        ref={ref}
        className={cn(
          buttonVariants({ motion, radius: resolvedRadius, variant, size }),
          className,
        )}
      >
        {icon && <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>}
        {children}
      </ButtonPrimitive>
    );
  },
);
