import { blackAndWhiteEffect } from "./modules/black-and-white";
import { duotoneEffect } from "./modules/duotone";
import { grainEffect } from "./modules/grain";
import { halftoneEffect } from "./modules/halftone";
import { originalEffect } from "./modules/original";
import { posterizeEffect } from "./modules/posterize";
import { screenPrintEffect } from "./modules/screen-print";
import { vintageFilmEffect } from "./modules/vintage-film";
import type { EffectCategory, EffectDefinition, EffectId } from "./types";

const EFFECT_REGISTRY: ReadonlyMap<EffectId, EffectDefinition<any>> = new Map<
  EffectId,
  EffectDefinition<any>
>([
  [originalEffect.id, originalEffect],
  [blackAndWhiteEffect.id, blackAndWhiteEffect],
  [duotoneEffect.id, duotoneEffect],
  [posterizeEffect.id, posterizeEffect],
  [grainEffect.id, grainEffect],
  [halftoneEffect.id, halftoneEffect],
  [screenPrintEffect.id, screenPrintEffect],
  [vintageFilmEffect.id, vintageFilmEffect],
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
