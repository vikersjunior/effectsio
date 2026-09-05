import type { Asset, EffectStack } from "../types/asset";
import type { Look, BackgroundState } from "../types/look";
import type { Frame, ImageLayer } from "../types/frame";
import {
  createDefaultFrame,
  createDefaultGenerativeLayer,
  createImageLayer,
} from "../types/frame";

const DB_NAME = "effectsio_db";
const DB_VERSION = 2;

export interface PersistedAssetRecord {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  thumbnailUrl: string;
  rawBlob: Blob;
  createdAt: number;
}

export interface HydratedProjectState {
  assets: Asset[];
  frames: Frame[];
  activeFrameId: string | null;
  activeLayerId: string | null;
  activeImageId: string | null;
  projectName?: string;
  effectStacks: Record<string, EffectStack>;
  backgrounds: Record<string, BackgroundState>;
  userLooks: Look[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("assets")) {
        db.createObjectStore("assets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("effect_stacks")) {
        db.createObjectStore("effect_stacks", { keyPath: "assetId" });
      }
      if (!db.objectStoreNames.contains("backgrounds")) {
        db.createObjectStore("backgrounds", { keyPath: "assetId" });
      }
      if (!db.objectStoreNames.contains("user_looks")) {
        db.createObjectStore("user_looks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("app_state")) {
        db.createObjectStore("app_state", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("frames")) {
        db.createObjectStore("frames", { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);

      let req: IDBRequest<T> | void;
      try {
        req = operation(store);
      } catch (err) {
        reject(err);
        return;
      }

      tx.oncomplete = () => {
        if (req) {
          resolve(req.result);
        } else {
          resolve(undefined as unknown as T);
        }
      };

      tx.onerror = () => reject(tx.error || new Error(`Transaction error on ${storeName}`));
      tx.onabort = () => reject(tx.error || new Error(`Transaction aborted on ${storeName}`));
    } catch (err) {
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------------
// Assets Storage
// ---------------------------------------------------------------------------

export async function dbSaveAsset(assetRecord: PersistedAssetRecord): Promise<void> {
  return runTransaction("assets", "readwrite", (store) => {
    store.put(assetRecord);
  });
}

export async function dbDeleteAsset(id: string): Promise<void> {
  return runTransaction("assets", "readwrite", (store) => {
    store.delete(id);
  });
}

export async function dbGetAllAssets(): Promise<PersistedAssetRecord[]> {
  return runTransaction<PersistedAssetRecord[]>("assets", "readonly", (store) => {
    return store.getAll();
  });
}

// ---------------------------------------------------------------------------
// Frames Storage (Stage 1 Frame & Layer Architecture)
// ---------------------------------------------------------------------------

export async function dbSaveFrame(frame: Frame): Promise<void> {
  return runTransaction("frames", "readwrite", (store) => {
    store.put(frame);
  });
}

export async function dbSaveFrames(frames: Frame[]): Promise<void> {
  if (!frames || frames.length === 0) return;
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const tx = db.transaction("frames", "readwrite");
      const store = tx.objectStore("frames");
      for (const frame of frames) {
        store.put(frame);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Transaction error on frames"));
      tx.onabort = () => reject(tx.error || new Error("Transaction aborted on frames"));
    } catch (err) {
      reject(err);
    }
  });
}

export async function dbDeleteFrame(id: string): Promise<void> {
  return runTransaction("frames", "readwrite", (store) => {
    store.delete(id);
  });
}

export async function dbGetAllFrames(): Promise<Frame[]> {
  const records = await runTransaction<Frame[]>("frames", "readonly", (store) => {
    return store.getAll();
  });
  return Array.isArray(records) ? records : [];
}

// ---------------------------------------------------------------------------
// Effect Stacks Storage (Preserved for Non-Destructive Legacy Transition)
// ---------------------------------------------------------------------------

export async function dbSaveEffectStack(assetId: string, stack: EffectStack): Promise<void> {
  return runTransaction("effect_stacks", "readwrite", (store) => {
    store.put({ assetId, stack });
  });
}

export async function dbDeleteEffectStack(assetId: string): Promise<void> {
  return runTransaction("effect_stacks", "readwrite", (store) => {
    store.delete(assetId);
  });
}

export async function dbGetAllEffectStacks(): Promise<Record<string, EffectStack>> {
  const records = await runTransaction<Array<{ assetId: string; stack: EffectStack }>>(
    "effect_stacks",
    "readonly",
    (store) => store.getAll()
  );

  const result: Record<string, EffectStack> = {};
  if (Array.isArray(records)) {
    for (const record of records) {
      if (record && record.assetId && Array.isArray(record.stack)) {
        result[record.assetId] = record.stack;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Backgrounds Storage (Preserved for Non-Destructive Legacy Transition)
// ---------------------------------------------------------------------------

export async function dbSaveBackground(assetId: string, background: BackgroundState): Promise<void> {
  return runTransaction("backgrounds", "readwrite", (store) => {
    store.put({ assetId, background });
  });
}

export async function dbDeleteBackground(assetId: string): Promise<void> {
  return runTransaction("backgrounds", "readwrite", (store) => {
    store.delete(assetId);
  });
}

export async function dbGetAllBackgrounds(): Promise<Record<string, BackgroundState>> {
  const records = await runTransaction<Array<{ assetId: string; background: BackgroundState }>>(
    "backgrounds",
    "readonly",
    (store) => store.getAll()
  );

  const result: Record<string, BackgroundState> = {};
  if (Array.isArray(records)) {
    for (const record of records) {
      if (record && record.assetId && record.background) {
        result[record.assetId] = record.background;
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// User Looks Storage
// ---------------------------------------------------------------------------

export async function dbSaveUserLook(look: Look): Promise<void> {
  return runTransaction("user_looks", "readwrite", (store) => {
    store.put(look);
  });
}

export async function dbDeleteUserLook(lookId: string): Promise<void> {
  return runTransaction("user_looks", "readwrite", (store) => {
    store.delete(lookId);
  });
}

export async function dbGetAllUserLooks(): Promise<Look[]> {
  const records = await runTransaction<Look[]>("user_looks", "readonly", (store) => {
    return store.getAll();
  });
  return Array.isArray(records) ? records : [];
}

// ---------------------------------------------------------------------------
// Session State Storage
// ---------------------------------------------------------------------------

export interface PersistedSessionState {
  activeFrameId: string | null;
  activeLayerId: string | null;
  activeImageId: string | null;
  projectName?: string;
}

export async function dbSaveSessionState(
  activeFrameId: string | null,
  activeLayerId: string | null,
  activeImageId: string | null,
  projectName?: string
): Promise<void>;
export async function dbSaveSessionState(
  activeImageIdOrFrameId: string | null,
  activeLayerIdOrProjectName?: string | null,
  projectName?: string
): Promise<void>;
export async function dbSaveSessionState(
  arg1: string | null,
  arg2?: string | null,
  arg3?: string | null,
  arg4?: string
): Promise<void> {
  let activeFrameId: string | null = null;
  let activeLayerId: string | null = null;
  let activeImageId: string | null = null;
  let resolvedProjectName = "Project Name";

  if (typeof arg4 === "string" || (arg3 !== undefined && arg2 !== undefined)) {
    // Called with (activeFrameId, activeLayerId, activeImageId, projectName)
    activeFrameId = arg1;
    activeLayerId = arg2 || null;
    activeImageId = arg3 || null;
    resolvedProjectName = arg4 || "Project Name";
  } else if (typeof arg3 === "string") {
    // Called with (activeFrameId, activeLayerId, projectName)
    activeFrameId = arg1;
    activeLayerId = arg2 || null;
    activeImageId = arg1;
    resolvedProjectName = arg3;
  } else if (typeof arg2 === "string") {
    // Called with (activeImageId, projectName)
    activeImageId = arg1;
    activeFrameId = arg1;
    resolvedProjectName = arg2;
  } else {
    activeImageId = arg1;
    activeFrameId = arg1;
  }

  return runTransaction("app_state", "readwrite", (store) => {
    store.put({
      key: "session",
      activeFrameId,
      activeLayerId,
      activeImageId,
      projectName: resolvedProjectName,
      updatedAt: Date.now(),
    });
  });
}

export async function dbGetSessionState(): Promise<PersistedSessionState | null> {
  const record = await runTransaction<{
    key: string;
    activeFrameId?: string | null;
    activeLayerId?: string | null;
    activeImageId?: string | null;
    projectName?: string;
  } | undefined>("app_state", "readonly", (store) => store.get("session"));

  if (!record) return null;
  return {
    activeFrameId: record.activeFrameId || record.activeImageId || null,
    activeLayerId: record.activeLayerId || null,
    activeImageId: record.activeImageId || record.activeFrameId || null,
    projectName: record.projectName,
  };
}

// ---------------------------------------------------------------------------
// Robust Hydration & Recovery with Idempotent Legacy Migration
// ---------------------------------------------------------------------------

export async function loadHydratedProject(): Promise<HydratedProjectState> {
  try {
    const [assetRecords, effectStacks, backgrounds, userLooks, session, existingFrames] = await Promise.all([
      dbGetAllAssets().catch(() => []),
      dbGetAllEffectStacks().catch(() => ({} as Record<string, EffectStack>)),
      dbGetAllBackgrounds().catch(() => ({} as Record<string, BackgroundState>)),
      dbGetAllUserLooks().catch(() => []),
      dbGetSessionState().catch(() => null),
      dbGetAllFrames().catch(() => []),
    ]);

    // Hydrate runtime Assets from persisted Blobs with fresh Object URLs
    const validAssets: Asset[] = [];

    for (const record of assetRecords) {
      try {
        if (!record || !record.id || !record.rawBlob) continue;

        const objectUrl = URL.createObjectURL(record.rawBlob);

        validAssets.push({
          id: record.id,
          filename: record.filename || "untitled",
          mimeType: record.mimeType || "image/png",
          fileSize: record.fileSize || 0,
          objectUrl,
          rawBlob: record.rawBlob,
          width: record.width || 800,
          height: record.height || 600,
          aspectRatio: record.aspectRatio || (record.width && record.height ? record.width / record.height : 1),
          thumbnailUrl: record.thumbnailUrl || objectUrl,
          createdAt: record.createdAt || Date.now(),
        });
      } catch (err) {
        console.warn(`Failed to hydrate asset record ${record?.id}:`, err);
      }
    }

    let frames: Frame[] = Array.isArray(existingFrames) ? existingFrames : [];
    let activeFrameId: string | null = null;
    let activeLayerId: string | null = null;

    if (frames.length === 0) {
      // Idempotent Migration / Synthesis required
      if (validAssets.length > 0) {
        // Legacy migration: 1 Asset -> 1 Frame -> GenerativeLayer (index 0) + ImageLayer (index 1)
        frames = validAssets.map((asset) => {
          const assetBg = backgrounds[asset.id] ? { ...backgrounds[asset.id] } : undefined;
          const baseGenerative = createDefaultGenerativeLayer(assetBg);
          const assetStack = effectStacks[asset.id] ? [...effectStacks[asset.id]] : [];
          const imageLayer = createImageLayer(asset.id, asset.filename, assetStack, "contain");

          return {
            id: `frame-${asset.id}`,
            name: asset.filename || "Frame",
            dimensions: {
              width: asset.width || 1080,
              height: asset.height || 1080,
              presetId: null,
            },
            layers: [baseGenerative, imageLayer],
            activeLayerId: imageLayer.id,
            createdAt: asset.createdAt || Date.now(),
            updatedAt: Date.now(),
          };
        });

        // Determine active frame from legacy session.activeImageId
        const targetAssetId =
          session?.activeImageId && validAssets.some((a) => a.id === session.activeImageId)
            ? session.activeImageId
            : validAssets[0].id;

        const matchingFrame = frames.find((f) => f.id === `frame-${targetAssetId}`) || frames[0];
        activeFrameId = matchingFrame.id;
        activeLayerId = matchingFrame.activeLayerId || matchingFrame.layers[1]?.id || matchingFrame.layers[0].id;
      } else {
        // Fresh project: synthesize default 1080x1080 1:1 Frame with GenerativeLayer at index 0
        const defaultFrame = createDefaultFrame();
        frames = [defaultFrame];
        activeFrameId = defaultFrame.id;
        activeLayerId = defaultFrame.layers[0].id;
      }

      // Persist synthesized frames to IndexedDB frames store
      try {
        await dbSaveFrames(frames);
        await dbSaveSessionState(activeFrameId, activeLayerId, session?.projectName || "Project Name");
      } catch (saveErr) {
        console.warn("Non-fatal: failed to persist initial frames to IndexedDB:", saveErr);
      }
    } else {
      // Existing frames found
      const matchingFrame = session?.activeFrameId
        ? frames.find((f) => f.id === session.activeFrameId)
        : null;
      const activeFrame = matchingFrame || frames[0];
      activeFrameId = activeFrame.id;

      if (session?.activeLayerId && activeFrame.layers.some((l) => l.id === session.activeLayerId)) {
        activeLayerId = session.activeLayerId;
      } else {
        activeLayerId = activeFrame.activeLayerId || activeFrame.layers[1]?.id || activeFrame.layers[0].id;
      }
    }

    // Derive activeImageId safely for legacy compatibility
    const currentActiveFrame = frames.find((f) => f.id === activeFrameId);
    const currentActiveLayer = currentActiveFrame?.layers.find((l) => l.id === activeLayerId);
    let resolvedActiveImageId: string | null = null;
    if (currentActiveLayer?.type === "image") {
      resolvedActiveImageId = currentActiveLayer.assetId;
    } else {
      const firstImg = currentActiveFrame?.layers.find((l): l is ImageLayer => l.type === "image");
      resolvedActiveImageId = firstImg ? firstImg.assetId : (validAssets[0]?.id || null);
    }

    // Populate legacy effectStacks and backgrounds from frames if needed
    const mergedEffectStacks = { ...effectStacks };
    const mergedBackgrounds = { ...backgrounds };
    for (const frame of frames) {
      const baseGen = frame.layers[0];
      for (const layer of frame.layers) {
        if (layer.type === "image") {
          if (!mergedEffectStacks[layer.assetId]) {
            mergedEffectStacks[layer.assetId] = layer.effectStack;
          }
          if (baseGen && baseGen.type === "generative" && !mergedBackgrounds[layer.assetId]) {
            mergedBackgrounds[layer.assetId] = baseGen.backgroundConfig;
          }
        }
      }
    }

    return {
      assets: validAssets,
      frames,
      activeFrameId,
      activeLayerId,
      activeImageId: resolvedActiveImageId,
      projectName: session?.projectName || "Project Name",
      effectStacks: mergedEffectStacks,
      backgrounds: mergedBackgrounds,
      userLooks: userLooks || [],
    };
  } catch (error) {
    console.error("Critical failure during IndexedDB project hydration, recovering with default state:", error);
    const defaultFrame = createDefaultFrame();
    return {
      assets: [],
      frames: [defaultFrame],
      activeFrameId: defaultFrame.id,
      activeLayerId: defaultFrame.layers[0].id,
      activeImageId: null,
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    };
  }
}

