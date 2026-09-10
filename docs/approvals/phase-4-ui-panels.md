# Phase 4 — UI & Panels Alignment: Approval Proposal

**Document type:** Implementation Approval Proposal  
**Status:** PENDING PROJECT OWNER APPROVAL  
**Base commit verified:** `c0f5cb38b5b201e2e76fa68beab4bf3fc8959e3b`  
**Prerequisite phases:** Phase 1 (`cd688c1`), Phase 2 (`92ca7bb` / `2295969`), Phase 3 (`99cf30d`)  
**Approval gate rule:** In accordance with `AGENTS.md` Rule 12, this proposal remains unapproved until the project owner explicitly appends the literal line `APPROVED: <date>`.

---

## 1. Executive Summary & Readiness Verdict

### 1.1 Readiness Verdict: READY FOR APPROVAL (Proposal Only)

The EffectsIO repository is architecturally and empirically ready for **Phase 4 — UI & Panels Alignment**.

- **Phase 1 (Frame & Layer Architecture)** established the canonical type model: `Project → Frame → (Group) → Layer → Source`.
- **Phase 2 (WebGL2 Unified Composition Model)** and its correction established authoritative `Layer.source` dispatch in the compositor.
- **Phase 3 (Studio Context & Active Editing State)** established `activeFrameId + activeLayerId` as the single authoritative active editing target in `StudioContext`, with `activeImageId` demoted to a derived compatibility property.
- All 394 existing automated tests across 30 test files pass.
- All mechanical governance gates (`check:no-competitor-refs`, `check:public-provenance`) pass cleanly.

Phase 4 bridges the remaining gap between the canonical data/state architecture and the application UI surfaces. Currently, the UI components (`layers-panel.tsx`, `inspector-panel.tsx`, `floating-effect-panel.tsx`, `floating-background-panel.tsx`, `canvas-control-dock.tsx`) still branch on legacy discriminants (`layer.type === "generative"`, `layer.type === "image"`) and gate effect operations on `activeImageId`.

Phase 4 aligns all UI panels with the canonical model:
1. Surfaces reason from universal `Layer` objects and `layer.source.type`.
2. Effect controls and floating editors operate on `activeLayerId`.
3. The Layers Panel unifies into a single hierarchical list supporting single-tier Groups.
4. The backdrop is protected as a UX constraint on a canonical Layer, not a separate layer type.

This task is **PROPOSAL ONLY**. No application source code has been modified in this session.

---

## 2. Pre-Flight Verification & Environment Status

### 2.1 Repository Verification at HEAD `c0f5cb38`

- **Git HEAD:** `c0f5cb38b5b201e2e76fa68beab4bf3fc8959e3b`
- **Working tree:** Clean (no uncommitted source changes).
- **Mechanical Approval Gate Status (`pnpm verify:approvals`):**
  - `phase-3-studio-context.md` → Valid signature (`APPROVED: 2026-09-09`)
  - `stage-1-frame-layer.md` → Valid signature (`APPROVED: 2026-09-05`)
  - `unified-composition-model.md` → Valid signature (`APPROVED: 2026-09-08`)
  - `phase-4-ui-panels.md` → Correctly reported as unapproved (pending owner review)
- **Competitor Reference Scan (`pnpm check:no-competitor-refs`):** Passed (scanned 623 tracked files against 16 deny-list terms; 0 violations).
- **Public Repository Provenance (`pnpm check:public-provenance`):** Passed (0 external runtime/provenance references found).

### 2.2 Graphify Architectural Intelligence

- **Graphify Knowledge Graph:** `graphify-out/graph.json` contains 4,252 nodes, 11,340 edges, and 151 communities.
- **Executed Query:**
  ```bash
  graphify query "Inspector panel source background layer type discriminant activeLayerId activeImageId effects looks" --budget 3000
  ```
