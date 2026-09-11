# Phase 4 — UI & Panels Alignment: Approval Proposal

## 1. Approval Status

```text
STATUS: PENDING PROJECT OWNER APPROVAL
```

This document is an **implementation approval proposal only**. In accordance with `AGENTS.md` Rule 12, Phase 4 implementation must not begin until the project owner explicitly approves the proposal and records the approval signature in Section 17 of this document.

### Mechanical Approval Gate Status (`pnpm verify:approvals`)

- **Prerequisite Shipped Gates:**
  - `unified-composition-model`: **APPROVED** (`2026-09-08`)
  - `phase-2-persistence-schema`: **APPROVED** (`2026-09-02`)
  - `phase-3-studio-context`: **APPROVED** (`2026-09-09`)
  - `stage-1-frame-layer`: **APPROVED** (`2026-09-05`)
- **Phase 4 Approval Gate (`phase-4-ui-panels.md`):** **PENDING PROJECT OWNER APPROVAL** (Exit Code 1).
- **Overall Verifier Status:** Intentionally blocked as designed. Implementation cannot proceed until explicit project owner sign-off.

---

## 2. Repository Baseline

- **Current Audited HEAD:** `5cb57d53863ac7ab9ffd42dfdab7f89a4ea2987a`
- **Current Branch:** `main`
- **Working Tree State:** Clean with respect to application source code. Zero changes to `src/`, tests, shaders, configuration, or runtime code. Only `docs/approvals/phase-4-ui-panels.md` and development-time graphify caches are modified.
- **Base Implementation Commit:** `99cf30deb26e09d21194b2b73a7162d0961e8c5e` (Phase 3 Studio Context & Active Editing State completion). All subsequent commits (`c0f5cb3`, `9d571ff`, `4bd3bf4`, `5cb57d5`) are documentation updates and audit proposals.
- **Historical Approval Records:** All previous approval records in `docs/approvals/` remain intact and authoritative.

---

## 3. Canonical Architecture Hierarchy & Rules

The repository's authoritative composition model hierarchy is:

```text
Project
└── Frame (composition boundary, dimensions, export settings)
    ├── Group (single-tier organizational container, optional — Phase 5)
    │   └── Layer
    │       └── Source
    └── Layer (universal independently composited visual object)
        └── Source (content generator: ImageSource | ProceduralSource)
            └── Effect Stack (intra-layer pixel modification pipeline)
```

### Architectural Principles & Invariants

1. **`Layer`** is the universal, independently composited visual element. Every `Layer` owns an `effectStack: EffectStackItem[]`, spatial `transform`, compositing `opacity` and `blendMode`, interaction state `locked`, and rendering state `visible`.
2. **`Source`** (`layer.source`) is the sole authoritative generator of pixels for a layer.
3. **`layer.source.type`** is the **sole canonical semantic content discriminator** (`"image"` vs `"procedural"`).
4. **Interaction vs Type:** `locked` is strictly an **interaction state**, never a layer type. It governs user interaction (selection, dragging, deletion, transformation).
5. **Rendering vs Type:** `visible` is strictly a **rendering visibility flag**, never a layer type.
6. **Compositing vs Type:** `opacity` (0.0 to 1.0) and `blendMode` are **compositing parameters**, never layer types.
7. **Organization vs Type:** `groupId` is an **organizational containment pointer**, never a layer type.
8. **Universal Effect Stack:** `effectStack` is an intra-layer processing pipeline available universally on all layers regardless of source type.
9. **Background as a Creative Role:** Background is a visual role filled by an ordinary canonical `Layer` with `source: ProceduralSource` positioned at index 0 of the frame's layer array.

### Prohibited Entities

Phase 4 introduces **zero** instances of:
- `BackgroundLayer` or `GenerativeLayer` as document model types.
- `ProceduralLayer`, `MaterialLayer`, or `SimulationLayer` as document types.
- `BackgroundStack` as a document primitive.

---

## 4. Current Implementation Reality

Forensic inspection of the codebase at commit `5cb57d53863ac7ab9ffd42dfdab7f89a4ea2987a` establishes the following concrete facts:

### 4.1 Active Editing Model (`src/context/studio-context.tsx`)
- **Authoritative State:** `activeFrameId` (line 284) and `activeLayerId` (line 286) are the sole authoritative state values in `StudioContext`.
- **Derived Lookups:** `activeFrame` (lines 387–390) and `activeLayer` (lines 393–396) resolve strictly by ID without silent fallbacks.
- **Compatibility Getter:** `activeImageId` (lines 399–408) is a derived `useMemo` getter returning `activeLayer.source.assetId` for image sources, and `null` for procedural sources, backdrops, or empty frames.
- **Universal Effect Stack:** `activeEffectStack` (lines 433–437) resolves `activeLayer?.effectStack ?? legacyAssetStack ?? []`.

