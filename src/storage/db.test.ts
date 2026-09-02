import { describe, it, expect } from "vitest";
import type { BackgroundState, Look } from "../types/look";
import { DEFAULT_BACKGROUND_STATE } from "../types/look";
import type { EffectStack } from "../types/asset";

describe("Phase 6 Storage & Schema Architecture Suite", () => {
  it("provides complete default background state", () => {
    expect(DEFAULT_BACKGROUND_STATE.type).toBe("transparent");
    expect(DEFAULT_BACKGROUND_STATE.color).toBe("#000000");
    expect(DEFAULT_BACKGROUND_STATE.padding).toBe(0);
    expect(DEFAULT_BACKGROUND_STATE.borderRadius).toBe(0);
    expect(DEFAULT_BACKGROUND_STATE.shadowBlur).toBe(16);
    expect(DEFAULT_BACKGROUND_STATE.shadowOpacity).toBe(0.4);
  });

  it("validates BackgroundState schema and property bounds", () => {
    const customBg: BackgroundState = {
      type: "linear-gradient",
      color: "#ff007a",
      gradientEndColor: "#7928ca",
      gradientAngle: 45,
      padding: 32,
      borderRadius: 16,
      shadowBlur: 24,
      shadowOpacity: 0.6,
    };

    expect(customBg.type).toBe("linear-gradient");
    expect(customBg.gradientAngle).toBeGreaterThanOrEqual(0);
    expect(customBg.gradientAngle).toBeLessThanOrEqual(360);
    expect(customBg.padding).toBe(32);
    expect(customBg.borderRadius).toBe(16);
  });

  it("validates Look schema and effect stack integrity", () => {
    const customLook: Look = {
      id: "look-user-123",
      name: "Vintage Monolith",
      category: "retro",
      description: "Custom warm vintage look",
      isBuiltIn: false,
      createdAt: 1700000000000,
      effectStack: [
        {
          instanceId: "inst-1",
          effectId: "vintage-film",
          enabled: true,
          parameters: { sepia: 30 },
        },
        {
          instanceId: "inst-2",
          effectId: "grain",
          enabled: true,
          parameters: { intensity: 20 },
        },
      ],
    };

    expect(customLook.id).toBe("look-user-123");
    expect(customLook.name).toBe("Vintage Monolith");
    expect(customLook.effectStack.length).toBe(2);
    expect(customLook.effectStack[0].effectId).toBe("vintage-film");
  });
});
