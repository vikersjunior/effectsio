import { cloneImageData } from "./canvas-utils";
import { getEffectDefinition } from "./registry";
import type { EffectStack } from "../types/asset";

export function resolveEffectParameters(
  effectId: string,
  userParameters?: Record<string, unknown>,
): Record<string, unknown> {
  const effect = getEffectDefinition(effectId);
  if (!effect) return userParameters ? { ...userParameters } : {};

  return {
    ...effect.defaultParameters,
    ...(userParameters ?? {}),
  };
}

export function applyEffect(
  sourceImageData: ImageData,
  effectId: string,
  userParameters?: Record<string, unknown>,
  time = 0,
): ImageData {
  const effect = getEffectDefinition(effectId);
  if (!effect || effectId === "original") {
    return cloneImageData(sourceImageData);
  }

  const resolvedParameters = resolveEffectParameters(effectId, userParameters);
  return effect.render(sourceImageData, { ...resolvedParameters, time });
}

export function executeEffectStack(
  sourceImageData: ImageData,
  stack: EffectStack,
  time = 0,
): ImageData {
  if (!stack || stack.length === 0) {
    return cloneImageData(sourceImageData);
  }

  let currentBuffer = cloneImageData(sourceImageData);

  for (const instance of stack) {
    if (!instance.enabled || instance.effectId === "original") continue;

    const def = getEffectDefinition(instance.effectId);
    if (!def) continue;

    const resolvedParameters = resolveEffectParameters(instance.effectId, instance.parameters);

    try {
      currentBuffer = def.render(currentBuffer, { ...resolvedParameters, time });
    } catch (err) {
      console.error(`Error rendering effect instance ${instance.instanceId} (${instance.effectId}):`, err);
    }
  }

  return currentBuffer;
}
