import * as React from "react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";
import { applyEffect } from "../effects/engine";
import { getSourceImageAssets, resolveActiveImage } from "./active-image";

export function EffectsCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const values = useToolcraftSelector((state) => state.values);
  const mediaAssets = useToolcraftSelector((state) => state.mediaAssets);
  const selectedLayerId = useToolcraftSelector((state) => state.selectedLayerId);

  const sourceAssets = React.useMemo(() => getSourceImageAssets(mediaAssets), [mediaAssets]);

  // Pre-resolve presentation URLs for all source assets in library
  const mediaUrls = useToolcraftMediaPresentationUrls(sourceAssets);

  const activeAsset = React.useMemo(() => {
    return resolveActiveImage(values["source.image"], selectedLayerId, sourceAssets);
  }, [selectedLayerId, sourceAssets, values]);

  const sceneFrame = useToolcraftProductSceneFrame();
  const paperColor = (values["appearance.background"] as string) ?? "#121316";
  const selectedEffect = (values["effect.selected"] as string) ?? "original";

  // Build resolved parameters for the currently active effect
  const effectParameters = React.useMemo(() => {
    switch (selectedEffect) {
      case "black-and-white":
        return {
          contrast: values["bw.contrast"],
          warmth: values["bw.warmth"],
        };
      case "duotone":
        return {
          contrast: values["duotone.contrast"],
          highlightColor: values["duotone.highlightColor"],
          shadowColor: values["duotone.shadowColor"],
        };
      case "posterize":
        return {
          levels: values["posterize.levels"],
        };
      case "grain":
        return {
          intensity: values["grain.intensity"],
        };
      case "halftone":
        return {
          angle: values["halftone.angle"],
          brightness: values["halftone.brightness"],
          contrast: values["halftone.contrast"],
          density: values["halftone.density"],
          dotSize: values["halftone.dotSize"],
        };
      case "screen-print":
        return {
          contrast: values["screenPrint.contrast"],
          grain: values["screenPrint.grain"],
          halftoneSize: values["screenPrint.halftoneSize"],
          inkColor1: values["screenPrint.inkColor1"],
          inkColor2: values["screenPrint.inkColor2"],
          inkDensity: values["screenPrint.inkDensity"],
          registrationOffset: values["screenPrint.registrationOffset"],
        };
      case "vintage-film":
        return {
          contrast: values["vintageFilm.contrast"],
          fade: values["vintageFilm.fade"],
          grain: values["vintageFilm.grain"],
          saturation: values["vintageFilm.saturation"],
          vignette: values["vintageFilm.vignette"],
        };
      default:
        return undefined;
    }
  }, [selectedEffect, values]);

  // Derive exact media presentation URL for the currently active asset
  const activeMediaUrl = React.useMemo(() => {
    if (!activeAsset || !mediaUrls) return null;
    return mediaUrls.get(activeAsset.id) ?? null;
  }, [activeAsset, mediaUrls]);

  const [loadedImage, setLoadedImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (!activeMediaUrl) {
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
    img.src = activeMediaUrl;

    return () => {
      active = false;
    };
  }, [activeMediaUrl]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = sceneFrame.rect?.width ?? 1200;
    const height = sceneFrame.rect?.height ?? 800;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, width, height);

    if (loadedImage) {
      const imgAspect = loadedImage.width / loadedImage.height;
      const canvasAspect = width / height;

      let drawW = width;
      let drawH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (imgAspect > canvasAspect) {
        drawW = width;
        drawH = width / imgAspect;
        offsetY = (height - drawH) / 2;
      } else {
        drawH = height;
        drawW = height * imgAspect;
        offsetY = (width - drawW) / 2;
      }

      const targetW = Math.max(1, Math.round(drawW));
      const targetH = Math.max(1, Math.round(drawH));

      if (selectedEffect === "original") {
        ctx.drawImage(loadedImage, offsetX, offsetY, targetW, targetH);
      } else {
        const offscreen = document.createElement("canvas");
        offscreen.width = targetW;
        offscreen.height = targetH;
        const offCtx = offscreen.getContext("2d", { willReadFrequently: true });

        if (offCtx) {
          offCtx.drawImage(loadedImage, 0, 0, targetW, targetH);
          const rawData = offCtx.getImageData(0, 0, targetW, targetH);
          const processed = applyEffect(rawData, selectedEffect, effectParameters);
          offCtx.putImageData(processed, 0, 0);
          ctx.drawImage(offscreen, offsetX, offsetY);
        } else {
          ctx.drawImage(loadedImage, offsetX, offsetY, targetW, targetH);
        }
      }
    }
  }, [effectParameters, loadedImage, paperColor, sceneFrame, selectedEffect]);

  return (
    <div style={{ height: "100%", overflow: "hidden", position: "relative", width: "100%" }}>
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          height: "100%",
          objectFit: "contain",
          width: "100%",
        }}
      />
    </div>
  );
}
