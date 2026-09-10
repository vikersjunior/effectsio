# Phase 4 — UI & Panels Alignment: Approval Proposal

**Document type:** Implementation Approval Proposal
**Status:** PENDING PROJECT OWNER APPROVAL
**Audited Repository HEAD:** `4bd3bf4b530a25ca4905850d3e2cd61bef101de4`
**Base Commit Verified:** `c0f5cb38b5b201e2e76fa68beab4bf3fc8959e3b`
**Prerequisite Phases Shipped:** Phase 1 (`cd688c1`), Phase 2 (`92ca7bb` / `2295969`), Phase 3 (`99cf30d`)
**Approval Gate Rule:** In accordance with `AGENTS.md` Rule 12, this proposal remains strictly unapproved until the project owner manually adds the literal line `APPROVED: <date>`.

---

## 1. Readiness Verdict

### **READY FOR APPROVAL**

The EffectsIO repository is architecturally prepared, empirically audited, and verified for **Phase 4 — UI & Panels Alignment**.

- **Phase 1 (Frame & Layer Architecture)** established the canonical type model: `Project → Frame → (Group) → Layer → Source`.
- **Phase 2 (WebGL2 Unified Composition Model)** and its correction established authoritative `Layer.source` dispatch in the WebGL compositor.
- **Phase 3 (Studio Context & Active Editing State)** established `activeFrameId + activeLayerId` as the single authoritative active editing target in `StudioContext`, with `activeImageId` demoted to a strictly derived compatibility getter (`useMemo` from `activeLayer.source`).
- All 394 automated tests across 30 test files pass cleanly.
- All mechanical compliance checks (`verify:approvals`, `check:no-competitor-refs`, `check:public-provenance`) pass.
- The state mutation engine (`StudioContext.mutateLayerStack`) already resolves targets by canonical `Layer.id` as **Priority 1** (lines 1552–1553 of `src/context/studio-context.tsx`).
- The remaining work in Phase 4 consists strictly of UI presentation alignments (`layers-panel.tsx`, `inspector-panel.tsx`, `floating-effect-panel.tsx`, `floating-background-panel.tsx`, `canvas-control-dock.tsx`) and introducing minimal Group state operations into `StudioContext` to fulfill the single-tier Group model.

---

## 2. Current Repository State

**Audited at commit:** `4bd3bf4b530a25ca4905850d3e2cd61bef101de4`
The repository state has been empirically verified across all relevant files:

### A. State Engine (`src/context/studio-context.tsx`)
- **Authoritative Active Editing Target:** `activeFrameId` and `activeLayerId` are stored in React state (lines 284–287) and refs (lines 527–528).
- **Strict Derived Lookup:** `activeFrame` (lines 387–390) and `activeLayer` (lines 393–396) resolve strictly by ID with zero silent fallbacks.
- **Derived Compatibility Property:** `activeImageId` (lines 399–408) derives strictly from `activeLayer.source` (`null` for procedural layers, backdrops, or empty frames).
- **Universal Effect Stack:** `activeEffectStack` (lines 416–418) universally derives as `activeLayer?.effectStack ?? []` across all layer types.
- **Target Resolution in Mutations:** `mutateLayerStack` (lines 1551–1565) checks:
  1. Priority 1: `l.id === targetId` (Canonical Layer ID)
  2. Priority 2: `l.source?.type === "image" && l.source.assetId === targetId`
  3. Priority 3: `l.type === "image" && l.assetId === targetId`
  4. Priority 4: active layer fallback.
- **API Signatures:** `addEffectToStack`, `reorderEffectStack`, `updateInstanceParameters`, `resetInstanceParameters`, `toggleInstanceEnabled`, and `removeInstanceFromStack` are already typed to accept `assetIdOrLayerId: string` (lines 163–183).

### B. Persistence Layer (`src/storage/db.ts`)
- Database version remains `DB_VERSION = 2` (line 31).
- `loadHydratedProject` follows approved hydration precedence: validated `session.activeLayerId` → `Frame.activeLayerId` → `session.activeImageId` migration bridge → top-most layer → `null`.
- Zero database schema migrations are required for Phase 4.

