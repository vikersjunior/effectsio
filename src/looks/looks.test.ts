import { describe, it, expect } from "vitest";
import { BUILTIN_LOOKS } from "./builtin-looks";
import {
  cloneEffectInstance,
  cloneLookToEffectStack,
  createLookFromStack,
  getAllLooks,
} from "./look-manager";
import type { EffectStack } from "../types/asset";

describe("Phase 6 Looks & Presets Engine Suite", () => {
  it("ships exactly 6 curated factory built-in Looks with non-empty stacks", () => {
    expect(BUILTIN_LOOKS.length).toBe(6);
    for (const look of BUILTIN_LOOKS) {
      expect(look.id).toBeDefined();
      expect(look.name.length).toBeGreaterThan(0);
      expect(look.isBuiltIn).toBe(true);
      expect(look.effectStack.length).toBeGreaterThan(0);
      for (const instance of look.effectStack) {
        expect(instance.effectId).toBeDefined();
        expect(instance.enabled).toBe(true);
        expect(typeof instance.parameters).toBe("object");
      }
    }
  });

  it("deep-clones a Look to an EffectStack with brand new instanceIds", () => {
    const look = BUILTIN_LOOKS[0]; // Editorial Print
    const stack = cloneLookToEffectStack(look);

    expect(stack.length).toBe(look.effectStack.length);

    // Verify all instanceIds are unique and distinct from the template
    for (let i = 0; i < stack.length; i++) {
      expect(stack[i].instanceId).not.toBe(look.effectStack[i].instanceId);
      expect(stack[i].effectId).toBe(look.effectStack[i].effectId);
      expect(stack[i].enabled).toBe(look.effectStack[i].enabled);
      expect(stack[i].parameters).toEqual(look.effectStack[i].parameters);
    }

    // Verify parameter mutation on stack does NOT mutate template
    (stack[0].parameters as Record<string, unknown>).dotSize = 999;
    expect((look.effectStack[0].parameters as Record<string, unknown>).dotSize).toBe(6);
  });

  it("creates a custom user Look from an active stack", () => {
    const activeStack: EffectStack = [
      {
        instanceId: "active-inst-1",
        effectId: "posterize",
        enabled: true,
        parameters: { levels: 3 },
      },
      {
        instanceId: "active-inst-2",
        effectId: "grain",
        enabled: false,
        parameters: { intensity: 50 },
      },
    ];

    const customLook = createLookFromStack("My Retro Vibe", "retro", activeStack, "Custom look description");

    expect(customLook.id).toContain("look-user-");
    expect(customLook.name).toBe("My Retro Vibe");
    expect(customLook.category).toBe("retro");
    expect(customLook.description).toBe("Custom look description");
    expect(customLook.isBuiltIn).toBe(false);
    expect(customLook.effectStack.length).toBe(2);

    // Verify new instanceIds generated
    expect(customLook.effectStack[0].instanceId).not.toBe("active-inst-1");
    expect(customLook.effectStack[1].enabled).toBe(false);

    // Verify catalog merge
    const all = getAllLooks([customLook]);
    expect(all.length).toBe(7);
    expect(all[all.length - 1].name).toBe("My Retro Vibe");
  });
});
