import * as React from "react";
import type {
  Asset,
  ViewportState,
  EffectInstance,
  EffectStack,
  StudioHistorySnapshot,
} from "../types/asset";
import type {
  Frame,
  Layer,
  ImageLayer,
  BlendMode,
  FrameDimensions,
  FrameSizePreset,
  LayerSource,
  ProceduralSource,
} from "../types/frame";
import {
  createDefaultBackdropLayer,
  createDefaultFrame,
  createImageLayer,
  createProceduralLayer,
} from "../types/frame";
import type { Look, LookCategory, BackgroundState } from "../types/look";
import { DEFAULT_BACKGROUND_STATE } from "../types/look";
import type {
  BackgroundItem,
  BackgroundItemType,
  GenerativeSublayer,
  GenerativeSublayerType,
} from "../types/frame";
import {
  createBackgroundItem,
  resolveBackgroundItemParameters,
  createGenerativeSublayer,
  resolveGenerativeParameters,
} from "../generative/registry";
import {
  deriveLegacyBackgroundFromBackgrounds,
  normalizeLegacyBackgroundToBackgrounds,
  deriveLegacyBackgroundFromSublayers,
  normalizeLegacyBackgroundToSublayers,
} from "../generative/normalization";
import { sanitizeTransform } from "../utils/transform-math";
import type { EffectId } from "../effects/types";
import { getEffectDefinition } from "../effects/registry";
import { createAssetFromFile, revokeAssetUrls } from "../utils/image-ingestion";
import { calculateFitZoom, clampInteractiveZoom } from "../utils/viewport-math";
import {
  cloneLookToEffectStack,
  createLookFromStack,
} from "../looks/look-manager";
import type { AnimationTimelineState } from "../types/animation";
import {
  DEFAULT_ANIMATION_STATE,
  normalizeTimelineTime,
} from "../types/animation";
import {
  loadHydratedProject,
  dbSaveAsset,
  dbDeleteAsset,
  dbSaveEffectStack,
  dbDeleteEffectStack,
  dbSaveBackground,
  dbDeleteBackground,
  dbSaveUserLook,
  dbDeleteUserLook,
  dbSaveSessionState,
  dbSaveFrame,
  dbSaveFrames,
  dbDeleteFrame,
  dbGetAllFrames,
} from "../storage/db";

/**
 * Synchronizes and extracts canonical ProceduralSource from background items.
 * BLK-01: Ensures layer.source remains the single authoritative representation for rendering.
 */
function deriveProceduralSourceFromBackgrounds(
  backgrounds: BackgroundItem[] | undefined,
  fallbackSource?: LayerSource
): ProceduralSource {
  const primaryBg = backgrounds && backgrounds[0];
  if (primaryBg) {
    return {
      type: "procedural",
      kind: primaryBg.type,
      parameters: { ...primaryBg.parameters },
      seed: primaryBg.seed,
    };
  }
  if (fallbackSource && fallbackSource.type === "procedural") {
    return fallbackSource;
  }
  return {
    type: "procedural",
    kind: "solid",
    parameters: { color: "#000000" },
  };
}

const MAX_HISTORY_LIMIT = 40;

export interface StudioContextType {
  isHydrated: boolean;
  projectName: string;
  setProjectName: (name: string) => void;

  // Frame & Layer Domain (Stage 1 Source of Truth)
  frames: Frame[];
  activeFrameId: string | null;
  activeFrame: Frame | null;
  activeLayerId: string | null;
  activeLayer: Layer | null;
  setActiveFrameId: (id: string | null) => void;
  setActiveLayerId: (id: string | null) => void;
  selectedEffectInstanceId: string | null;

  // Stage 1C / Decision A Layer & Frame Operations
  addLayerFromAsset: (assetId: string) => ImageLayer | null;
  addLayer: (layer: Layer) => void;
  addProceduralLayer: (
    kind: BackgroundItemType,
    parameters?: Record<string, unknown>,
    name?: string
  ) => Layer;
  updateLayer: (layerId: string, updates: Partial<Layer>, options?: { skipHistory?: boolean }) => void;
  updateLayerSource: (
    layerId: string,
    sourceUpdates: Partial<ProceduralSource> | Record<string, unknown>,
    options?: { skipHistory?: boolean }
  ) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  removeLayer: (layerId: string) => void;
  setFrameDimensions: (dimensions: FrameDimensions) => void;

  // Transitional Compatibility Adapters (Stage 1A)
  assets: Asset[];
  activeImageId: string | null;
  activeAsset: Asset | null;
  selectedAssetIds: Set<string>;
  effectStacks: Record<string, EffectStack>;
  activeEffectStack: EffectStack;
  backgrounds: Record<string, BackgroundState>;
  activeBackground: BackgroundState;
  hasActiveBackground: boolean;
  isBackgroundPanelOpen: boolean;
  setIsBackgroundPanelOpen: (open: boolean) => void;
  userLooks: Look[];
  selectedInstanceId: string | null;
  selectedInstance: EffectInstance | null;
  isImporting: boolean;
  importError: string | null;
  viewport: ViewportState;
  editorMode: "design" | "animate";
  setEditorMode: (mode: "design" | "animate") => void;
  isEffectBrowserOpen: boolean;
  setIsEffectBrowserOpen: (open: boolean) => void;
  theme: "system" | "light" | "dark";
  setTheme: (theme: "system" | "light" | "dark") => void;
  appliedLook: Look | null;
  setAppliedLook: (look: Look | null) => void;
  clearAppliedLook: () => void;

  // History & Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  startOrContinueParamInteraction: () => void;
  commitParamInteraction: () => void;

  // Animation & Timeline State
  timeline: AnimationTimelineState;
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  seek: (time: number) => void;
  stepFrame: (deltaFrames: number) => void;
  setTimelineDuration: (duration: number) => void;
  setTimelineLoop: (loop: boolean) => void;
  setTimelineSpeed: (speed: number) => void;
  resetTimeline: () => void;
  setTimelineTime: (time: number) => void;

  // Assets & Selection
  addAssets: (files: FileList | File[] | Asset[]) => Promise<void>;
  setActiveImageId: (id: string | null) => void;
  removeAsset: (id: string) => void;
  toggleAssetSelection: (assetId: string) => void;
  selectAsset: (assetId: string, clearOthers?: boolean) => void;
  selectAssetRange: (
    fromAssetId: string,
    toAssetId: string,
    assetList: Asset[]
  ) => void;
  deselectAsset: (assetId: string) => void;
  clearAssetSelection: () => void;
  selectAllAssets: () => void;

  // Effect Stack Mutations
  addEffectToStack: (
    assetIdOrLayerId: string,
    effectId: EffectId,
    parameters?: Record<string, unknown>
  ) => void;
  updateInstanceParameters: (
    assetIdOrLayerId: string,
    instanceId: string,
    parameters: Record<string, unknown>
  ) => void;
  resetInstanceParameters: (assetIdOrLayerId: string, instanceId: string) => void;
  toggleInstanceEnabled: (assetIdOrLayerId: string, instanceId: string) => void;
  removeInstanceFromStack: (assetIdOrLayerId: string, instanceId: string) => void;
  removeAllInstancesFromStack: (assetIdOrLayerId: string) => void;
  reorderEffectStack: (
    assetIdOrLayerId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  duplicateInstance: (assetIdOrLayerId: string, instanceId: string) => void;
  selectInstance: (assetIdOrLayerId: string, instanceId: string | null) => void;

  // Looks / Presets
  applyLookToActiveAsset: (look: Look) => void;
  applyLookToAssets: (assetIds: string[], look: Look) => void;
  saveCurrentStackAsLook: (
    name: string,
    category?: LookCategory,
    description?: string
  ) => Look;
  deleteUserLook: (lookId: string) => void;

  // Creative Background Layer (Transitional / Legacy selectors)
  updateActiveBackground: (updates: Partial<BackgroundState>) => void;
  resetActiveBackground: () => void;

  // Procedural Layer Editor State
  isProceduralEditorOpen: boolean;
  setIsProceduralEditorOpen: (open: boolean) => void;

  // Viewport
  setViewport: (
    updater: Partial<ViewportState> | ((prev: ViewportState) => ViewportState)
  ) => void;
  zoomViewport: (deltaPercent: number) => void;
  panViewport: (deltaX: number, deltaY: number) => void;
  resetViewportFit: (viewportW?: number, viewportH?: number) => void;
  resetViewportActual: () => void;
  clearImportError: () => void;
}

const initialViewportState: ViewportState = {
  zoom: 100,
  panX: 0,
  panY: 0,
  fitMode: "contain",
  showGrid: false,
  showCheckerboard: false,
  splitView: false,
  splitPosition: 0.5,
};

const StudioContext = React.createContext<StudioContextType | null>(null);

export function StudioProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [projectName, setProjectNameState] = React.useState<string>("Project Name");
  const [assets, setAssets] = React.useState<Asset[]>([]);

  // Stage 1 Domain Model Source of Truth
  const [frames, setFrames] = React.useState<Frame[]>(() => [createDefaultFrame()]);
  const [activeFrameId, setActiveFrameIdState] = React.useState<string | null>(
    () => frames[0]?.id ?? null
  );
  const [activeLayerId, setActiveLayerIdState] = React.useState<string | null>(
    () => frames[0]?.layers[0]?.id ?? null
  );
  const [selectedEffectInstanceId, setSelectedEffectInstanceId] =
    React.useState<string | null>(null);