### C. UI Presentation Layer (`src/components/layout/`)
- Currently maintains dual-region rendering in `layers-panel.tsx` and legacy type branching in `inspector-panel.tsx`, `floating-effect-panel.tsx`, and `floating-background-panel.tsx`.

---

## 3. Current Architecture

Phase 4 implements the repository-confirmed canonical model:

```text
Project
└── Frame (composition boundary, dimensions, export settings)
    ├── Group[] (single-tier organizational container, optional)
    │   └── Layer[]
    └── Layer[] (universal independently composited visual object)
        ├── Source (content generator: ImageSource | ProceduralSource)
        ├── EffectStack (ordered list of GPU shader effect instances)
        ├── Transform (spatial translation X/Y, scale, rotation)
        ├── Opacity (0.0 to 1.0)
        ├── BlendMode (compositing blend equation)
        ├── Visible (boolean rendering state)
        └── Locked (boolean interaction state)
```

### Architectural Definitions
- **Frame:** The composition boundary. Owns dimensions, background/fill, per-frame active layer memory (`Frame.activeLayerId`), and export configuration.
- **Layer:** The single, universal, independently composited visual object.
- **Source:** The content generator for a Layer (`ImageSource` or `ProceduralSource`). It has no awareness of canvas coordinates, z-index, blending, or effects.
- **Effect:** A GPU shader modification pass within a Layer's effect stack.
- **Group:** A single-tier organizational container (`Group → Layer[]`). Groups do not composite or nest.
- **Background:** A **creative visual role**, not a document-model type. A Layer at index 0 with a procedural source fills the background role.

### Semantic Discriminator vs. Property States
- **`source.type`** is the **sole semantic content discriminator** (`"image"` vs `"procedural"`).
- **`locked`** is an **interaction state**, never a layer type. It controls whether a layer can be edited, transformed, or dragged.
- **`visible`** is a **rendering state**, never a layer type.
- **`opacity`** and **`blendMode`** are **compositing properties**, never layer types.
- **`groupId`** is an **organizational reference**, never a layer type.
- **`effectStack`** is a **universal modification pipeline**, available on all layers.

### Prohibited Entities
Phase 4 introduces **zero** instances of:
- `BackgroundLayer` or `GenerativeLayer` as canonical document types.
- `ProceduralLayer`, `MaterialLayer`, or `SimulationLayer`.
- `BackgroundStack` or `BackgroundItem` as new UI architecture.

---

## 4. Current UI Findings: Component-by-Component Audit

For every relevant component, the table below contrasts the **CURRENT** repository implementation against the **PROPOSED** Phase 4 implementation:

| Component | Current Implementation (HEAD `4bd3bf4`) | Proposed Phase 4 Implementation |
|---|---|---|
| **`src/components/layout/layers-panel.tsx`** | **CURRENT:** Dual-region rendering. `imageLayers` filtered by `l.type === "image"` and reversed inside `SortableContext` (lines 303, 428–456). `baseBackground` found by `l.type === "generative"` (line 299) and rendered separately in `BackgroundRow` at the bottom (lines 459–478). Reorder guarded by `minIndex = baseBackground ? 1 : 0` (line 322). "Add Layer" popover shows "Background Layer" only when `!baseBackground` (line 363). `BackgroundRow` hardcodes `LockSimpleIcon` (line 189). `SortableLayerRow` has no lock indicator or toggle. Zero groups rendered. | **PROPOSED:** Single unified list rendering all `Frame.layers` bottom-to-top (visually reversed). Extend `SortableLayerRow` to render image thumbnails (`source.type === "image"`) or procedural swatches (`source.type === "procedural"`). Render single-tier group headers (`GroupRow`) and indented child layers. Protect backdrop via `disabled={layer.locked}` on `useSortable` and clamp `toIndex >= 1`. Offer "Image Layer" and "Procedural Layer" in Add Layer popover. |
| **`src/components/layout/inspector-panel.tsx`** | **CURRENT:** Destructures `activeImageId` (line 177). Gates section visibility on legacy discriminants: `isImageLayerActive = activeLayer?.type === "image" \|\| Boolean(activeAsset)` (line 265), `isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative"` (line 266), `isPopulated = isImageLayerActive \|\| isGenerativeLayerExplicitlyActive` (line 267). Effects and Looks sections hidden when `isGenerativeLayerExplicitlyActive` is true (lines 619, 679). Background Stack shown exclusively when `isGenerativeLayerExplicitlyActive` is true (line 771). All effect mutations pass `activeImageId` (lines 249, 654–666, 748–751, 933). **Live bug:** A canonical layer with `source.type === "procedural"` and `type === "procedural"` causes `isPopulated` to be false, rendering an empty inspector. | **PROPOSED:** Gate `isPopulated` on `Boolean(activeLayer)`, resolving the procedural empty-state bug. Derive `isImageSource = activeLayer?.source?.type === "image"` and `isProceduralSource = activeLayer?.source?.type === "procedural"`. Make Effects and Looks universal across all active layers. Contextually render Source controls (Image fit vs Procedural parameters). Pass `activeLayerId` to all effect callbacks (`reorderEffectStack`, `selectInstance`, `toggleInstanceEnabled`, `removeInstanceFromStack`, `addEffectToStack`). |
| **`src/components/layout/floating-effect-panel.tsx`** | **CURRENT:** Gated on `if (!activeAsset \|\| !activeImageId \|\| !selectedInstance \|\| !definition) return null;` (line 125). Genuinely invisible for procedural layers because `activeImageId` is null. All parameter mutations pass `activeImageId` (lines 130–137, 259–387). | **PROPOSED:** Gate on `if (!activeLayer \|\| !activeLayerId \|\| !selectedInstance \|\| !definition) return null;`. Pass `activeLayerId` to `selectInstance`, `resetInstanceParameters`, and `updateInstanceParameters`. Remove `activeAsset` and `activeImageId` imports. |
| **`src/components/layout/floating-background-panel.tsx`** | **CURRENT:** Gated on `if (!activeFrame \|\| !isBackgroundPanelOpen \|\| activeLayer?.type !== "generative") return null;` (line 155). Does **not** consume `activeImageId`. Updates procedural parameters via `updateBackgroundItemParameters`. | **PROPOSED:** Gate on `if (!activeFrame \|\| !isBackgroundPanelOpen \|\| activeLayer?.source?.type !== "procedural") return null;`. Retain internal procedural background item parameter editing for compatibility. |
| **`src/components/layout/canvas-control-dock.tsx`** | **CURRENT:** Destructures `activeImageId` (line 53); calls `addEffectToStack(activeImageId, effectId)` (lines 360–361). | **PROPOSED:** Destructure `activeLayerId`; call `addEffectToStack(activeLayerId, effectId)`. |
| **`src/components/layout/asset-panel.tsx`** | **CURRENT:** Destructures `activeImageId` (line 33). Highlights asset tile when `selectedAssetIds.size === 0 && asset.id === activeImageId` (line 277). | **PROPOSED:** **No change in Phase 4.** Retain `activeImageId` consumption as a legitimate compatibility visual cue for active image asset. |
| **`src/components/layout/canvas-viewport.tsx`** | **CURRENT:** Consumes `activeAsset` (lines 62, 125, 221, 336, 714) for image decoding, fit zoom, and texture upload. Checks `layer.source?.type === "image" \|\| layer.type === "image"`. Does not consume `activeImageId` directly. | **PROPOSED:** **No change in Phase 4.** Retain `activeAsset` consumption. Multi-layer viewport texture pipeline migration belongs to a dedicated viewport phase. |

---

## 5. Phase 4 Scope

The implementation scope for Phase 4 is strictly defined as follows:

