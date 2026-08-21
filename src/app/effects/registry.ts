import { asciiEffect } from "./modules/ascii";
import { blackAndWhiteEffect } from "./modules/black-and-white";
import { duotoneEffect } from "./modules/duotone";
import { glitchEffect } from "./modules/glitch";
import { grainEffect } from "./modules/grain";
import { halftoneEffect } from "./modules/halftone";
import { lineArtEffect } from "./modules/line-art";
import { originalEffect } from "./modules/original";
import { pixelateEffect } from "./modules/pixelate";
import { posterizeEffect } from "./modules/posterize";
import { screenPrintEffect } from "./modules/screen-print";
import { vintageFilmEffect } from "./modules/vintage-film";
import { EFFECT_IDS, type EffectCategory, type EffectDefinition, type EffectId } from "./types";

export { EFFECT_IDS };

export const EFFECT_REGISTRY: readonly EffectDefinition[] = [
  originalEffect,
  blackAndWhiteEffect,
  duotoneEffect,
  posterizeEffect,
  grainEffect,
  halftoneEffect,
  screenPrintEffect,
  vintageFilmEffect,
  glitchEffect,
  pixelateEffect,
  lineArtEffect,
  asciiEffect,
];

const EFFECT_MAP = new Map<EffectId, EffectDefinition>(
  EFFECT_REGISTRY.map((effect) => [effect.id, effect]),
);

export function getAllEffects(): readonly EffectDefinition[] {
  return EFFECT_REGISTRY;
}

export function getEffectDefinition(id: string): EffectDefinition | undefined {
  return EFFECT_MAP.get(id as EffectId);
}

export function getEffectsByCategory(category: EffectCategory): readonly EffectDefinition[] {
  return EFFECT_REGISTRY.filter((effect) => effect.category === category);
}

export function hasEffect(id: string): id is EffectId {
  return EFFECT_MAP.has(id as EffectId);
}