- **Architectural Findings:**
  - `Community 28` houses the core layout components: `InspectorPanel`, `LayersPanel`, `SortableLayerRow`, `BackgroundRow`, `SortableEffectRow`.
  - `Community 22` houses `StudioProvider`, `useStudioStore`, and state persistence in `db.ts`.
  - Strong cross-community coupling exists between `Community 28` and `Community 22` via `activeImageId` and `activeLayerId`.
  - `Community 41` contains the WebGL compositor (`webgl-frame-compositor.ts`) and canonical layer interfaces (`Layer`, `BaseLayer`).
  - Graph verification confirms that migrating UI panels to `activeLayerId` directly decouples `Community 28` from legacy image-only store keys.

### 2.3 Headroom Optimization Status

Per `AGENTS.md` Rule 11, Headroom availability was checked. The Headroom agent proxy was unavailable in the current execution environment. As required, no Headroom proxy optimization or token compression statistics are claimed.

---

## 3. Correct Architectural Framing & Semantic Foundation

### 3.1 The Canonical Composition Hierarchy

The approved Unified Composition Model dictates:

```text
Project
  └── Frame (canvas boundary, dimensions, export settings)
        ├── Group[] (single-tier organizational container, optional)
        │     └── Layer[]
        └── Layer[] (universal visual object)
              ├── Source (content generator: ImageSource | ProceduralSource)
              ├── EffectStack (ordered list of GPU shader effect instances)
              ├── Transform (spatial translation, scale, rotation)
              ├── Opacity (0.0 to 1.0)
              ├── BlendMode (compositing blend equation)
              ├── Visible (boolean)
              └── Locked (boolean interaction state)
```

### 3.2 Core Semantic Definitions

- **Frame:** The creative composition and canvas boundary. Owns dimensions, background color/fill if configured, frame-level active layer memory (`Frame.activeLayerId`), and export settings.
- **Layer:** The single, universal, independently composited visual object. All visual elements on canvas are Layers. There are no specialized compositional subclasses.
- **Source:** The content generator for a Layer. A Source generates pixels or procedural patterns (`ImageSource` or `ProceduralSource`). It has no awareness of canvas coordinates, z-index, blending, or effect stacks.
- **Effect:** A transformation shader that modifies existing visual content within a Layer's pipeline.
- **Group:** A single-tier organizational container that groups multiple Layers for collective visibility, locking, and spatial transformation.
- **Background:** A **creative visual role**, not a document-model type. A Layer at the bottom of the stack with a procedural Source fills the background role.

### 3.3 Strict Ban on Specialized Layer Primitives

Phase 4 strictly adheres to the approved UCM and PRD §10.6 constraint list:
- **NO** `BackgroundLayer` or `GenerativeLayer` as canonical types.
- **NO** `ProceduralLayer`, `MaterialLayer`, or `SimulationLayer`.
- **NO** `BackgroundStack` or `BackgroundItem` as a new UI architecture.
- Existing legacy interfaces (`ImageLayer`, `GenerativeLayer`, `BackgroundItem`) remain strictly in `src/types/frame.ts` as `@deprecated` migration adapters for historical data hydration only.

### 3.4 Important Correction: `locked` Is Not a Semantic Layer Discriminator

The UI must **never** treat `locked` as a layer type or semantic discriminator.
- `source.type` determines source-specific UI affordances (e.g., Image fit vs Procedural shader parameters).
- `locked` is an **interaction and property state** determining whether editing, transformation, or reordering is permitted.
- `visible` is a rendering state.
- `opacity` and `blendMode` are compositing properties.
- None of these properties may be repurposed as a layer category.

---

## 4. Resolution of the Three Core Architectural Questions

### Q1 — Procedural Layers and Effect Execution
- **Decision:** **Compositor behavior is deferred.** Phase 4 is strictly a UI and panel alignment phase.
- **Specification:** Phase 4 makes the UI capable of displaying and editing the universal Effects section for **any** canonical Layer, including Layers with a procedural Source (`source.type === "procedural"`).
- **Rendering Boundary:** Whether the WebGL compositor executes an effect stack against procedural-source content is a rendering pipeline concern (Phase 2 extension). Phase 4 **must not** implement or propose a hidden compositor rewrite.

