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

    if (actionValue === "resetTonalEffect") {
      const selectedEffect = (state.values["effect.selected"] as string) ?? "original";
      let targetsToReset: string[] = [];

      switch (selectedEffect) {
        case "black-and-white":
          targetsToReset = ["bw.contrast", "bw.warmth"];
          break;
        case "duotone":
          targetsToReset = [
            "duotone.shadowColor",
            "duotone.highlightColor",
            "duotone.contrast",
          ];
          break;
        case "posterize":
          targetsToReset = ["posterize.levels"];
          break;
        case "grain":
          targetsToReset = ["grain.intensity"];
          break;
        default:
          break;
      }

      if (targetsToReset.length > 0) {
        dispatch({
          label: "Reset tonal effect parameters",
          targets: targetsToReset,
          type: "controls.resetTargets",
        });
      }
      return;
    }

    if (actionValue === "resetDigitalEffect") {
      const selectedEffect = (state.values["effect.selected"] as string) ?? "original";
      let targetsToReset: string[] = [];

      switch (selectedEffect) {
        case "glitch":
          targetsToReset = [
            "glitch.intensity",
            "glitch.rgbShift",
            "glitch.noise",
            "glitch.scanlines",
            "glitch.distortion",
          ];
          break;
        case "pixelate":
          targetsToReset = ["pixelate.blockSize"];
          break;
        case "ascii":
          targetsToReset = [
            "ascii.fontSize",
            "ascii.characterDensity",
            "ascii.colorMode",
          ];
          break;
        default:
          break;
      }

      if (targetsToReset.length > 0) {
        dispatch({
          label: "Reset digital effect parameters",
          targets: targetsToReset,
          type: "controls.resetTargets",
        });
      }
    }
  },
};
