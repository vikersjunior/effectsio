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
  GenerativeLayer,
  BlendMode,
  FrameDimensions,
  FrameSizePreset,
} from "../types/frame";
import {
  createDefaultFrame,
  createDefaultGenerativeLayer,
  createImageLayer,
} from "../types/frame";
import type { Look, LookCategory, BackgroundState } from "../types/look";
import { DEFAULT_BACKGROUND_STATE } from "../types/look";
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

  // Stage 1C Layer & Frame Operations
  addLayerFromAsset: (assetId: string) => ImageLayer | null;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
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

  // Creative Background Layer
  updateActiveBackground: (updates: Partial<BackgroundState>) => void;
  resetActiveBackground: () => void;

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
  const [isBackgroundPanelOpen, setIsBackgroundPanelOpen] = React.useState(false);
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

  // Derived active frame
  const activeFrame = React.useMemo((): Frame | null => {
    if (!activeFrameId) return frames[0] || null;
    return frames.find((f) => f.id === activeFrameId) || frames[0] || null;
  }, [frames, activeFrameId]);

  // Derived active layer (strictly belongs to activeFrame)
  const activeLayer = React.useMemo((): Layer | null => {
    if (!activeFrame) return null;
    if (activeLayerId) {
      const found = activeFrame.layers.find((l) => l.id === activeLayerId);
      if (found) return found;
    }
    const firstImage = activeFrame.layers.find((l): l is ImageLayer => l.type === "image");
    return firstImage || activeFrame.layers[0] || null;
  }, [activeFrame, activeLayerId]);

  // Transitional Compatibility Getters (Stage 1A)
  const activeImageId = React.useMemo((): string | null => {
    if (!activeLayer) return null;
    if (activeLayer.type === "image") return activeLayer.assetId;
    const firstImage = activeFrame?.layers.find((l): l is ImageLayer => l.type === "image");
    return firstImage ? firstImage.assetId : null;
  }, [activeLayer, activeFrame]);

  const activeAsset = React.useMemo((): Asset | null => {
    if (!activeImageId) return null;
    return assets.find((a) => a.id === activeImageId) || null;
  }, [assets, activeImageId]);

  const activeEffectStack = React.useMemo((): EffectStack => {
    if (!activeLayer) return [];
    if (activeLayer.type === "image") {
      return activeLayer.effectStack || [];
    }
    const firstImage = activeFrame?.layers.find((l): l is ImageLayer => l.type === "image");
    return firstImage ? firstImage.effectStack || [] : [];
  }, [activeLayer, activeFrame]);

  const activeBackground = React.useMemo((): BackgroundState => {
    if (!activeFrame) return DEFAULT_BACKGROUND_STATE;
    const genLayer = activeFrame.layers.find((l): l is GenerativeLayer => l.type === "generative");
    return genLayer?.backgroundConfig || DEFAULT_BACKGROUND_STATE;
  }, [activeFrame]);

  const hasActiveBackground = React.useMemo((): boolean => {
    if (!activeFrame) return false;
    const genLayer = activeFrame.layers.find((l): l is GenerativeLayer => l.type === "generative");
    return Boolean(genLayer && genLayer.visible);
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
      const genLayer = frame.layers.find((l): l is GenerativeLayer => l.type === "generative");
      if (genLayer && genLayer.visible && genLayer.backgroundConfig) {
        for (const layer of frame.layers) {
          if (layer.type === "image" && layer.assetId) {
            map[layer.assetId] = genLayer.backgroundConfig;
          }
        }
      }
    }
    return map;
  }, [frames]);

  const selectedInstanceId = React.useMemo((): string | null => {
    if (selectedEffectInstanceId) return selectedEffectInstanceId;
    if (!activeImageId) return null;
    return selectedInstanceIds[activeImageId] || null;
  }, [selectedEffectInstanceId, activeImageId, selectedInstanceIds]);

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
            const resolvedFrameId = state.activeFrameId || state.frames[0].id;
            setActiveFrameIdState(resolvedFrameId);
            const targetFrame = state.frames.find((f) => f.id === resolvedFrameId) || state.frames[0];
            const resolvedLayerId =
              state.activeLayerId && targetFrame.layers.some((l) => l.id === state.activeLayerId)
                ? state.activeLayerId
                : targetFrame.activeLayerId || targetFrame.layers[1]?.id || targetFrame.layers[0].id;
            setActiveLayerIdState(resolvedLayerId);
          } else if (state.assets && state.assets.length > 0) {
            // Defensive synthesis for test mocks that return assets without frames
            const synthesizedFrames: Frame[] = state.assets.map((asset) => {
              const assetBg = state.backgrounds?.[asset.id];
              const baseGen = createDefaultGenerativeLayer(assetBg);
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
                layers: [baseGen, imgLayer],
                activeLayerId: imgLayer.id,
                createdAt: asset.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
            });
            setFrames(synthesizedFrames);
            const targetAssetId = state.activeImageId || state.assets[0].id;
            const initialFrame = synthesizedFrames.find((f) => f.id === `frame-${targetAssetId}`) || synthesizedFrames[0];
            setActiveFrameIdState(initialFrame.id);
            setActiveLayerIdState(initialFrame.activeLayerId || initialFrame.layers[1]?.id || initialFrame.layers[0].id);
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

  // Frame and Layer Setters (Stage 1 Source of Truth)
  const setActiveFrameId = React.useCallback((id: string | null) => {
    setActiveFrameIdState(id);
    if (id) {
      const frame = framesRef.current.find((f) => f.id === id);
      if (frame) {
        const nextLayerId =
          frame.activeLayerId ||
          frame.layers.find((l) => l.type === "image")?.id ||
          frame.layers[0]?.id ||
          null;
        setActiveLayerIdState(nextLayerId);
        const imgLayer = frame.layers.find((l): l is ImageLayer => l.type === "image");
        if (typeof dbSaveSessionState === "function") {
          dbSaveSessionState(
            id,
            nextLayerId,
            imgLayer?.assetId || null,
            projectNameRef.current
          ).catch(console.error);
        }
      }
    }
  }, []);

  const setActiveLayerId = React.useCallback((id: string | null) => {
    setActiveLayerIdState(id);
    if (activeFrameRef.current && typeof dbSaveSessionState === "function") {
      const frame = activeFrameRef.current;
      const targetLayer = frame.layers.find((l) => l.id === id);
      const assetId = targetLayer?.type === "image" ? targetLayer.assetId : null;
      dbSaveSessionState(
        frame.id,
        id,
        assetId,
        projectNameRef.current
      ).catch(console.error);
    }
  }, []);

  // Compatibility setter for activeImageId
  const setActiveImageId = React.useCallback((id: string | null) => {
    if (!id) {
      setActiveLayerIdState(null);
      return;
    }

    const currentFrames = framesRef.current;
    const targetFrame = currentFrames.find((f) =>
      f.layers.some((l) => l.type === "image" && l.assetId === id)
    );

    if (targetFrame) {
      setActiveFrameIdState(targetFrame.id);
      const targetLayer = targetFrame.layers.find(
        (l) => l.type === "image" && l.assetId === id
      );
      if (targetLayer) {
        setActiveLayerIdState(targetLayer.id);
      }
      if (typeof dbSaveSessionState === "function") {
        dbSaveSessionState(
          targetFrame.id,
          targetLayer?.id || null,
          id,
          projectNameRef.current
        ).catch(console.error);
      }
    }
  }, []);

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

  const updateLayer = React.useCallback(
    (layerId: string, updates: Partial<Layer>) => {
      recordDiscreteSnapshot();

      setFrames((prev) => {
        const activeFId = activeFrameIdRef.current;
        return prev.map((frame) => {
          if (frame.id !== activeFId) return frame;
          const layerIdx = frame.layers.findIndex((l) => l.id === layerId);
          if (layerIdx === -1) return frame;

          const current = frame.layers[layerIdx];
          let updatedLayer: Layer;

          if (layerIdx === 0 && current.type === "generative") {
            const genUpdates = updates as Partial<GenerativeLayer>;
            const nextBgConfig = genUpdates.backgroundConfig
              ? { ...current.backgroundConfig, ...genUpdates.backgroundConfig }
              : current.backgroundConfig;

            updatedLayer = {
              ...current,
              ...updates,
              type: "generative",
              backgroundConfig: nextBgConfig,
              updatedAt: Date.now(),
            };
          } else if (current.type === "image") {
            updatedLayer = {
              ...current,
              ...updates,
              type: "image",
              updatedAt: Date.now(),
            };
          } else {
            updatedLayer = {
              ...current,
              ...updates,
              updatedAt: Date.now(),
            } as Layer;
          }

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

          // Hard Invariant: index 0 is GenerativeLayer (locked background)
          // Image layers are only reorderable at indices >= 1
          if (fromIndex <= 0 || toIndex <= 0) {
            console.warn("Cannot reorder locked GenerativeLayer at index 0");
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

          // Verify invariant
          if (newLayers[0].type !== "generative") {
            console.warn("Reorder rejected: index 0 must be GenerativeLayer");
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

          // Invariant: index 0 GenerativeLayer cannot be deleted
          if (layerIdx === 0 || frame.layers[layerIdx].type === "generative") {
            console.warn("Cannot remove base GenerativeLayer");
            return frame;
          }

          const newLayers = frame.layers.filter((l) => l.id !== layerId);
          let nextActiveLayerId = frame.activeLayerId;
          if (frame.activeLayerId === layerId) {
            const fallback = newLayers[Math.max(0, layerIdx - 1)] || newLayers[0];
            nextActiveLayerId = fallback?.id || null;
            setActiveLayerIdState(nextActiveLayerId);
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
      setActiveImageId(assetId);
    },
    [setActiveImageId]
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
      setActiveImageId(assetId);
    },
    [setActiveImageId]
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
      setActiveImageId(toAssetId);
    },
    [selectAsset, setActiveImageId]
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
            const baseGen =
              (updatedFrames[0].layers[0] as GenerativeLayer) ||
              createDefaultGenerativeLayer();
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
              layers: [baseGen, firstLayer],
              activeLayerId: firstLayer.id,
              updatedAt: Date.now(),
            };

            const otherFrames = newlyCreated.slice(1).map((asset) => {
              const gen = createDefaultGenerativeLayer();
              const layer = createImageLayer(asset.id, asset.filename, [], "contain");
              return {
                id: `frame-${asset.id}`,
                name: asset.filename,
                dimensions: {
                  width: asset.width || 1080,
                  height: asset.height || 1080,
                  presetId: null,
                },
                layers: [gen, layer],
                activeLayerId: layer.id,
                createdAt: asset.createdAt || Date.now(),
                updatedAt: Date.now(),
              };
            });

            updatedFrames = [firstFrame, ...otherFrames];
          } else {
            const newFrames = newlyCreated.map((asset) => {
              const gen = createDefaultGenerativeLayer();
              const layer = createImageLayer(asset.id, asset.filename, [], "contain");
              return {
                id: `frame-${asset.id}`,
                name: asset.filename,
                dimensions: {
                  width: asset.width || 1080,
                  height: asset.height || 1080,
                  presetId: null,
                },
                layers: [gen, layer],
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
              (l) => !(l.type === "image" && l.assetId === id)
            );
            return {
              ...f,
              layers: nextLayers,
              activeLayerId:
                f.activeLayerId && !nextLayers.some((l) => l.id === f.activeLayerId)
                  ? nextLayers.find((l) => l.type === "image")?.id || nextLayers[0]?.id || null
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
          nextActiveFrame.activeLayerId ||
          nextActiveFrame.layers.find((l) => l.type === "image")?.id ||
          nextActiveFrame.layers[0]?.id ||
          null;
        setActiveLayerIdState(nextActiveLayerId);

        if (typeof dbSaveFrames === "function") {
          dbSaveFrames(updatedFrames).catch(console.error);
        }
        if (typeof dbSaveSessionState === "function") {
          const activeImg = nextActiveFrame.layers.find((l): l is ImageLayer => l.type === "image");
          dbSaveSessionState(
            nextActiveFrame.id,
            nextActiveLayerId,
            activeImg?.assetId || null,
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
          const li = frame.layers.findIndex(
            (l) => l.id === targetId || (l.type === "image" && l.assetId === targetId)
          );
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
            layerIndex = frame.layers.findIndex(
              (l) => l.id === activeLayerRef.current?.id || l.type === "image"
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

        const assetId = targetLayer.type === "image" ? targetLayer.assetId : targetId;

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
            if (layer.type === "image" && assetIds.includes(layer.assetId)) {
              hasChange = true;
              return {
                ...layer,
                effectStack: newStacksMap[layer.assetId] || [],
              };
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
        const genLayerIndex = targetFrame.layers.findIndex((l) => l.type === "generative");
        if (genLayerIndex === -1) return prev;

        const genLayer = targetFrame.layers[genLayerIndex] as GenerativeLayer;
        const currentBg = genLayer.backgroundConfig || DEFAULT_BACKGROUND_STATE;
        const nextBg: BackgroundState = {
          ...currentBg,
          ...updates,
          type: updates.type || currentBg.type,
        };

        const updatedGenLayer: GenerativeLayer = {
          ...genLayer,
          visible: true,
          backgroundMode: nextBg.type,
          backgroundConfig: nextBg,
        };

        const nextLayers = [...targetFrame.layers];
        nextLayers[genLayerIndex] = updatedGenLayer;

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
          const activeImg = targetFrame.layers.find((l): l is ImageLayer => l.type === "image");
          if (activeImg && typeof dbSaveBackground === "function") {
            Promise.resolve(dbSaveBackground(activeImg.assetId, nextBg)).catch(console.error);
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
    setIsBackgroundPanelOpen(false);

    setFrames((prev) => {
      const frameIndex = prev.findIndex((f) => f.id === activeFrame.id);
      if (frameIndex === -1) return prev;
      const targetFrame = prev[frameIndex];
      const genLayerIndex = targetFrame.layers.findIndex((l) => l.type === "generative");
      if (genLayerIndex === -1) return prev;

      const genLayer = targetFrame.layers[genLayerIndex] as GenerativeLayer;
      const updatedGenLayer: GenerativeLayer = {
        ...genLayer,
        visible: false,
        backgroundMode: "transparent",
        backgroundConfig: { ...DEFAULT_BACKGROUND_STATE, type: "transparent" },
      };

      const nextLayers = [...targetFrame.layers];
      nextLayers[genLayerIndex] = updatedGenLayer;

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
      const activeImg = targetFrame.layers.find((l): l is ImageLayer => l.type === "image");
      if (activeImg && typeof dbDeleteBackground === "function") {
        dbDeleteBackground(activeImg.assetId).catch(console.error);
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
      setFrames(snapshotToRestore.frames);
      if (snapshotToRestore.activeFrameId !== undefined) {
        setActiveFrameIdState(snapshotToRestore.activeFrameId);
      }
      if (snapshotToRestore.activeLayerId !== undefined) {
        setActiveLayerIdState(snapshotToRestore.activeLayerId);
      }
      if (typeof dbSaveFrames === "function") {
        dbSaveFrames(snapshotToRestore.frames).catch(console.error);
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
      setFrames(snapshotToRestore.frames);
      if (snapshotToRestore.activeFrameId !== undefined) {
        setActiveFrameIdState(snapshotToRestore.activeFrameId);
      }
      if (snapshotToRestore.activeLayerId !== undefined) {
        setActiveLayerIdState(snapshotToRestore.activeLayerId);
      }
      if (typeof dbSaveFrames === "function") {
        dbSaveFrames(snapshotToRestore.frames).catch(console.error);
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

    // Background
    hasActiveBackground,
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
