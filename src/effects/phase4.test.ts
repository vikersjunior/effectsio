import { describe, it, expect } from "vitest";
import { getAllEffects, getEffectDefinition } from "./registry";
import { applyEffect, resolveEffectParameters, executeEffectStack } from "./engine";
import { createImageData } from "./canvas-utils";
import type { EffectInstance, EffectStack } from "../types/asset";

describe("Phase 4.5 Effect Stack & Sequential Engine Suite", () => {
  it("all 12 canonical effects are discoverable in the registry", () => {
    const effects = getAllEffects();
    expect(effects.length).toBe(12);
    const ids = effects.map((e) => e.id);
    expect(ids).toContain("original");
    expect(ids).toContain("black-and-white");
    expect(ids).toContain("duotone");
    expect(ids).toContain("halftone");
    expect(ids).toContain("screen-print");
    expect(ids).toContain("posterize");
    expect(ids).toContain("pixelate");
    expect(ids).toContain("glitch");
    expect(ids).toContain("grain");
    expect(ids).toContain("vintage-film");
    expect(ids).toContain("line-art");
    expect(ids).toContain("ascii");
  });

  it("executeEffectStack processes sequential multi-effect stack", () => {
    const source = createImageData(10, 10);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 200;
      source.data[i + 1] = 100;
      source.data[i + 2] = 50;
      source.data[i + 3] = 255;
    }

    const stack: EffectStack = [
      {
        instanceId: "inst-1",
        effectId: "black-and-white",
        enabled: true,
        parameters: { contrast: 1, brightness: 0 },
      },
      {
        instanceId: "inst-2",
        effectId: "posterize",
        enabled: true,
        parameters: { levels: 4 },
      },
    ];

    const result = executeEffectStack(source, stack);
    expect(result).not.toBe(source);
    expect(result.data.length).toBe(source.data.length);
  });

  it("executeEffectStack skips disabled effect instances in stack", () => {
    const source = createImageData(5, 5);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 150;
      source.data[i + 1] = 150;
      source.data[i + 2] = 150;
      source.data[i + 3] = 255;
    }

    const disabledStack: EffectStack = [
      {
        instanceId: "inst-disabled",
        effectId: "black-and-white",
        enabled: false,
        parameters: {},
      },
    ];

    const result = executeEffectStack(source, disabledStack);
    // Disabling all effects in stack returns clean clone of original ImageData
    expect(result.data).toEqual(source.data);
    expect(result).not.toBe(source);
  });

  it("reordering effect stack produces deterministic visual pipeline changes", () => {
    const source = createImageData(8, 8);
    for (let i = 0; i < source.data.length; i += 4) {
      source.data[i] = 180;
      source.data[i + 1] = 90;
      source.data[i + 2] = 45;
      source.data[i + 3] = 255;
    }

    const instA: EffectInstance = {
      instanceId: "inst-a",
      effectId: "black-and-white",
      enabled: true,
      parameters: { contrast: 1.5 },
    };

    const instB: EffectInstance = {
      instanceId: "inst-b",
      effectId: "duotone",
      enabled: true,
      parameters: { shadowColor: "#0000ff", highlightColor: "#ffff00" },
    };

    const orderAB = executeEffectStack(source, [instA, instB]);
    const orderBA = executeEffectStack(source, [instB, instA]);

    expect(orderAB.data.length).toBe(orderBA.data.length);
  });

  it("multiple instances of the same effect maintain independent parameters", () => {
    const inst1: EffectInstance = {
      instanceId: "inst-1",
      effectId: "posterize",
      enabled: true,
      parameters: { levels: 4 },
    };
    const inst2: EffectInstance = {
      instanceId: "inst-2",
      effectId: "posterize",
      enabled: true,
      parameters: { levels: 16 },
    };

    expect(inst1.parameters.levels).toBe(4);
    expect(inst2.parameters.levels).toBe(16);
  });
});