### 4.2 Context Mutation Infrastructure (`src/context/studio-context.tsx`)
- `mutateLayerStack` (lines 1533–1565) **already accepts `targetId: string`** and resolves `l.id === targetId` as Priority 1 (line 1553).
- All effect stack action signatures (`addEffectToStack`, `reorderEffectStack`, `updateInstanceParameters`, `resetInstanceParameters`, `toggleInstanceEnabled`, `removeInstanceFromStack`, `selectInstance`) accept `targetId: string` and route to `mutateLayerStack`.
- `StudioContext` **already has full mutation infrastructure** for layer-targeted effect operations. No context rewrite is required for Phase 4.

### 4.3 WebGL Compositor Capability (`src/rendering/webgl/webgl-frame-compositor.ts`)
- The compositor already iterates `frame.layers` bottom-to-top (`i = 0..N-1`) without special index-0 branching (lines 355–385).
- Dispatches canonical sources: `source?.type === "image"` calls `renderImageSourceLayer` (line 372); `source?.type === "procedural"` calls `renderProceduralSourceLayer` (line 374).
- `renderProceduralSourceLayer` (lines 704–779) **already executes intra-layer effect stacks** via `executeLayerEffectStack(layerPP, layer, frameWidth, frameHeight, time)` (line 778).
- The compositor already fully supports procedural layers with effects, transforms, opacity, and blend modes.

### 4.4 Layers Panel Current State (`src/components/layout/layers-panel.tsx`)
- Maintains a legacy dual-region layout: filters `imageLayers` using deprecated `l.type === "image"` (line 303) for sorting, and filters `baseBackground` using deprecated `l.type === "generative"` (line 299) to render separately via `BackgroundRow` (lines 459–478).
- `SortableLayerRow` (line 48) requires `ImageLayer` and reads `layer.assetId`, making procedural layers invisible in the row list.
- Backdrop deletion is permitted via `removeLayer(baseBackground.id)` (line 475).
- Zero Group UI rendering exists.

### 4.5 Inspector Panel Current State (`src/components/layout/inspector-panel.tsx`)
- Destructures `activeImageId` (line 177).
- Gates body population on legacy types: `isImageLayerActive = activeLayer?.type === "image" || Boolean(activeAsset)` (line 265) and `isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative"` (line 266).
- When a canonical layer with `source.type === "procedural"` is active (without `type: "generative"`), `isPopulated` evaluates to `false`, rendering an empty inspector.
- Hides Effects and Looks sections when `isGenerativeLayerExplicitlyActive` is true (lines 619, 679).
- Passes `activeImageId` to effect mutation callbacks (lines 249, 654, 656, 661, 662, 665, 666, 748, 751, 933, 934), causing silent no-ops when procedural layers are active.

### 4.6 Floating Panels & Dock Current State
- `floating-effect-panel.tsx`: Visibility gated on `!activeAsset || !activeImageId || !selectedInstance || !definition` (line 125). Passes `activeImageId` to parameter updates.
- `floating-background-panel.tsx`: Visibility gated on `activeLayer?.type !== "generative"` (line 155).
- `canvas-control-dock.tsx`: Destructures `activeImageId` (line 53); gates effect additions on `if (activeImageId)` (lines 360–361).

---

## 5. Group Decision: Explicit Deferral to Phase 5

### 5.1 Codebase Audit of Groups
1. **Data Model:** `Group` interface (`src/types/frame.ts:120-129`), `BaseLayer.groupId?: string | null` (line 143), `Frame.groups?: Group[]` (line 259), and `createGroup()` helper (line 527) exist and are fully typed.
2. **Persistence:** `src/storage/db.ts` preserves and hydrates `groups: frame.groups || []` (lines 194, 586).
3. **Runtime State:** `StudioContext` contains **zero** Group mutation actions (`createGroup`, `removeGroup`, `updateGroup`, `toggleGroupCollapse` do not exist). `StudioContext` only supports single-target `activeLayerId`; group selection and multi-selection (`selectedLayerIds`) do not exist.
4. **UI:** `src/components/layout/layers-panel.tsx` contains **zero** Group rendering, indentation, or group drag-and-drop logic.
5. **Interaction:** Groups cannot currently be created, collapsed, renamed, locked, hidden, or reordered.

