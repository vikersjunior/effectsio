import * as React from "react";
import type { ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";
import { getSourceImageAssets, resolveActiveImage } from "./active-image";

export function ImageLibraryRenderer(
  props: ToolcraftCustomControlRendererProps<unknown>,
): React.JSX.Element | null {
  const { dispatch, setValue } = props;

  const mediaAssets = useToolcraftSelector((state) => state.mediaAssets);

  const sourceAssets = React.useMemo(() => getSourceImageAssets(mediaAssets), [mediaAssets]);

  const mediaUrls = useToolcraftMediaPresentationUrls(sourceAssets);

  const activeAsset = React.useMemo(() => {
    return resolveActiveImage(props.value, sourceAssets);
  }, [props.value, sourceAssets]);

  const activeImageId = activeAsset?.id ?? null;

  // Keep control value synchronized with active asset ID
  React.useEffect(() => {
    if (activeImageId && activeImageId !== props.value) {
      setValue(activeImageId);
    }
  }, [activeImageId, props.value, setValue]);

  const openFileSelector = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const files = target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      fileArray.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            const img = new Image();
            img.onload = () => {
              dispatch({
                asset: {
                  assetKind: "image",
                  fileName: file.name,
                  lifecycle: "ready",
                  mimeType: file.type || "image/png",
                  position: { x: 0, y: 0 },
                  resourceRef: result,
                  size: { height: img.naturalHeight, unit: "px", width: img.naturalWidth },
                  sourceTarget: "source.image",
                },
                type: "media.import",
              });
            };
            img.src = result;
          }
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };

  const handleSelectThumbnail = (assetId: string, layerId: string) => {
    setValue(assetId);
    if (layerId) {
      dispatch({ layerId, type: "layers.select" });
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {sourceAssets.length === 0 ? (
        <div
          onClick={openFileSelector}
          style={{
            border: "1px dashed #3a3d45",
            borderRadius: "8px",
            padding: "24px 16px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "#16171a",
            transition: "all 0.15s ease",
          }}
        >
          <div style={{ fontSize: "20px", marginBottom: "4px" }}>+</div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "#e2e8f0" }}>
            Upload Source Images
          </div>
          <div style={{ fontSize: "11px", color: "#848895", marginTop: "2px" }}>
            JPG, PNG, WEBP supported
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "8px",
            }}
          >
            {sourceAssets.map((asset) => {
              const url = mediaUrls.get(asset.id);
              const isActive = asset.id === activeImageId;

              return (
                <div
                  key={asset.id}
                  onClick={() => handleSelectThumbnail(asset.id, asset.layerId)}
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: "6px",
                    overflow: "hidden",
                    cursor: "pointer",
                    backgroundColor: "#18191c",
                    boxSizing: "border-box",
                    border: isActive ? "2px solid #3b82f6" : "1px solid #2e3036",
                    boxShadow: isActive ? "0 0 0 2px rgba(59, 130, 246, 0.4)" : "none",
                    transition: "all 0.15s ease",
                  }}
                  title={asset.fileName}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={asset.fileName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        color: "#888",
                      }}
                    >
                      ...
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ mediaId: asset.id, type: "media.delete" });
                    }}
                    style={{
                      position: "absolute",
                      top: "3px",
                      right: "3px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(0,0,0,0.75)",
                      color: "#ffffff",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                    title="Delete image"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <div
              onClick={openFileSelector}
              style={{
                aspectRatio: "1",
                borderRadius: "6px",
                border: "1px dashed #3a3d45",
                backgroundColor: "#18191c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                color: "#94a3b8",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Add more images"
            >
              +
            </div>
          </div>

          {activeImageId && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    mediaId: activeImageId,
                    operation: "rotate-right",
                    type: "media.transform",
                  })
                }
                style={{
                  padding: "6px",
                  fontSize: "11px",
                  backgroundColor: "#22242a",
                  color: "#cbd5e1",
                  border: "1px solid #333640",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ⟳ 90°
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    mediaId: activeImageId,
                    operation: "flip-horizontal",
                    type: "media.transform",
                  })
                }
                style={{
                  padding: "6px",
                  fontSize: "11px",
                  backgroundColor: "#22242a",
                  color: "#cbd5e1",
                  border: "1px solid #333640",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ⫼ Flip H
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({
                    mediaId: activeImageId,
                    operation: "flip-vertical",
                    type: "media.transform",
                  })
                }
                style={{
                  padding: "6px",
                  fontSize: "11px",
                  backgroundColor: "#22242a",
                  color: "#cbd5e1",
                  border: "1px solid #333640",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                ⫽ Flip V
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
