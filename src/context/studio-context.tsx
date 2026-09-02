import * as React from "react";
import type {
  Asset,
  ViewportState,
  EffectInstance,
  EffectStack,
  StudioHistorySnapshot,
} from "../types/asset";
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
} from "../storage/db";

const MAX_HISTORY_LIMIT = 40;

export interface StudioContextType {
  isHydrated: boolean;
  projectName: string;
  setProjectName: (name: string) => void;
  assets: Asset[];
  activeImageId: string | null;
  activeAsset: Asset | null;
  selectedAssetIds: Set<string>;
  effectStacks: Record<string, EffectStack>;
  activeEffectStack: EffectStack;
  backgrounds: Record<string, BackgroundState>;
  activeBackground: BackgroundState;
  userLooks: Look[];
  selectedInstanceId: string | null;
  selectedInstance: EffectInstance | null;
  isImporting: boolean;
  importError: string | null;
  viewport: ViewportState;

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
    assetId: string,
    effectId: EffectId,
    parameters?: Record<string, unknown>
  ) => void;
  updateInstanceParameters: (
    assetId: string,
    instanceId: string,
    parameters: Record<string, unknown>
  ) => void;
  resetInstanceParameters: (assetId: string, instanceId: string) => void;
  toggleInstanceEnabled: (assetId: string, instanceId: string) => void;
  removeInstanceFromStack: (assetId: string, instanceId: string) => void;
  removeAllInstancesFromStack: (assetId: string) => void;
  reorderEffectStack: (
    assetId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  duplicateInstance: (assetId: string, instanceId: string) => void;
  selectInstance: (assetId: string, instanceId: string | null) => void;

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
  const [activeImageId, setActiveImageIdState] = React.useState<string | null>(
    null
  );
  const [selectedAssetIds, setSelectedAssetIds] = React.useState<Set<string>>(
    () => new Set()
  );
  const [effectStacks, setEffectStacks] = React.useState<
    Record<string, EffectStack>
  >({});
  const [backgrounds, setBackgrounds] = React.useState<
    Record<string, BackgroundState>
  >({});
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

  // History state: past & future
  const [past, setPast] = React.useState<StudioHistorySnapshot[]>([]);
  const [future, setFuture] = React.useState<StudioHistorySnapshot[]>([]);

  // Live refs for stable callbacks & continuous interaction debouncing
  const projectNameRef = React.useRef(projectName);
  const effectStacksRef = React.useRef(effectStacks);
  const backgroundsRef = React.useRef(backgrounds);
  const activeImageIdRef = React.useRef(activeImageId);
  const selectedAssetIdsRef = React.useRef(selectedAssetIds);
  const pastRef = React.useRef(past);
  const futureRef = React.useRef(future);
  const assetsRef = React.useRef(assets);

  React.useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);
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
      // First update of this gesture: record pre-interaction state
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
          setAssets(state.assets);
          setActiveImageIdState(state.activeImageId);
          if (state.projectName) {
            setProjectNameState(state.projectName);
          }
          setEffectStacks(state.effectStacks);
          setBackgrounds(state.backgrounds);
          setUserLooks(state.userLooks);
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
    dbSaveSessionState(activeImageIdRef.current, trimmed).catch(console.error);
  }, []);

  // Derived active asset
  const activeAsset = React.useMemo(() => {
    if (!activeImageId) return null;
    return assets.find((a) => a.id === activeImageId) || null;
  }, [assets, activeImageId]);

  // Derived active stack
  const activeEffectStack = React.useMemo(() => {
    if (!activeImageId) return [];
    return effectStacks[activeImageId] || [];
  }, [activeImageId, effectStacks]);

  // Derived active background
  const activeBackground = React.useMemo(() => {
    if (!activeImageId) return DEFAULT_BACKGROUND_STATE;
    return backgrounds[activeImageId] || DEFAULT_BACKGROUND_STATE;
  }, [activeImageId, backgrounds]);

  // Derived selected instance ID
  const selectedInstanceId = React.useMemo(() => {
    if (!activeImageId) return null;
    return selectedInstanceIds[activeImageId] || null;
  }, [activeImageId, selectedInstanceIds]);

  // Derived selected instance object
  const selectedInstance = React.useMemo(() => {
    if (!selectedInstanceId || !activeEffectStack) return null;
    return (
      activeEffectStack.find(
        (inst) => inst.instanceId === selectedInstanceId
      ) || null
    );
  }, [selectedInstanceId, activeEffectStack]);

  const setActiveImageId = React.useCallback((id: string | null) => {
    setActiveImageIdState(id);
    dbSaveSessionState(id, projectNameRef.current).catch(console.error);
  }, []);

  // ---------------------------------------------------------------------------
  // Multi-Asset Selection Methods
  // ---------------------------------------------------------------------------

  const toggleAssetSelection = React.useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
    setActiveImageIdState(assetId);
    dbSaveSessionState(assetId, projectNameRef.current).catch(console.error);
  }, []);

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
      setActiveImageIdState(assetId);
      dbSaveSessionState(assetId, projectNameRef.current).catch(console.error);
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
      setActiveImageIdState(toAssetId);
      dbSaveSessionState(toAssetId).catch(console.error);
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
          if (asset.rawBlob) {
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
        setActiveImageIdState(newActiveId);
        setSelectedAssetIds(new Set([newActiveId]));
        dbSaveSessionState(newActiveId).catch(console.error);
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
        const filtered = prev.filter((a) => a.id !== id);

        if (activeImageId === id) {
          const nextActive =
            filtered.length > 0 ? filtered[filtered.length - 1].id : null;
          setActiveImageIdState(nextActive);
          dbSaveSessionState(nextActive).catch(console.error);
        }

        return filtered;
      });

      setSelectedAssetIds((prev) => {
        if (prev.has(id)) {
          const next = new Set(prev);
          next.delete(id);
          return next;
        }
        return prev;
      });

      setEffectStacks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setBackgrounds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      setSelectedInstanceIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // Remove from IndexedDB
      dbDeleteAsset(id).catch(console.error);
      dbDeleteEffectStack(id).catch(console.error);
      dbDeleteBackground(id).catch(console.error);
    },
    [activeImageId]
  );

  const selectInstance = React.useCallback(
    (assetId: string, instanceId: string | null) => {
      setSelectedInstanceIds((prev) => ({
        ...prev,
        [assetId]: instanceId,
      }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Effect Stack Mutations (With Undo Recording)
  // ---------------------------------------------------------------------------

  const addEffectToStack = React.useCallback(
    (
      assetId: string,
      effectId: EffectId,
      userParams?: Record<string, unknown>
    ) => {
      recordDiscreteSnapshot();

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

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const nextStack = [...currentStack, newInstance];
        dbSaveEffectStack(assetId, nextStack).catch(console.error);
        return {
          ...prev,
          [assetId]: nextStack,
        };
      });

      setSelectedInstanceIds((prev) => ({
        ...prev,
        [assetId]: newInstance.instanceId,
      }));
    },
    [recordDiscreteSnapshot]
  );

  const updateInstanceParameters = React.useCallback(
    (
      assetId: string,
      instanceId: string,
      updatedParams: Record<string, unknown>
    ) => {
      startOrContinueParamInteraction();

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const nextStack = currentStack.map((inst) => {
          if (inst.instanceId !== instanceId) return inst;
          return {
            ...inst,
            parameters: {
              ...inst.parameters,
              ...updatedParams,
            },
          };
        });

        // Debounced persistence to prevent I/O thrashing during slider drag
        const timerKey = "stack_" + assetId;
        if (debounceTimersRef.current[timerKey]) {
          clearTimeout(debounceTimersRef.current[timerKey]);
        }
        debounceTimersRef.current[timerKey] = setTimeout(() => {
          dbSaveEffectStack(assetId, nextStack).catch(console.error);
        }, 500);

        return {
          ...prev,
          [assetId]: nextStack,
        };
      });
    },
    [startOrContinueParamInteraction]
  );

  const resetInstanceParameters = React.useCallback(
    (assetId: string, instanceId: string) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const nextStack = currentStack.map((inst) => {
          if (inst.instanceId !== instanceId) return inst;
          const def = getEffectDefinition(inst.effectId);
          return {
            ...inst,
            parameters: def ? { ...def.defaultParameters } : {},
          };
        });
        dbSaveEffectStack(assetId, nextStack).catch(console.error);
        return {
          ...prev,
          [assetId]: nextStack,
        };
      });
    },
    [recordDiscreteSnapshot]
  );

  const toggleInstanceEnabled = React.useCallback(
    (assetId: string, instanceId: string) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const nextStack = currentStack.map((inst) => {
          if (inst.instanceId !== instanceId) return inst;
          return {
            ...inst,
            enabled: !inst.enabled,
          };
        });
        dbSaveEffectStack(assetId, nextStack).catch(console.error);
        return {
          ...prev,
          [assetId]: nextStack,
        };
      });
    },
    [recordDiscreteSnapshot]
  );

  const removeInstanceFromStack = React.useCallback(
    (assetId: string, instanceId: string) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const nextStack = currentStack.filter(
          (inst) => inst.instanceId !== instanceId
        );
        dbSaveEffectStack(assetId, nextStack).catch(console.error);
        return {
          ...prev,
          [assetId]: nextStack,
        };
      });

      setSelectedInstanceIds((prev) => {
        const currentSelected = prev[assetId];
        if (currentSelected === instanceId) {
          const currentStack = effectStacksRef.current[assetId] || [];
          const filtered = currentStack.filter(
            (inst) => inst.instanceId !== instanceId
          );
          const nextSelected =
            filtered.length > 0
              ? filtered[filtered.length - 1].instanceId
              : null;
          return { ...prev, [assetId]: nextSelected };
        }
        return prev;
      });
    },
    [recordDiscreteSnapshot]
  );

  const removeAllInstancesFromStack = React.useCallback(
    (assetId: string) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        dbSaveEffectStack(assetId, []).catch(console.error);
        return {
          ...prev,
          [assetId]: [],
        };
      });
      setSelectedInstanceIds((prev) => ({
        ...prev,
        [assetId]: null,
      }));
    },
    [recordDiscreteSnapshot]
  );

  const reorderEffectStack = React.useCallback(
    (assetId: string, fromIndex: number, toIndex: number) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        const currentStack = [...(prev[assetId] || [])];
        if (
          fromIndex < 0 ||
          fromIndex >= currentStack.length ||
          toIndex < 0 ||
          toIndex >= currentStack.length
        ) {
          return prev;
        }

        const [moved] = currentStack.splice(fromIndex, 1);
        currentStack.splice(toIndex, 0, moved);

        dbSaveEffectStack(assetId, currentStack).catch(console.error);

        return {
          ...prev,
          [assetId]: currentStack,
        };
      });
    },
    [recordDiscreteSnapshot]
  );

  const duplicateInstance = React.useCallback(
    (assetId: string, instanceId: string) => {
      recordDiscreteSnapshot();

      setEffectStacks((prev) => {
        const currentStack = prev[assetId] || [];
        const targetIndex = currentStack.findIndex(
          (inst) => inst.instanceId === instanceId
        );
        if (targetIndex === -1) return prev;

        const target = currentStack[targetIndex];
        const dup: EffectInstance = {
          instanceId: crypto.randomUUID(),
          effectId: target.effectId,
          enabled: target.enabled,
          parameters: JSON.parse(JSON.stringify(target.parameters || {})),
        };

        const nextStack = [...currentStack];
        nextStack.splice(targetIndex + 1, 0, dup);

        setSelectedInstanceIds((sprev) => ({
          ...sprev,
          [assetId]: dup.instanceId,
        }));

        dbSaveEffectStack(assetId, nextStack).catch(console.error);

        return {
          ...prev,
          [assetId]: nextStack,
        };
      });
    },
    [recordDiscreteSnapshot]
  );

  // ---------------------------------------------------------------------------
  // Looks / Presets Methods
  // ---------------------------------------------------------------------------

  const applyLookToActiveAsset = React.useCallback(
    (look: Look) => {
      if (!activeImageId) return;
      recordDiscreteSnapshot();

      // Deep clone template instances with brand-new unique instanceIds
      const clonedStack = cloneLookToEffectStack(look);

      setEffectStacks((prev) => {
        dbSaveEffectStack(activeImageId, clonedStack).catch(console.error);
        return {
          ...prev,
          [activeImageId]: clonedStack,
        };
      });

      setSelectedInstanceIds((prev) => ({
        ...prev,
        [activeImageId]:
          clonedStack.length > 0
            ? clonedStack[clonedStack.length - 1].instanceId
            : null,
      }));
    },
    [activeImageId, recordDiscreteSnapshot]
  );

  const applyLookToAssets = React.useCallback(
    (assetIds: string[], look: Look) => {
      if (assetIds.length === 0) return;
      recordDiscreteSnapshot();

      const newStacksMap: Record<string, EffectStack> = {};

      for (const assetId of assetIds) {
        // Deep clone independent effect stack with brand-new unique instanceIds
        const clonedStack = cloneLookToEffectStack(look);
        newStacksMap[assetId] = clonedStack;
        dbSaveEffectStack(assetId, clonedStack).catch(console.error);
      }

      setEffectStacks((prev) => ({
        ...prev,
        ...newStacksMap,
      }));

      setSelectedInstanceIds((prev) => {
        const next = { ...prev };
        for (const assetId of assetIds) {
          const stack = newStacksMap[assetId];
          next[assetId] =
            stack && stack.length > 0
              ? stack[stack.length - 1].instanceId
              : null;
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
        dbSaveUserLook(newLook).catch(console.error);
        return next;
      });
      return newLook;
    },
    [activeEffectStack]
  );

  const deleteUserLook = React.useCallback((lookId: string) => {
    setUserLooks((prev) => {
      const next = prev.filter((l) => l.id !== lookId);
      dbDeleteUserLook(lookId).catch(console.error);
      return next;
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Creative Background Layer Methods
  // ---------------------------------------------------------------------------

  const updateActiveBackground = React.useCallback(
    (updates: Partial<BackgroundState>) => {
      if (!activeImageId) return;
      startOrContinueParamInteraction();

      setBackgrounds((prev) => {
        const currentBg = prev[activeImageId] || DEFAULT_BACKGROUND_STATE;
        const nextBg = { ...currentBg, ...updates };

        // Debounced persistence
        const timerKey = "bg_" + activeImageId;
        if (debounceTimersRef.current[timerKey]) {
          clearTimeout(debounceTimersRef.current[timerKey]);
        }
        debounceTimersRef.current[timerKey] = setTimeout(() => {
          dbSaveBackground(activeImageId, nextBg).catch(console.error);
        }, 500);

        return {
          ...prev,
          [activeImageId]: nextBg,
        };
      });
    },
    [activeImageId, startOrContinueParamInteraction]
  );

  const resetActiveBackground = React.useCallback(() => {
    if (!activeImageId) return;
    recordDiscreteSnapshot();

    setBackgrounds((prev) => {
      dbSaveBackground(activeImageId, DEFAULT_BACKGROUND_STATE).catch(
        console.error
      );
      return {
        ...prev,
        [activeImageId]: DEFAULT_BACKGROUND_STATE,
      };
    });
  }, [activeImageId, recordDiscreteSnapshot]);

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
    setEffectStacks(snapshotToRestore.effectStacks);
    setBackgrounds(snapshotToRestore.backgrounds);
    setActiveImageIdState(snapshotToRestore.activeImageId);
    setSelectedAssetIds(new Set(snapshotToRestore.selectedAssetIds));

    // Synchronize persistence to IndexedDB
    for (const [aId, stack] of Object.entries(snapshotToRestore.effectStacks)) {
      dbSaveEffectStack(aId, stack).catch(console.error);
    }
    for (const [aId, bg] of Object.entries(snapshotToRestore.backgrounds)) {
      dbSaveBackground(aId, bg).catch(console.error);
    }
    dbSaveSessionState(snapshotToRestore.activeImageId).catch(console.error);
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
    setEffectStacks(snapshotToRestore.effectStacks);
    setBackgrounds(snapshotToRestore.backgrounds);
    setActiveImageIdState(snapshotToRestore.activeImageId);
    setSelectedAssetIds(new Set(snapshotToRestore.selectedAssetIds));

    // Synchronize persistence to IndexedDB
    for (const [aId, stack] of Object.entries(snapshotToRestore.effectStacks)) {
      dbSaveEffectStack(aId, stack).catch(console.error);
    }
    for (const [aId, bg] of Object.entries(snapshotToRestore.backgrounds)) {
      dbSaveBackground(aId, bg).catch(console.error);
    }
    dbSaveSessionState(snapshotToRestore.activeImageId).catch(console.error);
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
    updateActiveBackground,
    resetActiveBackground,

    // Viewport
    setViewport,
    zoomViewport,
    panViewport,
    resetViewportFit,
    resetViewportActual,
    clearImportError,
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
