// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import * as React from "react";
import { StudioProvider, useStudioStore } from "../context/studio-context";
import {
  GENERATIVE_SUBLAYER_REGISTRY,
  createGenerativeSublayer,
  resolveGenerativeParameters,
} from "./registry";
import {
  deriveLegacyBackgroundFromSublayers,
  normalizeGenerativeLayer,
  normalizeLegacyBackgroundToSublayers,
} from "./normalization";
import type { GenerativeSublayer, GenerativeSublayerType } from "./types";
import {
  createDefaultFrame,
  createDefaultGenerativeLayer,
  createImageLayer,
  type Frame,
  type GenerativeLayer,
} from "../types/frame";
import { DEFAULT_BACKGROUND_STATE, type BackgroundState } from "../types/look";

function createMockIndexedDB() {
  const stores: Record<string, Map<string, any>> = {};

  const mockDB = {
    objectStoreNames: {
      contains: (name: string) => name in stores,
    },
    createObjectStore: (name: string) => {
      stores[name] = new Map();
      return {};
    },
    transaction: (storeNames: string | string[], _mode: string) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      for (const name of names) {
        if (!stores[name]) stores[name] = new Map();
      }
      const primaryStore = stores[names[0]];
      const tx: any = {
        objectStore: (name: string) => {
          const storeMap = stores[name] || primaryStore;
          return {
            put: (val: any) => {
              const key = val.id || val.assetId || val.key || "key";
              storeMap.set(key, JSON.parse(JSON.stringify(val)));
              return { result: key };
            },
            get: (key: string) => {
              const val = storeMap.get(key);
              return { result: val ? JSON.parse(JSON.stringify(val)) : undefined };
            },
            getAll: () => {
              const items = Array.from(storeMap.values()).map((v) =>
                JSON.parse(JSON.stringify(v))
              );
              return { result: items };
            },
            delete: (key: string) => {
              storeMap.delete(key);
              return { result: undefined };
            },
          };
        },
        oncomplete: null,
        onerror: null,
        onabort: null,
      };
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

describe("Stage 3A: Generative Layer Foundation Suite", () => {
  describe("1. Model & Registry Definitions", () => {
    it("defines the 5 mandatory floor primitives in the registry", () => {
      const types: GenerativeSublayerType[] = [
        "solid",
        "linear-gradient",
        "radial-gradient",
        "dots",
        "grid",
      ];

      for (const type of types) {
        const def = GENERATIVE_SUBLAYER_REGISTRY[type];
        expect(def).toBeDefined();
        expect(def.type).toBe(type);
        expect(typeof def.name).toBe("string");
        expect(typeof def.description).toBe("string");
        expect(Array.isArray(def.parameters)).toBe(true);
        expect(typeof def.defaultParameters).toBe("object");
      }
    });

    it("creates a valid default sublayer instance with generated ID and defaults", () => {
      const sublayer = createGenerativeSublayer("solid");
      expect(sublayer.id).toBeDefined();
      expect(typeof sublayer.id).toBe("string");
      expect(sublayer.type).toBe("solid");
      expect(sublayer.enabled).toBe(true);
      expect(sublayer.opacity).toBe(1.0);
      expect(sublayer.blendMode).toBe("normal");
      expect(sublayer.parameters.color).toBe("#000000");
      expect(sublayer.name).toBeUndefined();
      expect(sublayer.seed).toBeUndefined();
    });

    it("supports optional custom name and optional seed", () => {
      const namedSublayer = createGenerativeSublayer("dots", {
        name: "My Custom Dots",
        seed: 42,
      });

      expect(namedSublayer.name).toBe("My Custom Dots");
      expect(namedSublayer.seed).toBe(42);
    });

    it("does not force seeds on deterministic generators unless specified", () => {
      const solid = createGenerativeSublayer("solid");
      expect(solid.seed).toBeUndefined();

      const grid = createGenerativeSublayer("grid");
      expect(grid.seed).toBeUndefined();
    });
  });

  describe("2. Parameter Resolution & Validation", () => {
    it("resolves default parameters when no overrides are given", () => {
      const resolved = resolveGenerativeParameters("linear-gradient");
      expect(resolved.startColor).toBe("#000000");
      expect(resolved.endColor).toBe("#3b82f6");
      expect(resolved.angle).toBe(135);
    });

    it("preserves valid user overrides without mutating input", () => {
      const input = { startColor: "#ff0000", angle: 90 };
      const inputCopy = { ...input };
      const resolved = resolveGenerativeParameters("linear-gradient", input);

      expect(resolved.startColor).toBe("#ff0000");
      expect(resolved.endColor).toBe("#3b82f6"); // default fallback
      expect(resolved.angle).toBe(90);
      expect(input).toEqual(inputCopy); // unmutated
    });

    it("clamps out-of-bounds numbers to schema bounds", () => {
      const clamped = resolveGenerativeParameters("dots", {
        spacing: 999, // max 64
        dotSize: 0, // min 1
      });

      expect(clamped.spacing).toBe(64);
      expect(clamped.dotSize).toBe(1);
    });

    it("rejects malformed numbers and falls back to default", () => {
      const resolved = resolveGenerativeParameters("dots", {
        spacing: "not-a-number",
      });

      expect(resolved.spacing).toBe(24);
    });

    it("rejects invalid color formats and falls back to default", () => {
      const resolved = resolveGenerativeParameters("solid", {
        color: "invalid-hex",
      });

      expect(resolved.color).toBe("#000000");
    });

    it("preserves valid hex colors without arbitrary rewriting", () => {
      const resolved = resolveGenerativeParameters("solid", {
        color: "#123456",
      });

      expect(resolved.color).toBe("#123456");
    });
  });

  describe("3. Opacity & Blend Mode Validation", () => {
    it("clamps opacity to the canonical [0.0, 1.0] range", () => {
      const over = createGenerativeSublayer("solid", { opacity: 2.5 });
      expect(over.opacity).toBe(1.0);

      const under = createGenerativeSublayer("solid", { opacity: -0.5 });
      expect(under.opacity).toBe(0.0);

      const valid = createGenerativeSublayer("solid", { opacity: 0.65 });
      expect(valid.opacity).toBe(0.65);
    });

    it("enforces canonical W3C blend modes and falls back to normal", () => {
      const valid = createGenerativeSublayer("solid", { blendMode: "multiply" });
      expect(valid.blendMode).toBe("multiply");

      const invalid = createGenerativeSublayer("solid", {
        blendMode: "non-existent-mode" as any,
      });
      expect(invalid.blendMode).toBe("normal");
    });

    it("enforces boolean enabled state", () => {
      const disabled = createGenerativeSublayer("solid", { enabled: false });
      expect(disabled.enabled).toBe(false);

      const enabled = createGenerativeSublayer("solid", { enabled: true });
      expect(enabled.enabled).toBe(true);
    });
  });

  describe("4. Legacy Normalization & Derivation", () => {
    it("normalizes transparent background to empty sublayers array", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "transparent",
      });
      expect(sublayers).toHaveLength(0);
    });

    it("normalizes solid background correctly", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "solid",
        color: "#e11d48",
        opacity: 80,
      });

      expect(sublayers).toHaveLength(1);
      expect(sublayers[0].type).toBe("solid");
      expect(sublayers[0].parameters.color).toBe("#e11d48");
      expect(sublayers[0].opacity).toBe(0.8);
      expect(sublayers[0].enabled).toBe(true);
    });

    it("normalizes linear-gradient background correctly", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "linear-gradient",
        color: "#111111",
        gradientEndColor: "#222222",
        gradientAngle: 45,
        opacity: 100,
      });

      expect(sublayers).toHaveLength(1);
      expect(sublayers[0].type).toBe("linear-gradient");
      expect(sublayers[0].parameters.startColor).toBe("#111111");
      expect(sublayers[0].parameters.endColor).toBe("#222222");
      expect(sublayers[0].parameters.angle).toBe(45);
    });

    it("normalizes radial-gradient background correctly", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "radial-gradient",
        color: "#aaaaaa",
        gradientEndColor: "#bbbbbb",
      });

      expect(sublayers).toHaveLength(1);
      expect(sublayers[0].type).toBe("radial-gradient");
      expect(sublayers[0].parameters.startColor).toBe("#aaaaaa");
      expect(sublayers[0].parameters.endColor).toBe("#bbbbbb");
    });

    it("normalizes dots pattern background correctly", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "dots",
        color: "#ffffff",
        patternBackgroundColor: "#0f172a",
        patternSpacing: 32,
      });

      expect(sublayers).toHaveLength(1);
      expect(sublayers[0].type).toBe("dots");
      expect(sublayers[0].parameters.dotColor).toBe("#ffffff");
      expect(sublayers[0].parameters.backgroundColor).toBe("#0f172a");
      expect(sublayers[0].parameters.spacing).toBe(32);
    });

    it("normalizes grid pattern background correctly", () => {
      const sublayers = normalizeLegacyBackgroundToSublayers({
        ...DEFAULT_BACKGROUND_STATE,
        type: "grid",
        color: "#ffffff",
        patternBackgroundColor: "#0f172a",
        patternSpacing: 48,
      });

      expect(sublayers).toHaveLength(1);
      expect(sublayers[0].type).toBe("grid");
      expect(sublayers[0].parameters.lineColor).toBe("#ffffff");
      expect(sublayers[0].parameters.backgroundColor).toBe("#0f172a");
      expect(sublayers[0].parameters.spacing).toBe(48);
    });

    it("derives read-only legacy BackgroundState from sublayers", () => {
      const emptyDerived = deriveLegacyBackgroundFromSublayers([]);
      expect(emptyDerived.type).toBe("transparent");

      const solidSublayer = createGenerativeSublayer("solid", {
        opacity: 0.75,
        parameters: { color: "#334455" },
      });
      const solidDerived = deriveLegacyBackgroundFromSublayers([solidSublayer]);
      expect(solidDerived.type).toBe("solid");
      expect(solidDerived.color).toBe("#334455");
      expect(solidDerived.opacity).toBe(75);

      const gradientSublayer = createGenerativeSublayer("linear-gradient", {
        parameters: { startColor: "#111111", endColor: "#999999", angle: 90 },
      });
      // In stack ordering, index 1 is topmost
      const stackDerived = deriveLegacyBackgroundFromSublayers([solidSublayer, gradientSublayer]);
      expect(stackDerived.type).toBe("linear-gradient");
      expect(stackDerived.color).toBe("#111111");
      expect(stackDerived.gradientEndColor).toBe("#999999");
      expect(stackDerived.gradientAngle).toBe(90);
    });
  });

  describe("5. Idempotence & Document Normalization", () => {
    it("is idempotent when normalizing a legacy GenerativeLayer multiple times", () => {
      const legacyLayer: Partial<GenerativeLayer> & { type: "generative" } = {
        id: "gen-legacy",
        name: "Background",
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        effectStack: [],
        type: "generative",
        backgroundMode: "solid",
        backgroundConfig: {
          ...DEFAULT_BACKGROUND_STATE,
          type: "solid",
          color: "#4f46e5",
          opacity: 90,
        },
        sublayers: undefined as any,
        backgrounds: undefined as any,
        createdAt: 1000,
        updatedAt: 1000,
      };

      const normalizedOnce = normalizeGenerativeLayer(legacyLayer);
      expect(normalizedOnce.backgrounds).toHaveLength(1);
      expect(normalizedOnce.backgrounds[0].type).toBe("solid");
      expect(normalizedOnce.backgrounds[0].parameters.color).toBe("#4f46e5");

      const normalizedTwice = normalizeGenerativeLayer(normalizedOnce);
      expect(normalizedTwice.backgrounds).toEqual(normalizedOnce.backgrounds);
      expect(normalizedTwice.id).toBe(normalizedOnce.id);
    });

    it("does not overwrite existing sublayers with legacy background fields", () => {
      const existingSublayer = createGenerativeSublayer("grid", {
        id: "existing-sublayer-1",
        parameters: { spacing: 36 },
      });

      const layerWithSublayers: Partial<GenerativeLayer> & { type: "generative" } = {
        id: "gen-active",
        name: "Background",
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        effectStack: [],
        type: "generative",
        backgroundMode: "solid", // legacy field says solid
        backgroundConfig: {
          ...DEFAULT_BACKGROUND_STATE,
          type: "solid",
          color: "#000000",
        },
        sublayers: [existingSublayer], // sublayer says grid
        backgrounds: [existingSublayer],
        createdAt: 1000,
        updatedAt: 1000,
      };

      const result = normalizeGenerativeLayer(layerWithSublayers);
      expect(result.backgrounds).toHaveLength(1);
      expect(result.backgrounds[0].type).toBe("grid");
      expect(result.backgrounds[0].id).toBe("existing-sublayer-1");
      expect(result.backgrounds[0].parameters.spacing).toBe(36);
    });

    it("preserves non-destructive legacy fields on GenerativeLayer during hydration", () => {
      const legacyLayer: Partial<GenerativeLayer> & { type: "generative" } = {
        id: "gen-1",
        name: "Background",
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        effectStack: [],
        type: "generative",
        backgroundMode: "dots",
        backgroundConfig: {
          ...DEFAULT_BACKGROUND_STATE,
          type: "dots",
          color: "#ff0000",
        },
        backgrounds: undefined as any,
        sublayers: undefined as any,
        createdAt: 12345,
        updatedAt: 12345,
      };

      const normalized = normalizeGenerativeLayer(legacyLayer);
      expect(normalized.backgroundMode).toBe("dots");
      expect(normalized.backgroundConfig).toBeDefined();
      expect(normalized.backgroundConfig?.color).toBe("#ff0000");
      expect(normalized.sublayers).toHaveLength(1);
    });
  });

  describe("6. Sublayer Ordering & Layer Hierarchy Invariant", () => {
    it("maintains bottom (index 0) to top (index N-1) canonical sublayer ordering", () => {
      const baseSublayer = createGenerativeSublayer("solid", {
        name: "Bottom Color",
      });
      const patternSublayer = createGenerativeSublayer("dots", {
        name: "Top Pattern",
      });

      const genLayer = createDefaultGenerativeLayer();
      genLayer.sublayers = [baseSublayer, patternSublayer];

      expect(genLayer.sublayers[0].name).toBe("Bottom Color");
      expect(genLayer.sublayers[1].name).toBe("Top Pattern");
    });

    it("ensures sublayer reordering does not alter frame.layers or displace GenerativeLayer at index 0", () => {
      const frame = createDefaultFrame("frame-reorder-test");
      const imgLayer = createImageLayer("asset-1", "Image 1");
      frame.layers.push(imgLayer);

      const genLayer = frame.layers[0] as GenerativeLayer;
      const sub1 = createGenerativeSublayer("solid", { id: "s1" });
      const sub2 = createGenerativeSublayer("dots", { id: "s2" });
      genLayer.sublayers = [sub1, sub2];

      // Reorder within sublayers: move index 0 to 1
      const [moved] = genLayer.sublayers.splice(0, 1);
      genLayer.sublayers.splice(1, 0, moved);

      // Verify sublayers reordered
      expect(genLayer.sublayers[0].id).toBe("s2");
      expect(genLayer.sublayers[1].id).toBe("s1");

      // Verify Frame hierarchy invariant: frame.layers[0] is still the GenerativeLayer
      expect(frame.layers).toHaveLength(2);
      expect(frame.layers[0].type).toBe("generative");
      expect(frame.layers[0].id).toBe(genLayer.id);
      expect(frame.layers[1].type).toBe("image");
      expect(frame.layers[1].id).toBe(imgLayer.id);
    });
  });

  describe("7. Persistence & Hydration Round-Trip", () => {
    it("persists sublayers through IndexedDB frames store and hydrates intact", async () => {
      const { mockIDBFactory } = createMockIndexedDB();
      const originalIDB = (globalThis as any).window?.indexedDB;
      if (!globalThis.window) (globalThis as any).window = {};
      globalThis.window.indexedDB = mockIDBFactory as any;

      const { dbSaveFrame, dbGetAllFrames, loadHydratedProject } = await import(
        "../storage/db"
      );

      const customSublayer1 = createGenerativeSublayer("solid", {
        id: "persist-sub-1",
        opacity: 0.8,
        parameters: { color: "#1e293b" },
      });
      const customSublayer2 = createGenerativeSublayer("grid", {
        id: "persist-sub-2",
        opacity: 0.5,
        parameters: { spacing: 32, lineWidth: 2 },
      });

      const frame = createDefaultFrame("frame-persistence-test");
      const genLayer = frame.layers[0] as GenerativeLayer;
      genLayer.backgrounds = [customSublayer1, customSublayer2];
      genLayer.sublayers = genLayer.backgrounds;

      await dbSaveFrame(frame);

      // Verify direct retrieval from frames store
      const allFrames = await dbGetAllFrames();
      expect(allFrames).toHaveLength(1);
      const retrievedGenLayer = allFrames[0].layers[0] as GenerativeLayer;
      expect(retrievedGenLayer.backgrounds).toHaveLength(2);
      expect(retrievedGenLayer.backgrounds[0].id).toBe("persist-sub-1");
      expect(retrievedGenLayer.backgrounds[0].type).toBe("solid");
      expect(retrievedGenLayer.backgrounds[0].parameters.color).toBe("#1e293b");
      expect(retrievedGenLayer.backgrounds[1].id).toBe("persist-sub-2");
      expect(retrievedGenLayer.backgrounds[1].type).toBe("grid");
      expect(retrievedGenLayer.backgrounds[1].parameters.spacing).toBe(32);

      // Verify full project hydration
      const hydrated = await loadHydratedProject();
      expect(hydrated.frames).toHaveLength(1);
      const hydratedGenLayer = hydrated.frames[0].layers[0] as GenerativeLayer;
      expect(hydratedGenLayer.backgrounds).toHaveLength(2);
      expect(hydratedGenLayer.backgrounds[0].id).toBe("persist-sub-1");
      expect(hydratedGenLayer.backgrounds[1].id).toBe("persist-sub-2");

      if (originalIDB) {
        globalThis.window.indexedDB = originalIDB;
      } else {
        delete (globalThis.window as any).indexedDB;
      }
    });

    it("hydrates legacy frames without sublayers by deterministically converting backgroundConfig", async () => {
      const { mockIDBFactory } = createMockIndexedDB();
      const originalIDB = (globalThis as any).window?.indexedDB;
      if (!globalThis.window) (globalThis as any).window = {};
      globalThis.window.indexedDB = mockIDBFactory as any;

      const { dbSaveFrame, dbGetAllFrames } = await import("../storage/db");

      // Frame created by legacy code before Stage 3A without sublayers property
      const legacyFrame: any = {
        id: "frame-old",
        name: "Old Frame",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        layers: [
          {
            id: "gen-old",
            name: "Background",
            type: "generative",
            visible: true,
            opacity: 1.0,
            blendMode: "normal",
            effectStack: [],
            backgroundMode: "solid",
            backgroundConfig: {
              ...DEFAULT_BACKGROUND_STATE,
              type: "solid",
              color: "#059669",
              opacity: 100,
            },
            // no sublayers
          },
        ],
        activeLayerId: "gen-old",
        createdAt: 1000,
        updatedAt: 1000,
      };

      await dbSaveFrame(legacyFrame);

      const frames = await dbGetAllFrames();
      expect(frames).toHaveLength(1);
      const genLayer = frames[0].layers[0] as GenerativeLayer;
      expect(genLayer.backgrounds).toBeDefined();
      expect(genLayer.backgrounds).toHaveLength(1);
      expect(genLayer.backgrounds[0].type).toBe("solid");
      expect(genLayer.backgrounds[0].parameters.color).toBe("#059669");

      if (originalIDB) {
        globalThis.window.indexedDB = originalIDB;
      } else {
        delete (globalThis.window as any).indexedDB;
      }
    });
  });

  describe("8. State Actions & History Integration", () => {
    it("executes addSublayer, updateSublayer, updateSublayerParameters, reorderSublayers, removeSublayer with undo/redo", async () => {
      const { renderHook, act } = await import("@testing-library/react");
      const { StudioProvider, useStudioStore } = await import("../context/studio-context");

      const { result } = renderHook(() => useStudioStore(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <StudioProvider>{children}</StudioProvider>
        ),
      });

      // Allow mount hydration to resolve
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      const store = result.current;
      expect(store.activeSublayers).toBeDefined();
      const initialCount = store.activeSublayers.length;

      // 1. Add solid sublayer
      await act(async () => {
        store.addSublayer("solid", { color: "#ff0000" });
      });

      expect(result.current.activeSublayers).toHaveLength(initialCount + 1);
      const addedSolid = result.current.activeSublayers[result.current.activeSublayers.length - 1];
      expect(addedSolid.type).toBe("solid");
      expect(addedSolid.parameters.color).toBe("#ff0000");
      expect(result.current.canUndo).toBe(true);

      // 2. Add dots sublayer at index 0 (bottom)
      await act(async () => {
        result.current.addSublayer("dots", { spacing: 30 }, 0);
      });

      expect(result.current.activeSublayers).toHaveLength(initialCount + 2);
      expect(result.current.activeSublayers[0].type).toBe("dots");
      expect(result.current.activeSublayers[0].parameters.spacing).toBe(30);

      // 3. Update solid sublayer opacity and blendMode
      await act(async () => {
        result.current.updateSublayer(addedSolid.id, {
          opacity: 0.75,
          blendMode: "multiply",
        });
      });

      const updatedSolid = result.current.activeSublayers.find((s) => s.id === addedSolid.id);
      expect(updatedSolid?.opacity).toBe(0.75);
      expect(updatedSolid?.blendMode).toBe("multiply");

      // 4. Update sublayer parameters with continuous scrubbing (skipHistory: true)
      await act(async () => {
        result.current.updateSublayerParameters(
          addedSolid.id,
          { color: "#00ff00" },
          { skipHistory: true }
        );
      });

      const scrubbedSolid = result.current.activeSublayers.find((s) => s.id === addedSolid.id);
      expect(scrubbedSolid?.parameters.color).toBe("#00ff00");

      // 5. Reorder sublayers
      const firstId = result.current.activeSublayers[0].id;
      const secondId = result.current.activeSublayers[1].id;
      await act(async () => {
        result.current.reorderSublayers(0, 1);
      });

      expect(result.current.activeSublayers[0].id).toBe(secondId);
      expect(result.current.activeSublayers[1].id).toBe(firstId);

      // 6. Undo restores previous order
      await act(async () => {
        result.current.undo();
      });

      expect(result.current.activeSublayers[0].id).toBe(firstId);
      expect(result.current.activeSublayers[1].id).toBe(secondId);

      // 7. Redo restores reordered state
      await act(async () => {
        result.current.redo();
      });

      expect(result.current.activeSublayers[0].id).toBe(secondId);
      expect(result.current.activeSublayers[1].id).toBe(firstId);

      // 8. Remove sublayer
      await act(async () => {
        result.current.removeSublayer(addedSolid.id);
      });

      expect(result.current.activeSublayers.some((s) => s.id === addedSolid.id)).toBe(false);

      // 9. Undo restores the removed sublayer
      await act(async () => {
        result.current.undo();
      });

      expect(result.current.activeSublayers.some((s) => s.id === addedSolid.id)).toBe(true);
    });
  });
});

