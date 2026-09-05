# EffectsIO — Stage 1 (Frame & Layer Architecture) Review Packet

**Document:** `stage-1-frame-layer-review.md`  
**Purpose:** Project Owner Architecture Review & Decision Packet (Revised)  
**Status:** **PENDING PROJECT-OWNER APPROVAL (Implementation Mechanically Blocked)**  
**Target Milestone:** V1.1 Beta Stage 1 (Frame & Layer Architecture)  
**Date:** September 5, 2026 (Revision 2)  
**Governance Standard:** `AGENTS.md` Rule 1 (Empirical Evidence), Rule 8 (Single Source of Truth), Rule 10 (Graphify Intelligence), Rule 11 (Headroom Pre-Flight), Rule 12 (Mechanical Approval Gates), Rule 14 (No Competitor References), Rule 15 (Public Provenance)

---

## Executive Summary & Governance Notice

This review packet provides the project owner with a comprehensive, technically grounded architectural proposal for **Stage 1 (Frame & Layer Architecture)** as defined in `docs/buildkit/PRD.md` (Sections 9, 10, 13, 20, and 34).

> [!IMPORTANT]
> **HARD GOVERNANCE NOTICE (Rule 12 Invariant)**:  
> Stage 1 implementation is **mechanically blocked** until:
> ```text
> docs/approvals/stage-1-frame-layer.md
> ```
> exists and contains the literal line:
> ```text
> APPROVED: <date>
> ```
> The approval file must be authored and signed solely by the human project owner. In strict compliance with `AGENTS.md` Rule 12, AI coding agents must **never** create the approval file, add an approval line, infer approval from user requests, or begin implementation before mechanical gate clearance.
> 
> **Zero Implementation Invariant**: During this session, **no application source code (`src/`), storage code (`src/storage/`), rendering code (`src/rendering/`), or UI components (`src/components/`) have been modified**. This document serves exclusively as an architectural proposal for formal owner evaluation.

---

## 1. Proposed Domain Model (TypeScript)

Stage 1 transitions EffectsIO from an **asset-bound single-image editing model** to a **hierarchical Frame and Multi-Layer composition studio**.

```text
Project / Session Scope
└── frames: Frame[]
    └── Frame (activeFrameId)
        ├── dimensions (width, height, presetId)
        └── layers: Layer[] (ordered bottom-to-top z-index)
            ├── GenerativeLayer (index 0: Protected backdrop floor / Canvas fill)
            │   ├── backgroundMode (6 existing modes)
            │   ├── backgroundConfig (BackgroundState)
            │   ├── opacity & blendMode
            │   └── effectStack (Reserved for domain consistency; inactive in Stage 1)
            └── ImageLayer[] (indices 1..N: Reorderable visual asset layers)
                ├── assetId (Immutable source bitmap reference)
                ├── fit ("contain" | "cover")
                ├── opacity & blendMode
                └── effectStack (Per-layer pixel & shader effect stack)
```

### 1.1 TypeScript Domain Interfaces

```typescript
// src/types/frame.ts

/**
 * Selected Stage 1 subset of blend modes implemented according to
 * relevant W3C Compositing and Blending Level 1 specifications.
 */
export type BlendMode =
  | "normal"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion";

export interface FrameDimensions {
  width: number;
  height: number;
  presetId?: string | null;
}

export interface FrameSizePreset {
  id: string;
  name: string;
  category: "Square" | "Free" | "Landscape" | "Portrait";
  width: number;
  height: number;
  aspectRatioLabel: string;
}

export interface BaseLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;       // 0.0 to 1.0
  blendMode: BlendMode;  // Layer-level blend mode interacting with accumulated backdrop
  effectStack: EffectStack;
  locked?: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * ImageLayer represents an imported visual asset placed within a Frame.
 *
 * Stage 1 Constraint: No layer transforms (x, y, scale, rotation).
 * Image layers automatically occupy the defined frame bounds according to `fit`.
 * Interactive drag, scale, rotation handles, and transform state are strictly deferred to future stages.
 */
export interface ImageLayer extends BaseLayer {
  type: "image";
  assetId: string;       // References immutable source Asset in assets store
  fit: "contain" | "cover";
}

/**
 * GenerativeLayer represents procedural canvas background content.
 *
 * Stage 1 Constraint: Thin generative layer representing the 6 existing background modes only.
 * Serves as an intentional extension point for future procedural systems without prescribing
 * the Stage 2 generative sub-layer schema.
 */
export interface GenerativeLayer extends BaseLayer {
  type: "generative";
  backgroundMode: "transparent" | "solid" | "linear-gradient" | "radial-gradient" | "dots" | "grid";
  backgroundConfig: BackgroundState;
}

export type Layer = ImageLayer | GenerativeLayer;

/**
 * Frame represents a complete, bounded composition document.
 *
 * Ownership Rule: Frame owns ordered layers. The background is owned exclusively
 * by a GenerativeLayer at the base of `layers`. Frame does NOT maintain a separate
 * `background` field.
 */
export interface Frame {
  id: string;
  name: string;
  dimensions: FrameDimensions;
  layers: Layer[];        // Ordered bottom-to-top (index 0 = backdrop, N-1 = foreground)
  activeLayerId: string | null;
  createdAt: number;
  updatedAt: number;
}
```

