import { cloneImageData } from "./canvas-utils";
import { getEffectDefinition } from "./registry";

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
): ImageData {
  const effect = getEffectDefinition(effectId);
  if (!effect) {
    return cloneImageData(sourceImageData);
  }

  const resolvedParameters = resolveEffectParameters(effectId, userParameters);
  return effect.render(sourceImageData, resolvedParameters);
}
