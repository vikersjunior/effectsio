import type { Asset, EffectStack } from "../types/asset";
import type { Look, BackgroundState } from "../types/look";

const DB_NAME = "effectsio_db";
const DB_VERSION = 1;

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
  activeImageId: string | null;
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
// Effect Stacks Storage
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
// Backgrounds Storage
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

export async function dbSaveSessionState(activeImageId: string | null): Promise<void> {
  return runTransaction("app_state", "readwrite", (store) => {
    store.put({ key: "session", activeImageId, updatedAt: Date.now() });
  });
}

export async function dbGetSessionState(): Promise<{ activeImageId: string | null } | null> {
  const record = await runTransaction<{ key: string; activeImageId: string | null } | undefined>(
    "app_state",
    "readonly",
    (store) => store.get("session")
  );
  return record ? { activeImageId: record.activeImageId } : null;
}

// ---------------------------------------------------------------------------
// Robust Hydration & Recovery
// ---------------------------------------------------------------------------

export async function loadHydratedProject(): Promise<HydratedProjectState> {
  try {
    const [assetRecords, effectStacks, backgrounds, userLooks, session] = await Promise.all([
      dbGetAllAssets().catch(() => []),
      dbGetAllEffectStacks().catch(() => ({})),
      dbGetAllBackgrounds().catch(() => ({})),
      dbGetAllUserLooks().catch(() => []),
      dbGetSessionState().catch(() => null),
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

    // Determine activeImageId safely
    let resolvedActiveImageId: string | null = null;
    if (session?.activeImageId && validAssets.some((a) => a.id === session.activeImageId)) {
      resolvedActiveImageId = session.activeImageId;
    } else if (validAssets.length > 0) {
      resolvedActiveImageId = validAssets[0].id;
    }

    return {
      assets: validAssets,
      activeImageId: resolvedActiveImageId,
      effectStacks: effectStacks || {},
      backgrounds: backgrounds || {},
      userLooks: userLooks || [],
    };
  } catch (error) {
    console.error("Critical failure during IndexedDB project hydration, recovering with empty state:", error);
    return {
      assets: [],
      activeImageId: null,
      effectStacks: {},
      backgrounds: {},
      userLooks: [],
    };
  }
}
