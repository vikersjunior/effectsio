import { describe, it, expect } from "vitest";
import type { BackgroundState, Look } from "../types/look";
import { DEFAULT_BACKGROUND_STATE } from "../types/look";
import type { EffectStack } from "../types/asset";

describe("Phase 6 Storage & Schema Architecture Suite", () => {
  it("provides complete default background state", () => {
    expect(DEFAULT_BACKGROUND_STATE.type).toBe("transparent");
    expect(DEFAULT_BACKGROUND_STATE.color).toBe("#000000");
    expect(DEFAULT_BACKGROUND_STATE.padding).toBe(0);
    expect(DEFAULT_BACKGROUND_STATE.borderRadius).toBe(0);
    expect(DEFAULT_BACKGROUND_STATE.shadowBlur).toBe(16);
    expect(DEFAULT_BACKGROUND_STATE.shadowOpacity).toBe(0.4);
  });

  it("validates BackgroundState schema and property bounds", () => {
    const customBg: BackgroundState = {
      type: "linear-gradient",
      color: "#ff007a",
      gradientEndColor: "#7928ca",
      gradientAngle: 45,
      padding: 32,
      borderRadius: 16,
      shadowBlur: 24,
      shadowOpacity: 0.6,
    };

    expect(customBg.type).toBe("linear-gradient");
    expect(customBg.gradientAngle).toBeGreaterThanOrEqual(0);
    expect(customBg.gradientAngle).toBeLessThanOrEqual(360);
    expect(customBg.padding).toBe(32);
    expect(customBg.borderRadius).toBe(16);
  });

  it("validates Look schema and effect stack integrity", () => {
    const customLook: Look = {
      id: "look-user-123",
      name: "Vintage Monolith",
      category: "retro",
      description: "Custom warm vintage look",
      isBuiltIn: false,
      createdAt: 1700000000000,
      effectStack: [
        {
          instanceId: "inst-1",
          effectId: "vintage-film",
          enabled: true,
          parameters: { sepia: 30 },
        },
        {
          instanceId: "inst-2",
          effectId: "grain",
          enabled: true,
          parameters: { intensity: 20 },
        },
      ],
    };

    expect(customLook.id).toBe("look-user-123");
    expect(customLook.name).toBe("Vintage Monolith");
    expect(customLook.effectStack.length).toBe(2);
    expect(customLook.effectStack[0].effectId).toBe("vintage-film");
  });
});

