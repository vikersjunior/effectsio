import * as React from "react";
import {
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  CornersOutIcon,
  GridFourIcon,
  EyeIcon,
  CloudArrowUpIcon,
  HandIcon,
  SquareSplitHorizontalIcon,
  SpinnerGapIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  FolderIcon,
  SlidersIcon,
} from "@phosphor-icons/react";
import { Button, Separator, Tooltip, TooltipTrigger, TooltipContent } from "../ui";
import { useStudioStore } from "../../context/studio-context";
import { executeEffectStack } from "../../effects/engine";
import { calculateFitZoom, calculateFocalZoom, clampInteractiveZoom, sanitizeNumber } from "../../utils/viewport-math";
import { renderBackgroundToCanvas } from "../../export/image-encoder";
import { createWebGL2Context } from "../../rendering/webgl/webgl-context";
import { GPUEffectPipeline, canExecuteStackOnGPU } from "../../rendering/webgl/webgl-effect-pipeline";
import { GPUBackgroundRenderer, isGPUSupportedBackground } from "../../rendering/webgl/webgl-background";
import { CanvasControlDock } from "./canvas-control-dock";
import { FloatingEffectPanel } from "./floating-effect-panel";
import { FloatingBackgroundPanel } from "./floating-background-panel";
import emptyStateSvgUrl from "../../assets/empty_state.svg";

export interface CanvasViewportProps {
  onOpenAssets?: () => void;
  onOpenInspector?: () => void;
  isNarrow?: boolean;
}

