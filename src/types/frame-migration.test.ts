import { describe, it, expect } from "vitest";
import type { Frame, Layer, ImageLayer, GenerativeLayer, Group } from "./frame";
import {
  createDefaultFrame,
  createDefaultBackdropLayer,
  createDefaultGenerativeLayer,
  createImageLayer,
  createLayer,
  createGroup,
  isImageSource,
  isProceduralSource,
  isImageLayer,
  isGenerativeLayer,
  normalizeLayerToUniversal,
  normalizeFrameToUniversalModel,
  DEFAULT_LAYER_TRANSFORM,
} from "./frame";

describe("Unified Composition Model — Phase 1 Data Model Foundation & Migration Suite", () => {
  // -------------------------------------------------------------------------
  // 1. Image Migration
  // -------------------------------------------------------------------------
  describe("1. Image Migration", () => {
    it("migrates a legacy ImageLayer without source to canonical Layer + ImageSource(assetId)", () => {
      const legacyImageLayer: any = {
        id: "img-legacy-1",
        name: "Imported Photograph",
        visible: true,
        opacity: 0.85,
        blendMode: "multiply",
        effectStack: [
          { instanceId: "eff-1", effectId: "grain", enabled: true, parameters: { amount: 15 } },
        ],
        type: "image",
        assetId: "asset-raw-99",
        fit: "cover",
        transform: {
          x: 40,
          y: -30,
          scaleX: 1.25,
          scaleY: 1.25,
          rotation: 12,
        },
        locked: true,
        createdAt: 1700000001000,
        updatedAt: 1700000002000,
      };

      const normalized = normalizeLayerToUniversal(legacyImageLayer);

      expect(normalized).toHaveLength(1);
      const layer = normalized[0];

      // Canonical Layer invariants
      expect(layer.source).toBeDefined();
      expect(isImageSource(layer.source)).toBe(true);

      if (isImageSource(layer.source)) {
        expect(layer.source.type).toBe("image");
        expect(layer.source.assetId).toBe("asset-raw-99");
      }

      // Metadata preservation
      expect(layer.id).toBe("img-legacy-1");
      expect(layer.name).toBe("Imported Photograph");
      expect(layer.visible).toBe(true);
      expect(layer.opacity).toBe(0.85);
      expect(layer.blendMode).toBe("multiply");
      expect(layer.locked).toBe(true);
      expect(layer.createdAt).toBe(1700000001000);
      expect(layer.updatedAt).toBe(1700000002000);
      expect(layer.effectStack).toHaveLength(1);
      expect(layer.effectStack[0].effectId).toBe("grain");

      // Transform & fit preservation
      expect((layer as ImageLayer).fit).toBe("cover");
      expect((layer as ImageLayer).transform).toEqual({
        x: 40,
        y: -30,
        scaleX: 1.25,
        scaleY: 1.25,
        rotation: 12,
      });

      // Backward compatibility fields
      expect(isImageLayer(layer)).toBe(true);
      expect((layer as ImageLayer).type).toBe("image");
      expect((layer as ImageLayer).assetId).toBe("asset-raw-99");
    });

    it("creates ImageLayer with populated ImageSource using createImageLayer factory", () => {
      const layer = createImageLayer(
        "asset-456",
        "Landscape",
        [{ instanceId: "eff-2", effectId: "duotone", enabled: true, parameters: {} }],
        "contain",
        { x: 10, y: 20 }
      );

      expect(layer.source).toEqual({
        type: "image",
        assetId: "asset-456",
      });
      expect(isImageSource(layer.source)).toBe(true);
      expect(isImageLayer(layer)).toBe(true);
      expect(layer.assetId).toBe("asset-456");
      expect(layer.transform?.x).toBe(10);
      expect(layer.transform?.y).toBe(20);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Procedural Migration
  // -------------------------------------------------------------------------
  describe("2. Procedural Migration", () => {
    it("migrates a legacy GenerativeLayer with multiple stackable backgrounds into individual canonical Layers with ProceduralSource", () => {
      const legacyGenerativeLayer: any = {
        id: "gen-backdrop",
        name: "Background",
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        effectStack: [
          { instanceId: "eff-stack", effectId: "posterize", enabled: true, parameters: { levels: 4 } },
        ],
        type: "generative",
        backgrounds: [
          {
            id: "bg-solid-1",
            type: "solid",
            enabled: true,
            opacity: 1.0,
            blendMode: "normal",
            parameters: { color: "#223344" },
            name: "Solid Base",
          },
          {
            id: "bg-grad-2",
            type: "linear-gradient",
            enabled: true,
            opacity: 0.75,
            blendMode: "overlay",
            parameters: {
              angle: 45,
              colors: ["#ff0055", "#00aaff"],
              positions: [0, 1],
            },
            name: "Gradient Overlay",
          },
          {
            id: "bg-dots-3",
            type: "dots",
            enabled: false,
            opacity: 0.3,
            blendMode: "screen",
            parameters: {
              dotColor: "#ffffff",
              spacing: 24,
              dotSize: 3,
            },
            name: "Dots Texture",
            seed: 9876,
          },
        ],
        locked: false,
        createdAt: 1000,
        updatedAt: 2000,
      };

      const normalized = normalizeLayerToUniversal(legacyGenerativeLayer);

      expect(normalized).toHaveLength(3);

      // Layer 0: Solid
      const layer0 = normalized[0];
      expect(layer0.id).toBe("bg-solid-1");
      expect(layer0.name).toBe("Solid Base");
      expect(layer0.visible).toBe(true);
      expect(layer0.opacity).toBe(1.0);
      expect(layer0.blendMode).toBe("normal");
      expect(isProceduralSource(layer0.source)).toBe(true);
      expect(layer0.source).toEqual({
        type: "procedural",
        kind: "solid",
        parameters: { color: "#223344" },
        seed: undefined,
      });

      // Layer 1: Linear Gradient
      const layer1 = normalized[1];
      expect(layer1.id).toBe("bg-grad-2");
      expect(layer1.name).toBe("Gradient Overlay");
      expect(layer1.visible).toBe(true);
      expect(layer1.opacity).toBe(0.75);
      expect(layer1.blendMode).toBe("overlay");
      expect(isProceduralSource(layer1.source)).toBe(true);
      expect(layer1.source).toEqual({
        type: "procedural",
        kind: "linear-gradient",
        parameters: {
          angle: 45,
          colors: ["#ff0055", "#00aaff"],
          positions: [0, 1],
        },
        seed: undefined,
      });

      // Layer 2: Dots with seed and disabled visibility
      const layer2 = normalized[2];
      expect(layer2.id).toBe("bg-dots-3");
      expect(layer2.name).toBe("Dots Texture");
      expect(layer2.visible).toBe(false);
      expect(layer2.opacity).toBe(0.3);
      expect(layer2.blendMode).toBe("screen");
      expect(isProceduralSource(layer2.source)).toBe(true);
      expect(layer2.source).toEqual({
        type: "procedural",
        kind: "dots",
        parameters: {
          dotColor: "#ffffff",
          spacing: 24,
          dotSize: 3,
        },
        seed: 9876,
      });
      // Top procedural layer inherits legacy layer's effectStack
      expect(layer2.effectStack).toHaveLength(1);
      expect(layer2.effectStack[0].effectId).toBe("posterize");
    });

    it("migrates a legacy GenerativeLayer with backgroundConfig into a canonical Layer with ProceduralSource", () => {
      const legacyGenerativeLayer: any = {
        id: "gen-config-only",
        name: "Background",
        type: "generative",
        visible: true,
        opacity: 1.0,
        blendMode: "normal",
        backgroundConfig: {
          type: "grid",
          gridColor: "#ffffff",
          gridSize: 32,
          gridThickness: 2,
        },
      };

      const normalized = normalizeLayerToUniversal(legacyGenerativeLayer);
      expect(normalized.length).toBeGreaterThanOrEqual(1);

      const gridLayer = normalized[0];
      expect(isProceduralSource(gridLayer.source)).toBe(true);
      if (isProceduralSource(gridLayer.source)) {
        expect(gridLayer.source.type).toBe("procedural");
        expect(gridLayer.source.kind).toBe("grid");
        expect(gridLayer.source.parameters).toMatchObject({
          lineColor: "#ffffff",
        });
      }
    });

    it("creates standalone canonical Layer with ProceduralSource using createLayer factory", () => {
      const layer = createLayer({
        name: "Radial Spotlight",
        source: {
          type: "procedural",
          kind: "radial-gradient",
          parameters: {
            colors: ["#ffffff", "#000000"],
            centerX: 0.5,
            centerY: 0.5,
          },
        },
        opacity: 0.9,
        blendMode: "soft-light",
        transform: { scaleX: 1.5, scaleY: 1.5 },
      });

      expect(isProceduralSource(layer.source)).toBe(true);
      expect(layer.name).toBe("Radial Spotlight");
      expect(layer.opacity).toBe(0.9);
      expect(layer.blendMode).toBe("soft-light");
      expect(layer.transform?.scaleX).toBe(1.5);
      expect(layer.source).toEqual({
        type: "procedural",
        kind: "radial-gradient",
        parameters: {
          colors: ["#ffffff", "#000000"],
          centerX: 0.5,
          centerY: 0.5,
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // 3. Idempotency
  // -------------------------------------------------------------------------
  describe("3. Idempotency", () => {
    it("running normalizeFrameToUniversalModel twice produces the exact same structure", () => {
      const initialFrame: Frame = {
        id: "frame-idempotency",
        name: "Test Composition",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        layers: [
          createDefaultBackdropLayer({
            type: "solid",
            color: "#334455",
          }),
          createImageLayer("asset-test-1", "Hero Image"),
          createImageLayer("asset-test-2", "Sticker"),
        ],
        groups: [
          createGroup("Graphics", ["layer-1", "layer-2"]),
        ],
        activeLayerId: "asset-test-1",
        createdAt: 100000,
        updatedAt: 200000,
      };

      const pass1 = normalizeFrameToUniversalModel(initialFrame);
      const pass2 = normalizeFrameToUniversalModel(pass1);

      // Verify layers count
      expect(pass2.layers).toHaveLength(pass1.layers.length);

      // Verify exact structure match
      expect(pass2.id).toBe(pass1.id);
      expect(pass2.name).toBe(pass1.name);
      expect(pass2.dimensions).toEqual(pass1.dimensions);
      expect(pass2.activeLayerId).toBe(pass1.activeLayerId);
      expect(pass2.groups).toEqual(pass1.groups);

      for (let i = 0; i < pass1.layers.length; i++) {
        expect(pass2.layers[i].id).toBe(pass1.layers[i].id);
        expect(pass2.layers[i].name).toBe(pass1.layers[i].name);
        expect(pass2.layers[i].visible).toBe(pass1.layers[i].visible);
        expect(pass2.layers[i].opacity).toBe(pass1.layers[i].opacity);
        expect(pass2.layers[i].blendMode).toBe(pass1.layers[i].blendMode);
        expect(pass2.layers[i].source).toEqual(pass1.layers[i].source);
        expect(pass2.layers[i].transform).toEqual(pass1.layers[i].transform);
      }
    });

    it("normalizing an individual canonical Layer repeatedly does not mutate or duplicate it", () => {
      const procLayer = createLayer({
        name: "Dots Grid",
        source: { type: "procedural", kind: "dots", parameters: { spacing: 16 } },
      });

      const pass1 = normalizeLayerToUniversal(procLayer);
      expect(pass1).toHaveLength(1);

      const pass2 = normalizeLayerToUniversal(pass1[0]);
      expect(pass2).toHaveLength(1);
      expect(pass2[0].id).toBe(procLayer.id);
      expect(pass2[0].source).toEqual(procLayer.source);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Existing Project Preservation
  // -------------------------------------------------------------------------
  describe("4. Existing Project Preservation", () => {
    it("preserves all frame and layer metadata through normalization", () => {
      const frame: Frame = {
        id: "frame-custom-meta",
        name: "Custom Social Banner",
        dimensions: { width: 1200, height: 630, presetId: "landscape" },
        layers: [
          createImageLayer("asset-preserved", "Preserved Image", [
            { instanceId: "fx-1", effectId: "vintage-film", enabled: true, parameters: {} },
          ]),
        ],
        groups: [
          {
            id: "group-1",
            name: "Main Group",
            layerIds: ["layer-id-1"],
            visible: true,
            locked: false,
            collapsed: true,
            createdAt: 500,
            updatedAt: 600,
          },
        ],
        activeLayerId: "layer-id-1",
        createdAt: 1600000000,
        updatedAt: 1700000000,
      };

      const normalized = normalizeFrameToUniversalModel(frame);

      expect(normalized.id).toBe("frame-custom-meta");
      expect(normalized.name).toBe("Custom Social Banner");
      expect(normalized.dimensions).toEqual({ width: 1200, height: 630, presetId: "landscape" });
      expect(normalized.createdAt).toBe(1600000000);
      expect(normalized.updatedAt).toBe(1700000000);
      expect(normalized.groups).toHaveLength(1);
      expect(normalized.groups![0]).toEqual({
        id: "group-1",
        name: "Main Group",
        layerIds: ["layer-id-1"],
        visible: true,
        locked: false,
        collapsed: true,
        createdAt: 500,
        updatedAt: 600,
      });
    });
  });

  // -------------------------------------------------------------------------
  // 5. Already Migrated Data
  // -------------------------------------------------------------------------
  describe("5. Already Migrated Data", () => {
    it("leaves already-migrated canonical Layers completely intact without re-migration or duplication", () => {
      const imageLayer = createLayer({
        id: "layer-img-ready",
        name: "Ready Image",
        source: { type: "image", assetId: "asset-universal-1" },
        transform: { x: 50, y: 100, scaleX: 1, scaleY: 1, rotation: 0 },
      });

      const procLayer = createLayer({
        id: "layer-proc-ready",
        name: "Ready Backdrop",
        source: {
          type: "procedural",
          kind: "solid",
          parameters: { color: "#123456" },
        },
      });

      const frame: Frame = {
        id: "frame-ready",
        name: "Ready Frame",
        dimensions: { width: 1080, height: 1080 },
        layers: [procLayer, imageLayer],
        groups: [],
        activeLayerId: imageLayer.id,
        createdAt: 100,
        updatedAt: 200,
      };

      const normalized = normalizeFrameToUniversalModel(frame);

      expect(normalized.layers).toHaveLength(2);
      expect(normalized.layers[0].id).toBe("layer-proc-ready");
      expect(normalized.layers[0].source).toEqual({
        type: "procedural",
        kind: "solid",
        parameters: { color: "#123456" },
        seed: undefined,
      });
      expect(normalized.layers[1].id).toBe("layer-img-ready");
      expect(normalized.layers[1].source).toEqual({
        type: "image",
        assetId: "asset-universal-1",
      });
      expect(normalized.activeLayerId).toBe("layer-img-ready");
    });
  });

  // -------------------------------------------------------------------------
  // 6. Group Model Foundation
  // -------------------------------------------------------------------------
  describe("6. Single-Tier Group Model Foundation", () => {
    it("creates a valid single-tier Group container with layer membership and controls", () => {
      const group = createGroup("Illustration Elements", ["layer-a", "layer-b"], {
        visible: true,
        locked: false,
        collapsed: false,
      });

      expect(group.id).toMatch(/^group-/);
      expect(group.name).toBe("Illustration Elements");
      expect(group.layerIds).toEqual(["layer-a", "layer-b"]);
      expect(group.visible).toBe(true);
      expect(group.locked).toBe(false);
      expect(group.collapsed).toBe(false);
      expect(group.createdAt).toBeGreaterThan(0);
      expect(group.updatedAt).toBeGreaterThan(0);
    });

    it("attaches groupId to layers without breaking base layer integrity", () => {
      const layer = createImageLayer(
        "asset-grouped",
        "Grouped Image",
        [],
        "contain",
        DEFAULT_LAYER_TRANSFORM,
        "group-123"
      );

      expect(layer.groupId).toBe("group-123");
      expect(layer.source?.type).toBe("image");
    });
  });

  // -------------------------------------------------------------------------
  // 7. Canonical Layer & Default Frame Invariants
  // -------------------------------------------------------------------------
  describe("7. Canonical Layer & Default Frame Invariants", () => {
    it("createDefaultFrame() produces a frame where layer 0 is a canonical Layer with ProceduralSource(solid)", () => {
      const frame = createDefaultFrame("frame-default-test", "New Composition");

      expect(frame.id).toBe("frame-default-test");
      expect(frame.name).toBe("New Composition");
      expect(frame.layers).toHaveLength(1);

      const backdrop = frame.layers[0];
      // Must have required source
      expect(backdrop.source).toBeDefined();
      expect(isProceduralSource(backdrop.source)).toBe(true);
      if (isProceduralSource(backdrop.source)) {
        expect(backdrop.source.type).toBe("procedural");
        expect(backdrop.source.kind).toBe("solid");
        expect(backdrop.source.parameters).toMatchObject({ color: "#000000" });
      }

      // Backdrop role: ordinary Layer acting as backdrop
      expect(backdrop.name).toBe("Background");
      expect(backdrop.visible).toBe(false);
      expect(backdrop.opacity).toBe(1.0);
      expect(backdrop.blendMode).toBe("normal");

      // Active layer matches backdrop
      expect(frame.activeLayerId).toBe(backdrop.id);
    });

    it("createDefaultBackdropLayer() creates a canonical Layer with ProceduralSource and legacy fields for compatibility", () => {
      const backdrop = createDefaultBackdropLayer({
        type: "solid",
        color: "#112233",
        visible: true,
        opacity: 80,
      });

      // Canonical invariants
      expect(backdrop.source).toBeDefined();
      expect(isProceduralSource(backdrop.source)).toBe(true);
      if (isProceduralSource(backdrop.source)) {
        expect(backdrop.source.kind).toBe("solid");
        expect(backdrop.source.parameters).toMatchObject({ color: "#112233" });
      }
      expect(backdrop.visible).toBe(true);

      // Legacy compatibility fields populated
      expect(backdrop.type).toBe("generative");
      expect(Array.isArray(backdrop.backgrounds)).toBe(true);
      expect(isGenerativeLayer(backdrop)).toBe(true);
    });

    it("createLayer() factory produces a canonical Layer requiring source", () => {
      const imgLayer = createLayer({
        name: "Photo",
        source: { type: "image", assetId: "asset-abc" },
        visible: true,
        opacity: 0.9,
      });

      expect(imgLayer.source).toEqual({ type: "image", assetId: "asset-abc" });
      expect(isImageSource(imgLayer.source)).toBe(true);
      expect(imgLayer.opacity).toBe(0.9);
      expect(imgLayer.type).toBe("image"); // compatibility field populated
      expect(imgLayer.assetId).toBe("asset-abc"); // compatibility field populated
    });
  });
});