### 5.2 Architectural Decision: Option B (Deferred to Phase 5)
Groups are **strictly deferred to Phase 5**.

**Rationale:**
- Attempting to implement Group UI in Phase 4 would require introducing multi-layer selection or group selection state into `StudioContext`, designing group hierarchy reordering in `@dnd-kit`, and inventing tree state management.
- Mixing Group implementation into Phase 4 would destabilize the core goal of Phase 4 (aligning the 5 primary UI panels with the canonical `activeLayerId` and `LayerSource` model).
- Group data structures and persistence remain preserved, but **all Group UI (`GroupRow`, tree indentation) and Group state operations are excluded from Phase 4**.

---

## 6. Backdrop Architecture & Interaction Model

### 6.1 Current Repository Implementation
- `createDefaultBackdropLayer()` in `src/types/frame.ts:331-370` creates an ordinary `Layer` with `source: { type: "procedural", kind: "solid", parameters: { color: "#000000" } }` at index 0.
- **Empirical Finding:** It currently leaves `locked: undefined`.
- `createDefaultFrame()` (`src/types/frame.ts:552`) places this backdrop at index 0: `layers: [baseBackdrop]`.
- The WebGL compositor treats index 0 with zero special-case logic; it renders it as an ordinary procedural layer.
- `layers-panel.tsx:475` currently permits backdrop deletion via `removeLayer(baseBackground.id)`.

### 6.2 Proposed Phase 4 Interaction Model
Backdrop is an ordinary canonical `Layer` with a procedural source, protected strictly by **interaction constraints**:

1. **Explicit Lock State:** `createDefaultBackdropLayer()` will initialize `locked: true`.
2. **Non-Draggable:** In `layers-panel.tsx`, `SortableLayerRow` passes `disabled={layer.locked}` to `useSortable`, mechanically preventing dragging the backdrop row.
3. **Reorder Clamping:** In `layers-panel.tsx:handleDragEnd`, destination index is clamped: `toIndex = Math.max(1, newIndex)`, preventing any other layer from being dragged beneath the backdrop.
4. **Non-Deletable:** In `SortableLayerRow`, the delete button is conditionally hidden or disabled when `layer.locked === true` (`canDelete={!layer.locked}`).
5. **Full Feature Parity:** The backdrop layer can still be selected (`activeLayerId = backdrop.id`), its visibility toggled, its procedural source parameters edited, and intra-layer effects applied to it.

---

## 7. Investigation of `createDefaultGenerativeLayer()`

- **Implementation (`src/types/frame.ts:373-377`):**
  ```typescript
  export function createDefaultGenerativeLayer(backgroundConfig?: BackgroundState): GenerativeLayer {
    const backdrop = createDefaultBackdropLayer(backgroundConfig);
    delete (backdrop as any).source;
    return backdrop as GenerativeLayer;
  }
  ```
- **Analysis:**
  - `createDefaultGenerativeLayer()` explicitly deletes `.source` to construct a legacy layer shape lacking canonical `source`.
  - This was implemented during Phase 2/3 as an **intentional compatibility adapter** so that legacy test suites (e.g. `webgl-frame-compositor.test.ts` testing `renderLegacyCompatibilityLayer`) and legacy asset-mock frames in `studio-context.tsx:723, 1331` continue functioning.
- **Classification:** **Implemented and intentional legacy compatibility / requires later cleanup**.
- **Phase 4 Action:** **Safe to leave unchanged in Phase 4**. Phase 4 UI panels consume canonical `Layer` and `createDefaultBackdropLayer()`. Touching `createDefaultGenerativeLayer()` is out of scope for Phase 4 and belongs to downstream test suite modernization.

---

## 8. Source Discriminator Audit

Grep inspection of `type === "image" | type === "generative" | type === "procedural"` across `src/components` and `src/context` reveals 3 distinct usage categories:

| Usage Category | Instances | Current State | Phase 4 Action |
|----------------|-----------|---------------|----------------|
| **1. Incorrect UI Architecture** | `layers-panel.tsx:299, 303`, `inspector-panel.tsx:265, 266, 449, 482, 500` | Filters/gates UI based on deprecated `layer.type === "image"` and `layer.type === "generative"`. Hides procedural layers and blocks effects. | **Replace entirely** with canonical `layer.source.type === "image"` and `layer.source.type === "procedural"`. |
| **2. Canonical Source Discrimination** | `webgl-frame-compositor.ts:371, 373`, `studio-context.tsx:401`, `phase-3-active-state.test.tsx` | Checks `source.type === "image"` or `source.type === "procedural"`. Authoritative discriminator. | **Preserve**. This is the standard Phase 4 UI components must adopt. |
| **3. Legacy Compatibility Fallbacks** | `studio-context.tsx` (getter fallbacks, snapshot hydration), `webgl-frame-compositor.ts:243, 250, 439` | Fallbacks for unmigrated frame objects lacking `source`. | **Preserve temporarily**. Required for backward compatibility and test mock safety. |

