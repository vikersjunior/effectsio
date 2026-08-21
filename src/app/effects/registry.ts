import { blackAndWhiteEffect } from "./modules/black-and-white";
import { duotoneEffect } from "./modules/duotone";
import { grainEffect } from "./modules/grain";
import { originalEffect } from "./modules/original";
import { posterizeEffect } from "./modules/posterize";
import type { EffectCategory, EffectDefinition, EffectId } from "./types";

const EFFECT_REGISTRY: ReadonlyMap<EffectId, EffectDefinition> = new Map<
  EffectId,
  EffectDefinition
>([
  [originalEffect.id, originalEffect],
  [blackAndWhiteEffect.id, blackAndWhiteEffect],
  [duotoneEffect.id, duotoneEffect],
  [posterizeEffect.id, posterizeEffect],
  [grainEffect.id, grainEffect],
]);

export function getAllEffects(): readonly EffectDefinition[] {
  return Array.from(EFFECT_REGISTRY.values());
}

export function getEffectDefinition(
  id: string,
): EffectDefinition | undefined {
  return EFFECT_REGISTRY.get(id as EffectId);
}

export function hasEffect(id: string): boolean {
  return EFFECT_REGISTRY.has(id as EffectId);
}

export function getEffectsByCategory(
  category: EffectCategory,
): readonly EffectDefinition[] {
  return getAllEffects().filter((effect) => effect.category === category);
}