### Q2 — Backdrop Behavior and Protection
- **Decision:** **The backdrop is protected as a UX constraint on a normal Layer.**
- **Specification:** The backdrop is represented as a normal canonical `Layer` with `source: { type: "procedural", proceduralType: "solid", ... }` at index 0 of the Frame.
- **UX Constraint:** Its non-reorderable status and pinned position at index 0 are enforced strictly as an interaction constraint in the Layers Panel (e.g. `disabled={layer.locked}` on drag handles, reorder clamp `minIndex = 1` when index 0 is locked).
- It is **not** a special `BackgroundLayer`, and it does not introduce any custom document primitive.

### Q3 — Inspector and Panel Terminology
- **Decision:** **Move the universal Inspector toward "Source" terminology.**
- **Specification:** The Inspector organizes sections by the canonical document hierarchy:
  ```text
  Layer Properties → Source → Transform → Effects → Looks
  ```
- **Terminology Shift:** The architectural name "Background" is retired from the universal section structure. The section is named **Source**. When the active Layer has a procedural Source, procedural and generative controls (solid, gradient, pattern) render inside this Source section.
- **Transitional Preservation:** Specific user-facing button labels (e.g. "Add Solid", "Add Gradient") and data-testids may be preserved temporarily to prevent breaking existing test suites during migration.

---

## 5. Current Repository Audit & Empirical Findings

### 5.1 Audit of Existing Component Implementations

Direct source inspection at HEAD `c0f5cb38` revealed the following concrete patterns:

#### 1. `src/components/layout/layers-panel.tsx` (485 lines)
- **Dual-Region Rendering:** The panel splits `activeFrame.layers` into two separate JSX blocks:
  - Line 299: `baseBackground = layers.find((l): l is GenerativeLayer => l.type === "generative")`
  - Lines 302–303: `imageLayers = layers.filter((l): l is ImageLayer => l.type === "image").reverse()`
  - Line 460: Renders a dedicated `BackgroundRow` for the generative layer at the bottom.
  - Lines 427–456: Renders `SortableLayerRow` strictly for image layers inside `SortableContext`.
- **Reorder Guard:** Line 322 uses `const minIndex = baseBackground ? 1 : 0`, gating reordering on the legacy `GenerativeLayer` presence.
- **Add Layer Popover:** Line 363 shows "Background Layer" conditionally when `!baseBackground`.
- **Groups:** Completely absent from the current UI rendering, despite `Group` being defined in `src/types/frame.ts` and `Frame.groups?: Group[]` existing.

#### 2. `src/components/layout/inspector-panel.tsx` (941 lines)
- **Active State Consumption:** Line 177 destructures `activeImageId` from `useStudioStore`.
- **Legacy Type Discriminants:**
  - Line 265: `const isImageLayerActive = activeLayer?.type === "image" || Boolean(activeAsset)`
  - Line 266: `const isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative"`
  - Line 267: `const isPopulated = isImageLayerActive || isGenerativeLayerExplicitlyActive`
- **Section Gating:**
  - Lines 619 & 679: Effects and Looks sections are gated by `!isGenerativeLayerExplicitlyActive`. If a procedural layer is active, Effects and Looks are completely hidden.
  - Line 771: Background Stack section is gated by `isGenerativeLayerExplicitlyActive`.
  - Line 500: Transform section is gated by `activeLayer?.type === "image"`.
- **Mutation Calls:**
  - Lines 249, 654–666, 748–751, 933–934: All effect stack operations (`reorderEffectStack`, `selectInstance`, `toggleInstanceEnabled`, `removeInstanceFromStack`, `addEffectToStack`) pass `activeImageId`.

#### 3. `src/components/layout/floating-effect-panel.tsx` (407 lines)
- **Hard Visibility Gate:** Line 125 states:
  ```ts
  if (!activeAsset || !activeImageId || !selectedInstance || !definition) return null;
  ```
  This makes the panel completely invisible whenever a procedural layer is active (since `activeImageId` is null).
- **Parameter Mutations:** Lines 259–395 pass `activeImageId` as the first argument to `updateInstanceParameters`, `resetInstanceParameters`, and `selectInstance`.