**Canonical Rule:** The semantic discriminator is strictly **`layer.source.type`**. Never use `locked`, `visible`, `opacity`, or other interaction/rendering properties as type discriminators.

---

## 9. Complete `activeImageId` Classification Matrix

Grep analysis identifies 62 occurrences of `activeImageId` across `src/`. They are classified into 4 strict categories:

| Category | File & Location | Symbol / Component | Current Behavior | Reason & Proposed Phase |
|----------|-----------------|--------------------|------------------|-------------------------|
| **A. MUST MIGRATE IN PHASE 4** | `inspector-panel.tsx:177, 243, 249, 654, 656, 661, 662, 665, 666, 748, 751, 933, 934` | `InspectorPanel` | Uses `activeImageId` for effect action callbacks and section rendering. | In canonical model, `activeLayer.id` is the target for effects. When procedural layers are active, `activeImageId` is `null`. Replace with `activeLayer.id`. (Phase 4) |
| **A. MUST MIGRATE IN PHASE 4** | `floating-effect-panel.tsx:23, 125, 130, 131, 136, 137, 259, 261, 271, 294, 321, 323, 345, 347, 365, 367, 385, 387` | `FloatingEffectPanel` | Gated on `activeImageId`; passes `activeImageId` to parameter updates. | Prevents editing effect parameters on procedural layers. Replace gate with `activeLayer && activeLayerId`; pass `activeLayerId`. (Phase 4) |
| **A. MUST MIGRATE IN PHASE 4** | `canvas-control-dock.tsx:53, 360, 361` | `CanvasControlDock` | Gated on `activeImageId`; passes `activeImageId` to `addEffectToStack`. | Prevents adding effects from dock when a procedural layer is active. Replace with `activeLayerId`. (Phase 4) |
| **B. RETAIN FOR COMPATIBILITY** | `studio-context.tsx:100, 399–408, 532, 545, 572, 602, 694, 741, 772, 857, 1825, 2498, 2606, 2833` | `StudioContext` | Derived compatibility getter (`useMemo`), ref sync, snapshot serialization, `setActiveImageId` adapter. | Legitimate compatibility adapter for external non-UI consumers and legacy snapshots. Retain in Phase 4. Defer removal to Phase 5+. |
| **B. RETAIN FOR COMPATIBILITY** | `db.ts:51, 336, 343, 359, 366, 372, 376, 389, 401, 407, 409, 485, 524, 635` | `EffectsDatabase` | Database schema v1/v2 field; session hydration fallback. | Required for backward compatibility with older database projects lacking frame metadata. Retain in Phase 4. Defer to Phase 5+. |
| **B. RETAIN FOR COMPATIBILITY** | `history.ts:18` | `SnapshotMetadata` | Metadata field in undo/redo history snapshots. | Required for backward compatibility of undo/redo states. Retain in Phase 4. Defer to Phase 5+. |
| **B. RETAIN FOR COMPATIBILITY** | `asset-panel.tsx:33, 76, 277` | `AssetPanel` | Fallback highlight on asset tiles when `selectedAssetIds` is empty. | Asset library UI selection highlight, not canvas editing identity. Retain in Phase 4. Defer to Asset Library modernization. |
| **C. REMOVE NOW** | `inspector-panel.tsx:177`, `floating-effect-panel.tsx:23`, `canvas-control-dock.tsx:53` | Destructuring imports | Destructures `activeImageId` from `useStudioStore()`. | Dead / redundant destructuring once UI actions migrate to `activeLayerId`. Remove immediately during Phase 4 edits. |
| **D. DEFER TO LATER PHASE** | `canvas-viewport.tsx` (consumes `activeAsset`) | `CanvasViewport` | Consumes `activeAsset` for image bitmap decoding and WebGL texture upload. | Multi-layer canvas texture rendering requires dedicated offscreen viewport texture pipeline. Defer to Viewport Milestone. |

---

## 10. Audit of the Five UI Surfaces

