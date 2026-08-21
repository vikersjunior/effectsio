import { describe, expect, it } from "vitest";
import { createImageData } from "./canvas-utils";
import { applyEffect, resolveEffectParameters } from "./engine";
import {
  getAllEffects,
  getEffectDefinition,
  getEffectsByCategory,
  hasEffect,
} from "./registry";

function createSampleImageData(width = 4, height = 4): ImageData {
  const img = createImageData(width, height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    data[i] = (pixelIndex * 35) % 256; // R
    data[i + 1] = (pixelIndex * 55 + 50) % 256; // G
    data[i + 2] = (pixelIndex * 85 + 100) % 256; // B
    data[i + 3] = 255; // A
  }
  return img;
}

describe("Effect Registry & Engine Architecture", () => {
  it("registers the 5 foundational effects for this phase", () => {
    const effects = getAllEffects();
    expect(effects.length).toBe(5);

    const ids = effects.map((e) => e.id);
    expect(ids).toContain("original");
    expect(ids).toContain("black-and-white");
    expect(ids).toContain("duotone");
    expect(ids).toContain("posterize");
    expect(ids).toContain("grain");
  });

  it("provides valid metadata and parameter schemas for every registered effect", () => {
    const effects = getAllEffects();
    for (const effect of effects) {
      expect(effect.id).toBeDefined();
      expect(effect.name).toBeDefined();
      expect(effect.category).toBeDefined();
      expect(effect.description).toBeDefined();
      expect(typeof effect.render).toBe("function");

      for (const param of effect.parameters) {
        expect(param.name).toBeDefined();
        expect(param.label).toBeDefined();
        expect(param.type).toBeDefined();
        expect(param.defaultValue).toBeDefined();
        expect(param.description).toBeDefined();
      }
    }
  });

  it("retrieves effects by id and category", () => {
    expect(hasEffect("black-and-white")).toBe(true);
    expect(hasEffect("non-existent")).toBe(false);

    const bw = getEffectDefinition("black-and-white");
    expect(bw?.id).toBe("black-and-white");

    const graphicEffects = getEffectsByCategory("graphic");
    expect(graphicEffects.length).toBeGreaterThanOrEqual(2);
  });

  it("resolves default parameters and merges user overrides", () => {
    const params = resolveEffectParameters("black-and-white", {
      contrast: 2.0,
    });
    expect(params.contrast).toBe(2.0);
    expect(params.warmth).toBe(0);
  });

  it("renders pure transformations on ImageData headlessly without UI dependencies", () => {
    const sample = createSampleImageData();

    // 1. Original (identity)
    const originalOut = applyEffect(sample, "original");
    expect(originalOut.data).toEqual(sample.data);

    // 2. Black & White (R === G === B when warmth is 0)
    const bwOut = applyEffect(sample, "black-and-white", { contrast: 1.0, warmth: 0 });
    expect(bwOut.data[0]).toBe(bwOut.data[1]);
    expect(bwOut.data[1]).toBe(bwOut.data[2]);

    // 3. Duotone
    const duotoneOut = applyEffect(sample, "duotone", {
      contrast: 1.0,
      highlightColor: "#ffffff",
      shadowColor: "#000000",
    });
    expect(duotoneOut.data.length).toBe(sample.data.length);
    expect(duotoneOut.width).toBe(sample.width);

    // 4. Posterize
    const posterizeOut = applyEffect(sample, "posterize", { levels: 2 });
    expect(posterizeOut.data.length).toBe(sample.data.length);

    // 5. Grain
    const grainOut = applyEffect(sample, "grain", { intensity: 50 });
    expect(grainOut.data.length).toBe(sample.data.length);
  });
});