#### 4. `src/components/layout/floating-background-panel.tsx` (1,057 lines)
- **Visibility Gate:** Line 155 states:
  ```ts
  if (!activeFrame || !isBackgroundPanelOpen || activeLayer?.type !== "generative") return null;
  ```
- **State Coupling:** Reads `activeBackgrounds` (which derives from `genLayer?.backgrounds || genLayer?.sublayers`).

#### 5. `src/components/layout/canvas-control-dock.tsx` (370 lines)
- Destructures `activeImageId` (line 53) and invokes `addEffectToStack(activeImageId, effectId)` (lines 360–361).

#### 6. `src/context/studio-context.tsx` (2,964 lines)
- **Key Architectural Fact Established:**
  Inspection of `mutateLayerStack` (lines 1533–1632) reveals that the effect stack mutation engine **already resolves by canonical Layer ID first**:
  ```ts
  // Priority 1 — Canonical Layer ID
  if (l.id === targetId) return true;
  // Priority 2 — Transitional ImageSource
  if (l.source?.type === "image" && l.source.assetId === targetId) return true;
  // Priority 3 — Legacy compatibility
  if (l.type === "image" && l.assetId === targetId) return true;
  ```
  Furthermore, the context interface signatures (lines 163–183) already accept `assetIdOrLayerId: string`:
  ```ts
  addEffectToStack: (assetIdOrLayerId: string, effectId: EffectId, parameters?: Record<string, unknown>) => void;
  updateInstanceParameters: (assetIdOrLayerId: string, instanceId: string, parameters: Record<string, unknown>) => void;
  reorderEffectStack: (assetIdOrLayerId: string, fromIndex: number, toIndex: number) => void;
  ```
  **Conclusion:** The backend state engine in `StudioContext` already supports `activeLayerId` seamlessly! The limitation is purely in the UI components, which were still passing `activeImageId`.

---

## 6. Phase 4 Scope & Explicit Non-Goals

### 6.1 Primary Scope

1. **Layers Panel Unification:**
   - Unify `layers-panel.tsx` into a single ordered list rendering all `Frame.layers`.
   - Eliminate separate `BackgroundRow` rendering path; merge row presentation into a canonical `SortableLayerRow` component.
   - Enforce backdrop non-reorderability via UX interaction constraints (`layer.locked`).
   - Implement single-tier Group rendering and expand/collapse in accordance with UCM.
2. **Inspector Panel Alignment:**
   - Replace legacy `layer.type` checks with `layer.source.type` discriminants.
   - Reorganize sections into the canonical hierarchy: `Layer Properties → Source → Transform → Effects → Looks`.
   - Make Effects and Looks universal across all active Layers.
   - Route all effect stack mutations through `activeLayerId`.
3. **Floating Effect Panel Migration:**
   - Update visibility gate from `!activeAsset || !activeImageId` to `!activeLayer || !activeLayerId`.
   - Route parameter updates through `activeLayerId`.
4. **Floating Background Panel Gate Alignment:**
   - Update visibility gate from `activeLayer?.type !== "generative"` to `activeLayer?.source?.type !== "procedural"`.
5. **Canvas Control Dock Alignment:**
   - Update effect addition from `activeImageId` to `activeLayerId`.
6. **Active State Cleanup:**
   - Remove unnecessary `activeImageId` consumption from migrated UI components.
7. **Test Alignment:**
   - Update component unit tests to assert canonical `layer.source` and `activeLayerId`.

### 6.2 Explicit Non-Goals

Phase 4 strictly excludes:
- **No WebGL compositor redesign:** Shader pipeline and frame compositing are untouched.
- **No shader execution migration:** Multi-pass GPU shader logic is untouched.
- **No new rendering primitives:** No new canvas buffers, pipelines, or offscreen renderers.
- **No new layer types:** Zero custom classes or compositional primitives.
- **No persistence or schema changes:** IndexedDB schema (`DB_VERSION = 2`) and stores remain unchanged.
- **No animation architecture redesign:** Central timeline clock and `u_time` binding remain untouched.
- **No backend or cloud sync infrastructure:** Local-first architecture remains intact.
- **No effect taxonomy expansion:** No new effects or categorization rewrites.
- **No Material or Physical Simulation effects.**
- **No modifications to approved UCM constraints.**

