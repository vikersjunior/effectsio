import type { EffectStack } from "./asset";
import type { BackgroundState } from "./look";

export interface StudioHistorySnapshot {
  effectStacks: Record<string, EffectStack>;
  backgrounds: Record<string, BackgroundState>;
  activeImageId: string | null;
  selectedAssetIds: string[];
}
