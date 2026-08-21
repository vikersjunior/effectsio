import { defineToolcraft } from "@/toolcraft/runtime";
import { appIdentity } from "./app-identity";

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
          id: "workstation",
          title: "Workstation",
          controls: {
            "panel.activeView": {
              applicability: { mode: "always" },
              defaultValue: "effects",
              description: "Switch active panel view between Creative Effects and Image Library.",
              label: "View",
              options: [
                { label: "Effects", value: "effects" },
                { label: "Library & Controls", value: "library" },
              ],
              performanceReason: "Switches active controls panel view between Effects and Library.",
              performanceRole: "responsiveness",
              target: "panel.activeView",
              type: "tabs",
            },
            "effect.selected": {
              applicability: {
                all: [{ equals: "effects", target: "panel.activeView" }],
                mode: "conditional",
              },
              defaultValue: "original",
              description: "Choose a visual effect to apply to the active image.",
              items: [
                {
                  alt: "Original (Unaltered image)",
                  src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><circle cx='50' cy='50' r='28' fill='%2338bdf8'/><path d='M30 70 L50 45 L70 70 Z' fill='%230f172a'/><circle cx='62' cy='38' r='6' fill='%23facc15'/></svg>",
                  value: "original",
                },
                {
                  alt: "Black & White (Monochrome)",
                  src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%231e293b'/><circle cx='50' cy='50' r='28' fill='%230f172a'/><path d='M50 22 A28 28 0 0 1 50 78 Z' fill='%23f8fafc'/></svg>",
                  value: "black-and-white",
                },
                {
                  alt: "Duotone (Navy to Cyan)",
                  src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='duo' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%230f172a'/><stop offset='100%25' stop-color='%2338bdf8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23duo)'/><circle cx='50' cy='50' r='20' fill='%2338bdf8' opacity='0.8'/></svg>",
                  value: "duotone",
                },
                {
                  alt: "Posterize (Color Quantization)",
                  src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='33.3' fill='%23ef4444'/><rect y='33.3' width='100' height='33.3' fill='%233b82f6'/><rect y='66.6' width='100' height='33.4' fill='%23eab308'/></svg>",
                  value: "posterize",
                },
                {
                  alt: "Film Grain (Noise Texture)",
                  src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23334155'/><circle cx='25' cy='25' r='3' fill='%23f8fafc' opacity='0.6'/><circle cx='65' cy='30' r='2' fill='%230f172a' opacity='0.7'/><circle cx='45' cy='60' r='4' fill='%23f8fafc' opacity='0.5'/><circle cx='75' cy='75' r='2.5' fill='%230f172a' opacity='0.6'/><circle cx='20' cy='70' r='3' fill='%23f8fafc' opacity='0.4'/></svg>",
                  value: "grain",
                },
              ],
              label: "Select Effect",
              performanceReason: "Selects creative effect algorithm to apply to the active image.",
              performanceRole: "responsiveness",
              target: "effect.selected",
              type: "imagePicker",
            },
            "source.image": {
              accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
              applicability: {
                all: [{ equals: "library", target: "panel.activeView" }],
                mode: "conditional",
              },
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