### Surface 1: `src/components/layout/layers-panel.tsx`
- **CURRENT:** Dual-region list separating `imageLayers` (sorted in `SortableContext`) from `baseBackground` (rendered in separate `BackgroundRow`). `SortableLayerRow` requires `ImageLayer` and `assetId`. Backdrop can be deleted.
- **PROBLEM:** Procedural layers cannot appear in the layer stack; backdrop is isolated and deletable; legacy `layer.type` used for filtering.
- **PHASE 4 CHANGE:** Unify all layers into a single list rendered bottom-to-top (visually reversed). Extend `SortableLayerRow` to accept canonical `Layer`, rendering image thumbnails for `source.type === "image"` and procedural swatches for `source.type === "procedural"`. Disable dragging and deletion on backdrop via `disabled={layer.locked}` and `canDelete={!layer.locked}`. Clamp reorders in `handleDragEnd` to `toIndex = Math.max(1, newIndex)`. Delete obsolete `sortable-background-row.tsx`.
- **NOT PHASE 4:** Group UI (`GroupRow`, tree indentation, group collapse/reorder).

### Surface 2: `src/components/layout/inspector-panel.tsx`
- **CURRENT:** Destructures `activeImageId`. Gates population on `activeLayer?.type === "image"` and `type === "generative"`. Hides Effects and Looks for generative layers. Passes `activeImageId` to effect callbacks.
- **PROBLEM:** Blank inspector when selecting canonical procedural layers. Artificial exclusion of effects from procedural layers. Effect actions fail on non-image layers.
- **PHASE 4 CHANGE:** Remove `activeImageId`. Gate `isPopulated = Boolean(activeLayer)`. Render canonical 3-tier hierarchy:
  1. **Tier 1 (Source Properties):** Image metadata & fit mode for `image` source; procedural parameter controls (color/gradient/pattern) for `procedural` source.
  2. **Tier 2 (Layer Properties):** Opacity slider, Blend Mode selector, Transform controls (`x`, `y`, `scaleX`, `scaleY`, `rotation`).
  3. **Tier 3 (Effects & Looks):** Universal Effect Stack and Looks for all layer types. Route all callbacks to `activeLayer.id`.
- **NOT PHASE 4:** Group properties inspector; multi-layer batch property editing.

### Surface 3: `src/components/layout/floating-effect-panel.tsx`
- **CURRENT:** Visibility gated on `!activeAsset || !activeImageId || !selectedInstance || !definition`. Passes `activeImageId` to `updateInstanceParameters`.
- **PROBLEM:** Refuses to open or render when a procedural layer is active. Effect parameter edits fail.
- **PHASE 4 CHANGE:** Remove `activeAsset` and `activeImageId`. Gate visibility on `!activeLayer || !activeLayerId || !selectedInstance || !definition`. Pass `activeLayerId` to all parameter mutation callbacks.
- **NOT PHASE 4:** Parameter widget redesigns or floating window mechanics changes.

### Surface 4: `src/components/layout/floating-background-panel.tsx`
- **CURRENT:** Visibility gated on `activeLayer?.type !== "generative"`.
- **PROBLEM:** Uses legacy type discriminator instead of canonical `source.type`.
- **PHASE 4 CHANGE:** Gate visibility on `activeLayer?.source?.type !== "procedural"`. Mutate parameters on `activeLayer.source.parameters`.
- **NOT PHASE 4:** Adding new procedural shader algorithms.

### Surface 5: `src/components/layout/canvas-control-dock.tsx`
- **CURRENT:** Destructures `activeImageId`; gates quick effect addition on `if (activeImageId)`.
- **PROBLEM:** Quick effect addition fails on procedural layers.
- **PHASE 4 CHANGE:** Destructure `activeLayerId`; gate on `if (activeLayerId) { addEffectToStack(effectId, activeLayerId); }`.
- **NOT PHASE 4:** Viewport navigation tools, zoom popover, undo/redo mechanics.

---

## 11. UI & Design System Component Reuse Plan

All UI elements required for Phase 4 are native EffectsIO primitives verified to exist in `src/components/ui/`:

| UI Requirement | Canonical Component | Verified Repository Path | Status & Phase 4 Reuse Strategy |
|----------------|---------------------|--------------------------|---------------------------------|
| Panel Shell | `PanelSurface` | `src/components/ui/panel/panel-surface.tsx` | Outer panel container. Reuse as-is. |
| Panel Header | `PanelHeader` | `src/components/ui/panel/panel-header.tsx` | Header container with title and action slots (`h-11`). Reuse as-is. |
| Section Container | `PanelSection` | `src/components/ui/panel/panel-section.tsx` | Collapsible parameter section wrapper. Reuse as-is. |
| Numeric Sliders | `SliderControl` | `src/components/ui/controls/slider/slider-control.tsx` | Opacity, transforms, effect parameters. Reuse as-is. |
| Select / Dropdowns | `SelectControl`, `StaticSelect` | `src/components/ui/controls/select/select-control.tsx` | BlendMode and FitMode selectors. Reuse as-is. |
| Color Pickers | `ColorControl` | `src/components/ui/controls/color/color-control.tsx` | Procedural color parameters. Reuse as-is. |
| Gradient Editors | `GradientControl` | `src/components/ui/controls/gradient/gradient-control.tsx` | Procedural gradient stops and angles. Reuse as-is. |
| Action Buttons | `Button` | `src/components/ui/primitives/button.tsx` | Discrete button actions. Reuse as-is. |
| Popover Containers | `Popover`, `PopoverTrigger`, `PopoverContent` | `src/components/ui/primitives/popover.tsx` | Add Layer and Looks popovers. Reuse as-is. |
| Scroll Containers | `ScrollFade` | `src/components/ui/primitives/scroll-fade.tsx` | Scrollable panel body with edge fades. Reuse as-is. |
| Icon Tokens | `@phosphor-icons/react` via `ICON_SIZES` | `src/components/ui/lib/icon-sizes.ts` | Canonical sizing tokens (`ICON_SIZES.sm`, `ICON_SIZES.md`). Reuse as-is. |
| Drag and Drop | `@dnd-kit/core`, `@dnd-kit/sortable` | `node_modules` | `SortableContext`, `useSortable`. Reuse as-is. |
| Unified Layer Row | `SortableLayerRow` | `src/components/layout/layers-panel.tsx:48` | Extend in place to accept canonical `Layer`, rendering image thumbnails or procedural swatches. |
| Group Row | `GroupRow` | N/A | **Omitted from Phase 4**. Group UI is deferred to Phase 5. |

---

## 12. Exact Phase 4 Scope

### 12.1 Already Implemented (Excluded from Phase 4 Implementation Work)
- **WebGL Procedural Effect Execution:** `webgl-frame-compositor.ts:778` already executes intra-layer effect stacks on procedural layers.
- **Context Stack Mutations:** `studio-context.tsx:1533-1565` already accepts `layerId` and mutates `layer.effectStack` directly.
- **Authoritative State:** `activeFrameId` + `activeLayerId` are already authoritative in `StudioContext`.
- **Data Model Groups:** `Frame.groups` and `BaseLayer.groupId` already exist in types and database persistence.

### 12.2 Phase 4 Implementation Work (The True Delta)
1. **`src/types/frame.ts`:** Update `createDefaultBackdropLayer()` to initialize `locked: true`.
2. **`src/components/layout/layers-panel.tsx`:**
   - Unify layer rendering into a single sorted list from `activeFrame.layers`.
   - Update `SortableLayerRow` to accept canonical `Layer` and render procedural swatches.
   - Enforce backdrop protection: `disabled={layer.locked}`, `canDelete={!layer.locked}`, `toIndex >= 1` clamping.
   - Remove legacy `type === "image"` and `type === "generative"` partitioning.
3. **`src/components/layout/inspector-panel.tsx`:**
   - Implement canonical 3-tier hierarchy (Source Properties, Layer Properties, Effects & Looks).
   - Gate population on `Boolean(activeLayer)`.
   - Route all effect actions to `activeLayer.id`.
   - Remove `activeImageId` destructuring and usage.
4. **`src/components/layout/floating-effect-panel.tsx`:**
   - Update visibility gate to `activeLayer && activeLayerId`.
   - Route parameter mutations to `activeLayerId`.
   - Remove `activeAsset` and `activeImageId` imports.
5. **`src/components/layout/floating-background-panel.tsx`:**
   - Update gate to `activeLayer?.source?.type !== "procedural"`.
   - Route procedural parameter changes to `activeLayer.source.parameters`.
6. **`src/components/layout/canvas-control-dock.tsx`:**
   - Route quick effect additions to `activeLayerId`.
7. **`src/components/layout/sortable-background-row.tsx`:**
   - Delete obsolete file once unified `SortableLayerRow` handles procedural layers.

### 12.3 Explicitly Deferred Work
- **Phase 5:** Interactive Group UI (`GroupRow`, indentation, group collapse/reorder), Group state mutations (`createGroup`, `removeGroup`), and multi-layer selection.
- **Phase 5+:** Asset Library modernizations removing `activeImageId` tile highlight fallback.
- **Phase 5+:** Viewport multi-texture offscreen rendering pipeline replacing `activeAsset` texture uploads in `canvas-viewport.tsx`.
- **Downstream Cleanup:** Removing legacy adapters (`ImageLayer`, `GenerativeLayer`, `createDefaultGenerativeLayer`) after all tests and persistence schemas migrate.

