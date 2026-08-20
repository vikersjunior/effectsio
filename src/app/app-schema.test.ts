import { describe, expect, it } from "vitest";
import { appSchema } from "./app-schema";
import { validateProductAcceptanceCoverage } from "./app-acceptance";

describe("appSchema", () => {
  it("publishes the EffectsIO product app contract", () => {
    expect(appSchema.identity.id).toBe("toolcraft");
    expect(appSchema.identity.title).toBe("Toolcraft");
    expect(appSchema.canvas?.enabled).toBe(true);
    expect(appSchema.canvas?.sizing?.mode).toBe("editable-output");
  });

  it("includes product sections for source image, style presets, colors, toggles, fine-tuning, and image export", () => {
    const sections = appSchema.panels.controls?.sections ?? [];

    const productSections =
      sections.filter(
        (section) => !section.id.startsWith("runtime."),
      ) ?? [];

    expect(productSections.length).toBe(6);
    expect(productSections.map((s) => s.id)).toEqual([
      "source-material",
      "style-presets",
      "color-tuning",
      "effect-toggles",
      "fine-tuning",
      "image-export.part-export-image-format-1k2loow",
    ]);
  });

  it("declares production reload coverage for EffectsIO", () => {
    expect(
      appSchema.panels.controls?.sections?.some(
        (section) => section.id === "source-material",
      ),
    ).toBe(true);
    if (appSchema.persistence.storage === "localStorage") {
      expect(appSchema.persistence.include).toContain("values");
      expect(appSchema.persistence.include).toContain("canvas");
      expect(appSchema.persistence.include).toContain("panels");
      expect(appSchema.persistence.key).toBe("toolcraft:effectsio:state:v1");
    }

    expect(validateProductAcceptanceCoverage()).toEqual([]);
  });
});