---

## 7. Detailed Component Migration Plan

### 7.1 Layers Panel (`src/components/layout/layers-panel.tsx`)

#### Current vs. Proposed Architecture

```text
Current (Dual-Region):                     Proposed (Canonical Unified Hierarchy):
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│ Layers Header (+ Add)                │   │ Layers Header (+ Add)                │
├──────────────────────────────────────┤   ├──────────────────────────────────────┤
│ SortableContext (ImageLayers only)   │   │ SortableContext (All reorderable)    │
│  ├── Layer 2 (Image)                 │   │  ├── Group 1 (Folder) [Single-tier]  │
│  └── Layer 1 (Image)                 │   │  │    ├── Layer 3 (Image)            │
├──────────────────────────────────────┤   │  │    └── Layer 2 (Procedural)       │
│ Locked Background Section            │   │  ├── Layer 1 (Image)                 │
│  └── BackgroundRow (GenerativeLayer) │   │  └── Backdrop Layer (Locked, Idx 0)  │
└──────────────────────────────────────┘   └──────────────────────────────────────┘
```

#### Detailed Changes:
1. **Single Unified List:**
   - Display `activeFrame.layers` in standard z-order (rendered in reverse so top layer appears at the top of the UI list).
   - Eliminate `imageLayers` and `baseBackground` split.
2. **Unified Row Component (`SortableLayerRow`):**
   - Accept canonical `layer: Layer`.
   - Render thumbnail based on `layer.source.type`:
     - `source.type === "image"`: Render image asset thumbnail preview.
     - `source.type === "procedural"`: Render procedural color/gradient/pattern swatch.
   - Display lock icon if `layer.locked`. If locked, disable DnD handle (`disabled: true` in `useSortable`).
   - Visibility toggle: Calls `updateLayer(layer.id, { visible: !layer.visible })`.
   - Delete action: Hidden or disabled if `layer.locked`.
3. **Backdrop UX Protection:**
   - Enforce via:
     ```ts
     const isBackdrop = index === 0 && layer.locked;
     ```
   - In drag-and-drop `onDragEnd`, clamp destination index so no layer can be dragged below index 0 when index 0 is locked:
     ```ts
     const minIndex = activeFrame.layers[0]?.locked ? 1 : 0;
     ```
4. **Single-Tier Groups Support:**
   - If `activeFrame.groups` contains groups, render group headers.
   - Child layers indented under group header.
   - Group actions: toggle group visibility, lock group, toggle group collapse.
   - Strictly single-tier: Groups contain Layers only. No nested groups.
5. **Add Layer Actions:**
   - Menu provides: "Image Layer" (opens asset selector or file ingestion) and "Procedural Layer" (creates a canonical Layer with `ProceduralSource`).

---

### 7.2 Inspector Panel (`src/components/layout/inspector-panel.tsx`)

#### Canonical Section Organization:
```text
Section 0: Layer Properties (Name, Opacity, BlendMode, Visibility, Lock)
Section 1: Source (Source-specific parameters)
             ├── Image Source: Fit Mode (contain / cover), Asset Dimensions, Info
             └── Procedural Source: Solid / Gradient / Pattern / Noise controls
Section 2: Transform (X/Y Translation, Scale, Rotation, Reset Transform)
Section 3: Effects (Universal Effect Stack: Add, Reorder, Enable/Disable, Delete)
Section 4: Looks (Universal Presets: Apply Look, Save as Look)
```

#### Detailed Changes:
1. **Discriminants:**
   ```ts
   // Replace:
   const isImageLayerActive = activeLayer?.type === "image" || Boolean(activeAsset);
   const isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative";
   const isPopulated = isImageLayerActive || isGenerativeLayerExplicitlyActive;

   // With:
   const isPopulated = Boolean(activeLayer);
   const isImageSource = activeLayer?.source?.type === "image";
   const isProceduralSource = activeLayer?.source?.type === "procedural";
   ```