---

## 13. Compatibility Boundary

The following legacy symbols remain actively required by unmigrated subsystems and **must NOT be removed** in Phase 4:

| Symbol / API | Resides In | Required By | Planned Removal Milestone |
|--------------|------------|-------------|---------------------------|
| `activeImageId` | `StudioContextType`, `db.ts`, `history.ts` | `asset-panel.tsx` (tile highlight fallback), `db.ts` (session hydration fallback) | Phase 5+ (after viewport & asset panel migrate) |
| `activeAsset` | `StudioContextType` | `canvas-viewport.tsx` (HTMLImageElement decoding, texture upload, fit zoom) | Phase 5+ (after viewport multi-layer pipeline) |
| `Layer.type` | `src/types/frame.ts`, `db.ts` | `db.ts` (IndexedDB v1/v2 hydration), `webgl-frame-compositor.ts` (legacy fallback) | Future persistence cleanup |
| `Layer.assetId` | `src/types/frame.ts`, `db.ts` | `db.ts` (hydration), `canvas-viewport.tsx` | Future persistence cleanup |
| `Layer.backgrounds` / `sublayers` | `src/types/frame.ts`, `db.ts` | `floating-background-panel.tsx`, `db.ts` | Future procedural source refactor |
| `addBackgroundItem()` / `updateBackgroundItem()` | `StudioContextType` | `floating-background-panel.tsx`, `inspector-panel.tsx` (background stack) | Retained for procedural background editing |
| `createDefaultGenerativeLayer()` | `src/types/frame.ts` | Legacy test mocks and compatibility test suites | Downstream test modernization |

---

## 14. Implementation Sequence

Phase 4 implementation will proceed in the following ordered steps:

1. **Step 1 — Backdrop Model Update:** Update `createDefaultBackdropLayer()` in `src/types/frame.ts` to initialize `locked: true`.
2. **Step 2 — Unified Layers Panel:** Refactor `layers-panel.tsx` to render all `activeFrame.layers` in a single unified list via `SortableLayerRow`, implement procedural swatches, enforce non-draggable and non-deletable backdrop constraints, and clamp drop targets.
3. **Step 3 — Canonical Inspector Panel:** Refactor `inspector-panel.tsx` to implement the 3-tier section layout, enable universal effect stacks across all layers, and route all effect callbacks to `activeLayer.id`.
4. **Step 4 — Floating Panels & Dock Alignment:** Update `floating-effect-panel.tsx`, `floating-background-panel.tsx`, and `canvas-control-dock.tsx` to route mutations to `activeLayerId` and consume canonical source properties.
5. **Step 5 — Cleanup:** Delete obsolete `sortable-background-row.tsx`.
6. **Step 6 — Verification:** Update component test suites (`inspector-panel.test.tsx`, `layers-panel.test.tsx`) to assert canonical `LayerSource` properties, run full automated test suite, and execute browser QA checklist.

---

## 15. Testing & Verification Plan

### 15.1 Static & Mechanical Verification (Empirically Executed at Audited HEAD)

The following verification commands were executed directly on the repository at HEAD `5cb57d53863ac7ab9ffd42dfdab7f89a4ea2987a`:

| Command | Category | Empirical Result |
|---------|----------|------------------|
| `git diff --check` | **ACTUALLY EXECUTED** | **PASS** (0 whitespace/formatting errors). |
| `pnpm check:no-competitor-refs` | **ACTUALLY EXECUTED** | **PASS** (624 tracked files scanned, 0 violations). |
| `pnpm check:public-provenance` | **ACTUALLY EXECUTED** | **PASS** (0 forbidden public provenance patterns found). |
| `pnpm typecheck` | **ACTUALLY EXECUTED** | **PASS** (`tsc --noEmit` exited code 0 across 515 source files). |
| `pnpm test` | **ACTUALLY EXECUTED** | **PASS** (30 test files passed, 394 tests passed, 121.14s). |
| `pnpm build` | **ACTUALLY EXECUTED** | **PASS** (Vite production build succeeded in 4.18s, 5055 modules). |
| `pnpm verify:approvals` | **ACTUALLY EXECUTED** | **BLOCKED (Exit Code 1)** (Phase 4 proposal pending project owner approval; all prerequisite gates pass). |
| `graphify query` | **ACTUALLY EXECUTED** | **PASS** (Knowledge graph queried successfully). |
| `graphify update .` | **ACTUALLY EXECUTED** | **PASS** (AST graph cache updated successfully). |

