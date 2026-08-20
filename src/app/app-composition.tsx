import type { ToolcraftAppComposition } from "@/toolcraft/runtime/react";
import type { ToolcraftProductExportRenderer } from "@/toolcraft/runtime";
import { appSchema } from "./app-schema";
import { EffectsCanvas } from "./components/EffectsCanvas";
import { processImageEffect } from "./effects/engine";
import { generateSampleImageCanvas } from "./effects/sample-image";
import { STYLE_PRESETS } from "./presets/presets-data";
import type { PresetParams, StylePresetId } from "./presets/types";

const exportRenderer: ToolcraftProductExportRenderer = {
  baseFileName: "effectsio-art",
  renderFrame: ({ context, state }) => {
    const width = context.canvas.width;
    const height = context.canvas.height;

    const values = state.values;
    const selectedPresetId = (values["preset.selected"] as StylePresetId) || "chiwara-screen-print";
    const presetDef = STYLE_PRESETS[selectedPresetId] || STYLE_PRESETS["chiwara-screen-print"];
    const base = presetDef.params;

    const resolvedParams: PresetParams = {
      presetId: selectedPresetId,
      presetName: presetDef.name,
      shadowColor: (values["colors.shadow"] as string) ?? base.shadowColor,
      highlightColor: (values["colors.highlight"] as string) ?? base.highlightColor,
      paperColor: (values["appearance.background"] as string) ?? (values["colors.paper"] as string) ?? base.paperColor,
      colorLevels: (values["tuning.colorLevels"] as number) ?? base.colorLevels,
      halftoneDotSize: (values["tuning.halftoneDotSize"] as number) ?? base.halftoneDotSize,
      halftoneAngle: (values["tuning.halftoneAngle"] as number) ?? base.halftoneAngle,
      halftoneContrast: (values["tuning.halftoneContrast"] as number) ?? base.halftoneContrast,
      grainIntensity: (values["tuning.grainIntensity"] as number) ?? base.grainIntensity,
      misregistrationShift: (values["tuning.misregistrationShift"] as number) ?? base.misregistrationShift,
      enableHalftone:
        (values["toggles.raster.enableHalftone"] as boolean) ??
        (values["toggles.enableHalftone"] as boolean) ??
        base.enableHalftone,
      enablePosterize:
        (values["toggles.raster.enablePosterize"] as boolean) ??
        (values["toggles.enablePosterize"] as boolean) ??
        base.enablePosterize,
      enableMisregistration:
        (values["toggles.texture.enableMisregistration"] as boolean) ??
        (values["toggles.enableMisregistration"] as boolean) ??
        base.enableMisregistration,
      enableGrain:
        (values["toggles.texture.enableGrain"] as boolean) ??
        (values["toggles.enableGrain"] as boolean) ??
        base.enableGrain,
      contrast: (values["tuning.contrast"] as number) ?? base.contrast,
      brightness: (values["tuning.brightness"] as number) ?? base.brightness,
    };

    const sourceCanvas = generateSampleImageCanvas(width, height);
    processImageEffect(context.canvas, sourceCanvas, resolvedParams);
  },
};

export const appComposition: ToolcraftAppComposition = {
  canvasContent: <EffectsCanvas />,
  exportRenderer,
  modelPresentation: { mode: "runtime" },
  renderDefaultCanvasMedia: false,
  schema: appSchema,
};
