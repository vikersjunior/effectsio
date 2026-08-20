import * as React from "react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";
import type { ToolcraftMediaAsset } from "@/toolcraft/runtime";

export function EffectsCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const values = useToolcraftSelector((state) => state.values);

  const sourceAssets = React.useMemo(() => {
    return (values["source.image"] as readonly ToolcraftMediaAsset[] | undefined) ?? [];
  }, [values]);

  const mediaUrls = useToolcraftMediaPresentationUrls(sourceAssets);
  const sceneFrame = useToolcraftProductSceneFrame();

  const paperColor = (values["appearance.background"] as string) ?? "#121316";

  const firstMediaUrl = React.useMemo(() => {
    if (!mediaUrls || mediaUrls.size === 0) return null;
    return Array.from(mediaUrls.values())[0] || null;
  }, [mediaUrls]);

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
        drawW = height * imgAspect;
        offsetX = (width - drawW) / 2;
      } else {
        drawH = width / imgAspect;
        offsetY = (height - drawH) / 2;
      }

      ctx.drawImage(loadedImage, offsetX, offsetY, drawW, drawH);
    }
  }, [loadedImage, paperColor, sceneFrame]);

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