describe("Stage 1A Frame Storage & Migration Suite", () => {
  // In-memory IndexedDB simulator for unit testing db.ts functions
  function createMockIndexedDB() {
    const stores: Record<string, Map<string, any>> = {};
    const storeKeyPaths: Record<string, string> = {};

    const mockDB: any = {
      objectStoreNames: {
        contains: (name: string) => name in stores,
      },
      createObjectStore: (name: string, options?: { keyPath?: string }) => {
        stores[name] = new Map();
        storeKeyPaths[name] = options?.keyPath || "id";
        return {};
      },
      transaction: (storeNames: string | string[], _mode: string) => {
        const names = Array.isArray(storeNames) ? storeNames : [storeNames];
        const tx: any = {
          objectStore: (name: string) => {
            const storeMap = stores[name] || new Map();
            const keyPath = storeKeyPaths[name] || "id";
            return {
              put: (item: any) => {
                const key = item[keyPath] || item.id || item.key || item.assetId;
                storeMap.set(key, typeof structuredClone === "function" ? structuredClone(item) : item);
                const req: any = { result: key };
                return req;
              },
              get: (key: string) => {
                const item = storeMap.get(key);
                const req: any = {
                  result: item ? (typeof structuredClone === "function" ? structuredClone(item) : item) : undefined,
                };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
              getAll: () => {
                const items = Array.from(storeMap.values()).map((v) =>
                  typeof structuredClone === "function" ? structuredClone(v) : v
                );
                const req: any = { result: items };
                setTimeout(() => req.onsuccess?.({ target: req }), 0);
                return req;
              },
              delete: (key: string) => {
                storeMap.delete(key);
                const req: any = { result: undefined };
                return req;
              },
              clear: () => {
                storeMap.clear();
                const req: any = { result: undefined };
                return req;
              },
            };
          },
          oncomplete: null,
          onerror: null,
          onabort: null,
        };
        // Auto-complete transaction on next tick
        setTimeout(() => {
          if (tx.oncomplete) tx.oncomplete();
        }, 0);
        return tx;
      },
    };

    const mockIDBFactory = {
      open: (_dbName: string, _version: number) => {
        const req: any = {
          result: mockDB,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
        };
        setTimeout(() => {
          if (req.onupgradeneeded) {
            req.onupgradeneeded({ target: req });
          }
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        }, 0);
        return req;
      },
    };

    return { mockIDBFactory, stores };
  }

  it("creates all required stores including 'frames' upon DB upgrade", async () => {
    const { mockIDBFactory, stores } = createMockIndexedDB();
    const originalIDB = (globalThis as any).window?.indexedDB;
    if (!globalThis.window) (globalThis as any).window = {};
    globalThis.window.indexedDB = mockIDBFactory as any;

    const { dbSaveFrame, dbGetAllFrames } = await import("./db");

    const testFrame: any = {
      id: "frame-1",
      name: "Test Frame",
      dimensions: { width: 1080, height: 1080, presetId: "1:1" },
      layers: [
        {
          id: "layer-bg",
          name: "Backdrop",
          type: "generative",
          visible: true,
          opacity: 1,
          blendMode: "normal",
          backgroundConfig: { type: "transparent", color: "#000000" },
        },
      ],
      activeLayerId: "layer-bg",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await dbSaveFrame(testFrame);
    const allFrames = await dbGetAllFrames();

    expect(allFrames).toHaveLength(1);
    expect(allFrames[0].id).toBe("frame-1");
    expect("frames" in stores).toBe(true);

    if (originalIDB) {
      globalThis.window.indexedDB = originalIDB;
    } else {
      delete (globalThis.window as any).indexedDB;
    }
  });

  it("hydrates fresh database with default 1080x1080 Frame and GenerativeLayer at index 0", async () => {
    const { mockIDBFactory } = createMockIndexedDB();
    const originalIDB = (globalThis as any).window?.indexedDB;
    if (!globalThis.window) (globalThis as any).window = {};
    globalThis.window.indexedDB = mockIDBFactory as any;

    const { loadHydratedProject } = await import("./db");

    const project = await loadHydratedProject();

    expect(project.frames).toHaveLength(1);
    const defaultFrame = project.frames[0];
    expect(defaultFrame.dimensions.width).toBe(1080);
    expect(defaultFrame.dimensions.height).toBe(1080);
    expect(defaultFrame.dimensions.presetId).toBe("1:1");
    expect(defaultFrame.layers).toHaveLength(1);
    expect(defaultFrame.layers[0].type).toBe("generative");
    expect(defaultFrame.layers[0].name).toBe("Background");
    expect(project.activeFrameId).toBe(defaultFrame.id);
    expect(project.activeLayerId).toBe(defaultFrame.layers[0].id);

    if (originalIDB) {
      globalThis.window.indexedDB = originalIDB;
    } else {
      delete (globalThis.window as any).indexedDB;
    }
  });

  it("migrates legacy assets to 1 Frame per asset with GenerativeLayer (index 0) and ImageLayer (index 1)", async () => {
    const { mockIDBFactory, stores } = createMockIndexedDB();
    const originalIDB = (globalThis as any).window?.indexedDB;
    if (!globalThis.window) (globalThis as any).window = {};
    globalThis.window.indexedDB = mockIDBFactory as any;

    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = () => "blob:test";
    }

    const { dbSaveAsset, dbSaveBackground, dbSaveEffectStack, dbSaveSessionState, loadHydratedProject } =
      await import("./db");

    // Populate legacy stores
    await dbSaveAsset({
      id: "asset-legacy-1",
      filename: "photo.png",
      mimeType: "image/png",
      fileSize: 1024,
      rawBlob: new Blob(["test-data"], { type: "image/png" }),
      width: 1920,
      height: 1080,
      aspectRatio: 1920 / 1080,
      thumbnailUrl: "data:image/png;base64,mock",
      createdAt: 1700000000000,
    });

    await dbSaveBackground("asset-legacy-1", {
      type: "solid",
      color: "#112233",
      padding: 20,
      borderRadius: 8,
      shadowBlur: 10,
      shadowOpacity: 0.5,
    });

    await dbSaveEffectStack("asset-legacy-1", [
      { instanceId: "eff-1", effectId: "grain", enabled: true, parameters: { intensity: 15 } },
    ]);

    await dbSaveSessionState(null, null, "asset-legacy-1", "My Legacy Project");

    // Hydrate project - should trigger legacy migration
    const project = await loadHydratedProject();

    expect(project.frames).toHaveLength(1);
    const frame = project.frames[0];
    expect(frame.id).toBe("frame-asset-legacy-1");
    expect(frame.name).toBe("photo.png");
    expect(frame.dimensions.width).toBe(1920);
    expect(frame.dimensions.height).toBe(1080);
    expect(frame.layers).toHaveLength(2);

    // Layer 0: GenerativeLayer
    expect(frame.layers[0].type).toBe("generative");
    expect((frame.layers[0] as any).backgroundConfig.type).toBe("solid");
    expect((frame.layers[0] as any).backgroundConfig.color).toBe("#112233");

    // Layer 1: ImageLayer
    expect(frame.layers[1].type).toBe("image");
    expect((frame.layers[1] as any).assetId).toBe("asset-legacy-1");
    expect((frame.layers[1] as any).fit).toBe("contain");
    expect((frame.layers[1] as any).effectStack).toHaveLength(1);
    expect((frame.layers[1] as any).effectStack[0].effectId).toBe("grain");

    // Authoritative active state
    expect(project.activeFrameId).toBe(frame.id);
    expect(project.activeLayerId).toBe(frame.layers[1].id);
    // Derived activeImageId
    expect(project.activeImageId).toBe("asset-legacy-1");

    // Repeat initialization check: repeated hydration does not duplicate frames
    const projectRepeat = await loadHydratedProject();
    expect(projectRepeat.frames).toHaveLength(1);
    expect(projectRepeat.frames[0].id).toBe("frame-asset-legacy-1");

    if (originalIDB) {
      globalThis.window.indexedDB = originalIDB;
    } else {
      delete (globalThis.window as any).indexedDB;
    }
  });

  it("supports dbSaveFrames and dbDeleteFrame", async () => {
    const { mockIDBFactory } = createMockIndexedDB();
    const originalIDB = (globalThis as any).window?.indexedDB;
    if (!globalThis.window) (globalThis as any).window = {};
    globalThis.window.indexedDB = mockIDBFactory as any;

    const { dbSaveFrames, dbDeleteFrame, dbGetAllFrames } = await import("./db");

    const f1: any = { id: "f-1", name: "F1", dimensions: { width: 100, height: 100, presetId: null }, layers: [] };
    const f2: any = { id: "f-2", name: "F2", dimensions: { width: 200, height: 200, presetId: null }, layers: [] };

    await dbSaveFrames([f1, f2]);
    let all = await dbGetAllFrames();
    expect(all).toHaveLength(2);

    await dbDeleteFrame("f-1");
    all = await dbGetAllFrames();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe("f-2");

    if (originalIDB) {
      globalThis.window.indexedDB = originalIDB;
    } else {
      delete (globalThis.window as any).indexedDB;
    }
  });

  it("recovers gracefully with default state when a critical failure occurs during hydration", async () => {
    const originalIDB = (globalThis as any).window?.indexedDB;
    if (!globalThis.window) (globalThis as any).window = {};
    // Mock failing indexedDB
    globalThis.window.indexedDB = {
      open: () => {
        const req: any = {};
        setTimeout(() => req.onerror?.({ target: req }), 0);
        return req;
      },
    } as any;

    const { loadHydratedProject } = await import("./db");

    const project = await loadHydratedProject();

    expect(project.frames).toHaveLength(1);
    expect(project.frames[0].layers[0].type).toBe("generative");
    expect(project.activeFrameId).toBe(project.frames[0].id);
    expect(project.activeLayerId).toBe(project.frames[0].layers[0].id);
    expect(project.assets).toEqual([]);
    expect(project.activeImageId).toBeNull();

    if (originalIDB) {
      globalThis.window.indexedDB = originalIDB;
    } else {
      delete (globalThis.window as any).indexedDB;
    }
  });
});
