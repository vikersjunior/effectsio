import { describe, expect, it } from "vitest";
import { blackAndWhiteEffect } from "./modules/black-and-white";
import { duotoneEffect } from "./modules/duotone";
import { grainEffect } from "./modules/grain";
import { halftoneEffect } from "./modules/halftone";
import { posterizeEffect } from "./modules/posterize";
import { screenPrintEffect } from "./modules/screen-print";
import { vintageFilmEffect } from "./modules/vintage-film";
import { reduceToolcraftControlsCommand } from "@/toolcraft/runtime/state/controls-reducer";
import { createToolcraftState } from "@/toolcraft/runtime/state/create-template-state";
import { appSchema } from "../app-schema";

describe("Effect Parameters & Rendering", () => {
  function createSampleImageData(width = 8, height = 8): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = (x * 30) % 255; // r
        data[i + 1] = (y * 30) % 255; // g
        data[i + 2] = ((x + y) * 20) % 255; // b
        data[i + 3] = 255; // a
      }
    }
    return { data, height, width } as ImageData;
  }

  it("modifies Black & White output with contrast and warmth parameters", () => {
    const sample = createSampleImageData();
    const defaultOutput = blackAndWhiteEffect.render(sample, {
      contrast: 1.2,
      warmth: 0,
    });

    const highContrastOutput = blackAndWhiteEffect.render(sample, {
      contrast: 2.2,
      warmth: 0,
    });

    const warmTintOutput = blackAndWhiteEffect.render(sample, {
      contrast: 1.2,
      warmth: 30,
    });

    expect(highContrastOutput.data).not.toEqual(defaultOutput.data);
    expect(warmTintOutput.data).not.toEqual(defaultOutput.data);
  });

  it("modifies Duotone output with contrast and colors", () => {
    const sample = createSampleImageData();
    const defaultOutput = duotoneEffect.render(sample, {
      contrast: 1.0,
      highlightColor: "#38bdf8",
      shadowColor: "#0f172a",
    });

    const highContrastOutput = duotoneEffect.render(sample, {
      contrast: 2.0,
      highlightColor: "#38bdf8",
      shadowColor: "#0f172a",
    });

    const customColorOutput = duotoneEffect.render(sample, {
      contrast: 1.0,
      highlightColor: "#f43f5e",
      shadowColor: "#1e1b4b",
    });

    expect(highContrastOutput.data).not.toEqual(defaultOutput.data);
    expect(customColorOutput.data).not.toEqual(defaultOutput.data);
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

  it("modifies Halftone output with dotSize, angle, and contrast parameters", () => {
    const sample = createSampleImageData(16, 16);
    const defaultOutput = halftoneEffect.render(sample, {
      angle: 45,
      brightness: 0,
      contrast: 1.3,
      density: 1.0,
      dotSize: 6,
    });

    const smallDotOutput = halftoneEffect.render(sample, {
      angle: 45,
      brightness: 0,
      contrast: 1.3,
      density: 1.0,
      dotSize: 2,
    });

    const angledOutput = halftoneEffect.render(sample, {
      angle: 0,
      brightness: 0,
      contrast: 1.3,
      density: 1.0,
      dotSize: 6,
    });

    expect(defaultOutput.data.some((byte) => byte !== 0 && byte !== 255)).toBe(true);
    expect(smallDotOutput.data).not.toEqual(defaultOutput.data);
    expect(angledOutput.data).not.toEqual(defaultOutput.data);
  });

  it("modifies Screen Print output with ink colors, contrast, and registration offset", () => {
    const sample = createSampleImageData(16, 16);
    const defaultOutput = screenPrintEffect.render(sample, {
      contrast: 1.4,
      grain: 20,
      halftoneSize: 8,
      inkColor1: "#e11d48",
      inkColor2: "#0284c7",
      inkDensity: 1.0,
      registrationOffset: 3,
    });

    const offsetOutput = screenPrintEffect.render(sample, {
      contrast: 1.4,
      grain: 20,
      halftoneSize: 8,
      inkColor1: "#e11d48",
      inkColor2: "#0284c7",
      inkDensity: 1.0,
      registrationOffset: 10,
    });

    const customInkOutput = screenPrintEffect.render(sample, {
      contrast: 1.4,
      grain: 20,
      halftoneSize: 8,
      inkColor1: "#10b981",
      inkColor2: "#f59e0b",
      inkDensity: 1.0,
      registrationOffset: 3,
    });

    expect(defaultOutput.data.length).toBe(16 * 16 * 4);
    expect(offsetOutput.data).not.toEqual(defaultOutput.data);
    expect(customInkOutput.data).not.toEqual(defaultOutput.data);
  });

  it("modifies Vintage Film output with grain, fade, contrast, and vignette", () => {
    const sample = createSampleImageData(16, 16);
    const defaultOutput = vintageFilmEffect.render(sample, {
      contrast: 1.1,
      fade: 25,
      grain: 30,
      saturation: 0.8,
      vignette: 40,
    });

    const heavyFadeOutput = vintageFilmEffect.render(sample, {
      contrast: 1.1,
      fade: 55,
      grain: 30,
      saturation: 0.8,
      vignette: 40,
    });

    const strongVignetteOutput = vintageFilmEffect.render(sample, {
      contrast: 1.1,
      fade: 25,
      grain: 30,
      saturation: 0.8,
      vignette: 90,
    });

    expect(defaultOutput.data.length).toBe(16 * 16 * 4);
    expect(heavyFadeOutput.data).not.toEqual(defaultOutput.data);
    expect(strongVignetteOutput.data).not.toEqual(defaultOutput.data);
  });

  it("scopes controls.resetTargets to screen print targets without affecting other values", () => {
    const initialState = createToolcraftState(appSchema);

    const modifiedState = {
      ...initialState,
      values: {
        ...initialState.values,
        "appearance.background": "#ffffff",
        "screenPrint.contrast": 2.2,
        "screenPrint.grain": 50,
        "screenPrint.halftoneSize": 16,
        "screenPrint.inkColor1": "#000000",
        "screenPrint.registrationOffset": 10,
      },
    };

    const screenPrintTargets = [
      "screenPrint.inkColor1",
      "screenPrint.inkColor2",
      "screenPrint.inkDensity",
      "screenPrint.halftoneSize",
      "screenPrint.grain",
      "screenPrint.contrast",
      "screenPrint.registrationOffset",
    ];

    const reducedState = reduceToolcraftControlsCommand(modifiedState, {
      label: "Reset screen print parameters",
      targets: screenPrintTargets,
      type: "controls.resetTargets",
    });

    expect(reducedState.values["screenPrint.contrast"]).toBe(1.4);
    expect(reducedState.values["screenPrint.grain"]).toBe(20);
    expect(reducedState.values["screenPrint.halftoneSize"]).toBe(8);
    expect(reducedState.values["screenPrint.inkColor1"]).toBe("#e11d48");
    expect(reducedState.values["screenPrint.registrationOffset"]).toBe(3);

    // Unrelated values should be untouched
    expect(reducedState.values["appearance.background"]).toBe("#ffffff");
  });
});
