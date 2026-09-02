import type { EffectStack, EffectInstance } from "../types/asset";
import type { Look, LookCategory } from "../types/look";
import { BUILTIN_LOOKS } from "./builtin-looks";

export function cloneEffectInstance(instance: EffectInstance): EffectInstance {
  return {
    instanceId: crypto.randomUUID(),
    effectId: instance.effectId,
    enabled: instance.enabled,
    parameters: JSON.parse(JSON.stringify(instance.parameters || {})),
  };
}

export function cloneLookToEffectStack(look: Look): EffectStack {
  if (!look || !Array.isArray(look.effectStack)) return [];
  return look.effectStack.map(cloneEffectInstance);
}

export function createLookFromStack(
  name: string,
  category: LookCategory = "custom",
  stack: EffectStack,
  description = ""
): Look {
  return {
    id: `look-user-${crypto.randomUUID()}`,
    name: name.trim() || "Untitled Look",
    category,
    description: description.trim(),
    isBuiltIn: false,
    createdAt: Date.now(),
    effectStack: stack.map(cloneEffectInstance),
  };
}

export function getAllLooks(userLooks: Look[] = []): Look[] {
  return [...BUILTIN_LOOKS, ...userLooks];
}