2. **Universal Sections:**
   - **Layer Properties:** Displayed whenever `isPopulated` is true.
   - **Transform:** Displayed for layers with spatial positioning.
   - **Effects:** Displayed whenever `isPopulated` is true (universal for all layers).
   - **Looks:** Displayed whenever `isPopulated` is true (universal for all layers).
3. **Source Section:**
   - Renamed from "Background" to "Source" in UI architecture.
   - If `isImageSource`: displays image metadata and fit mode controls.
   - If `isProceduralSource`: displays procedural configuration (solid, gradient, pattern).
4. **Active Editing Target Routing:**
   - Replace all instances of `activeImageId` in effect callbacks with `activeLayerId`:
     ```ts
     onSelect={() => activeLayerId && selectInstance(activeLayerId, instance.instanceId)}
     onToggleEnabled={() => activeLayerId && toggleInstanceEnabled(activeLayerId, instance.instanceId)}
     onRemove={() => activeLayerId && removeInstanceFromStack(activeLayerId, instance.instanceId)}
     onAddEffect={(effectId) => activeLayerId && addEffectToStack(activeLayerId, effectId)}
     ```

---

### 7.3 Floating Effect Panel (`src/components/layout/floating-effect-panel.tsx`)

#### Detailed Changes:
1. **Visibility Gate Migration:**
   ```ts
   // Replace:
   if (!activeAsset || !activeImageId || !selectedInstance || !definition) return null;

   // With:
   if (!activeLayer || !activeLayerId || !selectedInstance || !definition) return null;
   ```
2. **Parameter Mutation Migration:**
   - Replace all `activeImageId` arguments with `activeLayerId`:
     ```ts
     updateInstanceParameters(activeLayerId, selectedInstance.instanceId, updatedParams);
     resetInstanceParameters(activeLayerId, selectedInstance.instanceId);
     selectInstance(activeLayerId, null);
     ```
3. Remove `activeAsset` and `activeImageId` destructuring from component.

---

### 7.4 Floating Background Panel (`src/components/layout/floating-background-panel.tsx`)

#### Detailed Changes:
1. **Visibility Gate Migration:**
   ```ts
   // Replace:
   if (!activeFrame || !isBackgroundPanelOpen || activeLayer?.type !== "generative") return null;

   // With:
   if (!activeFrame || !isBackgroundPanelOpen || activeLayer?.source?.type !== "procedural") return null;
   ```
2. Retain existing parameter editing logic for transitional procedural backgrounds.

---

### 7.5 Canvas Control Dock (`src/components/layout/canvas-control-dock.tsx`)

#### Detailed Changes:
1. Destructure `activeLayerId` instead of `activeImageId`.
2. In `onSelectEffect` (line 360):
   ```ts
   // Replace:
   if (activeImageId) {
     addEffectToStack(activeImageId, effectId);
   }

   // With:
   if (activeLayerId) {
     addEffectToStack(activeLayerId, effectId);
   }
   ```

---

## 8. Active Editing State & Compatibility Inventory

### 8.1 Active Editing Model
Phase 3 established that `activeFrameId + activeLayerId` is the single authoritative source of truth. Phase 4 aligns all UI controls with this invariant.

### 8.2 Inventory of `activeImageId` Usage

| File | Context / Line | Classification | Phase 4 Action |
|---|---|---|---|
| `floating-effect-panel.tsx` | Lines 23, 125, 130–137, 259–387 | **Must Remove Now** | Migrate entirely to `activeLayerId`. |
| `inspector-panel.tsx` | Lines 177, 243, 249, 654–666, 748–751, 933 | **Must Remove Now** | Migrate entirely to `activeLayerId`. |
| `canvas-control-dock.tsx` | Lines 53, 360–361 | **Must Remove Now** | Migrate entirely to `activeLayerId`. |
| `asset-panel.tsx` | Lines 33, 76, 277 | **Temporary Compatibility** | Retain for asset thumbnail selection highlight fallback when `selectedAssetIds` is empty. |
| `canvas-viewport.tsx` | Lines 62, 125, 221, 336, 714 | **Temporary Compatibility** | Retain for HTMLImageElement texture upload and container fit calculations. |
| `studio-context.tsx` | Lines 100, 399–408, 2833 | **Temporary Compatibility** | Retain derived `activeImageId` getter in `StudioContextType` for unmigrated consumers. |

