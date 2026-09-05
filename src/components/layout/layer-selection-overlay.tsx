import * as React from "react";
import type { Frame, ImageLayer, LayerTransform } from "../../types/frame";
import type { Asset } from "../../types/asset";
import {
  calculateFittedDimensions,
  getLayerCenterInFrame,
  getOrientedBoundingBox,
  frameToScreen,
  screenToFrame,
  normalizeRotation,
  clampScale,
} from "../../utils/transform-math";

export interface LayerSelectionOverlayProps {
  frame: Frame;
  activeLayer: ImageLayer;
  asset: Asset;
  viewport: { zoom: number; panX: number; panY: number };
  viewportWidth: number;
  viewportHeight: number;
  onTransformChange: (transform: LayerTransform, options?: { skipHistory?: boolean }) => void;
  onTransformCommit: () => void;
  onTransformCancel: () => void;
}

type GestureType = "move" | "scale" | "rotate" | null;

interface ActiveGesture {
  type: GestureType;
  corner?: "tl" | "tr" | "br" | "bl";
  startClientX: number;
  startClientY: number;
  initialTransform: LayerTransform;
  initialFramePointer: { x: number; y: number };
  initialCenterInFrame: { x: number; y: number };
  anchorInFrame?: { x: number; y: number };
  initialDistance: number;
  initialAngleRad: number;
}

