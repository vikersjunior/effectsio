import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { Frame, Layer, ImageLayer, GenerativeLayer, Group } from "./frame";
import {
  createDefaultFrame,
  createDefaultBackdropLayer,
  createDefaultGenerativeLayer,
  createImageLayer,
  createLayer,
  createGroup,
  isGroup,
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
      const img1 = createImageLayer("asset-test-1", "Hero Image");
      const img2 = createImageLayer("asset-test-2", "Sticker");
      const initialFrame: Frame = {
        id: "frame-idempotency",
        name: "Test Composition",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        items: [
          createDefaultBackdropLayer({
            type: "solid",
            color: "#334455",
          }),
          createGroup("Graphics", [img1, img2]),
        ],
        activeLayerId: "asset-test-1",
        createdAt: 100000,
        updatedAt: 200000,
      };

      const pass1 = normalizeFrameToUniversalModel(initialFrame);
      const pass2 = normalizeFrameToUniversalModel(pass1);

      // Verify items count
      expect(pass2.items).toHaveLength(pass1.items.length);

      // Verify exact structure match
      expect(pass2.id).toBe(pass1.id);
      expect(pass2.name).toBe(pass1.name);
      expect(pass2.dimensions).toEqual(pass1.dimensions);
      expect(pass2.activeLayerId).toBe(pass1.activeLayerId);
      expect(pass2.items).toEqual(pass1.items);
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
      const imgLayer = createImageLayer("asset-preserved", "Preserved Image", [
        { instanceId: "fx-1", effectId: "vintage-film", enabled: true, parameters: {} },
      ]);
      imgLayer.id = "layer-id-1";

      const frame: any = {
        id: "frame-custom-meta",
        name: "Custom Social Banner",
        dimensions: { width: 1200, height: 630, presetId: "landscape" },
        layers: [imgLayer],
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
      const groupItem = normalized.items.find(isGroup);
      expect(groupItem).toBeDefined();
      expect(isGroup(groupItem!)).toBe(true);
      if (isGroup(groupItem!)) {
        expect(groupItem!.id).toBe("group-1");
        expect(groupItem!.name).toBe("Main Group");
        expect(groupItem!.children).toHaveLength(1);
        expect(groupItem!.children[0].id).toBe("layer-id-1");
      }
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
        items: [procLayer, imageLayer],
        activeLayerId: imageLayer.id,
        createdAt: 100,
        updatedAt: 200,
      };

      const normalized = normalizeFrameToUniversalModel(frame);

      expect(normalized.items).toHaveLength(2);
      expect(normalized.items[0].id).toBe("layer-proc-ready");
      expect((normalized.items[0] as Layer).source).toEqual({
        type: "procedural",
        kind: "solid",
        parameters: { color: "#123456" },
        seed: undefined,
      });
      expect(normalized.items[1].id).toBe("layer-img-ready");
      expect((normalized.items[1] as Layer).source).toEqual({
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
      const child1 = createImageLayer("asset-a", "Layer A");
      const child2 = createImageLayer("asset-b", "Layer B");
      const group = createGroup("Illustration Elements", [child1, child2], {
        visible: true,
        locked: false,
        collapsed: false,
      });

      expect(group.id).toMatch(/^group-/);
      expect(group.name).toBe("Illustration Elements");
      expect(group.children).toEqual([child1, child2]);
      expect(group.visible).toBe(true);
      expect(group.locked).toBe(false);
      expect(group.collapsed).toBe(false);
      expect(group.createdAt).toBeGreaterThan(0);
      expect(group.updatedAt).toBeGreaterThan(0);
    });

    it("verifies layers have no Model A groupId property", () => {
      const layer = createImageLayer(
        "asset-grouped",
        "Grouped Image",
        [],
        "contain",
        DEFAULT_LAYER_TRANSFORM
      );

      expect((layer as any).groupId).toBeUndefined();
      expect(layer.source?.type).toBe("image");
    });
  });

  // -------------------------------------------------------------------------
  // 7. Canonical Layer & Default Frame Invariants
  // -------------------------------------------------------------------------
  describe("7. Canonical Layer & Default Frame Invariants", () => {
    it("createDefaultFrame() produces a frame where item 0 is a canonical Layer with ProceduralSource(solid)", () => {
      const frame = createDefaultFrame("frame-default-test", "New Composition");

      expect(frame.id).toBe("frame-default-test");
      expect(frame.name).toBe("New Composition");
      expect(frame.items).toHaveLength(1);

      const backdrop = frame.items[0] as Layer;
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
      expect(backdrop.locked).toBe(true);

      // Canonical backdrop is a procedural layer
      expect(backdrop.type).toBe("procedural");
      expect((backdrop as any).backgrounds).toBeUndefined();
    });

    it("createLayer() factory produces a canonical Layer with required source while populating explicitly deprecated compatibility fields for unmigrated consumers", () => {
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

  // -------------------------------------------------------------------------
  // 8. Canonical Model Structural Integrity & Single BaseLayer Invariant
  // -------------------------------------------------------------------------
  describe("8. Canonical Model Structural Integrity & Single BaseLayer Invariant", () => {
    const frameTsPath = path.resolve(__dirname, "frame.ts");
    const frameTsContent = fs.readFileSync(frameTsPath, "utf-8");

    it("ensures exactly one BaseLayer declaration exists in src/types/frame.ts", () => {
      const matches = frameTsContent.match(/export\s+interface\s+BaseLayer\b/g);
      expect(matches).not.toBeNull();
      expect(matches).toHaveLength(1);
    });

    it("ensures BaseLayer does not declare source property", () => {
      const baseLayerBlockMatch = frameTsContent.match(/export\s+interface\s+BaseLayer\s*\{([\s\S]*?)\}/);
      expect(baseLayerBlockMatch).not.toBeNull();
      const baseLayerBody = baseLayerBlockMatch![1];
      expect(baseLayerBody).not.toMatch(/\bsource\b/);
    });

    it("ensures BaseLayer declares all canonical shared layer properties", () => {
      const baseLayerBlockMatch = frameTsContent.match(/export\s+interface\s+BaseLayer\s*\{([\s\S]*?)\}/);
      expect(baseLayerBlockMatch).not.toBeNull();
      const baseLayerBody = baseLayerBlockMatch![1];

      expect(baseLayerBody).toMatch(/\bid:\s*string/);
      expect(baseLayerBody).toMatch(/\bname:\s*string/);
      expect(baseLayerBody).toMatch(/\bvisible:\s*boolean/);
      expect(baseLayerBody).toMatch(/\bopacity:\s*number/);
      expect(baseLayerBody).toMatch(/\bblendMode:\s*BlendMode/);
      expect(baseLayerBody).toMatch(/\beffectStack:\s*EffectStack/);
      expect(baseLayerBody).toMatch(/\blocked\?:/);
      expect(baseLayerBody).not.toMatch(/\bgroupId\?:/);
      expect(baseLayerBody).toMatch(/\bcreatedAt:\s*number/);
      expect(baseLayerBody).toMatch(/\bupdatedAt:\s*number/);
    });

    it("ensures Layer extends BaseLayer and requires source: LayerSource", () => {
      const layerBlockMatch = frameTsContent.match(/export\s+interface\s+Layer\s+extends\s+BaseLayer\s*\{([\s\S]*?)\}/);
      expect(layerBlockMatch).not.toBeNull();
      const layerBody = layerBlockMatch![1];
      expect(layerBody).toMatch(/\bsource:\s*LayerSource;/);
      expect(layerBody).not.toMatch(/\bsource\?:/);
    });

    it("ensures compatibility fields on Layer are annotated with @deprecated", () => {
      const layerBlockMatch = frameTsContent.match(/export\s+interface\s+Layer\s+extends\s+BaseLayer\s*\{([\s\S]*?)\}/);
      expect(layerBlockMatch).not.toBeNull();
      const layerBody = layerBlockMatch![1];

      expect(layerBody).toMatch(/@deprecated[\s\S]*?\btype\?:/);
      expect(layerBody).toMatch(/@deprecated[\s\S]*?\bassetId\?:/);
      expect(layerBody).not.toMatch(/\bbackgrounds\?:/);
      expect(layerBody).not.toMatch(/\bsublayers\?:/);
      expect(layerBody).not.toMatch(/\bbackgroundMode\?:/);
      expect(layerBody).not.toMatch(/\bbackgroundConfig\?:/);
    });

    it("verifies createLayer() does not require legacy fields as input and treats source as authoritative", () => {
      const procLayer = createLayer({
        name: "Grid Pattern",
        source: {
          type: "procedural",
          kind: "grid",
          parameters: { gridSize: 32, gridColor: "#ffffff" },
        },
      });

      expect(isProceduralSource(procLayer.source)).toBe(true);
      if (isProceduralSource(procLayer.source)) {
        expect(procLayer.source.kind).toBe("grid");
        expect(procLayer.source.parameters).toEqual({ gridSize: 32, gridColor: "#ffffff" });
      }
      expect(procLayer.source).toBeDefined();
      expect(procLayer.type).toBe("procedural"); // temporary compatibility only
    });

    it("ensures canonical Layer cleanly represents both ImageSource and ProceduralSource", () => {
      const imgLayer: Layer = {
        id: "test-img",
        name: "Test Image",
        visible: true,
        opacity: 1,
        blendMode: "normal",
        effectStack: [],
        source: { type: "image", assetId: "asset-1" },
        createdAt: 100,
        updatedAt: 100,
      };
      expect(isImageSource(imgLayer.source)).toBe(true);

      const procLayer: Layer = {
        id: "test-proc",
        name: "Test Procedural",
        visible: true,
        opacity: 1,
        blendMode: "normal",
        effectStack: [],
        source: { type: "procedural", kind: "solid", parameters: { color: "#ffffff" } },
        createdAt: 100,
        updatedAt: 100,
      };
      expect(isProceduralSource(procLayer.source)).toBe(true);
    });

    it("normalizing createDefaultFrame is strictly idempotent and preserves backdrop ID and activeLayerId without new ID generation", () => {
      const defaultFrame = createDefaultFrame("frame-default-idempotent", "Idempotent Frame");
      const initialBackdrop = defaultFrame.items[0];
      expect(initialBackdrop).toBeDefined();
      expect(defaultFrame.activeLayerId).toBe(initialBackdrop.id);

      // Pass 1
      const norm1 = normalizeFrameToUniversalModel(defaultFrame);
      expect(norm1.items).toHaveLength(1);
      expect(norm1.items[0].id).toBe(initialBackdrop.id);
      expect(norm1.activeLayerId).toBe(initialBackdrop.id);
      expect(isProceduralSource((norm1.items[0] as Layer).source)).toBe(true);

      // Pass 2
      const norm2 = normalizeFrameToUniversalModel(norm1);
      expect(norm2.items).toHaveLength(1);
      expect(norm2.items[0].id).toBe(initialBackdrop.id);
      expect(norm2.activeLayerId).toBe(initialBackdrop.id);
      expect((norm2.items[0] as Layer).source).toEqual((norm1.items[0] as Layer).source);
    });

    it("verifies repeated normalization across a multi-layer frame does not alter structure or synthesize new IDs", () => {
      const initialFrame: Frame = {
        id: "frame-multi-test",
        name: "Multi-Layer Composition",
        dimensions: { width: 1080, height: 1080, presetId: "1:1" },
        items: [
          createDefaultBackdropLayer({ type: "solid", color: "#111111", visible: true, opacity: 100 }),
          createGroup(
            "Main Group",
            [
              createLayer({
                id: "layer-img-fixed",
                name: "Hero Photo",
                source: { type: "image", assetId: "asset-hero" },
                visible: true,
                opacity: 0.95,
                blendMode: "screen",
                transform: { x: 10, y: 20, scaleX: 1.1, scaleY: 1.1, rotation: 5 },
              }),
            ],
            { id: "grp-1", visible: true, locked: false, collapsed: false }
          ),
        ],
        activeLayerId: "layer-img-fixed",
        createdAt: 100,
        updatedAt: 100,
      };

      const pass1 = normalizeFrameToUniversalModel(initialFrame);
      expect(pass1.items).toHaveLength(2);
      expect(pass1.items[0].id).toBe(initialFrame.items[0].id);
      expect(pass1.items[1].id).toBe("grp-1");
      expect(pass1.activeLayerId).toBe("layer-img-fixed");

      const pass2 = normalizeFrameToUniversalModel(pass1);
      expect(pass2.items).toHaveLength(2);
      expect(pass2.items[0].id).toBe(initialFrame.items[0].id);
      expect(pass2.items[1].id).toBe("grp-1");
      expect(pass2.activeLayerId).toBe("layer-img-fixed");
      const grp2 = pass2.items[1] as Group;
      expect(grp2.children[0].source).toEqual({ type: "image", assetId: "asset-hero" });
      expect(grp2.children[0].transform).toEqual(
        ((initialFrame.items[1] as Group).children[0] as Layer).transform
      );
    });
  });
});