1. **Layers Panel Presentation:**
   - Eliminate dual-region split in `layers-panel.tsx`.
   - Render all `Frame.layers` in a single unified list in bottom-to-top z-order (visually reversed so top layer is at top of panel).
   - Extend `SortableLayerRow` to render image thumbnails (`source.type === "image"`) or procedural swatches (`source.type === "procedural"`).
   - Render single-tier group headers (`GroupRow`), group collapse/expand toggling, and visual child indentation.
   - Enforce backdrop protection as a UX constraint on a normal Layer:
     - Backdrop displays lock badge.
     - Backdrop has `disabled={layer.locked}` on `useSortable` (cannot be dragged).
     - Drag destination clamps `toIndex >= 1` when index 0 is locked.
   - Update "Add Layer" popover to offer "Image Layer" and "Procedural Layer".
2. **Inspector Panel Alignment:**
   - Eliminate legacy `layer.type` checks (`isGenerativeLayerExplicitlyActive`).
   - Gate `isPopulated` strictly on `Boolean(activeLayer)`.
   - Organize panel into canonical hierarchy:
     ```text
     Section 0: Layer Properties (Name, Opacity, BlendMode, Visibility, Lock)
     Section 1: Source (Contextual: Image fit/info vs. Procedural parameters)
     Section 2: Transform (X/Y Translation, Scale, Rotation, Reset)
     Section 3: Effects (Universal Effect Stack: Add, Reorder, Toggle, Remove)
     Section 4: Looks (Universal Presets: Apply Look, Save as Look)
     ```
   - Route all effect stack operations through `activeLayerId`.
3. **Floating Effect Panel Migration:**
   - Gate visibility on `!activeLayer || !activeLayerId || !selectedInstance || !definition`.
   - Pass `activeLayerId` to all parameter mutations.
   - Remove unused `activeAsset` and `activeImageId` imports.
4. **Floating Background Panel Gate Update:**
   - Update gate from `activeLayer?.type !== "generative"` to `activeLayer?.source?.type !== "procedural"`.
5. **Canvas Control Dock Migration:**
   - Route effect addition from `activeImageId` to `activeLayerId`.
6. **Minimal Group State Engine in `StudioContext`:**
   - Implement `createGroup(name, layerIds)`, `removeGroup(groupId)`, `updateGroup(groupId, updates)`, and `toggleGroupCollapse(groupId)`.
   - Update `removeLayer` to maintain group integrity (clean up `group.layerIds` and `layer.groupId`).
7. **Backdrop Object Initialization:**
   - Ensure `createDefaultBackdropLayer()` in `types/frame.ts` explicitly initializes `locked: true`.
8. **Unit Test Updates:**
   - Update component test suites asserting legacy `layer.type` to assert canonical `layer.source` and `activeLayerId`.

---

## 6. Explicit Non-Goals

Phase 4 strictly excludes the following work:

- **No WebGL compositor redesign:** The WebGL frame compositor (`src/rendering/webgl/webgl-frame-compositor.ts`) was completed in Phase 2 and remains untouched.
- **No shader changes or additions:** GLSL ES 3.00 shader code is untouched.
- **No compositor effect execution on procedural sources:** Whether the WebGL compositor runs effect stacks against procedural sources is deferred to a dedicated rendering phase. Phase 4 updates the UI surface only.
- **No IndexedDB schema upgrades:** Database version remains `DB_VERSION = 2`.
- **No removal of compatibility exports:** `activeImageId`, `setActiveImageId`, `activeAsset`, `effectStacks`, and `backgrounds` remain in `StudioContextType` for unmigrated consumers.
- **No removal of compatibility fields in `Layer`:** `type`, `assetId`, `backgrounds`, `sublayers`, and `backgroundConfig` remain on `Layer` in `types/frame.ts` for database hydration.
- **No canvas viewport texture pipeline rewrite:** `canvas-viewport.tsx` continues to consume `activeAsset` for image element decoding.
- **No nested groups:** `Group → Group` is strictly forbidden.
- **No animation or export engine changes:** Timeline controls and export pipelines remain untouched.