### 1.2 Explicit Stage 1 Constraints & Invariants

1. **No Layer Transforms in Stage 1**:
   - The Stage 1 domain model does **not** include `LayerTransform`, position offsets (`x`, `y`), scale factors (`scaleX`, `scaleY`), or rotation angles.
   - Layers occupy the defined frame bounds using canonical fitting (`contain` or `cover`).
   - Interactive drag handles, bounding boxes, resize anchors, rotation controls, and transform persistence are strictly deferred.
2. **Thin Generative Layer (6 Background Modes Only)**:
   - Stage 1 represents only the 6 existing background modes (`transparent`, `solid`, `linear-gradient`, `radial-gradient`, `dots`, `grid`).
   - No Stage 2 sub-layer type system (`GenerativeSubLayer`, gradient/pattern/light/optics/glass) is introduced into Stage 1.
3. **One Active Frame in UI**:
   - The data model supports `frames: Frame[]` and `activeFrameId: string`, but the Stage 1 UI renders and edits exactly one active frame at a time. Multi-frame switcher UI is deferred.
4. **Default Frame on Blank Load**:
   - Opening without existing data automatically synthesizes a default $1080 \times 1080$ Frame with a default `GenerativeLayer` backdrop, preserving the zero-barrier, always-editable canvas workflow.
5. **Protected Base GenerativeLayer at Index 0**:
   - In Stage 1, `layers[0]` is strictly reserved for the frame's base `GenerativeLayer` backdrop.
   - It is permanently anchored at the base of the stack: it cannot be dragged above image layers or reordered out of the base position.
   - `ImageLayer`s occupying indices $1 \dots N-1$ can be freely reordered among themselves above the backdrop.
6. **GenerativeLayer Effect Stack Inactive in Stage 1**:
   - `GenerativeLayer` inherits `BaseLayer.effectStack` for domain consistency and future extensibility, but Stage 1 does not expose or execute the effect stack for the base `GenerativeLayer`.
   - Stage 1 background styling is limited strictly to the six existing background modes and their existing `BackgroundState` controls.

---

## 2. Active Editing Invariant & State Ownership

### 2.1 The New Invariant: `activeFrameId + activeLayerId`

`AGENTS.md` Rule 8 currently establishes `activeImageId` as the active editing identity. Stage 1 replaces this single-asset assumption with a strict composite identity:

$$\text{Active Editing Target} \equiv \mathbf{activeFrameId} + \mathbf{activeLayerId}$$

#### Invariant Rules:
1. **Single Source of Truth**: `activeFrameId` and `activeLayerId` are the **only** writable state determining the active editing target.
2. **Frame Containment**: `activeLayerId` must belong to the active frame's `layers` collection.
3. **Derived Active Asset**: The active asset is strictly a **derived, read-only property**:
   $$\text{activeAssetId} = (\text{activeLayer?.type} === \text{"image"}) \ ? \ \text{activeLayer.assetId} : \text{null}$$
