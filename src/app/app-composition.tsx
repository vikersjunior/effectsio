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
  onPanelAction: ({ action, dispatch, state }) => {
    const actionValue = typeof action === "string" ? action : action.value;
    const sourceAssets = state.mediaAssets.filter((a) => a.sourceTarget === "source.image");

    if (actionValue === "clearAll") {
      sourceAssets.forEach((asset) => {
        dispatch({ mediaId: asset.id, type: "media.delete" });
      });
      return;
    }

    if (actionValue === "resetEffect") {
      const selectedEffect = (state.values["effect.selected"] as string) ?? "original";
      let targetsToReset: string[] = [];

      switch (selectedEffect) {
        case "black-and-white":
          targetsToReset = ["effect.bw.contrast", "effect.bw.warmth"];
          break;
        case "duotone":
          targetsToReset = [
            "effect.duotone.shadowColor",
            "effect.duotone.highlightColor",
            "effect.duotone.contrast",
            "effect.duotone.exposure",
          ];
          break;
        case "posterize":
          targetsToReset = ["effect.posterize.levels"];
          break;
        case "grain":
          targetsToReset = ["effect.grain.intensity"];
          break;
        default:
          break;
      }

      if (targetsToReset.length > 0) {
        dispatch({
          label: "Reset effect parameters",
          targets: targetsToReset,
          type: "controls.resetTargets",
        });
      }
    }
  },
};