export function LayerSelectionOverlay({
  frame,
  activeLayer,
  asset,
  viewport,
  viewportWidth,
  viewportHeight,
  onTransformChange,
  onTransformCommit,
  onTransformCancel,
}: LayerSelectionOverlayProps): React.JSX.Element | null {
  const transform = activeLayer.transform ?? { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  const frameW = frame.dimensions.width;
  const frameH = frame.dimensions.height;

  const fitted = React.useMemo(
    () => calculateFittedDimensions(asset.width, asset.height, frameW, frameH, activeLayer.fit),
    [asset.width, asset.height, frameW, frameH, activeLayer.fit]
  );

  const scaledW = fitted.width * transform.scaleX;
  const scaledH = fitted.height * transform.scaleY;

  const centerInFrame = React.useMemo(
    () => getLayerCenterInFrame(transform, frameW, frameH),
    [transform, frameW, frameH]
  );

  const obb = React.useMemo(
    () => getOrientedBoundingBox(centerInFrame, scaledW, scaledH, transform.rotation, 28),
    [centerInFrame, scaledW, scaledH, transform.rotation]
  );

  // Project OBB Frame coordinates to Screen coordinates
  const toScreen = React.useCallback(
    (pt: { x: number; y: number }) =>
      frameToScreen(pt.x, pt.y, viewportWidth, viewportHeight, frameW, frameH, viewport.zoom, viewport.panX, viewport.panY),
    [viewportWidth, viewportHeight, frameW, frameH, viewport.zoom, viewport.panX, viewport.panY]
  );

  const toFrame = React.useCallback(
    (screenX: number, screenY: number) =>
      screenToFrame(screenX, screenY, viewportWidth, viewportHeight, frameW, frameH, viewport.zoom, viewport.panX, viewport.panY),
    [viewportWidth, viewportHeight, frameW, frameH, viewport.zoom, viewport.panX, viewport.panY]
  );

  const screenTL = toScreen(obb.topLeft);
  const screenTR = toScreen(obb.topRight);
  const screenBR = toScreen(obb.bottomRight);
  const screenBL = toScreen(obb.bottomLeft);
  const screenCenter = toScreen(obb.center);
  const screenRotHandle = toScreen(obb.rotationHandle);
  const screenTopMid = {
    x: (screenTL.x + screenTR.x) / 2,
    y: (screenTL.y + screenTR.y) / 2,
  };

  const gestureRef = React.useRef<ActiveGesture | null>(null);
  const [isInteracting, setIsInteracting] = React.useState(false);

  // Keyboard Escape listener to cancel ongoing gesture
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && gestureRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const initial = gestureRef.current.initialTransform;
        gestureRef.current = null;
        setIsInteracting(false);
        onTransformChange(initial, { skipHistory: true });
        onTransformCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onTransformChange, onTransformCancel]);

  // Pointer move & up handlers
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const gesture = gestureRef.current;
    if (!gesture) return;

    e.preventDefault();
    e.stopPropagation();

    const currentFramePointer = toFrame(e.clientX, e.clientY);

    if (gesture.type === "move") {
      const deltaX = currentFramePointer.x - gesture.initialFramePointer.x;
      const deltaY = currentFramePointer.y - gesture.initialFramePointer.y;

      const newTransform: LayerTransform = {
        ...gesture.initialTransform,
        x: Math.round((gesture.initialTransform.x + deltaX) * 10) / 10,
        y: Math.round((gesture.initialTransform.y + deltaY) * 10) / 10,
      };

      onTransformChange(newTransform, { skipHistory: true });
    } else if (gesture.type === "scale") {
      const isAltPressed = e.altKey;

      let newScale: number;
      let newCenter = { ...gesture.initialCenterInFrame };

      if (isAltPressed || !gesture.anchorInFrame) {
        // Symmetrical scaling around center
        const currentDist = Math.hypot(
          currentFramePointer.x - gesture.initialCenterInFrame.x,
          currentFramePointer.y - gesture.initialCenterInFrame.y
        );
        const ratio = gesture.initialDistance > 0.001 ? currentDist / gesture.initialDistance : 1;
        newScale = clampScale(gesture.initialTransform.scaleX * ratio);
      } else {
        // Scaling pinned to opposite corner anchor
        const anchor = gesture.anchorInFrame;
        const currentDist = Math.hypot(
          currentFramePointer.x - anchor.x,
          currentFramePointer.y - anchor.y
        );
        const ratio = gesture.initialDistance > 0.001 ? currentDist / gesture.initialDistance : 1;
        newScale = clampScale(gesture.initialTransform.scaleX * ratio);

        // Displace center proportionally from fixed anchor
        const scaleRatio = newScale / gesture.initialTransform.scaleX;
        newCenter = {
          x: anchor.x + (gesture.initialCenterInFrame.x - anchor.x) * scaleRatio,
          y: anchor.y + (gesture.initialCenterInFrame.y - anchor.y) * scaleRatio,
        };
      }

      const newTransform: LayerTransform = {
        ...gesture.initialTransform,
        x: Math.round((newCenter.x - frameW / 2) * 10) / 10,
        y: Math.round((newCenter.y - frameH / 2) * 10) / 10,
        scaleX: Math.round(newScale * 10000) / 10000,
        scaleY: Math.round(newScale * 10000) / 10000,
      };

      onTransformChange(newTransform, { skipHistory: true });
    } else if (gesture.type === "rotate") {
      const currentAngleRad = Math.atan2(
        currentFramePointer.y - gesture.initialCenterInFrame.y,
        currentFramePointer.x - gesture.initialCenterInFrame.x
      );
      const deltaAngleDeg = (currentAngleRad - gesture.initialAngleRad) * (180 / Math.PI);
      let targetRotation = gesture.initialTransform.rotation + deltaAngleDeg;

      if (e.shiftKey) {
        // Snap to 15-degree increments
        targetRotation = Math.round(targetRotation / 15) * 15;
      }

      const normalized = normalizeRotation(targetRotation);
      const newTransform: LayerTransform = {
        ...gesture.initialTransform,
        rotation: Math.round(normalized * 10) / 10,
      };

      onTransformChange(newTransform, { skipHistory: true });
    }
  };

  const endGesture = (e: React.PointerEvent<SVGSVGElement>) => {
    if (gestureRef.current) {
      try {
        (e.currentTarget as Element).releasePointerCapture(e.pointerId);
      } catch {
        // ignore capture release error
      }
      gestureRef.current = null;
      setIsInteracting(false);
      onTransformCommit();
    }
  };

  // Start Move Gesture
  const handleBodyPointerDown = (e: React.PointerEvent<SVGPolygonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const startFramePointer = toFrame(e.clientX, e.clientY);
    gestureRef.current = {
      type: "move",
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialTransform: { ...transform },
      initialFramePointer: startFramePointer,
      initialCenterInFrame: { ...centerInFrame },
      initialDistance: 0,
      initialAngleRad: 0,
    };
    setIsInteracting(true);
    try {
      (e.currentTarget.ownerSVGElement || e.currentTarget).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Start Scale Gesture
  const handleCornerPointerDown = (
    corner: "tl" | "tr" | "br" | "bl",
    anchor: { x: number; y: number },
    cornerPoint: { x: number; y: number },
    e: React.PointerEvent<SVGRectElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startFramePointer = toFrame(e.clientX, e.clientY);
    const initialDist = Math.hypot(startFramePointer.x - anchor.x, startFramePointer.y - anchor.y);

    gestureRef.current = {
      type: "scale",
      corner,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialTransform: { ...transform },
      initialFramePointer: startFramePointer,
      initialCenterInFrame: { ...centerInFrame },
      anchorInFrame: anchor,
      initialDistance: initialDist,
      initialAngleRad: 0,
    };
    setIsInteracting(true);
    try {
      (e.currentTarget.ownerSVGElement || e.currentTarget).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Start Rotate Gesture
  const handleRotatePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const startFramePointer = toFrame(e.clientX, e.clientY);
    const initialAngleRad = Math.atan2(
      startFramePointer.y - centerInFrame.y,
      startFramePointer.x - centerInFrame.x
    );

    gestureRef.current = {
      type: "rotate",
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialTransform: { ...transform },
      initialFramePointer: startFramePointer,
      initialCenterInFrame: { ...centerInFrame },
      initialDistance: 0,
      initialAngleRad,
    };
    setIsInteracting(true);
    try {
      (e.currentTarget.ownerSVGElement || e.currentTarget).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleSize = 8;
  const halfHandle = handleSize / 2;
  const rotHandleRadius = 5;

  return (
    <svg
      data-slot="layer-selection-overlay"
      data-testid="layer-selection-overlay"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: isInteracting ? "all" : "none",
        overflow: "visible",
        zIndex: 20,
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {/* Transformed Layer Boundary Outline */}
      <polygon
        data-handle="bounding-box"
        points={`${screenTL.x},${screenTL.y} ${screenTR.x},${screenTR.y} ${screenBR.x},${screenBR.y} ${screenBL.x},${screenBL.y}`}
        fill="transparent"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: "all", cursor: "move" }}
        onPointerDown={handleBodyPointerDown}
      />

      {/* Rotation Stem Line from top edge midpoint to rotation handle */}
      <line
        x1={screenTopMid.x}
        y1={screenTopMid.y}
        x2={screenRotHandle.x}
        y2={screenRotHandle.y}
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />

      {/* Rotation Handle */}
      <circle
        data-handle="rotation"
        cx={screenRotHandle.x}
        cy={screenRotHandle.y}
        r={rotHandleRadius}
        fill="#ffffff"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        style={{ pointerEvents: "all", cursor: "grab" }}
        onPointerDown={handleRotatePointerDown}
      />

      {/* 4 Corner Scale Handles */}
      {/* Top-Left Handle (anchor is bottomRight) */}
      <rect
        data-handle="corner-tl"
        x={screenTL.x - halfHandle}
        y={screenTL.y - halfHandle}
        width={handleSize}
        height={handleSize}
        fill="#ffffff"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        style={{ pointerEvents: "all", cursor: "nwse-resize" }}
        onPointerDown={(e) => handleCornerPointerDown("tl", obb.bottomRight, obb.topLeft, e)}
      />

      {/* Top-Right Handle (anchor is bottomLeft) */}
      <rect
        data-handle="corner-tr"
        x={screenTR.x - halfHandle}
        y={screenTR.y - halfHandle}
        width={handleSize}
        height={handleSize}
        fill="#ffffff"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        style={{ pointerEvents: "all", cursor: "nesw-resize" }}
        onPointerDown={(e) => handleCornerPointerDown("tr", obb.bottomLeft, obb.topRight, e)}
      />

      {/* Bottom-Right Handle (anchor is topLeft) */}
      <rect
        data-handle="corner-br"
        x={screenBR.x - halfHandle}
        y={screenBR.y - halfHandle}
        width={handleSize}
        height={handleSize}
        fill="#ffffff"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        style={{ pointerEvents: "all", cursor: "nwse-resize" }}
        onPointerDown={(e) => handleCornerPointerDown("br", obb.topLeft, obb.bottomRight, e)}
      />

      {/* Bottom-Left Handle (anchor is topRight) */}
      <rect
        data-handle="corner-bl"
        x={screenBL.x - halfHandle}
        y={screenBL.y - halfHandle}
        width={handleSize}
        height={handleSize}
        fill="#ffffff"
        stroke="var(--primary, #0ea5e9)"
        strokeWidth="1.5"
        style={{ pointerEvents: "all", cursor: "nesw-resize" }}
        onPointerDown={(e) => handleCornerPointerDown("bl", obb.topRight, obb.bottomLeft, e)}
      />

      {/* Center Pivot Indicator */}
      <circle
        cx={screenCenter.x}
        cy={screenCenter.y}
        r={2.5}
        fill="var(--primary, #0ea5e9)"
        pointerEvents="none"
        opacity={0.7}
      />
    </svg>
  );
}