  const [selectedAssetIds, setSelectedAssetIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [userLooks, setUserLooks] = React.useState<Look[]>([]);
  const [selectedInstanceIds, setSelectedInstanceIds] = React.useState<
    Record<string, string | null>
  >({});
  const [isImporting, setIsImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [viewport, setViewportState] =
    React.useState<ViewportState>(initialViewportState);
  const [timeline, setTimeline] = React.useState<AnimationTimelineState>(
    DEFAULT_ANIMATION_STATE
  );
  const [editorMode, setEditorMode] = React.useState<"design" | "animate">("design");
  const [isEffectBrowserOpen, setIsEffectBrowserOpen] = React.useState(false);
  const [isProceduralEditorOpen, setIsProceduralEditorOpen] = React.useState(false);
  const isBackgroundPanelOpen = isProceduralEditorOpen;
  const setIsBackgroundPanelOpen = setIsProceduralEditorOpen;
  const [appliedLook, setAppliedLook] = React.useState<Look | null>(null);

  const clearAppliedLook = React.useCallback(() => {
    setAppliedLook(null);
  }, []);

  const [theme, setThemeState] = React.useState<"system" | "light" | "dark">(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = window.localStorage.getItem("effectsio_theme");
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    }
    return "system";
  });

  const setTheme = React.useCallback((nextTheme: "system" | "light" | "dark") => {
    setThemeState(nextTheme);
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("effectsio_theme", nextTheme);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const updateRootTheme = () => {
      let effectiveTheme: "light" | "dark" = "dark";
      if (theme === "system") {
        const prefersDark =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        effectiveTheme = prefersDark ? "dark" : "light";
      } else {
        effectiveTheme = theme;
      }

      if (effectiveTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      }
    };

    updateRootTheme();

    if (theme === "system" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => updateRootTheme();
      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
      } else if (typeof (mediaQuery as any).addListener === "function") {
        (mediaQuery as any).addListener(handler);
        return () => (mediaQuery as any).removeListener(handler);
      }
    }
  }, [theme]);

  // Derived active frame (strict lookup, zero fallback)
  const activeFrame = React.useMemo((): Frame | null => {
    if (!activeFrameId) return null;
    return frames.find((f) => f.id === activeFrameId) ?? null;
  }, [frames, activeFrameId]);

  // Derived active layer (strict lookup within activeFrame, zero fallback)
  const activeLayer = React.useMemo((): Layer | null => {
    if (!activeFrame || !activeLayerId) return null;
    return activeFrame.layers.find((l) => l.id === activeLayerId) ?? null;
  }, [activeFrame, activeLayerId]);

  // Transitional Compatibility Getters (strictly derived from activeLayer.source, null for procedural/backdrop/empty)
  const activeImageId = React.useMemo((): string | null => {
    if (!activeLayer) return null;
    if (activeLayer.source?.type === "image") {
      return activeLayer.source.assetId;
    }
    if (activeLayer.type === "image" && activeLayer.assetId) {
      return activeLayer.assetId;
    }
    return null;
  }, [activeLayer]);

  const activeAsset = React.useMemo((): Asset | null => {
    if (!activeImageId) return null;
    return assets.find((a) => a.id === activeImageId) || null;
  }, [assets, activeImageId]);

  // Universal Effect Stack (every Layer owns effectStack regardless of source type)
  const activeEffectStack = React.useMemo((): EffectStack => {
    return activeLayer?.effectStack ?? [];
  }, [activeLayer]);

  const activeBackground = React.useMemo((): BackgroundState => {
    if (!activeFrame) return DEFAULT_BACKGROUND_STATE;
    const currentLayer =
      (activeLayer?.source?.type === "procedural" ? activeLayer : null) ||
      activeFrame.layers.find((l) => l.source?.type === "procedural");
    if (!currentLayer || !currentLayer.source || currentLayer.source.type !== "procedural") {
      return DEFAULT_BACKGROUND_STATE;
    }

    const proc = currentLayer.source as ProceduralSource;
    return {
      ...DEFAULT_BACKGROUND_STATE,
      type: (proc.kind as any) || "solid",
      color: (proc.parameters?.color as string) || "#000000",
      gradientEndColor:
        (proc.parameters?.gradientEndColor as string) ||
        (proc.parameters?.endColor as string) ||
        "#E20000",
      gradientAngle:
        (proc.parameters?.gradientAngle as number) ||
        (proc.parameters?.angle as number) ||
        90,
      gradientStops: (proc.parameters?.gradientStops as any) || undefined,
      patternSpacing:
        (proc.parameters?.spacing as number) ||
        (proc.parameters?.patternSpacing as number) ||
        (proc.parameters?.gridSize as number) ||
        undefined,
      patternBackgroundColor:
        (proc.parameters?.backgroundColor as string) ||
        (proc.parameters?.patternBackgroundColor as string) ||
        undefined,
      visible: currentLayer.visible !== false,
    };
  }, [activeFrame, activeLayer]);

  const hasActiveBackground = React.useMemo((): boolean => {
    if (!activeFrame) return false;
    return activeFrame.layers.some(
      (l) => l.source?.type === "procedural" && l.visible !== false
    );
  }, [activeFrame]);

  const effectStacks = React.useMemo((): Record<string, EffectStack> => {
    const map: Record<string, EffectStack> = {};
    for (const frame of frames) {
      for (const layer of frame.layers) {
        if (layer.type === "image" && layer.assetId && layer.effectStack && layer.effectStack.length > 0) {
          map[layer.assetId] = layer.effectStack;
        }
      }
    }
    return map;
  }, [frames]);

  const backgrounds = React.useMemo((): Record<string, BackgroundState> => {
    const map: Record<string, BackgroundState> = {};
    for (const frame of frames) {
      const baseProc = frame.layers.find(
        (l) => (l.source?.type === "procedural" || l.type === "generative") && l.visible !== false
      );
      if (baseProc) {
        let bg: BackgroundState | undefined;
        if (baseProc.source?.type === "procedural") {
          const proc = baseProc.source as ProceduralSource;
          bg = {
            ...DEFAULT_BACKGROUND_STATE,
            type: (proc.kind as any) || "solid",
            color: (proc.parameters?.color as string) || "#000000",
            visible: true,
          };
        } else {
          const gen = baseProc as any;
          bg =
            gen.sublayers && gen.sublayers.length > 0
              ? deriveLegacyBackgroundFromSublayers(gen.sublayers)
              : gen.backgroundConfig;
        }
        if (bg) {
          for (const layer of frame.layers) {
            if (layer.type === "image" && layer.assetId) {
              map[layer.assetId] = bg;
            }
          }
        }
      }
    }
    return map;
  }, [frames]);

  const selectedInstanceId = React.useMemo((): string | null => {
    if (selectedEffectInstanceId) return selectedEffectInstanceId;
    if (activeLayer?.id && selectedInstanceIds[activeLayer.id]) {
      return selectedInstanceIds[activeLayer.id];
    }
    if (activeImageId && selectedInstanceIds[activeImageId]) {
      return selectedInstanceIds[activeImageId];
    }
    return null;
  }, [selectedEffectInstanceId, activeLayer, activeImageId, selectedInstanceIds]);

  const selectedInstance = React.useMemo((): EffectInstance | null => {
    if (!selectedInstanceId || !activeEffectStack) return null;
    return (
      activeEffectStack.find(
        (inst) => inst.instanceId === selectedInstanceId
      ) || null
    );
  }, [selectedInstanceId, activeEffectStack]);

  // History state: past & future
  const [past, setPast] = React.useState<StudioHistorySnapshot[]>([]);
  const [future, setFuture] = React.useState<StudioHistorySnapshot[]>([]);

  // Live refs for stable callbacks & continuous interaction debouncing
  const projectNameRef = React.useRef(projectName);
  const framesRef = React.useRef(frames);
  const activeFrameIdRef = React.useRef(activeFrameId);
  const activeFrameRef = React.useRef(activeFrame);
  const activeLayerIdRef = React.useRef(activeLayerId);
  const activeLayerRef = React.useRef(activeLayer);
  const effectStacksRef = React.useRef(effectStacks);
  const backgroundsRef = React.useRef(backgrounds);
  const activeImageIdRef = React.useRef(activeImageId);
  const selectedAssetIdsRef = React.useRef(selectedAssetIds);
  const pastRef = React.useRef(past);
  const futureRef = React.useRef(future);
  const assetsRef = React.useRef(assets);

  // Keep refs immediately synchronized on every render
  assetsRef.current = assets;
  framesRef.current = frames;
  activeFrameIdRef.current = activeFrameId;
  activeFrameRef.current = activeFrame;
  activeLayerIdRef.current = activeLayerId;
  backgroundsRef.current = backgrounds;
  activeImageIdRef.current = activeImageId;

  React.useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);
  React.useEffect(() => {
    framesRef.current = frames;
  }, [frames]);
  React.useEffect(() => {
    activeFrameIdRef.current = activeFrameId;
  }, [activeFrameId]);
  React.useEffect(() => {
    activeFrameRef.current = activeFrame;
  }, [activeFrame]);
  React.useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);
  React.useEffect(() => {
    activeLayerRef.current = activeLayer;
  }, [activeLayer]);
  React.useEffect(() => {
    effectStacksRef.current = effectStacks;
  }, [effectStacks]);
  React.useEffect(() => {
    backgroundsRef.current = backgrounds;
  }, [backgrounds]);
  React.useEffect(() => {
    activeImageIdRef.current = activeImageId;
  }, [activeImageId]);
  React.useEffect(() => {
    selectedAssetIdsRef.current = selectedAssetIds;
  }, [selectedAssetIds]);
  React.useEffect(() => {
    pastRef.current = past;
  }, [past]);
  React.useEffect(() => {
    futureRef.current = future;
  }, [future]);
  React.useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  // Debounce timers ref for disk writes
  const debounceTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({});

  // Continuous parameter slider interaction handling ref
  const isParamInteractingRef = React.useRef(false);
  const paramInteractionTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Snapshot factory helper
  const createSnapshot = React.useCallback((): StudioHistorySnapshot => {
    return {
      frames: JSON.parse(JSON.stringify(framesRef.current)),
      activeFrameId: activeFrameIdRef.current,
      activeLayerId: activeLayerIdRef.current,
      effectStacks: JSON.parse(JSON.stringify(effectStacksRef.current)),
      backgrounds: JSON.parse(JSON.stringify(backgroundsRef.current)),
      activeImageId: activeImageIdRef.current,
      selectedAssetIds: Array.from(selectedAssetIdsRef.current),
    };
  }, []);

  // Record discrete semantic snapshot before a mutation
  const recordDiscreteSnapshot = React.useCallback(() => {
    if (paramInteractionTimerRef.current) {
      clearTimeout(paramInteractionTimerRef.current);
      paramInteractionTimerRef.current = null;
      isParamInteractingRef.current = false;
    }
    const snap = createSnapshot();
    setPast((prev) => {
      const next = [...prev, snap];
      if (next.length > MAX_HISTORY_LIMIT) {
        return next.slice(next.length - MAX_HISTORY_LIMIT);
      }
      return next;
    });
    setFuture([]);
  }, [createSnapshot]);

  // Start or continue continuous parameter interaction (slider gestures)
  const startOrContinueParamInteraction = React.useCallback(() => {
    if (!isParamInteractingRef.current) {
      const snap = createSnapshot();
      setPast((prev) => {
        const next = [...prev, snap];
        if (next.length > MAX_HISTORY_LIMIT) {
          return next.slice(next.length - MAX_HISTORY_LIMIT);
        }
        return next;
      });
      setFuture([]);
      isParamInteractingRef.current = true;
    }

    if (paramInteractionTimerRef.current) {
      clearTimeout(paramInteractionTimerRef.current);
    }
    paramInteractionTimerRef.current = setTimeout(() => {
      isParamInteractingRef.current = false;
      paramInteractionTimerRef.current = null;
    }, 600);
  }, [createSnapshot]);

  // Commit continuous parameter interaction immediately on pointer up / finish
  const commitParamInteraction = React.useCallback(() => {
    if (paramInteractionTimerRef.current) {
      clearTimeout(paramInteractionTimerRef.current);
      paramInteractionTimerRef.current = null;
    }
    isParamInteractingRef.current = false;
  }, []);

  // 1. Startup Hydration Lifecycle
  React.useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const state = await loadHydratedProject();
        if (mounted) {
          if (state.assets && state.assets.length > 0) {
            setAssets((prev) => (prev.length > 0 ? prev : state.assets));
          }

          if (state.projectName) {
            setProjectNameState(state.projectName);
          }

          if (state.userLooks && state.userLooks.length > 0) {
            setUserLooks((prev) => (prev.length > 0 ? prev : state.userLooks));
          }

          if (state.frames && Array.isArray(state.frames) && state.frames.length > 0) {
            setFrames(state.frames);
            // 1. Resolve activeFrameId (validated against loaded frames)
            const targetFrame =
              state.activeFrameId && state.frames.some((f) => f.id === state.activeFrameId)
                ? state.frames.find((f) => f.id === state.activeFrameId)!
                : state.frames[0];
            const resolvedFrameId = targetFrame.id;
            setActiveFrameIdState(resolvedFrameId);

            // 2. Resolve activeLayerId according to approved precedence
            let resolvedLayerId: string | null = null;
            if (state.activeLayerId && targetFrame.layers.some((l) => l.id === state.activeLayerId)) {
              resolvedLayerId = state.activeLayerId;
            } else if (targetFrame.activeLayerId && targetFrame.layers.some((l) => l.id === targetFrame.activeLayerId)) {
              resolvedLayerId = targetFrame.activeLayerId;
            } else if (state.activeImageId) {
              // Migration bridge: only consulted if canonical activeLayerId was absent/invalid
              const matchingImg = targetFrame.layers.find(
                (l) =>
                  (l.source?.type === "image" && l.source.assetId === state.activeImageId) ||
                  (l.type === "image" && l.assetId === state.activeImageId)
              );
              resolvedLayerId = matchingImg
                ? matchingImg.id
                : (targetFrame.layers[targetFrame.layers.length - 1]?.id ?? null);
            } else if (targetFrame.layers.length > 0) {
              // Top-most layer (ordered bottom-to-top)
              resolvedLayerId = targetFrame.layers[targetFrame.layers.length - 1].id;
            } else {
              resolvedLayerId = null;
            }

            if (targetFrame.activeLayerId !== resolvedLayerId) {
              setFrames((prev) =>
                prev.map((f) =>
                  f.id === targetFrame.id ? { ...f, activeLayerId: resolvedLayerId } : f
                )
              );
            }
            setActiveLayerIdState(resolvedLayerId);
          } else if (state.assets && state.assets.length > 0) {
            // Defensive synthesis for test mocks that return assets without frames
            const synthesizedFrames: Frame[] = state.assets.map((asset) => {
              const assetBg = state.backgrounds?.[asset.id];
              const baseBackdrop = createDefaultBackdropLayer(assetBg);
              const assetStack = state.effectStacks?.[asset.id] ? [...state.effectStacks[asset.id]] : [];
              const imgLayer = createImageLayer(asset.id, asset.filename, assetStack, "contain");
              return {
                id: `frame-${asset.id}`,
                name: asset.filename || "Frame",
                dimensions: {
                  width: asset.width || 1080,
                  height: asset.height || 1080,
                  presetId: null,
                },
                layers: [baseBackdrop, imgLayer],
                activeLayerId: imgLayer.id,
                createdAt: asset.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
            });
            setFrames(synthesizedFrames);
            const targetAssetId = state.activeImageId || state.assets[0].id;
            const initialFrame = synthesizedFrames.find((f) => f.id === `frame-${targetAssetId}`) || synthesizedFrames[0];
            setActiveFrameIdState(initialFrame.id);
            const initialLayerId = initialFrame.activeLayerId || initialFrame.layers[initialFrame.layers.length - 1]?.id || null;
            setActiveLayerIdState(initialLayerId);
          }

          setIsHydrated(true);
        }
      } catch (err) {
        console.error("Hydration failed, using defaults:", err);
        if (mounted) {
          setIsHydrated(true);
        }
      }
    }

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  const setProjectName = React.useCallback((name: string) => {
    const trimmed = name.trim() || "Project Name";
    setProjectNameState(trimmed);
    if (typeof dbSaveSessionState === "function") {
      dbSaveSessionState(
        activeFrameIdRef.current,
        activeLayerIdRef.current,
        activeImageIdRef.current,
        trimmed
      ).catch(console.error);
    }
  }, []);

  // Frame and Layer Setters (Canonical Source of Truth)
  const setActiveFrameId = React.useCallback((id: string | null) => {
    setActiveFrameIdState(id);
    if (!id) {
      setActiveLayerIdState(null);
      return;
    }

    const frame = framesRef.current.find((f) => f.id === id);
    if (frame) {
      // Validate frame.activeLayerId against frame.layers
      let resolvedLayerId: string | null = null;
      if (frame.activeLayerId && frame.layers.some((l) => l.id === frame.activeLayerId)) {
        resolvedLayerId = frame.activeLayerId;
      } else if (frame.layers.length > 0) {
        // Top-most layer (ordered bottom-to-top)
        resolvedLayerId = frame.layers[frame.layers.length - 1].id;
      } else {
        resolvedLayerId = null;
      }

      if (frame.activeLayerId !== resolvedLayerId) {
        setFrames((prevFrames) =>
          prevFrames.map((f) =>
            f.id === frame.id ? { ...f, activeLayerId: resolvedLayerId } : f
          )
        );
      }
      setActiveLayerIdState(resolvedLayerId);

      const targetLayer = frame.layers.find((l) => l.id === resolvedLayerId);
      const assetId =
        targetLayer?.source?.type === "image"
          ? targetLayer.source.assetId
          : targetLayer?.type === "image" && targetLayer.assetId
          ? targetLayer.assetId
          : null;

      if (typeof dbSaveSessionState === "function") {
        dbSaveSessionState(
          id,
          resolvedLayerId,
          assetId,
          projectNameRef.current
        ).catch(console.error);
      }
    } else {
      setActiveLayerIdState(null);
    }
  }, []);

  const setActiveLayerId = React.useCallback((id: string | null) => {
    setActiveLayerIdState(id);
    const activeFId = activeFrameIdRef.current;
    if (activeFId) {
      setFrames((prevFrames) =>
        prevFrames.map((f) =>
          f.id === activeFId ? { ...f, activeLayerId: id } : f
        )
      );
      const frame = framesRef.current.find((f) => f.id === activeFId);
      const targetLayer = frame?.layers.find((l) => l.id === id);
      const assetId =
        targetLayer?.source?.type === "image"
          ? targetLayer.source.assetId
          : targetLayer?.type === "image" && targetLayer.assetId
          ? targetLayer.assetId
          : null;
      if (typeof dbSaveSessionState === "function") {
        dbSaveSessionState(
          activeFId,
          id,
          assetId,
          projectNameRef.current
        ).catch(console.error);
      }
    }
  }, []);

  // Compatibility setter for activeImageId (frame-isolated, resolves ImageSource in current active frame)
  const setActiveImageId = React.useCallback((id: string | null) => {
    if (!id) {
      setActiveLayerId(null);
      return;
    }

    const currentFrame = activeFrameRef.current;
    if (!currentFrame) return;

    // Resolve matching ImageSource layer in CURRENT activeFrame only
    const targetLayer = currentFrame.layers.find(
      (l) =>
        (l.source?.type === "image" && l.source.assetId === id) ||
        (l.type === "image" && l.assetId === id)
    );

    if (targetLayer) {
      setActiveLayerId(targetLayer.id);
    }
    // If unplaced in the active frame: no-op with respect to canvas editing.
    // Does NOT switch frames, does NOT change activeFrameId, does NOT steal canvas focus.
  }, [setActiveLayerId]);

  // ---------------------------------------------------------------------------
  // Stage 1C Layer & Frame Operations
  // ---------------------------------------------------------------------------

  const addLayerFromAsset = React.useCallback(
    (assetId: string): ImageLayer | null => {
      const asset = assetsRef.current.find((a) => a.id === assetId) || assets.find((a) => a.id === assetId);
      const filename = asset?.filename;

      recordDiscreteSnapshot();
      const newLayer = createImageLayer(assetId, filename);

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current || prev[0]?.id;
        if (!activeFId) return prev;

        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;

          const newLayers = [...frame.layers, newLayer];
          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            activeLayerId: newLayer.id,
            updatedAt: Date.now(),
          };

          setActiveLayerIdState(newLayer.id);

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }
          if (typeof dbSaveSessionState === "function") {
            dbSaveSessionState(
              updatedFrame.id,
              newLayer.id,
              assetId,
              projectNameRef.current
            ).catch(console.error);
          }

          return updatedFrame;
        });
      });

      return newLayer;
    },
    [assets, recordDiscreteSnapshot]
  );

  const addLayer = React.useCallback(
    (layer: Layer) => {
      recordDiscreteSnapshot();
      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current || prev[0]?.id;
        if (!activeFId) return prev;

        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;

          const newLayers = [...frame.layers, layer];
          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            activeLayerId: layer.id,
            updatedAt: Date.now(),
          };

          setActiveLayerIdState(layer.id);

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }
          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot]
  );

  const addProceduralLayer = React.useCallback(
    (
      kind: BackgroundItemType,
      parameters?: Record<string, unknown>,
      name?: string
    ): Layer => {
      recordDiscreteSnapshot();
      const incomingParams =
        parameters && "parameters" in parameters && typeof (parameters as any).parameters === "object"
          ? (parameters as any).parameters
          : parameters;
      const resolvedParams = resolveBackgroundItemParameters(kind, incomingParams || {});
      const newLayer = createProceduralLayer(
        {
          type: "procedural",
          kind,
          parameters: resolvedParams,
        },
        name || `${kind.charAt(0).toUpperCase() + kind.slice(1)} Layer`
      );

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current || prev[0]?.id;
        if (!activeFId) return prev;

        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;

          const newLayers = [...frame.layers, newLayer];
          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            activeLayerId: newLayer.id,
            updatedAt: Date.now(),
          };

          setActiveLayerIdState(newLayer.id);

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }
          return updatedFrame;
        });
      });

      return newLayer;
    },
    [recordDiscreteSnapshot]
  );

  const updateLayerSource = React.useCallback(
    (
      layerId: string,
      sourceUpdates: Partial<ProceduralSource> | Record<string, unknown>,
      options?: { skipHistory?: boolean }
    ) => {
      if (options?.skipHistory) {
        startOrContinueParamInteraction();
      } else {
        recordDiscreteSnapshot();
      }

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current || prev[0]?.id;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;
          const layerIdx = frame.layers.findIndex(
            (l) =>
              l.id === layerId ||
              (l as any).backgrounds?.some((b: any) => b.id === layerId) ||
              (l as any).sublayers?.some((b: any) => b.id === layerId)
          );
          if (layerIdx === -1) return frame;

          const current = frame.layers[layerIdx];
          if (!current.source || current.source.type !== "procedural") return frame;

          const currentSource = current.source as ProceduralSource;
          const isFullSource =
            (sourceUpdates as any).type === "procedural" ||
            (sourceUpdates as any).kind !== undefined;

          const incomingParams =
            (sourceUpdates as any).parameters && typeof (sourceUpdates as any).parameters === "object"
              ? (sourceUpdates as any).parameters
              : isFullSource
              ? {}
              : sourceUpdates;

          const nextParameters = {
            ...currentSource.parameters,
            ...incomingParams,
          };

          const nextKind = isFullSource
            ? ((sourceUpdates as any).kind ?? currentSource.kind)
            : currentSource.kind;

          const resolvedParams = resolveBackgroundItemParameters(nextKind, nextParameters);

          const nextSource: ProceduralSource = {
            type: "procedural",
            kind: nextKind,
            parameters: resolvedParams,
            seed: (sourceUpdates as any).seed ?? currentSource.seed,
          };

          const updatedLayer: Layer = {
            ...current,
            source: nextSource,
            updatedAt: Date.now(),
          };

          const nextLayers = [...frame.layers];
          nextLayers[layerIdx] = updatedLayer;

          const updatedFrame: Frame = {
            ...frame,
            layers: nextLayers,
            updatedAt: Date.now(),
          };

          if (typeof dbSaveFrame === "function") {
            Promise.resolve(dbSaveFrame(updatedFrame)).catch(console.error);
          }
          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot, startOrContinueParamInteraction]
  );

  const updateLayer = React.useCallback(
    (layerId: string, updates: Partial<Layer>, options?: { skipHistory?: boolean }) => {
      if (!options?.skipHistory) {
        recordDiscreteSnapshot();
      }

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;
          const layerIdx = frame.layers.findIndex((l) => l.id === layerId);
          if (layerIdx === -1) return frame;

          const current = frame.layers[layerIdx];
          let nextTransform = current.transform;
          if (updates.transform !== undefined) {
            nextTransform = sanitizeTransform(updates.transform);
          }

          let nextSource = current.source;
          if (updates.source) {
            nextSource = {
              ...current.source,
              ...updates.source,
            } as LayerSource;
          }

          // Hard invariant: backdrop at index 0 cannot be unlocked
          let nextLocked = updates.locked !== undefined ? updates.locked : current.locked;
          if (layerIdx === 0 && current.locked && updates.locked === false) {
            nextLocked = true;
          }

          const updatedLayer: Layer = {
            ...current,
            ...updates,
            locked: nextLocked,
            ...(nextTransform ? { transform: nextTransform } : {}),
            ...(nextSource ? { source: nextSource } : {}),
            updatedAt: Date.now(),
          };

          const newLayers = [...frame.layers];
          newLayers[layerIdx] = updatedLayer;

          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            updatedAt: Date.now(),
          };

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }

          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot]
  );


  const reorderLayers = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      recordDiscreteSnapshot();

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;

          // Hard Invariant: index 0 is canonical backdrop / locked background
          // Layers are only reorderable at indices >= 1, and locked layers cannot be moved
          if (fromIndex <= 0 || toIndex <= 0 || frame.layers[fromIndex]?.locked) {
            console.warn("Cannot reorder locked backdrop layer at index 0");
            return frame;
          }
          if (
            fromIndex >= frame.layers.length ||
            toIndex >= frame.layers.length ||
            fromIndex === toIndex
          ) {
            return frame;
          }

          const newLayers = [...frame.layers];
          const [moved] = newLayers.splice(fromIndex, 1);
          newLayers.splice(toIndex, 0, moved);

          // Structural invariant: if a backdrop exists, it must remain behind all upper layers at index 0
          const hasBackdrop = frame.layers.some((l) => l.source?.type === "procedural" || l.type === "generative");
          const firstIsBackdrop = newLayers[0]?.source?.type === "procedural" || newLayers[0]?.type === "generative";
          if (hasBackdrop && !firstIsBackdrop) {
            console.warn("Reorder rejected: index 0 must be backdrop layer");
            return frame;
          }

          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            updatedAt: Date.now(),
          };

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }

          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot]
  );

  const removeLayer = React.useCallback(
    (layerId: string) => {
      recordDiscreteSnapshot();

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;
          const layerIdx = frame.layers.findIndex((l) => l.id === layerId);
          if (layerIdx === -1) return frame;

          // Hard invariant: backdrop at index 0 is locked and cannot be removed
          if (layerIdx === 0 && (frame.layers[0]?.locked || frame.layers[0]?.name === "Background")) {
            console.warn("Cannot remove locked backdrop layer at index 0");
            return frame;
          }

          const isGenerative =
            frame.layers[layerIdx].source?.type === "procedural" ||
            frame.layers[layerIdx].type === "generative";
          const newLayers = frame.layers.filter((l) => l.id !== layerId);
          let nextActiveLayerId = frame.activeLayerId;
          const wasActive = frame.activeLayerId === layerId || activeLayerIdRef.current === layerId;

          if (wasActive) {
            if (newLayers.length === 0) {
              nextActiveLayerId = null;
            } else {
              // Prefer adjacent layer below (index - 1), else first remaining layer (index 0)
              const adjacentIdx = layerIdx > 0 ? layerIdx - 1 : 0;
              nextActiveLayerId = newLayers[adjacentIdx]?.id || null;
            }
            setActiveLayerIdState(nextActiveLayerId);
          }

          if (isGenerative) {
            setIsProceduralEditorOpen(false);
          }

          const updatedFrame: Frame = {
            ...frame,
            layers: newLayers,
            activeLayerId: nextActiveLayerId,
            updatedAt: Date.now(),
          };

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }

          if (wasActive && typeof dbSaveSessionState === "function") {
            const activeL = newLayers.find((l) => l.id === nextActiveLayerId);
            const activeImg =
              activeL?.source?.type === "image"
                ? activeL.source.assetId
                : activeL?.type === "image" && activeL.assetId
                ? activeL.assetId
                : null;
            dbSaveSessionState(
              frame.id,
              nextActiveLayerId,
              activeImg,
              projectNameRef.current
            ).catch(console.error);
          }

          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot]
  );

  const setFrameDimensions = React.useCallback(
    (dimensions: FrameDimensions) => {
      recordDiscreteSnapshot();

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;

          const updatedFrame: Frame = {
            ...frame,
            dimensions: {
              width: Math.max(1, Math.round(dimensions.width)),
              height: Math.max(1, Math.round(dimensions.height)),
              presetId: dimensions.presetId || null,
            },
            updatedAt: Date.now(),
          };

          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }

          return updatedFrame;
        });
      });
    },
    [recordDiscreteSnapshot]
  );

  // ---------------------------------------------------------------------------
  // Multi-Asset Selection Methods
  // ---------------------------------------------------------------------------

  const toggleAssetSelection = React.useCallback(
    (assetId: string) => {
      setSelectedAssetIds((prev) => {
        const next = new Set(prev);
        if (next.has(assetId)) {
          next.delete(assetId);
        } else {
          next.add(assetId);
        }
        return next;
      });
    },
    []
  );

  const selectAsset = React.useCallback(
    (assetId: string, clearOthers = true) => {
      setSelectedAssetIds((prev) => {
        if (clearOthers) {
          return new Set([assetId]);
        }
        const next = new Set(prev);
        next.add(assetId);
        return next;
      });
    },
    []
  );

  const selectAssetRange = React.useCallback(
    (fromAssetId: string, toAssetId: string, assetList: Asset[]) => {
      const fromIdx = assetList.findIndex((a) => a.id === fromAssetId);
      const toIdx = assetList.findIndex((a) => a.id === toAssetId);
      if (fromIdx === -1 || toIdx === -1) {
        selectAsset(toAssetId, true);
        return;
      }
      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);
      const rangeIds = assetList.slice(start, end + 1).map((a) => a.id);
      setSelectedAssetIds(new Set(rangeIds));
    },
    [selectAsset]
  );

  const deselectAsset = React.useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }, []);

  const clearAssetSelection = React.useCallback(() => {
    setSelectedAssetIds(new Set());
  }, []);

  const selectAllAssets = React.useCallback(() => {
    setSelectedAssetIds(new Set(assetsRef.current.map((a) => a.id)));
  }, []);

  // ---------------------------------------------------------------------------
  // Assets Management
  // ---------------------------------------------------------------------------

  const addAssets = React.useCallback(
    async (files: FileList | File[] | Asset[]) => {
      const fileArray: (File | Asset)[] = Array.isArray(files)
        ? files
        : Array.from(files);
      if (fileArray.length === 0) return;

      setIsImporting(true);
      setImportError(null);

      const newlyCreated: Asset[] = [];
      let lastError: string | null = null;

      for (const item of fileArray) {
        try {
          const asset =
            item && typeof item === "object" && "objectUrl" in item
              ? (item as Asset)
              : await createAssetFromFile(item as File);
          newlyCreated.push(asset);

          // Save raw Blob to IndexedDB
          if (asset.rawBlob && typeof dbSaveAsset === "function") {
            dbSaveAsset({
              id: asset.id,
              filename: asset.filename,
              mimeType: asset.mimeType,
              fileSize: asset.fileSize,
              width: asset.width,
              height: asset.height,
              aspectRatio: asset.aspectRatio,
              thumbnailUrl: asset.thumbnailUrl,
              rawBlob: asset.rawBlob,
              createdAt: asset.createdAt,
            }).catch(console.error);
          }
        } catch (err) {
          lastError =
            err instanceof Error ? err.message : "Failed to import image";
        }
      }

      if (newlyCreated.length > 0) {
        setAssets((prev) => [...prev, ...newlyCreated]);
        const newActiveId = newlyCreated[newlyCreated.length - 1].id;

        setFrames((prevFrames) => {
          let updatedFrames = [...prevFrames];

          const isOnlyEmptyDefault =
            updatedFrames.length === 1 &&
            !updatedFrames[0].layers.some((l) => l.type === "image");

          if (isOnlyEmptyDefault) {
            const firstAsset = newlyCreated[0];
            const baseBackdrop =
              updatedFrames[0].layers[0] ||
              createDefaultBackdropLayer();
            const firstLayer = createImageLayer(
              firstAsset.id,
              firstAsset.filename,
              [],
              "contain"
            );
            const firstFrame: Frame = {
              ...updatedFrames[0],
              name: firstAsset.filename,
              dimensions: {
                width: firstAsset.width || 1080,
                height: firstAsset.height || 1080,
                presetId: null,
              },
              layers: [baseBackdrop, firstLayer],
              activeLayerId: firstLayer.id,
              updatedAt: Date.now(),
            };

            const otherFrames = newlyCreated.slice(1).map((asset) => {
              const backdrop = createDefaultBackdropLayer();
              const layer = createImageLayer(asset.id, asset.filename, [], "contain");
              return {
                id: `frame-${asset.id}`,
                name: asset.filename,
                dimensions: {
                  width: asset.width || 1080,
                  height: asset.height || 1080,
                  presetId: null,
                },
                layers: [backdrop, layer],
                activeLayerId: layer.id,
                createdAt: asset.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
            });

            updatedFrames = [firstFrame, ...otherFrames];
          } else {
            const newFrames = newlyCreated.map((asset) => {
              const backdrop = createDefaultBackdropLayer();
              const layer = createImageLayer(asset.id, asset.filename, [], "contain");
              return {
                id: `frame-${asset.id}`,
                name: asset.filename,
                dimensions: {
                  width: asset.width || 1080,
                  height: asset.height || 1080,
                  presetId: null,
                },
                layers: [backdrop, layer],
                activeLayerId: layer.id,
                createdAt: asset.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
            });
            updatedFrames = [...updatedFrames, ...newFrames];
          }

          const targetFrame =
            updatedFrames.find((f) =>
              f.layers.some((l) => l.type === "image" && l.assetId === newActiveId)
            ) || updatedFrames[updatedFrames.length - 1];

          setActiveFrameIdState(targetFrame.id);
          const targetLayer = targetFrame.layers.find(
            (l) => l.type === "image" && l.assetId === newActiveId
          );
          setActiveLayerIdState(targetLayer?.id || targetFrame.layers[0].id);

          if (typeof dbSaveFrames === "function") {
            dbSaveFrames(updatedFrames).catch(console.error);
          }
          if (typeof dbSaveSessionState === "function") {
            dbSaveSessionState(
              targetFrame.id,
              targetLayer?.id || null,
              newActiveId,
              projectNameRef.current
            ).catch(console.error);
          }

          return updatedFrames;
        });

        setSelectedAssetIds(new Set([newActiveId]));
      }

      if (lastError && newlyCreated.length === 0) {
        setImportError(lastError);
      }

      setIsImporting(false);
    },
    []
  );

  const removeAsset = React.useCallback(
    (id: string) => {
      setAssets((prev) => {
        const target = prev.find((a) => a.id === id);
        if (target) {
          revokeAssetUrls(target);
        }
        return prev.filter((a) => a.id !== id);
      });

      setSelectedAssetIds((prev) => {
        if (prev.has(id)) {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        return prev;
      });

      setFrames((prevFrames) => {
        let updatedFrames = prevFrames
          .map((f) => {
            const nextLayers = f.layers.filter(
              (l) =>
                !(
                  (l.source?.type === "image" && l.source.assetId === id) ||
                  (l.type === "image" && l.assetId === id)
                )
            );
            return {
              ...f,
              layers: nextLayers,
              activeLayerId:
                f.activeLayerId && !nextLayers.some((l) => l.id === f.activeLayerId)
                  ? nextLayers[nextLayers.length - 1]?.id ?? null
                  : f.activeLayerId,
              updatedAt: Date.now(),
            };
          })
          .filter((f) => {
            if (f.id === `frame-${id}` && f.layers.length <= 1) {
              return false;
            }
            return true;
          });

        if (updatedFrames.length === 0) {
          updatedFrames = [createDefaultFrame()];
        }

        const nextActiveFrame =
          updatedFrames.find((f) => f.id === activeFrameIdRef.current) ||
          updatedFrames[updatedFrames.length - 1];

        setActiveFrameIdState(nextActiveFrame.id);
        const nextActiveLayerId =
          nextActiveFrame.activeLayerId && nextActiveFrame.layers.some((l) => l.id === nextActiveFrame.activeLayerId)
            ? nextActiveFrame.activeLayerId
            : (nextActiveFrame.layers[nextActiveFrame.layers.length - 1]?.id ?? null);
        setActiveLayerIdState(nextActiveLayerId);

        if (typeof dbSaveFrames === "function") {
          dbSaveFrames(updatedFrames).catch(console.error);
        }
        if (typeof dbSaveSessionState === "function") {
          const activeL = nextActiveFrame.layers.find((l) => l.id === nextActiveLayerId);
          const activeImgId =
            activeL?.source?.type === "image"
              ? activeL.source.assetId
              : activeL?.type === "image" && activeL.assetId
              ? activeL.assetId
              : null;
          dbSaveSessionState(
            nextActiveFrame.id,
            nextActiveLayerId,
            activeImgId,
            projectNameRef.current
          ).catch(console.error);
        }

        return updatedFrames;
      });

      setSelectedInstanceIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // Remove from IndexedDB
      if (typeof dbDeleteAsset === "function") {
        dbDeleteAsset(id).catch(console.error);
      }
      if (typeof dbDeleteEffectStack === "function") {
        dbDeleteEffectStack(id).catch(console.error);
      }
      if (typeof dbDeleteBackground === "function") {
        dbDeleteBackground(id).catch(console.error);
      }
    },
    []
  );

  // Helper for mutating an effect stack on a layer within frames
  const mutateLayerStack = React.useCallback(
    (
      targetId: string,
      mutator: (currentStack: EffectStack) => EffectStack,
      options: { debounce?: boolean; isContinuous?: boolean } = {}
    ) => {
      if (options.isContinuous) {
        startOrContinueParamInteraction();
      } else {
        recordDiscreteSnapshot();
      }

      setFrames((prevFrames) => {
        let frameIndex = -1;
        let layerIndex = -1;

        for (let fi = 0; fi < prevFrames.length; fi++) {
          const frame = prevFrames[fi];
          const li = frame.layers.findIndex((l) => {
            // Priority 1 — Canonical Layer ID
            if (l.id === targetId) return true;
            // Priority 2 — Transitional ImageSource
            if (l.source?.type === "image" && l.source.assetId === targetId) return true;
            // Priority 3 — Legacy compatibility
            if (l.type === "image" && l.assetId === targetId) return true;
            return false;
          });
          if (li !== -1) {
            frameIndex = fi;
            layerIndex = li;
            break;
          }
        }

        if (frameIndex === -1 && activeFrameRef.current) {
          frameIndex = prevFrames.findIndex((f) => f.id === activeFrameRef.current!.id);
          if (frameIndex !== -1) {
            const frame = prevFrames[frameIndex];
            // Priority 4 — Active layer fallback strictly by layer ID
            layerIndex = frame.layers.findIndex(
              (l) => l.id === activeLayerRef.current?.id
            );
          }
        }

        if (frameIndex === -1 || layerIndex === -1) {
          return prevFrames;
        }

        const targetFrame = prevFrames[frameIndex];
        const targetLayer = targetFrame.layers[layerIndex];
        const currentStack = targetLayer.effectStack || [];
        const nextStack = mutator(currentStack);

        const updatedLayer: Layer = {
          ...targetLayer,
          effectStack: nextStack,
        };

        const nextLayers = [...targetFrame.layers];
        nextLayers[layerIndex] = updatedLayer;

        const updatedFrame: Frame = {
          ...targetFrame,
          layers: nextLayers,
          updatedAt: Date.now(),
        };

        const nextFrames = [...prevFrames];
        nextFrames[frameIndex] = updatedFrame;

        const assetId = targetLayer.type === "image" ? (targetLayer as ImageLayer).assetId : targetId;

        if (options.debounce) {
          const timerKey = "stack_" + assetId;
          if (debounceTimersRef.current[timerKey]) {
            clearTimeout(debounceTimersRef.current[timerKey]);
          }
          debounceTimersRef.current[timerKey] = setTimeout(() => {
            if (typeof dbSaveFrame === "function") {
              Promise.resolve(dbSaveFrame(updatedFrame)).catch(console.error);
            }
            if (typeof dbSaveEffectStack === "function") {
              Promise.resolve(dbSaveEffectStack(assetId, nextStack)).catch(console.error);
            }
          }, 500);
        } else {
          if (typeof dbSaveFrame === "function") {
            dbSaveFrame(updatedFrame).catch(console.error);
          }
          if (typeof dbSaveEffectStack === "function") {
            dbSaveEffectStack(assetId, nextStack).catch(console.error);
          }
        }

        return nextFrames;
      });
    },
    [recordDiscreteSnapshot, startOrContinueParamInteraction]
  );

  const selectInstance = React.useCallback(
    (targetId: string, instanceId: string | null) => {
      setSelectedEffectInstanceId(instanceId);
      setSelectedInstanceIds((prev) => ({
        ...prev,
        [targetId]: instanceId,
      }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Effect Stack Mutations (With Undo Recording)
  // ---------------------------------------------------------------------------

  const addEffectToStack = React.useCallback(
    (
      targetId: string,
      effectId: EffectId,
      userParams?: Record<string, unknown>
    ) => {
      const def = getEffectDefinition(effectId);
      const initialParams = {
        ...(def ? def.defaultParameters : {}),
        ...(userParams || {}),
      };

      const newInstance: EffectInstance = {
        instanceId: crypto.randomUUID(),
        effectId,
        enabled: true,
        parameters: initialParams,
      };

      mutateLayerStack(targetId, (current) => [...current, newInstance]);

      setSelectedEffectInstanceId(newInstance.instanceId);
      setSelectedInstanceIds((prev) => ({
        ...prev,
        [targetId]: newInstance.instanceId,
      }));
    },
    [mutateLayerStack]
  );

  const updateInstanceParameters = React.useCallback(
    (
      targetId: string,
      instanceId: string,
      updatedParams: Record<string, unknown>
    ) => {
      mutateLayerStack(
        targetId,
        (current) =>
          current.map((inst) =>
            inst.instanceId === instanceId
              ? { ...inst, parameters: { ...inst.parameters, ...updatedParams } }
              : inst
          ),
        { debounce: true, isContinuous: true }
      );
    },
    [mutateLayerStack]
  );

  const resetInstanceParameters = React.useCallback(
    (targetId: string, instanceId: string) => {
      mutateLayerStack(targetId, (current) =>
        current.map((inst) => {
          if (inst.instanceId !== instanceId) return inst;
          const def = getEffectDefinition(inst.effectId);
          return {
            ...inst,
            parameters: def ? { ...def.defaultParameters } : {},
          };
        })
      );
    },
    [mutateLayerStack]
  );

  const toggleInstanceEnabled = React.useCallback(
    (targetId: string, instanceId: string) => {
      mutateLayerStack(targetId, (current) =>
        current.map((inst) =>
          inst.instanceId === instanceId ? { ...inst, enabled: !inst.enabled } : inst
        )
      );
    },
    [mutateLayerStack]
  );

  const removeInstanceFromStack = React.useCallback(
    (targetId: string, instanceId: string) => {
      mutateLayerStack(targetId, (current) =>
        current.filter((inst) => inst.instanceId !== instanceId)
      );

      setSelectedInstanceIds((prev) => {
        const currentSelected = prev[targetId];
        if (currentSelected === instanceId) {
          const stack = effectStacksRef.current[targetId] || [];
          const filtered = stack.filter((inst) => inst.instanceId !== instanceId);
          const nextSelected =
            filtered.length > 0 ? filtered[filtered.length - 1].instanceId : null;
          return { ...prev, [targetId]: nextSelected };
        }
        return prev;
      });
    },
    [mutateLayerStack]
  );

  const removeAllInstancesFromStack = React.useCallback(
    (targetId: string) => {
      mutateLayerStack(targetId, () => []);
      setSelectedEffectInstanceId(null);
      setSelectedInstanceIds((prev) => ({
        ...prev,
        [targetId]: null,
      }));
    },
    [mutateLayerStack]
  );

  const reorderEffectStack = React.useCallback(
    (targetId: string, fromIndex: number, toIndex: number) => {
      mutateLayerStack(targetId, (current) => {
        if (
          fromIndex < 0 ||
          fromIndex >= current.length ||
          toIndex < 0 ||
          toIndex >= current.length
        ) {
          return current;
        }
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
    },
    [mutateLayerStack]
  );

  const duplicateInstance = React.useCallback(
    (targetId: string, instanceId: string) => {
      let dupInstanceId: string | null = null;
      mutateLayerStack(targetId, (current) => {
        const targetIndex = current.findIndex((inst) => inst.instanceId === instanceId);
        if (targetIndex === -1) return current;
        const target = current[targetIndex];
        const dup: EffectInstance = {
          instanceId: crypto.randomUUID(),
          effectId: target.effectId,
          enabled: target.enabled,
          parameters: JSON.parse(JSON.stringify(target.parameters || {})),
        };
        dupInstanceId = dup.instanceId;
        const next = [...current];
        next.splice(targetIndex + 1, 0, dup);
        return next;
      });

      if (dupInstanceId) {
        const finalDupId: string = dupInstanceId;
        setSelectedEffectInstanceId(finalDupId);
        setSelectedInstanceIds((prev) => ({
          ...prev,
          [targetId]: finalDupId,
        }));
      }
    },
    [mutateLayerStack]
  );

  // ---------------------------------------------------------------------------
  // Looks / Presets Methods
  // ---------------------------------------------------------------------------

  const applyLookToActiveAsset = React.useCallback(
    (look: Look) => {
      if (!activeLayer) return;
      recordDiscreteSnapshot();

      const clonedStack = cloneLookToEffectStack(look);

      mutateLayerStack(activeLayer.id, () => clonedStack);

      const lastId = clonedStack.length > 0 ? clonedStack[clonedStack.length - 1].instanceId : null;
      setSelectedEffectInstanceId(lastId);
      if (activeImageId) {
        setSelectedInstanceIds((prev) => ({
          ...prev,
          [activeImageId]: lastId,
        }));
      }

      setAppliedLook(look);
    },
    [activeLayer, activeImageId, mutateLayerStack, recordDiscreteSnapshot]
  );

  const applyLookToAssets = React.useCallback(
    (assetIds: string[], look: Look) => {
      if (assetIds.length === 0) return;
      recordDiscreteSnapshot();

      const newStacksMap: Record<string, EffectStack> = {};
      for (const aId of assetIds) {
        newStacksMap[aId] = cloneLookToEffectStack(look);
      }

      setFrames((prevFrames) => {
        const updatedFrames = prevFrames.map((frame) => {
          let hasChange = false;
          const nextLayers = frame.layers.map((layer) => {
            if (layer.type === "image") {
              const img = layer as ImageLayer;
              if (assetIds.includes(img.assetId)) {
                hasChange = true;
                return {
                  ...layer,
                  effectStack: newStacksMap[img.assetId] || [],
                };
              }
            }
            return layer;
          });
          return hasChange ? { ...frame, layers: nextLayers, updatedAt: Date.now() } : frame;
        });

        if (typeof dbSaveFrames === "function") {
          dbSaveFrames(updatedFrames).catch(console.error);
        }
        for (const [aId, stack] of Object.entries(newStacksMap)) {
          if (typeof dbSaveEffectStack === "function") {
            dbSaveEffectStack(aId, stack).catch(console.error);
          }
        }

        return updatedFrames;
      });

      setSelectedInstanceIds((prev) => {
        const next = { ...prev };
        for (const assetId of assetIds) {
          const stack = newStacksMap[assetId];
          next[assetId] = stack && stack.length > 0 ? stack[stack.length - 1].instanceId : null;
        }
        return next;
      });
    },
    [recordDiscreteSnapshot]
  );

  const saveCurrentStackAsLook = React.useCallback(
    (
      name: string,
      category: LookCategory = "custom",
      description = ""
    ): Look => {
      const newLook = createLookFromStack(
        name,
        category,
        activeEffectStack,
        description
      );
      setUserLooks((prev) => {
        const next = [...prev, newLook];
        if (typeof dbSaveUserLook === "function") {
          dbSaveUserLook(newLook).catch(console.error);
        }
        return next;
      });
      return newLook;
    },
    [activeEffectStack]
  );

  const deleteUserLook = React.useCallback((lookId: string) => {
    setUserLooks((prev) => {
      const next = prev.filter((l) => l.id !== lookId);
      if (typeof dbDeleteUserLook === "function") {
        dbDeleteUserLook(lookId).catch(console.error);
      }
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Creative Background Layer Methods
  // ---------------------------------------------------------------------------

  const updateActiveBackground = React.useCallback(
    (updates: Partial<BackgroundState>) => {
      if (!activeFrame) return;
      startOrContinueParamInteraction();

      setFrames((prev) => {
        const frameIndex = prev.findIndex((f) => f.id === activeFrame.id);
        if (frameIndex === -1) return prev;
        const targetFrame = prev[frameIndex];

        let procIdx = targetFrame.layers.findIndex(
          (l) => l.id === targetFrame.activeLayerId && l.source?.type === "procedural"
        );
        if (procIdx === -1) {
          procIdx = targetFrame.layers.findIndex((l) => l.source?.type === "procedural");
        }
        if (procIdx === -1) return prev;

        const currentLayer = targetFrame.layers[procIdx];
        const currentSource = currentLayer.source as ProceduralSource;
        const nextKind = updates.type && updates.type !== "transparent" ? updates.type : currentSource.kind;
        const nextParams: Record<string, unknown> = {
          ...currentSource.parameters,
          ...(updates.color ? { color: updates.color } : {}),
          ...(updates.gradientEndColor ? { gradientEndColor: updates.gradientEndColor } : {}),
          ...(updates.gradientAngle !== undefined ? { gradientAngle: updates.gradientAngle, angle: updates.gradientAngle } : {}),
          ...(updates.patternSpacing !== undefined ? { spacing: updates.patternSpacing } : {}),
        };

        const isVisible = updates.visible !== undefined ? updates.visible : updates.type !== "transparent";

        const updatedLayer: Layer = {
          ...currentLayer,
          visible: isVisible,
          source: {
            type: "procedural",
            kind: nextKind as any,
            parameters: nextParams,
            seed: currentSource.seed,
          },
          updatedAt: Date.now(),
        };

        const nextLayers = [...targetFrame.layers];
        nextLayers[procIdx] = updatedLayer;

        const updatedFrame: Frame = {
          ...targetFrame,
          layers: nextLayers,
          updatedAt: Date.now(),
        };

        const nextFrames = [...prev];
        nextFrames[frameIndex] = updatedFrame;

        // Debounced persistence
        const timerKey = "bg_" + targetFrame.id;
        if (debounceTimersRef.current[timerKey]) {
          clearTimeout(debounceTimersRef.current[timerKey]);
        }
        debounceTimersRef.current[timerKey] = setTimeout(() => {
          if (typeof dbSaveFrame === "function") {
            Promise.resolve(dbSaveFrame(updatedFrame)).catch(console.error);
          }
        }, 500);

        return nextFrames;
      });
    },
    [activeFrame, startOrContinueParamInteraction]
  );

  const resetActiveBackground = React.useCallback(() => {
    if (!activeFrame) return;
    recordDiscreteSnapshot();
    setIsProceduralEditorOpen(false);

    setFrames((prev) => {
      const frameIndex = prev.findIndex((f) => f.id === activeFrame.id);
      if (frameIndex === -1) return prev;
      const targetFrame = prev[frameIndex];

      // Reset index 0 to hidden default, remove all upper procedural layers (index >= 1)
      const nextLayers: Layer[] = [];
      targetFrame.layers.forEach((l, idx) => {
        if (idx === 0) {
          const resetBackdrop: Layer = {
            ...l,
            visible: false,
            source: {
              type: "procedural",
              kind: "solid",
              parameters: { color: "#000000" },
            },
            updatedAt: Date.now(),
          };
          nextLayers.push(resetBackdrop);
        } else if (l.source?.type === "procedural" || l.type === "generative") {
          // Exclude upper procedural layers
        } else {
          nextLayers.push(l);
        }
      });

      const updatedFrame: Frame = {
        ...targetFrame,
        layers: nextLayers,
        updatedAt: Date.now(),
      };

      const nextFrames = [...prev];
      nextFrames[frameIndex] = updatedFrame;

      if (typeof dbSaveFrame === "function") {
        dbSaveFrame(updatedFrame).catch(console.error);
      }

      return nextFrames;
    });
  }, [activeFrame, recordDiscreteSnapshot]);



  // ---------------------------------------------------------------------------
  // Global Undo / Redo
  // ---------------------------------------------------------------------------

  const undo = React.useCallback(() => {
    if (paramInteractionTimerRef.current) {
      clearTimeout(paramInteractionTimerRef.current);
      paramInteractionTimerRef.current = null;
      isParamInteractingRef.current = false;
    }
    if (pastRef.current.length === 0) return;

    const currentSnap = createSnapshot();
    const newPast = [...pastRef.current];
    const snapshotToRestore = newPast.pop()!;

    setPast(newPast);
    setFuture((prev) => [currentSnap, ...prev]);

    // Restore state
    if (snapshotToRestore.frames && snapshotToRestore.frames.length > 0) {
      const restoredFrames = snapshotToRestore.frames;
      setFrames(restoredFrames);

      // Validate and resolve activeFrameId
      const targetFrame =
        snapshotToRestore.activeFrameId && restoredFrames.some((f) => f.id === snapshotToRestore.activeFrameId)
          ? restoredFrames.find((f) => f.id === snapshotToRestore.activeFrameId)!
          : restoredFrames[0];
      const resolvedFrameId = targetFrame.id;
      setActiveFrameIdState(resolvedFrameId);

      // Validate and resolve activeLayerId
      let resolvedLayerId: string | null = null;
      if (snapshotToRestore.activeLayerId && targetFrame.layers.some((l) => l.id === snapshotToRestore.activeLayerId)) {
        resolvedLayerId = snapshotToRestore.activeLayerId;
      } else if (targetFrame.activeLayerId && targetFrame.layers.some((l) => l.id === targetFrame.activeLayerId)) {
        resolvedLayerId = targetFrame.activeLayerId;
      } else if (targetFrame.layers.length > 0) {
        resolvedLayerId = targetFrame.layers[targetFrame.layers.length - 1].id;
      } else {
        resolvedLayerId = null;
      }

      if (targetFrame.activeLayerId !== resolvedLayerId) {
        setFrames((prev) =>
          prev.map((f) =>
            f.id === targetFrame.id ? { ...f, activeLayerId: resolvedLayerId } : f
          )
        );
      }
      setActiveLayerIdState(resolvedLayerId);

      if (typeof dbSaveFrames === "function") {
        dbSaveFrames(restoredFrames).catch(console.error);
      }
    } else if (snapshotToRestore.effectStacks || snapshotToRestore.backgrounds) {
      // Legacy snapshot fallback
      setFrames((prev) =>
        prev.map((frame) => {
          const imgLayer = frame.layers.find((l) => l.type === "image");
          const assetId = imgLayer?.type === "image" ? imgLayer.assetId : null;
          let nextLayers = [...frame.layers];
          if (assetId && snapshotToRestore.effectStacks?.[assetId]) {
            nextLayers = nextLayers.map((l) =>
              l.type === "image" && l.assetId === assetId
                ? { ...l, effectStack: snapshotToRestore.effectStacks[assetId] }
                : l
            );
          }
          if (assetId && snapshotToRestore.backgrounds) {
            const bg = snapshotToRestore.backgrounds[assetId] || DEFAULT_BACKGROUND_STATE;
            nextLayers = nextLayers.map((l) =>
              l.type === "generative"
                ? { ...l, backgroundConfig: bg }
                : l
            );
          }
          return { ...frame, layers: nextLayers, updatedAt: Date.now() };
        })
      );
    }

    setSelectedAssetIds(new Set(snapshotToRestore.selectedAssetIds || []));

    // Dual-write legacy persistence
    if (snapshotToRestore.effectStacks && typeof dbSaveEffectStack === "function") {
      for (const [aId, stack] of Object.entries(snapshotToRestore.effectStacks)) {
        dbSaveEffectStack(aId, stack).catch(console.error);
      }
    }
    if (snapshotToRestore.backgrounds && typeof dbSaveBackground === "function") {
      for (const [aId, bg] of Object.entries(snapshotToRestore.backgrounds)) {
        dbSaveBackground(aId, bg).catch(console.error);
      }
    }
    if (typeof dbSaveSessionState === "function") {
      dbSaveSessionState(
        snapshotToRestore.activeFrameId || null,
        snapshotToRestore.activeLayerId || null,
        snapshotToRestore.activeImageId || null,
        projectNameRef.current
      ).catch(console.error);
    }
  }, [createSnapshot]);

  const redo = React.useCallback(() => {
    if (paramInteractionTimerRef.current) {
      clearTimeout(paramInteractionTimerRef.current);
      paramInteractionTimerRef.current = null;
      isParamInteractingRef.current = false;
    }
    if (futureRef.current.length === 0) return;

    const currentSnap = createSnapshot();
    const newFuture = [...futureRef.current];
    const snapshotToRestore = newFuture.shift()!;

    setFuture(newFuture);
    setPast((prev) => {
      const next = [...prev, currentSnap];
      if (next.length > MAX_HISTORY_LIMIT) {
        return next.slice(next.length - MAX_HISTORY_LIMIT);
      }
      return next;
    });

    // Restore state
    if (snapshotToRestore.frames && snapshotToRestore.frames.length > 0) {
      const restoredFrames = snapshotToRestore.frames;
      setFrames(restoredFrames);

      // Validate and resolve activeFrameId
      const targetFrame =
        snapshotToRestore.activeFrameId && restoredFrames.some((f) => f.id === snapshotToRestore.activeFrameId)
          ? restoredFrames.find((f) => f.id === snapshotToRestore.activeFrameId)!
          : restoredFrames[0];
      const resolvedFrameId = targetFrame.id;
      setActiveFrameIdState(resolvedFrameId);

      // Validate and resolve activeLayerId
      let resolvedLayerId: string | null = null;
      if (snapshotToRestore.activeLayerId && targetFrame.layers.some((l) => l.id === snapshotToRestore.activeLayerId)) {
        resolvedLayerId = snapshotToRestore.activeLayerId;
      } else if (targetFrame.activeLayerId && targetFrame.layers.some((l) => l.id === targetFrame.activeLayerId)) {
        resolvedLayerId = targetFrame.activeLayerId;
      } else if (targetFrame.layers.length > 0) {
        resolvedLayerId = targetFrame.layers[targetFrame.layers.length - 1].id;
      } else {
        resolvedLayerId = null;
      }

      if (targetFrame.activeLayerId !== resolvedLayerId) {
        setFrames((prev) =>
          prev.map((f) =>
            f.id === targetFrame.id ? { ...f, activeLayerId: resolvedLayerId } : f
          )
        );
      }
      setActiveLayerIdState(resolvedLayerId);

      if (typeof dbSaveFrames === "function") {
        dbSaveFrames(restoredFrames).catch(console.error);
      }
    } else if (snapshotToRestore.effectStacks || snapshotToRestore.backgrounds) {
      // Legacy snapshot fallback
      setFrames((prev) =>
        prev.map((frame) => {
          const imgLayer = frame.layers.find((l) => l.type === "image");
          const assetId = imgLayer?.type === "image" ? imgLayer.assetId : null;
          let nextLayers = [...frame.layers];
          if (assetId && snapshotToRestore.effectStacks?.[assetId]) {
            nextLayers = nextLayers.map((l) =>
              l.type === "image" && l.assetId === assetId
                ? { ...l, effectStack: snapshotToRestore.effectStacks[assetId] }
                : l
            );
          }
          if (assetId && snapshotToRestore.backgrounds) {
            const bg = snapshotToRestore.backgrounds[assetId] || DEFAULT_BACKGROUND_STATE;
            nextLayers = nextLayers.map((l) =>
              l.type === "generative"
                ? { ...l, backgroundConfig: bg }
                : l
            );
          }
          return { ...frame, layers: nextLayers, updatedAt: Date.now() };
        })
      );
    }

    setSelectedAssetIds(new Set(snapshotToRestore.selectedAssetIds || []));

    // Dual-write legacy persistence
    if (snapshotToRestore.effectStacks && typeof dbSaveEffectStack === "function") {
      for (const [aId, stack] of Object.entries(snapshotToRestore.effectStacks)) {
        dbSaveEffectStack(aId, stack).catch(console.error);
      }
    }
    if (snapshotToRestore.backgrounds && typeof dbSaveBackground === "function") {
      for (const [aId, bg] of Object.entries(snapshotToRestore.backgrounds)) {
        dbSaveBackground(aId, bg).catch(console.error);
      }
    }
    if (typeof dbSaveSessionState === "function") {
      dbSaveSessionState(
        snapshotToRestore.activeFrameId || null,
        snapshotToRestore.activeLayerId || null,
        snapshotToRestore.activeImageId || null,
        projectNameRef.current
      ).catch(console.error);
    }
  }, [createSnapshot]);

  // Global Keyboard Shortcuts (⌘Z, ⌘⇧Z / Ctrl+Y)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isUndo =
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "z";
      const isRedo =
        ((e.metaKey || e.ctrlKey) &&
          e.shiftKey &&
          e.key.toLowerCase() === "z") ||
        (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === "y");

      if (isUndo) {
        e.preventDefault();
        undo();
      } else if (isRedo) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // ---------------------------------------------------------------------------
  // Viewport Methods (Ephemeral)
  // ---------------------------------------------------------------------------

  const setViewport = React.useCallback(
    (
      updater:
        | Partial<ViewportState>
        | ((prev: ViewportState) => ViewportState)
    ) => {
      setViewportState((prev) => {
        if (typeof updater === "function") {
          return updater(prev);
        }
        return { ...prev, ...updater };
      });
    },
    []
  );

  const zoomViewport = React.useCallback((deltaPercent: number) => {
    setViewportState((prev) => ({
      ...prev,
      zoom: clampInteractiveZoom(prev.zoom + deltaPercent),
      fitMode: "custom",
    }));
  }, []);

  const panViewport = React.useCallback((deltaX: number, deltaY: number) => {
    setViewportState((prev) => ({
      ...prev,
      panX: prev.panX + deltaX,
      panY: prev.panY + deltaY,
      fitMode: "custom",
    }));
  }, []);

  const resetViewportFit = React.useCallback(
    (viewportW?: number, viewportH?: number) => {
      if (activeAsset && viewportW && viewportH) {
        const fit = calculateFitZoom(
          viewportW,
          viewportH,
          activeAsset.width,
          activeAsset.height
        );
        setViewportState((prev) => ({
          ...prev,
          zoom: fit.zoom,
          panX: 0,
          panY: 0,
          fitMode: "contain",
        }));
      } else {
        setViewportState((prev) => ({
          ...prev,
          zoom: 100,
          panX: 0,
          panY: 0,
          fitMode: "contain",
        }));
      }
    },
    [activeAsset]
  );

  const resetViewportActual = React.useCallback(() => {
    setViewportState((prev) => ({
      ...prev,
      zoom: 100,
      panX: 0,
      panY: 0,
      fitMode: "1:1",
    }));
  }, []);

  const clearImportError = React.useCallback(() => {
    setImportError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Animation / Timeline Methods
  // ---------------------------------------------------------------------------

  const play = React.useCallback(() => {
    setTimeline((prev) => ({ ...prev, playbackState: "playing" }));
  }, []);

  const pause = React.useCallback(() => {
    setTimeline((prev) => ({ ...prev, playbackState: "paused" }));
  }, []);

  const togglePlayback = React.useCallback(() => {
    setTimeline((prev) => ({
      ...prev,
      playbackState: prev.playbackState === "playing" ? "paused" : "playing",
    }));
  }, []);

  const seek = React.useCallback((time: number) => {
    setTimeline((prev) => ({
      ...prev,
      currentTime: normalizeTimelineTime(time, prev.duration, prev.loop),
    }));
  }, []);

  const setTimelineTime = React.useCallback((time: number) => {
    setTimeline((prev) => ({
      ...prev,
      currentTime: normalizeTimelineTime(time, prev.duration, prev.loop),
    }));
  }, []);

  const stepFrame = React.useCallback((deltaFrames: number) => {
    setTimeline((prev) => {
      const frameDuration = 1 / (prev.fps || 60);
      const newTime = prev.currentTime + deltaFrames * frameDuration;
      return {
        ...prev,
        playbackState: "paused",
        currentTime: normalizeTimelineTime(newTime, prev.duration, prev.loop),
      };
    });
  }, []);

  const setTimelineDuration = React.useCallback((duration: number) => {
    const validDuration = Math.max(0.1, duration);
    setTimeline((prev) => ({
      ...prev,
      duration: validDuration,
      currentTime: Math.min(prev.currentTime, validDuration),
    }));
  }, []);

  const setTimelineLoop = React.useCallback((loop: boolean) => {
    setTimeline((prev) => ({ ...prev, loop }));
  }, []);

  const setTimelineSpeed = React.useCallback((speed: number) => {
    setTimeline((prev) => ({
      ...prev,
      speed: Math.max(0.1, Math.min(10, speed)),
    }));
  }, []);

  const resetTimeline = React.useCallback(() => {
    setTimeline((prev) => ({
      ...prev,
      playbackState: "stopped",
      currentTime: 0,
    }));
  }, []);

  // Cleanup Object URLs ONLY when StudioProvider unmounts
  React.useEffect(() => {
    return () => {
      assetsRef.current.forEach((asset) => revokeAssetUrls(asset));
    };
  }, []);

  const value: StudioContextType = {
    isHydrated,
    projectName,
    setProjectName,

    // Frame & Layer Domain (Stage 1 Source of Truth)
    frames,
    activeFrameId,
    activeFrame,
    activeLayerId,
    activeLayer,
    setActiveFrameId,
    setActiveLayerId,
    selectedEffectInstanceId,

    // Stage 1C Layer & Frame Operations
    addLayer,
    addProceduralLayer,
    updateLayerSource,
    addLayerFromAsset,
    updateLayer,
    reorderLayers,
    removeLayer,
    setFrameDimensions,

    // Transitional Compatibility Adapters (Stage 1A)
    assets,
    activeImageId,
    activeAsset,
    selectedAssetIds,
    effectStacks,
    activeEffectStack,
    backgrounds,
    activeBackground,
    userLooks,
    selectedInstanceId,
    selectedInstance,
    isImporting,
    importError,
    viewport,

    // History & Undo / Redo
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    startOrContinueParamInteraction,
    commitParamInteraction,

    // Animation / Timeline
    timeline,
    play,
    pause,
    togglePlayback,
    seek,
    stepFrame,
    setTimelineDuration,
    setTimelineLoop,
    setTimelineSpeed,
    resetTimeline,
    setTimelineTime,

    // Assets & Selection
    addAssets,
    setActiveImageId,
    removeAsset,
    toggleAssetSelection,
    selectAsset,
    selectAssetRange,
    deselectAsset,
    clearAssetSelection,
    selectAllAssets,

    // Effect Stack
    addEffectToStack,
    updateInstanceParameters,
    resetInstanceParameters,
    toggleInstanceEnabled,
    removeInstanceFromStack,
    removeAllInstancesFromStack,
    reorderEffectStack,
    duplicateInstance,
    selectInstance,

    // Looks
    applyLookToActiveAsset,
    applyLookToAssets,
    saveCurrentStackAsLook,
    deleteUserLook,

    // Procedural Layer Editor & Background
    hasActiveBackground,
    isProceduralEditorOpen,
    setIsProceduralEditorOpen,
    isBackgroundPanelOpen,
    setIsBackgroundPanelOpen,
    updateActiveBackground,
    resetActiveBackground,

    // Viewport
    setViewport,
    zoomViewport,
    panViewport,
    resetViewportFit,
    resetViewportActual,
    clearImportError,

    // Editing Context & Modals
    editorMode,
    setEditorMode,
    isEffectBrowserOpen,
    setIsEffectBrowserOpen,
    theme,
    setTheme,
    appliedLook,
    setAppliedLook,
    clearAppliedLook,
  };

  if (typeof window !== "undefined") {
    (window as any).__studioStore = value;
  }

  return (
    <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
  );
}

export function useStudioStore(): StudioContextType {
  const context = React.useContext(StudioContext);
  if (!context) {
    throw new Error("useStudioStore must be used within a StudioProvider");
  }
  return context;
}