---

## 7. Compatibility Boundary

The following legacy fields and APIs remain actively required by unmigrated subsystems and **must NOT be removed** in Phase 4:

| Symbol / API | Resides In | Required By | Planned Removal Milestone |
|---|---|---|---|
| `activeImageId` | `StudioContextType`, `db.ts`, `history.ts` | `asset-panel.tsx` (tile highlight), `db.ts` (session hydration fallback) | Phase 5+ (after viewport & asset panel migrate) |
| `activeAsset` | `StudioContextType` | `canvas-viewport.tsx` (HTMLImageElement decoding, texture upload, fit zoom) | Phase 5+ (after viewport multi-layer pipeline) |
| `Layer.type` | `types/frame.ts`, `db.ts` | `db.ts` (IndexedDB v1/v2 hydration), `webgl-frame-compositor.ts` (legacy fallback) | Future persistence cleanup |
| `Layer.assetId` | `types/frame.ts`, `db.ts` | `db.ts` (hydration), `canvas-viewport.tsx` | Future persistence cleanup |
| `Layer.backgrounds` / `sublayers` | `types/frame.ts`, `db.ts` | `floating-background-panel.tsx`, `db.ts` | Future procedural source refactor |
| `addBackgroundItem()` / `updateBackgroundItem()` | `StudioContextType` | `floating-background-panel.tsx`, `inspector-panel.tsx` (background stack) | Retained for procedural background editing |

---

## 8. Groups: Data-Model, State, and UI Boundary

A forensic audit of the repository reveals the exact readiness state of Groups:

1. **Data-Model Support:** **EXISTS** in `src/types/frame.ts`:
   - `Group` interface (lines 120–129): `{ id, name, layerIds, visible, locked, collapsed?, createdAt, updatedAt }`.
   - `BaseLayer.groupId?: string | null` (line 143).
   - `Frame.groups?: Group[]` (line 259).
   - `createGroup()` factory function (lines 527–545).
   - `createDefaultFrame()` initializes `groups: []` (line 559).
   - `normalizeFrameToUniversalModel()` preserves `frame.groups` (lines 807–829).
2. **Runtime/State Support:** **DOES NOT EXIST** in `src/context/studio-context.tsx`:
   - `grep -i "group" src/context/studio-context.tsx` returns **0 matches**.
   - There are currently no group mutation actions in `StudioContext`.
3. **UI Support:** **DOES NOT EXIST** in `src/components/layout/layers-panel.tsx`:
   - Groups are not rendered in the Layers Panel.

### Phase 4 Group Commitment
To deliver working single-tier Groups in the UI without broken or dead controls, Phase 4 will implement:
- **Minimal Group State in `StudioContext`:**
  - `createGroup(name: string, layerIds: string[]): Group`
  - `removeGroup(groupId: string): void` (un-groups child layers, setting `layer.groupId = null`)
  - `updateGroup(groupId: string, updates: Partial<Group>): void`
  - `toggleGroupCollapse(groupId: string): void`
  - Update `removeLayer(layerId)` to filter out `layerId` from parent `group.layerIds`.
- **Layers Panel Group Presentation:**
  - Render `GroupRow` with collapse/expand chevron, group name, visibility toggle, lock toggle, and visually indented child layers.
- **Strict Constraint:** Single-tier only (`Group → Layer[]`). Nesting `Group → Group` is forbidden.

---

## 9. Backdrop Model & UX Constraints

Forensic inspection confirms how the backdrop is currently represented:

