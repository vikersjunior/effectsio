import { describe, expect, it } from "vitest";
import { duotoneEffect } from "./modules/duotone";
import { grainEffect } from "./modules/grain";
import { posterizeEffect } from "./modules/posterize";
import { reduceToolcraftControlsCommand } from "@/toolcraft/runtime/state/controls-reducer";
import { createToolcraftState } from "@/toolcraft/runtime/state/create-template-state";
import { appSchema } from "../app-schema";

describe("Effect Parameters & Rendering", () => {
  function createSampleImageData(width = 4, height = 4): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 100; // r
      data[i + 1] = 150; // g
      data[i + 2] = 200; // b
      data[i + 3] = 255; // a
    }
    return { data, height, width } as ImageData;
  }

  it("modifies Duotone output with contrast and exposure parameters", () => {
    const sample = createSampleImageData();
    const defaultOutput = duotoneEffect.render(sample, {
      contrast: 1.0,
      exposure: 0,
      highlightColor: "#38bdf8",
      shadowColor: "#0f172a",
    });

    const highContrastOutput = duotoneEffect.render(sample, {
      contrast: 2.0,
      exposure: 0,
      highlightColor: "#38bdf8",
      shadowColor: "#0f172a",
    });

    const brightExposureOutput = duotoneEffect.render(sample, {
      contrast: 1.0,
      exposure: 50,
      highlightColor: "#38bdf8",
      shadowColor: "#0f172a",
    });

    expect(highContrastOutput.data).not.toEqual(defaultOutput.data);
    expect(brightExposureOutput.data).not.toEqual(defaultOutput.data);
  });

  it("modifies Posterize output with levels parameter", () => {
    const sample = createSampleImageData();
    const defaultOutput = posterizeEffect.render(sample, { levels: 4 });
    const fineLevelsOutput = posterizeEffect.render(sample, { levels: 16 });

    expect(fineLevelsOutput.data).not.toEqual(defaultOutput.data);
  });

  it("modifies Film Grain output with intensity parameter", () => {
    const sample = createSampleImageData();
    const lowIntensity = grainEffect.render(sample, { intensity: 10 });
    const highIntensity = grainEffect.render(sample, { intensity: 80 });

    expect(lowIntensity.data).not.toEqual(highIntensity.data);
  });

  it("scopes controls.resetTargets to only specified effect targets without affecting other values", () => {
    const initialState = createToolcraftState(appSchema);

    // Mutate state with custom values
    const modifiedState = {
      ...initialState,
      values: {
        ...initialState.values,
        "appearance.background": "#ffffff", // changed unrelated value
        "effect.duotone.contrast": 1.8, // changed target
        "effect.duotone.exposure": 40, // changed target
        "effect.duotone.highlightColor": "#ff0000", // changed target
        "effect.duotone.shadowColor": "#00ff00", // changed target
      },
    };

    const duotoneTargets = [
      "effect.duotone.shadowColor",
      "effect.duotone.highlightColor",
      "effect.duotone.contrast",
      "effect.duotone.exposure",
    ];

    const reducedState = reduceToolcraftControlsCommand(modifiedState, {
      label: "Reset effect parameters",
      targets: duotoneTargets,
      type: "controls.resetTargets",
    });

    // Duotone targets should be restored to schema defaults
    expect(reducedState.values["effect.duotone.contrast"]).toBe(1.0);
    expect(reducedState.values["effect.duotone.exposure"]).toBe(0);
    expect(reducedState.values["effect.duotone.highlightColor"]).toBe("#38bdf8");
    expect(reducedState.values["effect.duotone.shadowColor"]).toBe("#0f172a");

    // Unrelated values should be untouched
    expect(reducedState.values["appearance.background"]).toBe("#ffffff");
  });
});
