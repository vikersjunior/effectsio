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
    storage: "localStorage",
    key: "toolcraft:effectsio:state:v1",
    version: 1,
    include: ["canvas", "values", "panels"],
  },
  panels: {
    controls: {
      title: "EffectsIO Workstation",
      sections: [
        {
          id: "source-material",
          title: "Image Library",
          controls: {
            "source.image": {
              type: "fileDrop",
              target: "source.image",
              label: "Image Library",
              description: "Upload, import, and manage source images in your project library.",
              assetKind: "image",
              multiple: true,
              accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
              defaultValue: [],
              applicability: { mode: "always" },
              performanceRole: "responsiveness",
              performanceReason: "Loads selected source image onto the workspace canvas.",
            },
          },
        },
        {
          id: "background-section",
          title: "Background",
          controls: {
            "export.includeBackground": {
              type: "switch",
              target: "export.includeBackground",
              label: "Background",
              description: "Include background fill in output image export.",
              defaultValue: true,
              applicability: { mode: "always" },
              performanceRole: "responsiveness",
              performanceReason: "Toggles background color inclusion during export.",
            },
            "appearance.background": {
              type: "color",
              target: "appearance.background",
              label: "Background color",
              description: "Canvas workspace and paper background tint.",
              defaultValue: "#121316",
              applicability: { mode: "always" },
              performanceRole: "responsiveness",
              performanceReason: "Sets workspace canvas background color.",
            },
          },
        },
        {
          id: "image-export",
          title: "Image Export",
          layoutGroups: [
            {
              layout: "inline",
              columns: 2,
              controls: ["export.image.format", "export.image.resolution"],
            },
          ],
          controls: {
            "export.image.format": {
              type: "select",
              target: "export.image.format",
              label: "Format",
              description: "Select output image format.",
              defaultValue: "png",
              options: [
                { label: "PNG", value: "png" },
                { label: "JPG", value: "jpg" },
              ],
              applicability: { mode: "always" },
              performanceRole: "responsiveness",
              performanceReason: "Sets export image format.",
            },
            "export.image.resolution": {
              type: "select",
              target: "export.image.resolution",
              label: "Resolution",
              description: "Select output image resolution.",
              defaultValue: "4k",
              options: [
                { label: "2K", value: "2k" },
                { label: "4K", value: "4k" },
                { label: "8K", value: "8k" },
              ],
              applicability: { mode: "always" },
              performanceRole: "responsiveness",
              performanceReason: "Sets export image resolution.",
            },
            "output.exportImage": {
              type: "panelActions",
              target: "output.exportImage",
              actions: [
                {
                  value: "exportImage",
                  label: "Export Image",
                  role: "export-image",
                },
              ],
              applicability: { mode: "always" },
            },
          },
        },
      ],
    },
  },
  toolbar: {
    history: true,
    radar: true,
    theme: true,
    zoom: true,
  },
});