---

## 9. Design System Alignment & Component Reuse Plan

### 9.1 Native Component Ownership & Reuse
In accordance with `AGENTS.md` Rule 9 and `component-rules.md`, Phase 4 introduces **zero duplicate or ad-hoc UI controls**.

| UI Need | Existing Canonical Component | Reuse Strategy |
|---|---|---|
| Panel Container | `PanelSurface` (`src/components/ui/panel/panel-surface.tsx`) | Used for Inspector and Layers panel outer boundaries. |
| Panel Headers | `PanelHeader` (`src/components/ui/panel/panel-header.tsx`) | Used for panel title, icon, and primary actions. |
| Inspector Sections | `PanelSection` (`src/components/ui/panel/panel-section.tsx`) | Used for Layer Properties, Source, Transform, Effects, Looks sections. |
| Unified Layer Row | `SortableLayerRow` (`src/components/layout/layers-panel.tsx`) | Extend existing component to handle procedural swatches, lock badges, and group indentation. |
| Numeric Inputs | `SliderControl` (`src/components/ui/controls/slider/slider-control.tsx`) | Used for Opacity, Scale, Rotation, and effect parameters. |
| Dropdowns / Selects | `SelectControl` (`src/components/ui/controls/select/select-control.tsx`) | Used for BlendMode and FitMode selectors. |
| Toggles & Switches | `Toggle` / `Switch` (`src/components/ui/primitives/`) | Used for Layer visibility and lock buttons. |
| Popovers & Menus | `Popover` (`src/components/ui/primitives/popover.tsx`) | Used for Add Layer and Add Effect menus. |
| Iconography | `@phosphor-icons/react` via `ICON_SIZES` (`src/components/ui/lib/icon-sizes.ts`) | Strict compliance with canonical icon sizing rules. |

### 9.2 Addressing Documentation Drift in Design System Docs
- **Drift Identified:**
  - `docs/design-system/effectsio-ui-system.md` (§10) and `docs/design-system/effectsio-component-system.md` (§18) describe separate "Image Layer" vs "Generative Layer" inspector contexts.
- **Resolution:**
  - The approved UCM (`docs/approvals/unified-composition-model.md`) and PRD §10.3 are the authoritative source of truth.
  - Phase 4 implements the universal `Layer → Source → Effects` inspector structure.
  - The older design system documents are marked as documentation cleanup candidates (see §13).

---

## 10. Single-Tier Group Specification