### 15.2 Browser Verification Matrix (PLANNED — NOT YET EXECUTED)

The following 14-scenario browser verification checklist will be executed upon completion of Phase 4 source code changes:

| # | Scenario | Test Steps | Expected Verification Outcome | Status |
|---|----------|------------|-------------------------------|--------|
| 1 | **Image Layer Selection** | Click an image layer in Layers panel. | Inspector displays Source (Image info/fit), Layer Properties, Transform, Effects, Looks. | `PLANNED — NOT YET EXECUTED` |
| 2 | **Procedural Layer Selection** | Click a procedural layer in Layers panel. | Inspector displays Source (Procedural parameters), Layer Properties, Transform, Effects, Looks (resolving empty-inspector bug). | `PLANNED — NOT YET EXECUTED` |
| 3 | **Effects Section Visibility** | Select image, procedural, and backdrop layers in turn. | Effects section remains visible and accessible across all layer types. | `PLANNED — NOT YET EXECUTED` |
| 4 | **Looks Section Visibility** | Select image and procedural layers. | Looks section remains visible and accessible across all layer types. | `PLANNED — NOT YET EXECUTED` |
| 5 | **Effect Addition to Layer** | Click "Add effect" from Inspector on a procedural layer. | Effect is appended to `activeLayer.effectStack` and renders in WebGL canvas. | `PLANNED — NOT YET EXECUTED` |
| 6 | **Effect Parameter Editing** | Open floating effect panel on a procedural layer and adjust sliders. | Parameter changes update strictly against `activeLayer.id` and render live. | `PLANNED — NOT YET EXECUTED` |
| 7 | **Floating Effect Panel Lifecyle** | Click an effect item in stack; click close button. | Panel opens showing correct definition controls; closes cleanly on dismissal. | `PLANNED — NOT YET EXECUTED` |
| 8 | **Procedural Parameter Controls** | Edit color/gradient/pattern on a procedural layer. | Procedural canvas texture updates immediately via shader uniforms. | `PLANNED — NOT YET EXECUTED` |
| 9 | **Layer Visibility Toggle** | Click eye icon on image and procedural layers. | Canvas compositor skips invisible layers; selection remains on toggled layer. | `PLANNED — NOT YET EXECUTED` |
| 10 | **Layer Deletion Handling** | Click delete button on an image or procedural layer (index > 0). | Layer is removed; active selection safely collapses to neighboring layer. | `PLANNED — NOT YET EXECUTED` |
| 11 | **Layer Reordering** | Drag a layer from visual index 1 to 2. | Z-order in canvas compositor updates to match new array order. | `PLANNED — NOT YET EXECUTED` |
| 12 | **Backdrop Mechanical Protection** | Attempt to drag backdrop or drag a layer beneath backdrop; check delete button. | Drag is prevented (`disabled={layer.locked}`); drops clamped to `toIndex >= 1`; delete button hidden/disabled. | `PLANNED — NOT YET EXECUTED` |
| 13 | **Active Layer Switching** | Switch between image and procedural layers rapidly. | Selection rings, Inspector controls, and floating panels update immediately with zero state leakage. | `PLANNED — NOT YET EXECUTED` |
| 14 | **Asset Library Decoupling** | Click an asset tile in Asset Library while a procedural layer is active. | Asset tile highlights as selected; canvas active layer remains the procedural layer. | `PLANNED — NOT YET EXECUTED` |

---

## 16. Final Readiness Verdict

```text
READY FOR APPROVAL
```

### Rationale
1. **Repository Alignment:** The proposal is 100% grounded in the actual codebase at HEAD `5cb57d53863ac7ab9ffd42dfdab7f89a4ea2987a`.
2. **Contradiction-Free Scope:** Group UI and state mutations are unambiguously deferred to Phase 5. Group data models are preserved.
3. **Verified Subsystems:** WebGL compositor capability and `StudioContext` mutation routing are confirmed already implemented and excluded from Phase 4.
4. **Backdrop Protection:** Mechanical interaction constraints (`locked: true`, non-draggable, non-deletable, clamped drops) provide complete protection without breaking the canonical Layer abstraction.
5. **No Source Modifications:** Zero application code in `src/`, tests, shaders, or persistence was modified during this verification.

---

## 17. Approval Requirement

```text
STATUS: PENDING PROJECT OWNER APPROVAL
```

In accordance with `AGENTS.md` Rule 12, Phase 4 implementation **MUST NOT BEGIN** until the project owner explicitly adds the following literal approval line to this section:

```text
APPROVED: <date>
```
