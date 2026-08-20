import * as React from "react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";
import type { PresetParams, StylePresetId } from "../presets/types";
import { STYLE_PRESETS } from "../presets/presets-data";
import { processImageEffect } from "../effects/engine";
import { generateSampleImageCanvas } from "../effects/sample-image";

export function EffectsCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const values = useToolcraftSelector((state) => state.values);

  const sourceAssets = React.useMemo(() => {
    return (values["source.image"] as readonly ToolcraftMediaAsset[] | undefined) ?? [];
  }, [values]);

  const mediaUrls = useToolcraftMediaPresentationUrls(sourceAssets);

  // Finite / Infinite scene frame from Toolcraft
  const sceneFrame = useToolcraftProductSceneFrame();

  // Selected preset and values
  const selectedPresetId = (values["preset.selected"] as StylePresetId) || "chiwara-screen-print";
  const presetDef = STYLE_PRESETS[selectedPresetId] || STYLE_PRESETS["chiwara-screen-print"];

  // Compute resolved preset parameters with control overrides
  const resolvedParams: PresetParams = React.useMemo(() => {
    const base = presetDef.params;

    const shadowColor = (values["colors.shadow"] as string) ?? base.shadowColor;
    const highlightColor = (values["colors.highlight"] as string) ?? base.highlightColor;
    const paperColor = (values["appearance.background"] as string) ?? (values["colors.paper"] as string) ?? base.paperColor;

    const colorLevels = (values["tuning.colorLevels"] as number) ?? base.colorLevels;
    const halftoneDotSize = (values["tuning.halftoneDotSize"] as number) ?? base.halftoneDotSize;
    const halftoneAngle = (values["tuning.halftoneAngle"] as number) ?? base.halftoneAngle;
    const halftoneContrast = (values["tuning.halftoneContrast"] as number) ?? base.halftoneContrast;
    const grainIntensity = (values["tuning.grainIntensity"] as number) ?? base.grainIntensity;
    const misregistrationShift = (values["tuning.misregistrationShift"] as number) ?? base.misregistrationShift;

    const enableHalftone =
      (values["toggles.raster.enableHalftone"] as boolean) ??
      (values["toggles.enableHalftone"] as boolean) ??
      base.enableHalftone;
    const enablePosterize =
      (values["toggles.raster.enablePosterize"] as boolean) ??
      (values["toggles.enablePosterize"] as boolean) ??
      base.enablePosterize;
    const enableMisregistration =
      (values["toggles.texture.enableMisregistration"] as boolean) ??
      (values["toggles.enableMisregistration"] as boolean) ??
      base.enableMisregistration;
    const enableGrain =
      (values["toggles.texture.enableGrain"] as boolean) ??
      (values["toggles.enableGrain"] as boolean) ??
      base.enableGrain;

    const contrast = (values["tuning.contrast"] as number) ?? base.contrast;
    const brightness = (values["tuning.brightness"] as number) ?? base.brightness;

    return {
      presetId: selectedPresetId,
      presetName: presetDef.name,
      shadowColor,
      highlightColor,
      paperColor,
      colorLevels,
      halftoneDotSize,
      halftoneAngle,
      halftoneContrast,
      grainIntensity,
      misregistrationShift,
      enableHalftone,
      enablePosterize,
      enableMisregistration,
      enableGrain,
      contrast,
      brightness,
    };
  }, [presetDef, selectedPresetId, values]);

  // Extract first uploaded media image URL if present
  const firstMediaUrl = React.useMemo(() => {
    if (!mediaUrls || mediaUrls.size === 0) return null;
    return Array.from(mediaUrls.values())[0] || null;
  }, [mediaUrls]);

  // Load uploaded image element
  const [loadedImage, setLoadedImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (!firstMediaUrl) {
      setLoadedImage(null);
      return;
    }

    let active = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (active) {
        setLoadedImage(img);
      }
    };
    img.src = firstMediaUrl;

    return () => {
      active = false;
    };
  }, [firstMediaUrl]);

  // Render pipeline whenever params, loaded image, or scene frame change
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = sceneFrame.rect?.width ?? 1200;
    const height = sceneFrame.rect?.height ?? 800;

    canvas.width = width;
    canvas.height = height;

    let sourceCanvas: HTMLCanvasElement;

    if (loadedImage) {
      sourceCanvas = document.createElement("canvas");
      sourceCanvas.width = width;
      sourceCanvas.height = height;
      const sCtx = sourceCanvas.getContext("2d");
      if (sCtx) {
        const imgAspect = loadedImage.width / loadedImage.height;
        const canvasAspect = width / height;

        let drawW = width;
        let drawH = height;
        let offsetX = 0;
        let offsetY = 0;

        if (imgAspect > canvasAspect) {
          drawW = height * imgAspect;
          offsetX = (width - drawW) / 2;
        } else {
          drawH = width / imgAspect;
          offsetY = (height - drawH) / 2;
        }

        sCtx.fillStyle = resolvedParams.paperColor;
        sCtx.fillRect(0, 0, width, height);
        sCtx.drawImage(loadedImage, offsetX, offsetY, drawW, drawH);
      }
    } else {
      sourceCanvas = generateSampleImageCanvas(width, height);
    }

    // Process image through effects pipeline directly onto displayed canvas
    processImageEffect(canvas, sourceCanvas, resolvedParams);
  }, [loadedImage, resolvedParams, sceneFrame]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}