4. **No Writable `activeImageId`**: `activeImageId` will **not** remain independent writable state in context or storage.
5. **No `selectedLayerIds` in Stage 1**: Stage 1 supports exactly one active layer at a time (`activeLayerId`). Multi-layer selection is deferred.
6. **Separation of Asset Library Selection**: Asset library selection (`selectedAssetIds: Set<string>`) remains dedicated to batch ingestion, deletion, and batch Look operations in the Asset Library panel, decoupled from canvas composition editing.
7. **Viewport Decoupling**: Viewport state (pan, zoom, split-view divider) remains purely presentation state and never alters composition structure.

### 2.2 Reorganization of Legacy Asset-Keyed State

| Current Home (Asset-Keyed) | Stage 1 Target Home | Ownership & Architectural Rationale |
| :--- | :--- | :--- |
| `effectStacks[assetId]` | **`ImageLayer.effectStack`** | Effects modify visual composition layers, not library bitmaps. Allows multiple layers to reference the same asset with independent effect stacks. |
| `backgrounds[assetId]` | **`GenerativeLayer.backgroundConfig`** | Background is a composable layer in the frame stack. Decoupled from asset identity; participates in standard layer compositing. |
| `selectedInstanceIds[assetId]` | **`selectedEffectInstanceId: string \| null`** | Inspector effect selection is scoped to the single active layer's effect stack (`activeLayer.effectStack`), eliminating asset-keyed tracking. |
| `activeImageId` | **`activeFrameId + activeLayerId`** | Canvas composition identity replaces single-asset identity. Active asset is derived read-only. |

### 2.3 Sunset & Migration Plan for `activeImageId`

1. **Sub-Stage 1A (Transitional Compatibility)**:
   - `StudioContext` introduces `activeFrameId` and `activeLayerId`.
   - Exposes read-only compatibility getters (`activeAsset`, `activeImageId`, `activeEffectStack`, `activeBackground`) so existing UI panels and tests continue operating without immediate breaking changes.
2. **Sub-Stage 1B (Pipeline Transition)**:
   - WebGL2 rendering pipeline and export engine transition to consuming `Frame` and `Layer` structures directly.
3. **Sub-Stage 1C (UI Surface Migration)**:
   - UI surfaces (`InspectorPanel`, `FloatingEffectPanel`, `FloatingBackgroundPanel`, `CanvasControlDock`) migrate to consuming `activeLayerId` and layer actions directly.
4. **Post-Stage 1 Cleanup**:
   - Deprecated `activeImageId` compatibility getter is removed. Direct references across `src/` are permanently eliminated.

---

## 3. Background Ownership: Option B (`GenerativeLayer`)

The proposal evaluates two models for background ownership:
- **Option A (`Frame.background`)**: Background stored as a dedicated field on the `Frame` object.
- **Option B (`GenerativeLayer`)**: Background stored as a first-class `GenerativeLayer` at index 0 of `frame.layers`.

### Recommendation: Option B (`GenerativeLayer`) as Single Source of Truth

The revised architecture selects **Option B exclusively**. The `Frame` object does **not** maintain a separate `background` property.

#### Architectural Rationale:
1. **Unified Compositing Pipeline**: The WebGL2 compositor executes a single, uniform layer-accumulation loop. Option A would require maintaining a separate background-clear pass and an ad-hoc backdrop shader alongside the layer compositor.
2. **Protected Base Backdrop at Index 0**: In Stage 1, the base `GenerativeLayer` is fixed as a protected backdrop layer at `layers[0]`. It cannot be dragged above or reordered out of the base position, ensuring a stable background floor for the composition. `ImageLayer`s can be freely reordered among themselves in the visual stack above the backdrop.
3. **Standard Layer Controls**: `opacity`, `visible`, and `blendMode` work identically across all layers, eliminating duplicate background opacity controls.
4. **Clean Extension Point for Stage 2**: Stage 2 procedural patterns and sub-layers will live naturally inside `GenerativeLayer` without altering the `Frame` contract.
5. **No Split Brain**: Having only `GenerativeLayer.backgroundConfig` ensures there is never a conflict between `Frame.background` and layer state.
6. **Effect Stack Scope**: `GenerativeLayer` inherits `BaseLayer.effectStack` for domain consistency and future extensibility, but Stage 1 does not expose or execute the effect stack for the base GenerativeLayer. Background styling is limited strictly to the six existing background modes and their existing `BackgroundState` controls.

