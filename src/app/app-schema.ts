import { defineToolcraft } from "@/toolcraft/runtime";
import { appIdentity } from "./app-identity";
import { duotoneEffect } from "./effects/modules/duotone";
import { grainEffect } from "./effects/modules/grain";
import { posterizeEffect } from "./effects/modules/posterize";
import { PRESET_THUMBNAILS } from "./effects/preset-thumbnails";

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
        {
          id: "source-material",
          title: "Image Library",
          controls: {
            "source.image": {
              accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
              applicability: { mode: "always" },
              assetKind: "image",
              defaultValue: [],
              description: "Upload, import, and manage source images in your project library.",
              label: "Image Library",
              multiple: true,
              performanceReason: "Loads selected source image onto the workspace canvas.",
              performanceRole: "responsiveness",
              target: "source.image",
              type: "fileDrop",
            },
          },
        },
        {
          id: "effects-section",
          title: "Creative Effects",
          controls: {
            "effect.tab": {
              applicability: { mode: "always" },
              defaultValue: "gallery",
              description: "Switch between effects gallery and fine-tuning parameter adjustments.",
              label: "Mode",
              options: [
                { label: "Gallery", value: "gallery" },
                { label: "Controls", value: "controls" },
              ],
              performanceReason: "Switches effects panel view between gallery and parameter adjustments.",
              performanceRole: "responsiveness",
              semanticGroup: "mode",
              target: "effect.tab",
              type: "tabs",
            },
            "effect.selected": {
              applicability: {
                all: [{ equals: "gallery", target: "effect.tab" }],
                mode: "conditional",
              },
              defaultValue: "original",
              description: "Choose a visual effect to apply to the active image.",
              items: [
                {
                  alt: "Original (Unaltered photo)",
                  src: PRESET_THUMBNAILS.original,
                  value: "original",
                },
                {
                  alt: "Black & White (Monochrome)",
                  src: PRESET_THUMBNAILS["black-and-white"],
                  value: "black-and-white",
                },
                {
                  alt: "Duotone (Navy to Cyan)",
                  src: PRESET_THUMBNAILS.duotone,
                  value: "duotone",
                },
                {
                  alt: "Posterize (Color Quantization)",
                  src: PRESET_THUMBNAILS.posterize,
                  value: "posterize",
                },
                {
                  alt: "Film Grain (Noise Texture)",
                  src: PRESET_THUMBNAILS.grain,
                  value: "grain",
                },
              ],
              label: "Select Effect",
              performanceReason: "Selects creative effect algorithm to apply to the active image.",
              performanceRole: "responsiveness",
              semanticGroup: "selection",
              target: "effect.selected",
              type: "imagePicker",
            },
            "effect.duotone.shadowColor": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "duotone", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (duotoneEffect.defaultParameters.shadowColor as string) ?? "#0f172a",
              description: "Color mapped to dark shadow tones.",
              label: "Shadow color",
              performanceReason: "Sets duotone shadow mapping color.",
              performanceRole: "responsiveness",
              semanticGroup: "duotone",
              target: "effect.duotone.shadowColor",
              type: "color",
            },
            "effect.duotone.highlightColor": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "duotone", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (duotoneEffect.defaultParameters.highlightColor as string) ?? "#38bdf8",
              description: "Color mapped to bright highlight tones.",
              label: "Highlight color",
              performanceReason: "Sets duotone highlight mapping color.",
              performanceRole: "responsiveness",
              semanticGroup: "duotone",
              target: "effect.duotone.highlightColor",
              type: "color",
            },
            "effect.duotone.contrast": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "duotone", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (duotoneEffect.defaultParameters.contrast as number) ?? 1.0,
              description: "Steepness of gradient transition curve.",
              label: "Contrast",
              max: 2.0,
              min: 0.5,
              performanceReason: "Adjusts duotone gradient contrast curve.",
              performanceRole: "responsiveness",
              semanticGroup: "duotone",
              sliderValueKind: "continuous",
              step: 0.05,
              target: "effect.duotone.contrast",
              type: "slider",
            },
            "effect.duotone.exposure": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "duotone", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (duotoneEffect.defaultParameters.exposure as number) ?? 0,
              description: "Exposure balance across shadow and highlight tones.",
              label: "Exposure",
              max: 100,
              min: -100,
              performanceReason: "Adjusts duotone tone exposure offset.",
              performanceRole: "responsiveness",
              semanticGroup: "duotone",
              sliderValueKind: "continuous",
              step: 1,
              target: "effect.duotone.exposure",
              type: "slider",
            },
            "effect.posterize.levels": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "posterize", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (posterizeEffect.defaultParameters.levels as number) ?? 4,
              description: "Number of color steps per RGB channel.",
              label: "Color levels",
              max: 16,
              min: 2,
              performanceReason: "Adjusts channel quantization step count.",
              performanceRole: "responsiveness",
              semanticGroup: "posterize",
              sliderValueKind: "discrete",
              step: 1,
              target: "effect.posterize.levels",
              type: "slider",
              variant: "discrete",
            },
            "effect.grain.intensity": {
              applicability: {
                all: [
                  { equals: "controls", target: "effect.tab" },
                  { equals: "grain", target: "effect.selected" },
                ],
                mode: "conditional",
              },
              defaultValue: (grainEffect.defaultParameters.intensity as number) ?? 35,
              description: "Film grain noise amplitude.",
              label: "Intensity",
              max: 100,
              min: 5,
              performanceReason: "Controls film grain noise amplitude.",
              performanceRole: "responsiveness",
              semanticGroup: "grain",
              sliderValueKind: "continuous",
              step: 1,
              target: "effect.grain.intensity",
              type: "slider",
            },
            "effect.reset": {
              actions: [
                {
                  label: "Reset Effect",
                  value: "resetEffect",
                },
              ],
              applicability: {
                all: [{ equals: "controls", target: "effect.tab" }],
                mode: "conditional",
              },
              description: "Reset parameters for the active effect to default values.",
              label: "Reset",
              performanceReason: "Resets parameters for active effect.",
              performanceRole: "responsiveness",
              semanticGroup: "actions",
              target: "effect.reset",
              type: "actions",
            },
          },
        },
        {
          id: "background-section",
          title: "Background",
          controls: {
            "export.includeBackground": {
              applicability: { mode: "always" },
              defaultValue: true,
              description: "Include background fill in output image export.",
              label: "Background",
              performanceReason: "Toggles background color inclusion during export.",
              performanceRole: "responsiveness",
              target: "export.includeBackground",
              type: "switch",
            },
            "appearance.background": {
              applicability: { mode: "always" },
              defaultValue: "#121316",
              description: "Canvas workspace and paper background tint.",
              label: "Background color",
              performanceReason: "Sets workspace canvas background color.",
              performanceRole: "responsiveness",
              target: "appearance.background",
              type: "color",
            },
          },
        },
        {
          id: "image-export",
          layoutGroups: [
            {
              columns: 2,
              controls: ["export.image.format", "export.image.resolution"],
              layout: "inline",
            },
          ],
          title: "Image Export",
          controls: {
            "export.image.format": {
              applicability: { mode: "always" },
              defaultValue: "png",
              description: "Select output image format.",
              label: "Format",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              performanceReason: "Sets export image format.",
              performanceRole: "responsiveness",
              target: "export.image.format",
              type: "select",
            },
            "export.image.resolution": {
              applicability: { mode: "always" },
              defaultValue: "4k",
              description: "Select output image resolution.",
              label: "Resolution",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              performanceReason: "Sets export image resolution.",
              performanceRole: "responsiveness",
              target: "export.image.resolution",
              type: "select",
            },
            "output.exportImage": {
              actions: [
                {
                  label: "Export Image",
                  role: "export-image",
                  value: "exportImage",
                },
              ],
              applicability: { mode: "always" },
              target: "output.exportImage",
              type: "panelActions",
            },
          },
        },
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
