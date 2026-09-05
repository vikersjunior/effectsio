import type { EffectStack } from "./asset";
import type { BackgroundState } from "./look";
import type { Frame } from "./frame";

export interface StudioHistorySnapshot {
  frames: Frame[];
  activeFrameId: string | null;
  activeLayerId: string | null;
  // Legacy compatibility fields
  effectStacks: Record<string, EffectStack>;
  backgrounds: Record<string, BackgroundState>;
  activeImageId: string | null;
  selectedAssetIds: string[];
}

