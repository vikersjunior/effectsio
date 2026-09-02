import * as React from "react";
import { cn } from "../lib/utils";

export interface ScrollFadeProps extends React.ComponentProps<"div"> {
  containerClassName?: string;
  side?: "top" | "bottom" | "left" | "right" | "both";
}

export function ScrollFade({
  children,
  className,
  containerClassName,
  side = "bottom",
  ...props
}: ScrollFadeProps): React.JSX.Element {
  return (
    <div
      data-slot="scroll-fade"
      className={cn("relative overflow-hidden", containerClassName)}
    >
      <div
        className={cn(
          "h-full w-full overflow-auto scrollbar-thin",
          side === "bottom" && "mask-image-gradient-b",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
}
