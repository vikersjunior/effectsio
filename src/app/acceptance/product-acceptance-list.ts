import type { ToolcraftComponentAcceptance } from "./types";
import { effectControlsAcceptanceItems } from "./effect-controls-acceptance-items";
import { runtimeAcceptanceItems } from "./runtime-acceptance-items";

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = [
  ...runtimeAcceptanceItems,
  ...effectControlsAcceptanceItems,
];