1. **Document Model:** The backdrop is a normal canonical `Layer` created by `createDefaultBackdropLayer()` (`types/frame.ts:331`) with `source: { type: "procedural", kind: "solid", parameters: { color: "#000000" } }`.
2. **Position:** Positioned at array index 0 in `Frame.layers`.
3. **Lock State:** `createDefaultBackdropLayer()` currently leaves `locked` as `undefined`. The lock is hardcoded in the `BackgroundRow` UI (`LockSimpleIcon`, line 189) and enforced by index guards in `studio-context.tsx` (lines 1019, 1037).
4. **Deletion:** The backdrop can currently be deleted via `layers-panel.tsx` line 238 and `removeLayer()`. When deleted, an "Add Background Layer" button appears.
5. **Compositor Independence:** The WebGL compositor (`composeFrame`) evaluates `frame.layers` from `i = 0` to `N - 1` bottom-to-top regardless of layer type; it has **zero index-0 assumptions**.

### Phase 4 Backdrop UX Rule
- In `createDefaultBackdropLayer()`, explicitly initialize `locked: true`.
- In `layers-panel.tsx`, protect the backdrop via `layer.locked` instead of `layer.type === "generative"`:
  - `disabled={layer.locked}` on `useSortable` (prevents dragging the backdrop).
  - Clamp drop destination `toIndex >= 1` when index 0 is locked (prevents dragging another layer below index 0).
- This protects the backdrop at the base of the stack as an interaction constraint on a normal Layer.

---

## 10. Component Reuse Plan

Inspection of `src/components/ui/` and `src/components/layout/` confirms the exact component inventory:

| UI Need | Existing Component | Path | Status & Reuse Strategy |
|---|---|---|---|
| Panel Container | `PanelSurface` | `src/components/ui/panel/panel-surface.tsx` | Exists; used for panel outer chrome. |
| Panel Header | `PanelHeader` | `src/components/ui/panel/panel-header.tsx` | Exists; used for panel headers with action slots. |
| Inspector Sections | `PanelSection` | `src/components/ui/panel/panel-section.tsx` | Exists; used for collapsible parameter sections. |
| Numeric Controls | `SliderControl` | `src/components/ui/controls/slider/slider-control.tsx` | Exists; used for Opacity, Scale, Rotation, effect parameters. |
| Select Controls | `SelectControl` | `src/components/ui/controls/select/select-control.tsx` | Exists; used for BlendMode and FitMode selectors. |
| Color Controls | `ColorControl` | `src/components/ui/controls/color/color-control.tsx` | Exists; used for procedural color parameters. |
| Gradient Controls | `GradientControl` | `src/components/ui/controls/gradient/gradient-control.tsx` | Exists; used for procedural gradient parameters. |
| Action Buttons | `Button` | `src/components/ui/primitives/button.tsx` | Exists; used for discrete button actions. |
| Toggles & Switches | `Toggle` / `Switch` | `src/components/ui/primitives/` | Exists; used for layer visibility and lock toggles. |
| Popovers | `Popover` | `src/components/ui/primitives/popover.tsx` | Exists; used for Add Layer and Looks popovers. |
| Scroll Containers | `ScrollFade` | `src/components/ui/primitives/scroll-fade.tsx` | Exists; used for scrollable panel bodies. |
| Icon System | `@phosphor-icons/react` via `ICON_SIZES` | `src/components/ui/lib/icon-sizes.ts` | Exists; canonical icon library and sizes. |
| Drag & Drop | `@dnd-kit/core`, `@dnd-kit/sortable` | `node_modules` | Installed; provides `SortableContext`, `useSortable`. |
| Layer Row | `SortableLayerRow` | `src/components/layout/layers-panel.tsx:48` | **Layout component (not in `ui/`).** Extend in place to render procedural swatches and lock indicators. |
| Background Stack Row | `SortableBackgroundRow` | `src/components/layout/sortable-background-row.tsx:30` | **Layout component.** Exists; used in Inspector background stack. |
| Group Row | `GroupRow` | `src/components/layout/` | **Does not exist yet.** Must be authored as a layout composite in `src/components/layout/`. |

---

## 11. Implementation Sequence

To prevent regressions and ensure code health at each step, Phase 4 will be implemented in the following strict dependency order:

