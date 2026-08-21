import type { ToolcraftControlSectionSchema } from "@/toolcraft/runtime";

export const backgroundSection: ToolcraftControlSectionSchema = {
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
};
