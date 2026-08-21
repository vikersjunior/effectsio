import { defineToolcraft } from "@/toolcraft/runtime";
import { appIdentity } from "./app-identity";
import { backgroundSection } from "./schema/background-section";
import { effectsArtisticSection } from "./schema/effects-artistic-section";
import { effectsDigitalSection } from "./schema/effects-digital-section";
import { effectsGallerySection } from "./schema/effects-gallery-section";
import { effectsGraphicSection } from "./schema/effects-graphic-section";
import { effectsTonalSection } from "./schema/effects-tonal-section";
import { imageExportSection } from "./schema/image-export-section";
import { sourceMaterialSection } from "./schema/source-material-section";

export const appSchema = defineToolcraft({
  canvas: {
    enabled: true,
    sizing: { mode: "editable-output" },
    upload: true,
  },
  identity: appIdentity,
  persistence: {
    include: ["canvas", "values", "panels"],
    key: "toolcraft:effectsio:state:v1",
    storage: "localStorage",
    version: 1,
  },
  panels: {
    controls: {
      sections: [
        sourceMaterialSection,
        effectsGallerySection,
        effectsTonalSection,
        effectsArtisticSection,
        effectsGraphicSection,
        effectsDigitalSection,
        backgroundSection,
        imageExportSection,
      ],
      title: "EffectsIO Workstation",
    },
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
