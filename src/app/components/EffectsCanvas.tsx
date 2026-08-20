import * as React from "react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftProductSceneFrame,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";

export function EffectsCanvas(): React.JSX.Element {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const values = useToolcraftSelector((state) => state.values);
  const mediaAssets = useToolcraftSelector((state) => state.mediaAssets);

  // Filter images uploaded to source.image target
  const sourceAssets = React.useMemo(() => {
    return mediaAssets.filter((asset) => asset.sourceTarget === "source.image");
  }, [mediaAssets]);

  // Active asset is the primary uploaded asset in the library
  const activeAsset = React.useMemo(() => {
    if (sourceAssets.length === 0) return null;
    return sourceAssets[0];
  }, [sourceAssets]);

  const activeAssetsList = React.useMemo(() => {
    return activeAsset ? [activeAsset] : [];
  }, [activeAsset]);

  const mediaUrls = useToolcraftMediaPresentationUrls(activeAssetsList);
  const sceneFrame = useToolcraftProductSceneFrame();

  const paperColor = (values["appearance.background"] as string) ?? "#121316";

  const activeMediaUrl = React.useMemo(() => {
    if (!activeAsset || !mediaUrls || mediaUrls.size === 0) return null;
    return mediaUrls.get(activeAsset.id) || Array.from(mediaUrls.values())[0] || null;
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
