import type { EffectStack } from "./asset";
import type { BackgroundState } from "./look";
import type { Frame } from "./frame";

export interface StudioHistorySnapshot {
  frames: Frame[];
  /** Canonical active frame ID in the Unified Composition Model */
  activeFrameId: string | null;
  /** Canonical active layer ID in the Unified Composition Model */
  activeLayerId: string | null;

  // Legacy compatibility fields (deprecated, scheduled for removal in downstream phases)
  /** @deprecated Transitional compatibility field for unmigrated Phase 4 consumers */
  effectStacks: Record<string, EffectStack>;
  /** @deprecated Transitional compatibility field for unmigrated Phase 4 consumers */
  backgrounds: Record<string, BackgroundState>;
  /** @deprecated Transitional compatibility field for unmigrated Phase 4 consumers. Canonical active editing target is activeLayerId. */
  activeImageId: string | null;
  /** Asset library selection state, decoupled from canvas editing */
  selectedAssetIds: string[];
}

