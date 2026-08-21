import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

export const imageExportSection: ToolcraftControlSectionSchema = {
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
};
