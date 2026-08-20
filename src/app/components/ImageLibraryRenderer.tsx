import * as React from "react";
import type { ToolcraftCustomControlRendererProps } from "@/toolcraft/runtime/react";
import {
  useToolcraftMediaPresentationUrls,
  useToolcraftSelector,
} from "@/toolcraft/runtime/react";

export function ImageLibraryRenderer(
  props: ToolcraftCustomControlRendererProps<unknown>,
): React.JSX.Element | null {
  const { dispatch, setValue } = props;
  const value = typeof props.value === "string" ? props.value : "";
  const mediaAssets = useToolcraftSelector((state) => state.mediaAssets);

  const sourceAssets = React.useMemo(() => {
    return mediaAssets.filter((asset) => asset.sourceTarget === "source.image");
  }, [mediaAssets]);

  const mediaUrls = useToolcraftMediaPresentationUrls(sourceAssets);

  // Active image ID is either the explicitly set value or the first asset
  const activeImageId = React.useMemo(() => {
    if (sourceAssets.length === 0) return null;
    const exists = sourceAssets.some((asset) => asset.id === value);
    return exists ? value : sourceAssets[0].id;
  }, [sourceAssets, value]);

  // Keep active image ID synchronized if missing or changed
  React.useEffect(() => {
    if (activeImageId && activeImageId !== value) {
      setValue(activeImageId);
    }
  }, [activeImageId, setValue, value]);

  if (sourceAssets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
      }}
    >
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
              onClick={() => {
                setValue(asset.id);
              }}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: "6px",
                overflow: "hidden",
                cursor: "pointer",
                backgroundColor: "#18191c",
                boxSizing: "border-box",
                outline: isActive ? "2px solid #3b82f6" : "1px solid #2e3036",
                outlineOffset: isActive ? "1px" : "0px",
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
                  Loading...
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
                  backgroundColor: "rgba(0,0,0,0.65)",
                  color: "#fff",
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
      </div>
    </div>
  );
}