```text
Step 1: Backdrop Schema Initialization
└── types/frame.ts: initialize locked: true in createDefaultBackdropLayer()
    ↓
Step 2: Group State Actions in StudioContext
└── studio-context.tsx: add createGroup, removeGroup, updateGroup, toggleGroupCollapse
    ↓
Step 3: Dock & Floating Effect Panel Migration
├── canvas-control-dock.tsx: route addEffectToStack to activeLayerId
└── floating-effect-panel.tsx: gate on activeLayerId; route parameter updates to activeLayerId
    ↓
Step 4: Floating Background Panel Gate Migration
└── floating-background-panel.tsx: update gate to activeLayer?.source?.type !== "procedural"
    ↓
Step 5: Inspector Panel Alignment
└── inspector-panel.tsx: gate on Boolean(activeLayer); discriminate on source.type;
    make Effects/Looks universal; route mutations to activeLayerId
    ↓
Step 6: Layers Panel Unification
└── layers-panel.tsx: unify into single list; extend SortableLayerRow;
    author GroupRow; protect backdrop via layer.locked; update Add Layer popover
    ↓
Step 7: Automated Unit Test Alignment
└── Update component test suites asserting legacy layer.type to assert canonical layer.source
```

---

## 12. Verification Plan

Phase 4 implementation will be verified through both automated mechanical checks and interactive browser verification:

### 12.1 Static & Mechanical Verification
```bash
pnpm verify:approvals         # Confirms Phase 4 approval record is valid once signed
pnpm check:no-competitor-refs   # Confirms 0 competitor references in tracked files
pnpm check:public-provenance    # Confirms 0 external runtime references
pnpm typecheck                # 0 TypeScript compiler errors required
pnpm test                     # 394+ unit tests passing (0 failures)
pnpm build                    # Production Vite build passes cleanly
pnpm graphify:update          # Synchronizes AST knowledge graph post-implementation
```

### 12.2 Browser Verification Checklist
Interactive browser verification covering the following 13 scenarios:

1. **Image Layer Selection:** Select an image layer; verify Inspector displays Layer Properties, Source (Image info/fit), Transform, Effects, Looks.
2. **Procedural Layer Selection:** Select a procedural layer; verify Inspector displays Layer Properties, Source (Procedural parameters), Transform, Effects, Looks (confirming resolution of the empty-inspector bug).
3. **Layer Switching:** Switch between layers; verify selection ring and Inspector update instantly with zero state leakage.
4. **Universal Effect Stack on Procedural Layer:** Add an effect to a procedural layer; verify effect row renders in stack and floating effect panel opens.
5. **Floating Effect Panel Targeting:** Adjust sliders in Floating Effect Panel; verify updates apply strictly to `activeLayerId`.
6. **Canvas Dock Effect Addition:** Click an effect in the canvas dock; verify it appends to `activeLayerId`.
7. **Backdrop Protection:** Attempt to drag a layer below the backdrop; verify drop is disallowed and backdrop remains at index 0.
8. **Backdrop Lock Badge:** Verify backdrop displays lock icon and cannot be dragged.
9. **Layer Visibility:** Toggle eye icon on image and procedural layers; verify canvas reflects visibility change.
10. **Layer Reordering:** Drag layers within allowed range; verify z-order updates in canvas compositor.
11. **Group Authoring & Interaction:** Create a group, collapse/expand it, toggle group visibility and lock; verify child layers indent and behave collectively.
12. **Decoupled Asset Selection:** Click assets in Asset Library; verify active canvas layer does not switch accidentally.
13. **Background Workflow Continuity:** Open floating background editor for procedural layers; verify color, gradient, and pattern editing continues working.

---

## 13. Approval Boundary

```text
STATUS: PENDING PROJECT OWNER APPROVAL
```

This document is an **implementation approval proposal only**. No application source code has been modified in this session.

In accordance with `AGENTS.md` Rule 12, Phase 4 implementation **must not begin** until the project owner explicitly adds the following literal line to this document:

```text
APPROVED: <date>
```
