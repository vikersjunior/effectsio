import { describe, expect, it } from "vitest";
import { appSchema } from "./app-schema";
import { validateProductAcceptanceCoverage } from "./app-acceptance";
import { blackAndWhiteEffect } from "./effects/modules/black-and-white";
import { duotoneEffect } from "./effects/modules/duotone";
import { grainEffect } from "./effects/modules/grain";
import { halftoneEffect } from "./effects/modules/halftone";
import { posterizeEffect } from "./effects/modules/posterize";
import { screenPrintEffect } from "./effects/modules/screen-print";
import { vintageFilmEffect } from "./effects/modules/vintage-film";

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

    expect(productSections.length).toBe(6);
    expect(productSections.map((s) => s.id)).toEqual([
      "source-material",
      "effects-gallery",
      "effects-tonal",
      "effects-artistic",
      "effects-screenprint",
      "image-export.part-export-image-format-1k2loow",
    ]);
  });

  it("ensures schema default values match effect registry default parameters", () => {
    const tonalSection = appSchema.panels.controls?.sections?.find(
      (s) => s.id === "effects-tonal",
    );
    expect(tonalSection).toBeDefined();
    const tonalControls = tonalSection?.controls as Record<string, { defaultValue?: unknown }>;

    expect(tonalControls["bw.contrast"].defaultValue).toBe(
      blackAndWhiteEffect.defaultParameters.contrast,
    );
    expect(tonalControls["bw.warmth"].defaultValue).toBe(
      blackAndWhiteEffect.defaultParameters.warmth,
    );
    expect(tonalControls["duotone.shadowColor"].defaultValue).toBe(
      duotoneEffect.defaultParameters.shadowColor,
    );
    expect(tonalControls["duotone.highlightColor"].defaultValue).toBe(
      duotoneEffect.defaultParameters.highlightColor,
    );
    expect(tonalControls["duotone.contrast"].defaultValue).toBe(
      duotoneEffect.defaultParameters.contrast,
    );
    expect(tonalControls["posterize.levels"].defaultValue).toBe(
      posterizeEffect.defaultParameters.levels,
    );
    expect(tonalControls["grain.intensity"].defaultValue).toBe(
      grainEffect.defaultParameters.intensity,
    );

    const artisticSection = appSchema.panels.controls?.sections?.find(
      (s) => s.id === "effects-artistic",
    );
    expect(artisticSection).toBeDefined();
    const artisticControls = artisticSection?.controls as Record<string, { defaultValue?: unknown }>;

    expect(artisticControls["halftone.dotSize"].defaultValue).toBe(
      halftoneEffect.defaultParameters.dotSize,
    );
    expect(artisticControls["halftone.contrast"].defaultValue).toBe(
      halftoneEffect.defaultParameters.contrast,
    );
    expect(artisticControls["halftone.angle"].defaultValue).toBe(
      halftoneEffect.defaultParameters.angle,
    );
    expect(artisticControls["vintageFilm.grain"].defaultValue).toBe(
      vintageFilmEffect.defaultParameters.grain,
    );
    expect(artisticControls["vintageFilm.fade"].defaultValue).toBe(
      vintageFilmEffect.defaultParameters.fade,
    );
    expect(artisticControls["vintageFilm.contrast"].defaultValue).toBe(
      vintageFilmEffect.defaultParameters.contrast,
    );

    const screenPrintSection = appSchema.panels.controls?.sections?.find(
      (s) => s.id === "effects-screenprint",
    );
    expect(screenPrintSection).toBeDefined();
    const screenPrintControls = screenPrintSection?.controls as Record<string, { defaultValue?: unknown }>;

    expect(screenPrintControls["screenPrint.inkColor1"].defaultValue).toBe(
      screenPrintEffect.defaultParameters.inkColor1,
    );
    expect(screenPrintControls["screenPrint.inkColor2"].defaultValue).toBe(
      screenPrintEffect.defaultParameters.inkColor2,
    );
    expect(screenPrintControls["screenPrint.registrationOffset"].defaultValue).toBe(
      screenPrintEffect.defaultParameters.registrationOffset,
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
        (section) => section.id === "effects-gallery",
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