export function CanvasViewport({
  onOpenAssets,
  onOpenInspector,
  isNarrow = false,
}: CanvasViewportProps = {}): React.JSX.Element {
  const {
    isHydrated,
    activeAsset,
    activeEffectStack,
    activeBackground,
    addAssets,
    viewport,
    setViewport,
    zoomViewport,
    resetViewportFit,
    resetViewportActual,
    canUndo,
    canRedo,
    undo,
    redo,
    timeline,
    pause,
    togglePlayback,
    setTimelineTime,
  } = useStudioStore();

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Loaded source bitmap reference
  const [loadedSourceImage, setLoadedSourceImage] = React.useState<{ id: string; img: HTMLImageElement } | null>(null);

  // Transient Local Pan Interaction State
  const [isPanning, setIsPanning] = React.useState(false);
  const [isHandToolActive, setIsHandToolActive] = React.useState(false);
  const [isSpacePressed, setIsSpacePressed] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);

  // Interactive Split View Drag & Hover State
  const [isDraggingSplit, setIsDraggingSplit] = React.useState(false);
  const [isSplitHovered, setIsSplitHovered] = React.useState(false);

  // Refs for high-frequency RAF coalescing, render versioning, and transient drag/zoom values
  const pointerStartRef = React.useRef<{ x: number; y: number; initialPanX: number; initialPanY: number } | null>(null);
  const transientPanRef = React.useRef<{ panX: number; panY: number }>({ panX: viewport.panX, panY: viewport.panY });
  const transientZoomRef = React.useRef<number>(viewport.zoom);
  const isWheelingRef = React.useRef<boolean>(false);
  const wheelCommitTimerRef = React.useRef<number | null>(null);
  const lastWheelSyncTimeRef = React.useRef<number>(0);
  const viewportRef = React.useRef(viewport);
  viewportRef.current = viewport;
  const activeAssetRef = React.useRef(activeAsset);
  activeAssetRef.current = activeAsset;
  const rafIdRef = React.useRef<number | null>(null);
  const activePointerIdRef = React.useRef<number | null>(null);

  // Animation Clock & Playback Refs (Zero React Re-render continuous RAF loop)
  const isPlaying = timeline.playbackState === "playing";
  const animRafIdRef = React.useRef<number | null>(null);
  const lastTimeRef = React.useRef<number | null>(null);
  const currentTimeRef = React.useRef<number>(timeline.currentTime);
  const lastSyncTimeRef = React.useRef<number>(0);

  // WebGL2 GPU Pipeline and Background Renderer references (persistent across renders, disposed on unmount)
  const gpuPipelineRef = React.useRef<GPUEffectPipeline | null>(null);
  const gpuBgRendererRef = React.useRef<GPUBackgroundRenderer | null>(null);

  React.useEffect(() => {
    const offscreenCanvas = document.createElement("canvas");
    const gl = createWebGL2Context(offscreenCanvas, {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    if (gl) {
      gpuPipelineRef.current = new GPUEffectPipeline(gl);
    }

    try {
      const bgOffscreen = document.createElement("canvas");
      const bgGl = createWebGL2Context(bgOffscreen, {
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
      if (bgGl) {
        gpuBgRendererRef.current = new GPUBackgroundRenderer(bgGl);
      }
    } catch (err) {
      console.warn("GPU background renderer setup failed, will use CPU fallback:", err);
      gpuBgRendererRef.current = null;
    }

    return () => {
      if (gpuPipelineRef.current) {
        gpuPipelineRef.current.dispose();
        gpuPipelineRef.current = null;
      }
      if (gpuBgRendererRef.current) {
        gpuBgRendererRef.current.dispose();
        gpuBgRendererRef.current = null;
      }
    };
  }, []);

  // Sync transientPanRef and transientZoomRef with viewport when not actively dragging/wheeling
  React.useEffect(() => {
    if (!isPanning && !isWheelingRef.current) {
      transientPanRef.current = { panX: viewport.panX, panY: viewport.panY };
      transientZoomRef.current = viewport.zoom;
    }
  }, [viewport.zoom, viewport.panX, viewport.panY, isPanning]);

  // Asynchronously load active asset original source image
  React.useEffect(() => {
    if (!activeAsset) {
      setLoadedSourceImage(null);
      return;
    }

    let isCancelled = false;
    const img = new Image();
    img.src = activeAsset.objectUrl;

    img.onload = () => {
      if (!isCancelled) {
        setLoadedSourceImage({ id: activeAsset.id, img });
      }
    };

    img.onerror = () => {
      if (!isCancelled) {
        setLoadedSourceImage(null);
      }
    };

    return () => {
      isCancelled = true;
    };
  }, [activeAsset]);

  // Centralized Canvas Draw Method (ONLY clears & renders; NEVER mutates canvas.width / canvas.height!)
  const drawFrame = React.useCallback(
    (time: number = currentTimeRef.current) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      if (width <= 0 || height <= 0) return;

      ctx.save();

      // 1. Apply High-DPI Resolution Scaling (Buffer sizing is handled separately in ResizeObserver!)
      ctx.scale(dpr, dpr);

      const computedStyle = getComputedStyle(document.documentElement);
      const bgColor = computedStyle.getPropertyValue("--background").trim() || "oklch(0 0 0)";
      const borderVal = computedStyle.getPropertyValue("--border").trim() || "oklch(0.311 0.013 279.19)";
      const primaryVal = computedStyle.getPropertyValue("--primary").trim() || "oklch(0.546 0.215 262.88)";

      // 2. Render Fixed Viewport Background Color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // 3. Render Fixed Viewport Transparency Checkerboard Pattern (Fixed 8px pattern in CSS pixel space)
      if (viewport.showCheckerboard) {
        const squareSize = 8;
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        for (let y = 0; y < height; y += squareSize) {
          for (let x = 0; x < width; x += squareSize) {
            if ((Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0) {
              ctx.fillRect(x, y, squareSize, squareSize);
            }
          }
        }
      }

      // 4. Render Fixed Viewport Grid Lines
      if (viewport.showGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        const gridSize = 24;
        for (let x = 0; x < width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      }

      const currentPanX = sanitizeNumber(transientPanRef.current.panX, viewport.panX);
      const currentPanY = sanitizeNumber(transientPanRef.current.panY, viewport.panY);
      const currentZoom = sanitizeNumber(transientZoomRef.current, viewport.zoom);

      // 5. Render Transformed Active Image & Processed Effect Stack Layer
      const isSourceLoaded = activeAsset && loadedSourceImage && loadedSourceImage.id === activeAsset.id;

      if (isSourceLoaded && loadedSourceImage) {
        const scale = currentZoom / 100;
        const renderSource = loadedSourceImage.img;
        const w = activeAsset.width;
        const h = activeAsset.height;

        // Render processed output via GPU or CPU fallback
        let renderProcessed: HTMLImageElement | HTMLCanvasElement = renderSource;

        if (activeEffectStack && activeEffectStack.some((item) => item.enabled !== false)) {
          let gpuRenderSuccess = false;
          if (gpuPipelineRef.current && canExecuteStackOnGPU(activeEffectStack)) {
            try {
              renderProcessed = gpuPipelineRef.current.renderStackToCanvas(
                renderSource,
                w,
                h,
                activeEffectStack,
                activeAsset.id,
                time,
              );
              gpuRenderSuccess = true;
            } catch (gpuErr) {
              console.warn("GPU rendering pass failed, falling back to CPU:", gpuErr);
            }
          }

          if (!gpuRenderSuccess) {
            const offCanvas = document.createElement("canvas");
            offCanvas.width = w;
            offCanvas.height = h;
            const offCtx = offCanvas.getContext("2d");
            if (offCtx) {
              offCtx.drawImage(renderSource, 0, 0, w, h);
              const sourceImageData = offCtx.getImageData(0, 0, w, h);
              const finalImageData = executeEffectStack(sourceImageData, activeEffectStack, time);
              offCtx.putImageData(finalImageData, 0, 0);
              renderProcessed = offCanvas;
            }
          }
        }

        const padding = activeBackground.padding ?? 0;
        const borderRadius = activeBackground.borderRadius ?? 0;
        const shadowBlur = activeBackground.shadowBlur ?? 16;
        const shadowOpacity = activeBackground.shadowOpacity ?? 0.4;

        const drawX = -w / 2;
        const drawY = -h / 2;

        // Helper function to render image bitmap with matrix transform and creative background inside canvas
        const drawTransformedImage = (imgSource: HTMLImageElement | HTMLCanvasElement) => {
          ctx.save();
          ctx.translate(width / 2 + currentPanX, height / 2 + currentPanY);
          ctx.scale(scale, scale);

          // 1. Draw Creative Background Layer (if not transparent and visible)
          if (activeBackground && activeBackground.type !== "transparent" && activeBackground.visible !== false) {
            const bgW = w + 2 * padding;
            const bgH = h + 2 * padding;
            const bgX = -bgW / 2;
            const bgY = -bgH / 2;

            ctx.save();
            ctx.translate(bgX, bgY);

            let renderedWithGPU = false;
            if (gpuBgRendererRef.current && isGPUSupportedBackground(activeBackground.type)) {
              try {
                const bgCanvas = gpuBgRendererRef.current.renderBackgroundToCanvas(bgW, bgH, activeBackground, time);
                ctx.drawImage(bgCanvas, 0, 0, bgW, bgH);
                renderedWithGPU = true;
              } catch (err) {
                console.warn("GPU background rendering failed, falling back to CPU:", err);
                renderedWithGPU = false;
              }
            }

            if (!renderedWithGPU) {
              renderBackgroundToCanvas(ctx, bgW, bgH, activeBackground);
            }

            ctx.restore();
          }

          // 2. Draw Image Shadow (if framing padding > 0 or background is added)
          const hasVisibleBg = activeBackground && activeBackground.type !== "transparent";
          if ((padding > 0 || hasVisibleBg) && shadowOpacity > 0 && shadowBlur > 0) {
            ctx.save();
            ctx.shadowColor = `rgba(0, 0, 0, ${shadowOpacity})`;
            ctx.shadowBlur = shadowBlur / scale;
            ctx.shadowOffsetY = (shadowBlur / 2) / scale;
            if (borderRadius > 0 && typeof ctx.roundRect === "function") {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(drawX, drawY, w, h, borderRadius);
              ctx.clip();
              ctx.drawImage(imgSource, drawX, drawY, w, h);
              ctx.restore();
            } else {
              ctx.drawImage(imgSource, drawX, drawY, w, h);
            }
            ctx.restore();
          } else {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
          }


          // 3. Draw Image Bitmap (with optional corner radius clipping)
          ctx.save();
          if (borderRadius > 0) {
            ctx.beginPath();
            if (typeof ctx.roundRect === "function") {
              ctx.roundRect(drawX, drawY, w, h, borderRadius);
            } else {
              ctx.rect(drawX, drawY, w, h);
            }
            ctx.clip();
          }
          ctx.drawImage(imgSource, drawX, drawY, w, h);
          ctx.restore();

          // 4. Border Stroke
          if (padding === 0) {
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = borderVal;
            ctx.lineWidth = 1 / scale;
            ctx.strokeRect(drawX, drawY, w, h);
          }

          ctx.restore();
        };

        if (viewport.splitView) {
          // VIEWPORT-SPACE Split View Clipping: splitX exists in 100% CSS Viewport space (0..width)
          const splitPos = Math.max(0, Math.min(1, viewport.splitPosition ?? 0.5));
          const splitX = width * splitPos;

          // Left Clip Region (0 to splitX): Original Source Asset
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitX, height);
          ctx.clip();
          drawTransformedImage(renderSource);
          ctx.restore();

          // Right Clip Region (splitX to width): Processed Effect Output
          ctx.save();
          ctx.beginPath();
          ctx.rect(splitX, 0, width - splitX, height);
          ctx.clip();
          drawTransformedImage(renderProcessed);
          ctx.restore();

          // Viewport Split Line Overlay
          ctx.save();
          ctx.shadowColor = "transparent";
          ctx.strokeStyle = primaryVal;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, height);
          ctx.stroke();
          ctx.restore();
        } else {
          // Full View: Render Processed Image Output
          drawTransformedImage(renderProcessed);
        }
      } else {
        // Empty Viewport State is rendered via DOM overlay (Figma node 137:6167)
        // Canvas buffer remains cleanly cleared to system background
      }

      ctx.restore();
    },
    [activeAsset, loadedSourceImage, activeEffectStack, activeBackground, viewport]
  );

  const drawFrameRef = React.useRef(drawFrame);
  drawFrameRef.current = drawFrame;

  // Request single RAF draw pass for static updates (stable identity across all renders)
  const requestDraw = React.useCallback(() => {
    if (rafIdRef.current !== null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawFrameRef.current(currentTimeRef.current);
    });
  }, []);

  // Sync currentTimeRef when timeline.currentTime changes externally (seek / step)
  React.useEffect(() => {
    currentTimeRef.current = timeline.currentTime;
    requestDraw();
  }, [timeline.currentTime, requestDraw]);

  // Continuous 60 FPS Animation RAF Loop (Decoupled from React Component Tree Re-renders)
  React.useEffect(() => {
    if (!isPlaying) {
      if (animRafIdRef.current !== null) {
        cancelAnimationFrame(animRafIdRef.current);
        animRafIdRef.current = null;
      }
      lastTimeRef.current = null;
      requestDraw();
      return;
    }

    let isCancelled = false;

    const loop = (timestamp: number) => {
      if (isCancelled) return;

      if (lastTimeRef.current !== null) {
        const deltaSec = ((timestamp - lastTimeRef.current) / 1000) * (timeline.speed || 1.0);
        let nextTime = currentTimeRef.current + deltaSec;

        if (nextTime > timeline.duration) {
          if (timeline.loop) {
            nextTime = nextTime % timeline.duration;
          } else {
            nextTime = timeline.duration;
            currentTimeRef.current = nextTime;
            drawFrame(nextTime);
            pause();
            return;
          }
        }

        currentTimeRef.current = nextTime;
        drawFrame(nextTime);

        // Throttle UI synchronization to 15 Hz for smooth UI progress without re-render churn
        if (timestamp - lastSyncTimeRef.current > 66) {
          lastSyncTimeRef.current = timestamp;
          setTimelineTime(nextTime);
        }
      }

      lastTimeRef.current = timestamp;
      animRafIdRef.current = requestAnimationFrame(loop);
    };

    animRafIdRef.current = requestAnimationFrame(loop);

    return () => {
      isCancelled = true;
      if (animRafIdRef.current !== null) {
        cancelAnimationFrame(animRafIdRef.current);
        animRafIdRef.current = null;
      }
      lastTimeRef.current = null;
    };
  }, [isPlaying, timeline.duration, timeline.loop, timeline.speed, drawFrame, setTimelineTime, pause, requestDraw]);

  // Pause playback automatically when tab is hidden to save power
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && timeline.playbackState === "playing") {
        pause();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [timeline.playbackState, pause]);

  // Canvas Buffer Sizing (EXCLUSIVELY DRIVEN by ResizeObserver & DPR changes!)
  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateCanvasBufferSize = (rawWidth: number, rawHeight: number) => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.round(rawWidth);
      const cssH = Math.round(rawHeight);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);

      if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        requestDraw();
      }
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rawW = entry.contentRect.width;
        const rawH = entry.contentRect.height;
        const cssW = Math.round(rawW);
        const cssH = Math.round(rawH);

        if (cssW > 0 && cssH > 0) {
          updateCanvasBufferSize(cssW, cssH);

          const asset = activeAssetRef.current;
          const vp = viewportRef.current;

          if (asset && vp.fitMode === "contain") {
            const fit = calculateFitZoom(cssW, cssH, asset.width, asset.height);
            setViewport((prev) => {
              if (
                prev.fitMode === "contain" &&
                Math.abs(prev.zoom - fit.zoom) < 0.001 &&
                prev.panX === 0 &&
                prev.panY === 0
              ) {
                return prev;
              }
              return {
                ...prev,
                zoom: fit.zoom,
                panX: 0,
                panY: 0,
              };
            });
          } else {
            requestDraw();
          }
        }
      }
    });

    observer.observe(container);

    if (container.clientWidth > 0 && container.clientHeight > 0) {
      updateCanvasBufferSize(container.clientWidth, container.clientHeight);
      requestDraw();
    }

    return () => {
      observer.disconnect();
    };
  }, [setViewport, requestDraw]);

  // Adjust fit zoom when activeAsset dimensions or fitMode change to contain
  React.useEffect(() => {
    if (activeAsset && viewport.fitMode === "contain" && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cssW = Math.round(rect.width);
      const cssH = Math.round(rect.height);
      if (cssW > 0 && cssH > 0) {
        const fit = calculateFitZoom(cssW, cssH, activeAsset.width, activeAsset.height);
        setViewport((prev) => {
          if (
            prev.fitMode === "contain" &&
            Math.abs(prev.zoom - fit.zoom) < 0.001 &&
            prev.panX === 0 &&
            prev.panY === 0
          ) {
            return prev;
          }
          return {
            ...prev,
            zoom: fit.zoom,
            panX: 0,
            panY: 0,
          };
        });
      }
    }
  }, [activeAsset?.id, activeAsset?.width, activeAsset?.height, viewport.fitMode, setViewport]);

  // Trigger RAF render whenever activeAsset, loadedSourceImage, activeEffectStack, activeBackground, or viewport changes
  React.useEffect(() => {
    requestDraw();
  }, [activeAsset, loadedSourceImage, activeEffectStack, activeBackground, viewport, requestDraw]);

  // Listen for root theme changes to redraw canvas viewport background and chrome
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      requestDraw();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, [requestDraw]);

  // Keyboard shortcut listeners
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") {
        return;
      }
      if (e.code === "Space" && !e.repeat) {
        if (isHandToolActive) {
          setIsSpacePressed(true);
        } else {
          e.preventDefault();
          togglePlayback();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isHandToolActive, togglePlayback]);

  // Non-passive wheel zoom with transient RAF coalescing
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const isPinch = e.ctrlKey || e.metaKey;
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= 100;

      // Continuous exponential zoom factor: symmetric, smooth, proportional to scroll delta
      const clampedDelta = Math.max(-120, Math.min(120, delta));
      const sensitivity = isPinch ? 0.008 : 0.0018;
      const zoomFactor = Math.exp(-clampedDelta * sensitivity);

      const currentTransientZoom = transientZoomRef.current;
      const currentTransientPan = transientPanRef.current;
      const targetZoom = currentTransientZoom * zoomFactor;

      const asset = activeAssetRef.current;

      if (!asset) {
        const clampedZoom = clampInteractiveZoom(targetZoom);
        transientZoomRef.current = clampedZoom;
        requestDraw();
      } else {
        const result = calculateFocalZoom(
          targetZoom,
          mouseX,
          mouseY,
          rect.width,
          rect.height,
          asset.width,
          asset.height,
          currentTransientZoom,
          currentTransientPan.panX,
          currentTransientPan.panY
        );

        transientZoomRef.current = result.newZoom;
        transientPanRef.current = {
          panX: result.newPanX,
          panY: result.newPanY,
        };
        requestDraw();
      }

      isWheelingRef.current = true;

      // Throttle intermediate React UI synchronization to ~15 Hz (66ms) so controls stay in sync
      const now = performance.now();
      if (now - lastWheelSyncTimeRef.current > 66) {
        lastWheelSyncTimeRef.current = now;
        const currentZ = transientZoomRef.current;
        const currentPX = transientPanRef.current.panX;
        const currentPY = transientPanRef.current.panY;
        setViewport((prev) => ({
          ...prev,
          zoom: Math.round(currentZ * 10) / 10,
          panX: Math.round(currentPX),
          panY: Math.round(currentPY),
          fitMode: "custom",
        }));
      }

      // Settle commit: commit final transient zoom and pan when wheeling stops
      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
      }
      wheelCommitTimerRef.current = window.setTimeout(() => {
        wheelCommitTimerRef.current = null;
        isWheelingRef.current = false;
        const finalZ = transientZoomRef.current;
        const finalPX = transientPanRef.current.panX;
        const finalPY = transientPanRef.current.panY;
        setViewport((prev) => ({
          ...prev,
          zoom: Math.round(finalZ * 10) / 10,
          panX: Math.round(finalPX),
          panY: Math.round(finalPY),
          fitMode: "custom",
        }));
      }, 120);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (wheelCommitTimerRef.current !== null) {
        window.clearTimeout(wheelCommitTimerRef.current);
        wheelCommitTimerRef.current = null;
      }
    };
  }, [setViewport, requestDraw]);

  // Clean up pointer drag and commit transient pan coordinates
  const stopPanDrag = React.useCallback(
    (targetElement?: HTMLElement | null) => {
      if (isPanning) {
        setIsPanning(false);

        const finalPanX = sanitizeNumber(transientPanRef.current.panX, viewport.panX);
        const finalPanY = sanitizeNumber(transientPanRef.current.panY, viewport.panY);

        setViewport((prev) => ({
          ...prev,
          panX: finalPanX,
          panY: finalPanY,
          fitMode: "custom",
        }));

        pointerStartRef.current = null;

        if (activePointerIdRef.current !== null && targetElement) {
          try {
            targetElement.releasePointerCapture(activePointerIdRef.current);
          } catch {
            // Ignore capture release error
          }
          activePointerIdRef.current = null;
        }
      }

      if (isDraggingSplit) {
        setIsDraggingSplit(false);
      }
    },
    [isPanning, isDraggingSplit, viewport.panX, viewport.panY, setViewport]
  );

  // Window blur listener to cancel drag
  React.useEffect(() => {
    const handleWindowBlur = () => {
      if (isPanning || isDraggingSplit) {
        stopPanDrag(containerRef.current);
      }
    };

    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isPanning, isDraggingSplit, stopPanDrag]);

  // Interactive Split View Pointer Drag Handlers
  const handleSplitPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture error
    }
  };

  const handleSplitPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplit && containerRef.current) {
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const mouseX = e.clientX - rect.left;
        const newPos = Math.max(0, Math.min(1, mouseX / rect.width));
        setViewport((prev) => ({ ...prev, splitPosition: newPos }));
      }
    }
  };

  const handleSplitPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSplit(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore release capture error
    }
  };

  // Keyboard Navigation for Split View Handle
  const handleSplitKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = viewport.splitPosition ?? 0.5;
    const step = e.shiftKey ? 0.1 : 0.02;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setViewport((prev) => ({ ...prev, splitPosition: Math.max(0, current - step) }));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setViewport((prev) => ({ ...prev, splitPosition: Math.min(1, current + step) }));
    } else if (e.key === "Home") {
      e.preventDefault();
      setViewport((prev) => ({ ...prev, splitPosition: 0 }));
    } else if (e.key === "End") {
      e.preventDefault();
      setViewport((prev) => ({ ...prev, splitPosition: 1 }));
    }
  };

  // Canvas Viewport Pointer Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplit) return;

    // Critical: Do NOT initiate canvas panning if the click was on a toolbar, button, dialog, popover, or interactive element
    if (
      (e.target as HTMLElement).closest(
        '[role="toolbar"], [role="dialog"], [data-slot="popover"], button, input, select, textarea, [data-floating-surface]'
      )
    ) {
      return;
    }

    const isMiddleClick = e.button === 1;
    const isLeftClick = e.button === 0;
    const shouldPan = isMiddleClick || (isLeftClick && (isHandToolActive || isSpacePressed));

    if (shouldPan) {
      e.preventDefault();
      setIsPanning(true);
      activePointerIdRef.current = e.pointerId;

      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPanX: viewport.panX,
        initialPanY: viewport.panY,
      };

      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Ignore pointer capture error
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0) {
        const mouseX = e.clientX - rect.left;
        const newPos = Math.max(0, Math.min(1, mouseX / rect.width));
        setViewport((prev) => ({ ...prev, splitPosition: newPos }));
      }
      return;
    }

    if (isPanning && pointerStartRef.current) {
      e.preventDefault();
      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;

      transientPanRef.current = {
        panX: pointerStartRef.current.initialPanX + deltaX,
        panY: pointerStartRef.current.initialPanY + deltaY,
      };

      requestDraw();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    stopPanDrag(e.currentTarget as HTMLElement);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    stopPanDrag(e.currentTarget as HTMLElement);
  };

  const handleDoubleClick = () => {
    if (containerRef.current) {
      resetViewportFit(containerRef.current.clientWidth, containerRef.current.clientHeight);
    } else {
      resetViewportFit();
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addAssets(e.dataTransfer.files);
    }
  };

  React.useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const cursorStyle = isDraggingSplit
    ? "ew-resize"
    : isPanning
    ? "grabbing"
    : isHandToolActive || isSpacePressed
    ? "grab"
    : "default";

  const splitPos = Math.max(0, Math.min(1, viewport.splitPosition ?? 0.5));

  return (
    <main
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onDoubleClick={handleDoubleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "var(--background)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: cursorStyle,
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {/* Canvas Element Container */}
      <div
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          height: "100%",
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
          }}
        />

        {/* Main Canvas Empty State (Correction 02.8 — Figma node 137:6167) */}
        {!activeAsset && isHydrated && (
          <div
            data-slot="canvas-empty-state"
            className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2 select-none z-10"
          >
            <div
              className="w-16 h-8 flex items-center justify-center overflow-visible"
              data-slot="empty-state-illustration"
            >
              <img
                src={emptyStateSvgUrl}
                alt=""
                width={70}
                height={38}
                className="w-[70px] h-[38px] max-w-none select-none pointer-events-none"
              />
            </div>
            <h2 className="font-medium text-base leading-6 text-[color:var(--foreground)] text-center tracking-tight">
              No image selected
            </h2>
            <p className="font-normal text-xs leading-4 text-[color:var(--muted-foreground)] text-center whitespace-normal max-w-[440px]">
              Import an image or drag and drop one here to start editing.
            </p>
          </div>
        )}

        {/* Viewport HUD Overlay: Split View Divider & Draggable Handle */}
        {viewport.splitView && activeAsset && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 30,
            }}
          >
            {/* Full Viewport-Height Continuous Vertical Split Line */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${splitPos * 100}%`,
                transform: "translateX(-50%)",
                width: "1.5px",
                backgroundColor: "var(--primary)",
                boxShadow: "0 0 4px rgba(0, 0, 0, 0.5)",
              }}
            />

            {/* Draggable Split View Circular Pill Knob Overlay */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(splitPos * 100)}
              aria-label="Before and after split view"
              tabIndex={0}
              onKeyDown={handleSplitKeyDown}
              onPointerDown={handleSplitPointerDown}
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerCancel={handleSplitPointerUp}
              onMouseEnter={() => setIsSplitHovered(true)}
              onMouseLeave={() => setIsSplitHovered(false)}
              style={{
                position: "absolute",
                top: "50%",
                left: `${splitPos * 100}%`,
                transform: "translate(-50%, -50%)",
                width: "28px",
                height: "28px",
                borderRadius: "9999px",
                backgroundColor: "var(--card)",
                border: isDraggingSplit || isSplitHovered ? "1.5px solid var(--primary)" : "1px solid color-mix(in oklab, var(--border) 40%, transparent)",
                boxShadow: isDraggingSplit || isSplitHovered ? "0 4px 14px rgba(0, 0, 0, 0.6), 0 0 0 2px color-mix(in oklab, var(--primary) 25%, transparent)" : "0 2px 8px rgba(0, 0, 0, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "1px",
                cursor: "ew-resize",
                pointerEvents: "auto",
                userSelect: "none",
                touchAction: "none",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                outline: "none",
              }}
            >
              <CaretLeftIcon size={10} style={{ color: isDraggingSplit || isSplitHovered ? "var(--primary)" : "var(--foreground)" }} />
              <CaretRightIcon size={10} style={{ color: isDraggingSplit || isSplitHovered ? "var(--primary)" : "var(--foreground)" }} />
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {!isHydrated && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              backgroundColor: "var(--background)",
            }}
          >
            <SpinnerGapIcon size={24} style={{ color: "var(--primary)", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--muted-foreground)" }}>
              Restoring workspace...
            </span>
          </div>
        )}

        {/* Viewport Drag Overlay Indicator */}
        {isDragOver && (
          <div
            style={{
              position: "absolute",
              inset: "1rem",
              borderRadius: "var(--radius-lg)",
              border: "2px dashed var(--primary)",
              backgroundColor: "rgba(12, 140, 233, 0.15)",
              backdropFilter: "blur(4px)",
              zIndex: 15,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              pointerEvents: "none",
            }}
          >
            <CloudArrowUpIcon size={32} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "var(--text-xs-plus)", fontWeight: 600 }}>
              Drop image to import
            </span>
          </div>
        )}

        {/* Narrow Viewport (< 900px) Drawer Trigger Buttons */}
        {isNarrow && (
          <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
            {onOpenAssets && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenAssets}
                className="pointer-events-auto gap-1.5 shadow-lg backdrop-blur-md bg-[color:color-mix(in_oklab,var(--card)_85%,transparent)] border border-[color:var(--border)] text-xs font-semibold text-[color:var(--foreground)]"
              >
                <FolderIcon size={14} />
                <span>Assets</span>
              </Button>
            )}
            {onOpenInspector && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenInspector}
                className="pointer-events-auto ml-auto gap-1.5 shadow-lg backdrop-blur-md bg-[color:color-mix(in_oklab,var(--card)_85%,transparent)] border border-[color:var(--border)] text-xs font-semibold text-[color:var(--foreground)]"
              >
                <SlidersIcon size={14} />
                <span>Inspector</span>
              </Button>
            )}
          </div>
        )}

        {/* Contextual Floating Effect Customization Panel (when an effect instance is selected) */}
        <FloatingEffectPanel />

        {/* Contextual Floating Background Customization Panel (when background is active and opened) */}
        <FloatingBackgroundPanel />

        {/* Canonical Floating Canvas Control System (Timeline Bar + Viewport Dock) */}
        <CanvasControlDock
          isHandToolActive={isHandToolActive}
          setIsHandToolActive={setIsHandToolActive}
          isSpacePressed={isSpacePressed}
          containerRef={containerRef}
        />
      </div>
    </main>
  );
}
