import { describe, expect, it } from "vitest";
import { appSchema } from "./app-schema";
import { validateProductAcceptanceCoverage } from "./app-acceptance";
import { blackAndWhiteEffect } from "./effects/modules/black-and-white";
import { duotoneEffect } from "./effects/modules/duotone";
import { grainEffect } from "./effects/modules/grain";
import { posterizeEffect } from "./effects/modules/posterize";

describe("appSchema", () => {
  it("publishes the EffectsIO product app contract", () => {
    expect(appSchema.identity.id).toBe("toolcraft");
    expect(appSchema.identity.title).toBe("Toolcraft");
    expect(appSchema.canvas?.enabled).toBe(true);
    expect(appSchema.canvas?.sizing?.mode).toBe("editable-output");
  });

  it("includes foundational product sections for Image Library, Creative Effects, and Image Export", () => {
    const sections = appSchema.panels.controls?.sections ?? [];

    const productSections =
      sections.filter(
        (section) => !section.id.startsWith("runtime."),
      ) ?? [];

    expect(productSections.length).toBe(3);
    expect(productSections.map((s) => s.id)).toEqual([
      "source-material",
      "effects-section",
      "image-export.part-export-image-format-1k2loow",
    ]);
  });

  it("ensures schema default values match effect registry default parameters", () => {
    const effectsSection = appSchema.panels.controls?.sections?.find(
      (s) => s.id === "effects-section",
    );
    expect(effectsSection).toBeDefined();
    const controls = effectsSection?.controls as Record<string, { defaultValue?: unknown }>;

    expect(controls["effect.bw.contrast"].defaultValue).toBe(
      blackAndWhiteEffect.defaultParameters.contrast,
    );
    expect(controls["effect.bw.warmth"].defaultValue).toBe(
      blackAndWhiteEffect.defaultParameters.warmth,
    );
    expect(controls["effect.duotone.shadowColor"].defaultValue).toBe(
      duotoneEffect.defaultParameters.shadowColor,
    );
    expect(controls["effect.duotone.highlightColor"].defaultValue).toBe(
      duotoneEffect.defaultParameters.highlightColor,
    );
    expect(controls["effect.duotone.contrast"].defaultValue).toBe(
      duotoneEffect.defaultParameters.contrast,
    );
    expect(controls["effect.posterize.levels"].defaultValue).toBe(
      posterizeEffect.defaultParameters.levels,
    );
    expect(controls["effect.grain.intensity"].defaultValue).toBe(
      grainEffect.defaultParameters.intensity,
    );
  });

  it("declares production reload coverage for EffectsIO", () => {
    expect(
      appSchema.panels.controls?.sections?.some(
        (section) => section.id === "source-material",
      ),
    ).toBe(true);
    expect(
      appSchema.panels.controls?.sections?.some(
        (section) => section.id === "effects-section",
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
