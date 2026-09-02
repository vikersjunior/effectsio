import { SHARED_INPUT_CONTROL_SURFACE_CLASS_NAME } from "./input-control-style";

export const outlineControlSurfaceClassName = SHARED_INPUT_CONTROL_SURFACE_CLASS_NAME;

export const outlineControlInteractiveClassName = [
  "hover:border-[color:color-mix(in_oklab,var(--border)_20%,transparent)]",
  "focus-visible:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
  "data-[state=open]:border-[color:color-mix(in_oklab,var(--border)_30%,transparent)]",
].join(" ");
