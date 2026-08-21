import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

export const sourceMaterialSection: ToolcraftControlSectionSchema = {
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
};