#### `FloatingBackgroundPanel` Transition:
The existing [`FloatingBackgroundPanel`](file:///Volumes/VikersPass/Work/Web%20Projects/Effectsio/src/components/layout/floating-background-panel.tsx) continues to function seamlessly:
- Instead of reading/mutating `backgrounds[activeImageId]`, it reads and mutates the base `GenerativeLayer` (`frame.layers.find(l => l.type === 'generative')`) of the active frame.
- Its parameter controls (colors, stops, padding, grid size, dot size) map directly to `baseGenerativeLayer.backgroundConfig`.

---

## 4. WebGL2 Multi-Layer Compositing Architecture

### 4.1 Render Target Analysis & Framebuffer Strategy

Compositing an arbitrary multi-layer frame requires safely supporting:
1. Source layer texture upload and procedural generation
2. Multi-pass effect execution per layer (ping-pong processing)
3. Accumulation of previous layers into a composite buffer
4. Blending the processed layer over the accumulated backdrop
5. Final blit to viewport or export buffer

#### Why 3 FBOs Cause Coupling Hazards:
In an architecture with only 3 FBOs (`AccumA`, `AccumB`, `Work`), if a layer requires 2 or more effect passes, `Work` alone cannot perform ping-pong without borrowing `AccumB`. However, if `AccumB` is used for layer effect passes, determining which buffer is the valid backdrop, which is the layer result, and which is the blend destination requires rotating buffer pointers dynamically. This introduces state-machine fragility, feedback-loop risks (sampling and writing to the same texture), and format lock-in.

#### Proposed Solution: The Decoupled 4-FBO Reusable Working Pool
Stage 1 allocates exactly **four shared FBO attachments** sized to the active frame dimensions, cleanly decoupled into two dedicated functional pairs:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Decoupled 4-FBO Reusable Working Set                                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ Accumulator Pair (2 FBOs)        │ Layer Ping-Pong Pair (2 FBOs)       │
│  - fboAccumulatorA               │  - fboLayerPing                     │
│  - fboAccumulatorB               │  - fboLayerPong                     │
│  Role: Cross-layer accumulation  │  Role: Intra-layer effect passes    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

```text
                                  ┌────────────────────────┐
                                  │   Source Image/Gen     │
                                  └───────────┬────────────┘
                                              ▼
┌──────────────────┐               ┌───────────────────────┐
│  fboLayerPing    │ ◄───────────► │     fboLayerPong      │ (Intra-layer effect ping-pong)
└──────────────────┘               └───────────┬───────────┘
                                               ▼
                                   [Layer Output Texture]
                                               │
                                               ▼
┌───────────────────────┐          ┌───────────────────────┐
│   fboAccumulatorA     │ ───────► │   Compositing Pass    │ ──────►  fboAccumulatorB
│ (Accumulated Backdrop)│          │ (Blend Mode + Opacity)│          (New Accumulation)
└───────────────────────┘          └───────────────────────┘                    │
           ▲                                                                    │
           └────────────────────────── Swap Targets ◄───────────────────────────┘
```

#### Resource Classification:
- **Framebuffer Objects (4 FBOs)**: Reusable GL framebuffer handles (`gl.createFramebuffer()`).
- **Attached Color Textures (4 Textures)**: Full-resolution RGBA8 textures attached to `COLOR_ATTACHMENT0` of the 4 FBOs.
- **Source Textures**: GPU textures uploaded from immutable asset bitmaps via `uploadTexture()`.
- **Temporary Pass Textures**: Color attachments of `fboLayerPing`/`fboLayerPong` during effect passes.
- **Accumulation Targets**: Color attachments of `fboAccumulatorA`/`fboAccumulatorB` during composite passes.

### 4.2 GPU Working-Set Memory vs. Total System VRAM

#### Compositor Working-Set Allocation:
The working set is sized to the frame resolution and is **independent of layer count**:
$$\text{Buffer Size} = \text{width} \times \text{height} \times 4\text{ bytes (RGBA8)}$$
- At 1080p ($1920 \times 1080$): $4 \times 8.29\text{ MB} \approx \mathbf{33.2\text{ MB}}$
- At 4K ($3840 \times 2160$): $4 \times 33.18\text{ MB} \approx \mathbf{132.7\text{ MB}}$

> [!IMPORTANT]
> **GPU Memory & Performance Scope Clarification**:  
> **The reusable compositor working-set allocation is independent of layer count because the same intermediate buffers are reused sequentially. Total GPU memory consumption and rendering cost can nevertheless increase with the number, resolution, and complexity of layers, source textures, cached assets, and effect passes.**
>
> To preserve technical precision:
> - **Working-set allocation**: Approximately ~33.2 MB at 1080p and ~132.7 MB at 4K for four RGBA8 full-resolution attachments.
> - **Total GPU resource usage**: Also includes source asset textures, cached textures, shader/program resources, and browser/WebGL context overhead.
> - **Rendering cost**: Can increase with layer count, effect-stack depth, shader complexity, texture sampling, framebuffer passes, and 4K fill rate.
> - The 4-FBO architecture guarantees a bounded reusable compositor working set, but does NOT claim a fixed total VRAM footprint or an unconditional frame-time guarantee under arbitrary project complexity.

### 4.3 Execution Flow & Multi-Layer Accumulation Loop

```text
1. Prepare Viewport: Set gl.viewport(0, 0, frame.width, frame.height)
2. Initialize Accumulator:
   - Bind fboAccumulatorA -> Clear to (0, 0, 0, 0)
3. For each layer in frame.layers (ordered bottom-to-top):
   a. If !layer.visible or layer.opacity == 0: continue
   b. Generate Layer Base Content into fboLayerPing:
      - If GenerativeLayer (index 0): Execute procedural background shader (solid, gradient, grid, dots)
      - If ImageLayer (indices 1..N): Draw source asset texture fitted to frame bounds ("contain" | "cover")
   c. Execute Layer Effect Stack (Intra-Layer Ping-Pong):
      - If layer.type === "image" && layer.effectStack has active effects:
        - Ping-pong through fboLayerPing <-> fboLayerPong using existing PingPongManager logic
        - Final layer result resolves to texLayerOutput
      - Else (GenerativeLayer or ImageLayer without effects):
        - texLayerOutput = fboLayerPing.texture
   d. Composite Layer over Backdrop:
      - Bind fboAccumulatorB as render target
      - Bind fboAccumulatorA.texture to Texture Unit 0 (u_backdrop)
      - Bind texLayerOutput to Texture Unit 1 (u_source)
      - Execute BLEND_COMPOSITE_SHADER with layer.blendMode, layer.opacity, and premultiplied alpha
      - Swap Accumulator pointers: (fboAccumulatorA <-> fboAccumulatorB)
4. Final Presentation Pass:
   - Bind WebGL canvas default drawing buffer (or export canvas)
   - Blit fboAccumulatorA applying Viewport Camera Matrix (pan, zoom, split comparison)
```

### 4.4 Two Distinct Blend-Mode Levels & Premultiplied Alpha

1. **Per-Effect Blend Mode**: Lives inside an `ImageLayer`'s effect stack. Controls how an individual effect instance interacts with the intermediate result of the effect pass beneath it within that single layer.
2. **Per-Layer Blend Mode**: Lives on `BaseLayer.blendMode`. Controls how the completed, fully processed layer texture blends onto the accumulated backdrop in `fboAccumulatorB`.

#### GLSL ES 3.00 Blend Shader & Premultiplied Alpha:
The compositing pass uses strict premultiplied alpha equations to avoid dark fringes or halos on semi-transparent borders:

$$\alpha_{src} = \text{top}.\alpha \times \text{u\_opacity}, \quad \alpha_{dst} = \text{base}.\alpha$$
$$\alpha_{out} = \alpha_{src} + \alpha_{dst} \times (1.0 - \alpha_{src})$$
$$\mathbf{C}_{blended} = \mathcal{B}(\mathbf{C}_{dst}, \mathbf{C}_{src})$$
$$\mathbf{C}_{out} = \mathbf{C}_{blended} \times \alpha_{src} \times \alpha_{dst} + \mathbf{C}_{src} \times \alpha_{src} \times (1.0 - \alpha_{dst}) + \mathbf{C}_{dst} \times \alpha_{dst} \times (1.0 - \alpha_{src})$$

The Stage 1 shader implements the selected 12 W3C blend modes: `normal`, `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `hard-light`, `soft-light`, `difference`, and `exclusion`.

### 4.5 Viewport Pan/Zoom Performance Invariant

To preserve the ~60 FPS viewport performance established in recent optimization passes:
- Canvas panning, wheel zoom, and Fit-to-Screen execute **exclusively during the final presentation pass** (Step 4).
- Panning or zooming requires **zero re-compositing of layers or effect stacks**. Re-compositing is triggered strictly when layer parameters, layer visibility, or frame dimensions change.

---

## 5. IndexedDB v1 $\to$ v2 Migration Strategy

### 5.1 Database Upgrade Contract

The database version in [`src/storage/db.ts`](file:///Volumes/VikersPass/Work/Web%20Projects/Effectsio/src/storage/db.ts) increments from `1` to `2`.

```typescript
// Proposed IDB upgrade handler in db.ts
dbRequest.onupgradeneeded = (event) => {
  const db = dbRequest.result;
  if (event.oldVersion < 2) {
    if (!db.objectStoreNames.contains("frames")) {
      db.createObjectStore("frames", { keyPath: "id" });
    }
  }
};
```

### 5.2 Migration Properties & Failure Recovery

- **Non-Destructive Data Preservation**:
  - Source asset bitmaps in `assets` store remain 100% untouched.
  - Legacy `effect_stacks` and `backgrounds` object stores are read but **not deleted**, ensuring legacy records remain available during transition.
- **Transactional Failure Recovery**:
  - Entire migration runs inside a single IDB read-write transaction covering `assets`, `effect_stacks`, `backgrounds`, `frames`, and `app_state`.
  - If any error occurs during synthesis, the transaction automatically aborts, leaving the database in its valid v1 state without partial or corrupted frame records.
- **Idempotency**:
  - Migration checks `frames.count()`. If existing frames are detected, synthesis is skipped to prevent duplicate frame generation on repeated initializations.

### 5.3 Migration Model Justification: 1 Frame Per Asset

In the current single-asset application:
- Each asset in the library represents an independent editable canvas artwork with its own associated `effectStacks[assetId]` and `backgrounds[assetId]`.
- Switching between assets in the Asset Panel switches the entire canvas content, effects, and backdrop.

Therefore, the least surprising, non-destructive migration mapping is **one Frame per Asset**:
1. For each `Asset`, synthesize one `Frame`:
   - `dimensions`: Inherited from asset intrinsic `width` and `height`.
   - `Layer 0 (GenerativeLayer)`: Initialized from `backgrounds[asset.id]` (or default transparent).
   - `Layer 1 (ImageLayer)`: References `asset.id`, `fit: "contain"`, initialized with `effectStacks[asset.id]`.
2. `activeFrameId` is set to the frame corresponding to the previously active asset (`app_state.activeImageId`).
3. **Empty Project Case (Zero Assets)**: Synthesizes exactly one default Frame ($1080 \times 1080$, preset `"1:1"`, with default `GenerativeLayer`).

---

## 6. UI Scope & Existing Functionality Impact

### 6.1 Stage 1 UI Scope Boundary

```text
┌────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ REQUIRED IN STAGE 1                                    │ DEFERRED (STAGES 2 & 3)                                │
├────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ • Active Frame editing & rendering                     │ • Multi-frame switcher UI / canvas layout mode         │
│ • Active Layer selection (activeLayerId)               │ • Interactive layer transform handles (drag/scale/rot) │
│ • ImageLayer placed with frame fitting (contain/cover) │ • Layer transform persistence (x, y, scale, rotation)  │
│ • GenerativeLayer base backdrop editing                │ • Stage 2 generative sub-layers (13 full categories)   │
│ • Layer visibility toggle                              │ • Multi-layer selection in canvas (selectedLayerIds)   │
│ • Layer opacity slider (0 - 100%)                      │ • Multi-track animation timeline integration           │
│ • Layer-level blend mode selector (12 modes)           │ • Layer masking / clipping paths                       │
│ • Layer reordering (ImageLayers only; backdrop fixed) │ • Vector shapes or text layers                         │
│ • Frame Size Selector dock button & presets popover    │ • Nested groups / pre-comps                            │
│ • Frame export (GPU canvas export of composed frame)   │                                                        │
└────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

### 6.2 Existing Functionality Impact Matrix

| Feature / UI Component | Classification | Transitional Behavior |
| :--- | :--- | :--- |
| **Image Ingestion** | Preserved | Ingestion saves asset bitmap to `assets` store and appends a new `ImageLayer` to the active frame. |
| **Asset Library Selection** | Preserved | `selectedAssetIds: Set<string>` in `AssetPanel` remains independent multi-selection for library batch actions. |
| **Effect Stack Editing** | Preserved | Edits target `activeLayer.effectStack` instead of `effectStacks[activeImageId]`. |
| **Floating Background Panel** | Preserved | Mutates the base `GenerativeLayer` of the active frame. |
| **Layer Reordering** | Adapted | `ImageLayer`s can be reordered among themselves above index 0; base `GenerativeLayer` remains fixed at index 0. |
| **Undo / Redo History** | Adapted | History captures full `Frame` composition snapshots (`frames`, `activeFrameId`, `activeLayerId`). |
| **Batch Look Application** | Adapted | Applying a Look to multiple selected assets in `AssetPanel` clones the effect stack into each corresponding asset's `ImageLayer`. |
| **Export Engine** | Adapted | `GPUSurfaceRenderer` renders the accumulated frame texture at native dimensions rather than a single asset quad. |
| **Split Comparison View** | Preserved | Compares the active layer's raw source asset bitmap against the fully accumulated composite. |
| **Canvas Pan / Zoom** | Preserved | Pan and zoom transforms apply to the presentation quad without re-compositing layers. |
| **Frame Size Selector** | Adapted | Existing dock button opens canonical popover with Square, Free, Landscape, and Portrait presets, mutating `frame.dimensions`. |

---

## 7. Migration Sequence, Effort & Risk Assessment

### 7.1 Phased Implementation Sequence

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Sub-Stage 1A: State Model & Context Migration                          │
│  - Define Frame, Layer, BlendMode types in src/types/frame.ts          │
│  - Upgrade IndexedDB to v2 with non-destructive migration in db.ts     │
│  - Wire StudioContext with Frame/Layer store + transitional adapters   │
│  - Verification: 100% existing test suites pass; 0 visual regressions  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sub-Stage 1B: Multi-Layer WebGL2 Compositing Engine                    │
│  - Implement Decoupled 4-FBO working set in webgl-fbo.ts               │
│  - Implement GLSL ES 3.00 blend mode shaders in shaders/blend-modes.ts │
│  - Implement multi-layer accumulation loop in GPUEffectPipeline        │
│  - Verification: GPU compositing tests & blend parity tests pass       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Sub-Stage 1C: UI Surfaces & Frame Presets                              │
│  - Wire Frame Size Selector dock button (Square/Free/Landscape/Port)   │
│  - Implement Layers Panel (ImageLayer reorder, visibility, opacity)   │
│  - Connect Inspector to activeLayer scope                              │
│  - Verification: Full end-to-end interactive manual & automated QA     │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Effort & Risk Assessment
- **Overall Effort: High**  
  - *Reasoning*: Touches core TypeScript models, storage migration, global context state, GLSL shaders, multi-pass accumulation loops, and UI control docks across the application shell.
- **State Migration Risk (Medium)**: 117 usages of `activeImageId` across 15 files. Mitigated by deploying backward-compatible context adapters in Sub-Stage 1A so existing consumers continue functioning throughout the transition.
- **Persistence Risk (Low-Medium)**: Mitigated by non-destructive, idempotent IDB migration with transactional abort on failure and preservation of legacy records.
- **Rendering Risk (Medium-High)**: Compositing multi-layer stacks at 60 FPS without VRAM overruns. Mitigated by the Decoupled 4-FBO Working Pool.
- **UI Integration Risk (Low-Medium)**: Mitigated by strictly consuming canonical EffectsIO shared primitives (`Button`, `SegmentedControl`, `SelectControl`, `SliderControl`) with zero bespoke widgets.
- **Regression Risk (Medium)**: Mitigated by the 3-sub-stage sequence and automated test suites.

### 7.3 The Single Biggest Technical Risk
> **The Single Biggest Technical Risk**: Preserving the ~60 FPS WebGL2 rendering pipeline and low-latency slider reactivity when compositing multi-layer stacks, without causing GPU VRAM overruns or redundant per-layer render passes.
>
> *Mitigation*: The proposed **Decoupled 4-FBO Working Pool** bounds compositor working memory strictly to frame resolution ($\approx 132.7\text{ MB}$ at 4K), decouples intra-layer effect ping-pong from accumulation, skips inactive/invisible layers, and separates presentation pan/zoom from composition re-rendering.

---

## 8. Recommendation

### **APPROVE**

**Architecture to be Implemented**:
Implement the revised **Frame & Layer Architecture** featuring:
1. **Domain Model**: `Frame` with ordered `Layer[]` (`ImageLayer` and `GenerativeLayer` discriminated union) supporting multi-frame collections (`frames: Frame[]`, `activeFrameId: string`). No layer transforms in Stage 1.
2. **Background Ownership**: Adopt **Option B (`GenerativeLayer`)** exclusively as the protected base layer at index 0 of the frame stack. `Frame` owns no separate `background` property. Stage 1 background styling is limited strictly to the 6 existing background modes; `effectStack` is reserved but inactive.
3. **Compositing Engine**: Decoupled **4-FBO Working Pool** (Accumulator Pair + Layer Ping-Pong Pair) with 12 W3C blend modes implemented in GLSL ES 3.00, strictly separating layer effect execution from composition accumulation.
4. **Active Editing Invariant**: Migrate to `activeFrameId + activeLayerId` as the sole source of truth, with active asset derived read-only.
5. **Rollout Phasing**: Three-part staged sequence (Sub-Stage 1A: State Model & Context Migration; Sub-Stage 1B: Multi-Layer WebGL2 Compositing Engine; Sub-Stage 1C: UI Surfaces & Frame Presets).

---

## 9. Single Project-Owner Decision Question

> **Owner Decision:** Do you approve the revised Stage 1 (Frame & Layer Architecture) proposal—including the domain model (Frame/Layer discriminated union with no layer transforms in Stage 1), the protected GenerativeLayer base backdrop at index 0, the `activeFrameId + activeLayerId` editing invariant, the Decoupled 4-FBO WebGL2 compositor with 12 blend modes, the non-destructive v1→v2 IndexedDB migration, and the three-part phased rollout (1A: State/Context, 1B: WebGL Compositing, 1C: UI Surfaces)—for implementation?

---

## 10. Mechanical Approval Gate Status

Per `AGENTS.md` Rule 12, mechanical approval gate verification was executed at the conclusion of this session:

```text
$ pnpm verify:approvals

> effectsio@ verify:approvals /Volumes/VikersPass/Work/Web Projects/Effectsio
> node scripts/check-approval-gates.mjs

=== Mechanical Approval Gate Verification ===

Found 0 active decision gate(s) in docs/buildkit/.
Found 2 approval file(s) in docs/approvals/.


❌ APPROVAL GATE VERIFICATION FAILED
The following 1 gate(s) require explicit project-owner approval before implementation can proceed:

- docs/approvals/stage-1-frame-layer-review.md [Approval Packet]: Review packet docs/approvals/stage-1-frame-layer-review.md is PENDING and has not been signed with "APPROVED: <date>"

Per AGENTS.md Rule 12, implementation CANNOT proceed past an owner decision gate without a matching docs/approvals/<phase-slug>.md containing "APPROVED: <date>".
 ELIFECYCLE  Command failed with exit code 1.
```

### Confirmation:
- The required approval file `docs/approvals/stage-1-frame-layer.md` **does NOT exist**.
- The review packet `docs/approvals/stage-1-frame-layer-review.md` is **PENDING OWNER REVIEW**.
- **Stage 1 implementation is completely blocked.**
- **No application implementation code was written or modified.**