### 10.1 Data Model Integration
From `src/types/frame.ts`:
```ts
export interface Group {
  id: string;
  name: string;
  layerIds: string[];
  visible: boolean;
  locked: boolean;
  collapsed?: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 10.2 Interaction Rules
- **Containment:** Groups contain an ordered list of `layerIds`.
- **Single-Tier:** Groups cannot contain other Groups.
- **Collapse State:** Collapsing a group hides its child layers in the Layers Panel list.
- **Collective Operations:**
  - Toggling group visibility toggles rendering of all child layers.
  - Toggling group lock locks all child layers from direct canvas interaction.
- **Selection:** Clicking a group header selects the group; clicking a child layer selects that specific layer (`activeLayerId`).

---

## 11. Implementation Invariants

Phase 4 implementation must satisfy all of the following invariants:

| # | Invariant | Verification Method |
|---|---|---|
| **I-1** | `activeLayerId` is the sole key used by UI panels to target layer modifications and effect stack mutations. | Code inspection / grep |
| **I-2** | `layer.source.type === "image"` and `layer.source.type === "procedural"` are the authoritative discriminants for source-specific UI. | Code inspection / grep |
| **I-3** | Legacy `layer.type` is never used as a discriminant in migrated UI components. | Code inspection / grep |
| **I-4** | Effects and Looks sections in the Inspector render for any active Layer regardless of source type. | Automated tests / Browser QA |
| **I-5** | The Floating Effect Panel opens and operates on any active Layer with a selected effect instance. | Automated tests / Browser QA |
| **I-6** | The Layers Panel renders all layers in a single unified list; no separate hardcoded background region. | Automated tests / Browser QA |
| **I-7** | The backdrop layer at index 0 remains locked and cannot be reordered below itself. | Drag-and-drop test / Browser QA |
| **I-8** | Groups are strictly single-tier (`Group → Layer[]`). | Schema validation / UI test |
| **I-9** | Asset library selection (`selectedAssetIds`) remains decoupled from canvas layer selection. | StudioContext tests |
| **I-10** | Zero new npm runtime dependencies are introduced. | `package.json` diff |
| **I-11** | Zero TypeScript compiler errors (`pnpm typecheck` exits 0). | Automated CI check |
| **I-12** | All unit tests pass (`pnpm test` exits 0). | Vitest execution |

---

## 12. Verification Plan

### 12.1 Static & Mechanical Checks
The following automated commands must execute and exit with code 0:
```bash
pnpm typecheck
pnpm test
pnpm build
pnpm verify:approvals
pnpm check:no-competitor-refs
pnpm check:public-provenance
pnpm graphify:update
```

### 12.2 Browser Verification Checklist
Manual verification via interactive browser session covering the following 13 scenarios:

1. **Image Layer Selection:** Select an image-source layer; verify Inspector shows Layer Properties, Source (Image info/fit), Transform, Effects, Looks.
2. **Procedural Layer Selection:** Select a procedural-source layer; verify Inspector shows Layer Properties, Source (procedural parameters), Transform, Effects, Looks.
3. **Layer Switching:** Switch between layers; verify active layer highlight updates instantly with zero stale state.
4. **Universal Effect Stack on Procedural Layer:** Add an effect to a procedural layer; verify effect appears in stack and floating effect panel opens.
5. **Floating Effect Panel Targeting:** Edit sliders in Floating Effect Panel; verify updates apply strictly to `activeLayerId`.
6. **Canvas Dock Effect Addition:** Click an effect in the canvas dock; verify it adds to `activeLayerId`.
7. **Backdrop Protection:** Attempt to drag a layer below the backdrop; verify drop is disallowed and backdrop remains at index 0.
8. **Backdrop Locked State:** Verify backdrop displays lock icon and cannot be moved or deleted.
9. **Layer Visibility:** Toggle eye icon on image and procedural layers; verify canvas reflects visibility change.
10. **Layer Reordering:** Drag layers within allowed range; verify z-order updates in canvas compositor.
11. **Group Interaction:** Create/expand/collapse a group; verify child layers indent and collapse properly.
12. **Decoupled Asset Selection:** Click assets in Asset Library; verify canvas active layer does not switch accidentally.
13. **Background Workflow Continuity:** Open floating background editor for procedural layers; verify color, gradient, and pattern editing works seamlessly.

---

## 13. Documentation Cleanup Candidates

The following documentation files contain statements superseded by the Unified Composition Model and Phase 3:

1. **`docs/design-system/effectsio-ui-system.md` (lines 330–340):**
   - *Issue:* Describes separate "Generative layer" and "Image layer" inspector contexts.
   - *Action:* Recommend updating to describe the universal `Layer → Source → Effects` inspector structure in a future docs pass.
2. **`docs/design-system/effectsio-component-system.md` (§18 & §20):**
   - *Issue:* Refers to "Generative layers" and specialized "Generative Controls".
   - *Action:* Recommend updating terminology to "Procedural Sources" in a future docs pass.
3. **`docs/buildkit/architecture.md` (lines 33–40):**
   - *Issue:* Inspector diagram still mentions "Procedural Tab" and "Effects Stack Tab" as separate tabs rather than contextual vertical panel sections.
   - *Action:* Recommend aligning diagram with current vertical scrolling panel layout in a future docs pass.

*Note: No documentation has been deleted in this proposal session.*

---

## 14. Approval Gate

```text
STATUS: PENDING PROJECT OWNER APPROVAL
```

This document is an **implementation proposal only**. No application source code has been modified.

In accordance with `AGENTS.md` Rule 12, Phase 4 implementation **must not begin** until the project owner explicitly adds the following literal line to this document:

```text
APPROVED: <date>
```
