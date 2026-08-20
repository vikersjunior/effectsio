import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";
import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";
import { appSchema } from "./app-schema";
import { EffectsCanvas } from "./components/EffectsCanvas";

const exportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "effectsio-export",
  renderFrame: ({ context, state }) => {
    const width = context.canvas.width;
    const height = context.canvas.height;
    const ctx = context;

    const paperColor = (state.values["appearance.background"] as string) ?? "#121316";

    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);
  },
};

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <EffectsCanvas />,
  exportRenderer,
  modelPresentation: { mode: "runtime" },
  renderDefaultCanvasMedia: false,
  schema: appSchema,
};
