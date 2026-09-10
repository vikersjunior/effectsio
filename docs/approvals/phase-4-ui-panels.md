# Phase 4 — UI & Panels Alignment: Approval Proposal

**Document type:** Implementation Approval Proposal  
**Status:** PENDING PROJECT OWNER APPROVAL  
**Audited Repository HEAD:** `9d571ffec25fe344e47b599aaf6cb19377aad46d`
**Base Commit Verified:** `c0f5cb38b5b201e2e76fa68beab4bf3fc8959e3b`
**Prerequisite Phases Shipped:** Phase 1 (`cd688c1`), Phase 2 (`92ca7bb` / `2295969`), Phase 3 (`99cf30d`)
**Approval Gate Rule:** In accordance with `AGENTS.md` Rule 12, this proposal remains strictly unapproved until the project owner manually adds the literal line `APPROVED: <date>`.

---

## 1. Readiness Verdict

### **READY FOR APPROVAL**

The repository is architecturally prepared, empirically audited, and verified for **Phase 4 — UI & Panels Alignment**.

- **Phase 1 (Frame & Layer Architecture)** established the canonical type model: `Project → Frame → (Group) → Layer → Source`.
- **Phase 2 (WebGL2 Unified Composition Model)** and its correction established authoritative `Layer.source` dispatch in the compositor.
- **Phase 3 (Studio Context & Active Editing State)** established `activeFrameId + activeLayerId` as the single authoritative active editing target in `StudioContext`, with `activeImageId` demoted to a derived compatibility getter (`useMemo` from `activeLayer.source`).
- All 394 automated tests across 30 test files pass.
- All mechanical checks (`verify:approvals`, `check:no-competitor-refs`, `check:public-provenance`) pass.
- The state mutation engine (`StudioContext.mutateLayerStack`) already resolves targets by canonical `Layer.id` as **Priority 1**.
- The remaining tasks in Phase 4 are strictly UI/state-consumer alignments that bring the presentation layer (`layers-panel.tsx`, `inspector-panel.tsx`, `floating-effect-panel.tsx`, `floating-background-panel.tsx`, `canvas-control-dock.tsx`) and minimal Group state actions into compliance with the canonical Unified Composition Model.

---

## 2. Current Repository State

A forensic audit of HEAD `9d571ff` reveals the exact boundary between what is currently implemented and what Phase 4 will migrate:

### CURRENT (What Exists in the Codebase Today)
1. **Layers Panel (`layers-panel.tsx`):**
   - Renders in **two completely disjoint JSX regions**: reorderable `imageLayers` (filtered by `layer.type === "image"`, displayed in reverse order) inside `DndContext` / `SortableContext`, and a separate `baseBackground` (found by `layer.type === "generative"`) rendered in a static `BackgroundRow` at the bottom.
   - Reordering is guarded by `const minIndex = baseBackground ? 1 : 0`.
   - "Add Layer" popover shows a "Background Layer" button only when `!baseBackground`.
   - `BackgroundRow` hardcodes a permanent lock icon (`LockSimpleIcon`).
   - `SortableLayerRow` has **no lock indicator and no lock toggle** in the UI.
   - Groups are **not rendered at all** in the UI.
2. **Inspector Panel (`inspector-panel.tsx`):**
   - Destructures `activeImageId` and routes all effect stack operations (`reorderEffectStack`, `selectInstance`, `toggleInstanceEnabled`, `removeInstanceFromStack`, `addEffectToStack`) through `activeImageId`.
   - Section visibility is branched on legacy discriminants:
     - `isImageLayerActive = activeLayer?.type === "image" || Boolean(activeAsset)`
     - `isGenerativeLayerExplicitlyActive = activeLayer?.type === "generative"`
     - `isPopulated = isImageLayerActive || isGenerativeLayerExplicitlyActive`
   - **Empirical Bug at HEAD:** If a canonical layer has `source.type === "procedural"` and `type === "procedural"`, both `isImageLayerActive` and `isGenerativeLayerExplicitlyActive` evaluate to `false`, causing `isPopulated` to be `false` and rendering an empty Inspector ("Select a layer to view and edit its properties").
   - Effects and Looks sections are hidden whenever `isGenerativeLayerExplicitlyActive` is `true`.
   - The Background Stack section is rendered exclusively when `isGenerativeLayerExplicitlyActive` is `true`.
3. **Floating Effect Panel (`floating-effect-panel.tsx`):**
   - Hard-gated on `if (!activeAsset || !activeImageId || !selectedInstance || !definition) return null;`.
   - Genuinely invisible whenever a procedural layer is active because `activeImageId` is `null`.
   - All parameter mutations pass `activeImageId`.
4. **Floating Background Panel (`floating-background-panel.tsx`):**
   - Hard-gated on `if (!activeFrame || !isBackgroundPanelOpen || activeLayer?.type !== "generative") return null;`.
   - Does **not** consume `activeImageId`.
5. **Canvas Control Dock (`canvas-control-dock.tsx`):**
   - Destructures `activeImageId` and calls `addEffectToStack(activeImageId, effectId)`.
6. **Canvas Viewport (`canvas-viewport.tsx`):**
   - Does **not** consume `activeImageId` directly. Consumes `activeAsset` (derived from `activeImageId`) for HTML image element decoding, fit zoom calculations, and texture uploads. Checks `layer.source?.type === "image" || layer.type === "image"`.
7. **Asset Panel (`asset-panel.tsx`):**
   - Consumes `activeImageId` solely as a fallback visual cue (subtle border ring) on asset tiles when `selectedAssetIds` is empty.
8. **Group Model (`types/frame.ts` & `studio-context.tsx`):**
   - `Group` interface (`id`, `name`, `layerIds`, `visible`, `locked`, `collapsed`) is defined in `types/frame.ts`.
   - `Frame.groups?: Group[]` is persisted and normalized.
   - **Empirical Gap at HEAD:** `studio-context.tsx` contains **zero Group state actions** (no `createGroup`, `removeGroup`, `updateGroup`, `toggleGroupCollapse`).
9. **Backdrop Layer (`types/frame.ts` & `studio-context.tsx`):**
   - Canonical `Layer` at index 0 with `source: { type: "procedural", kind: "solid", parameters: { color: "#000000" } }`.
   - `locked` property is `undefined` on the layer object; locked behavior is enforced solely by UI presentation and `studio-context.tsx` index-0 guards.
   - Can currently be deleted via `layers-panel.tsx` line 238 and `removeLayer()`.

---

## 3. Verified Phase 4 Migration Inventory

Every row in this table has been verified against actual repository source code:

| File | Current Behavior | Legacy Dependency | Proposed Phase 4 Change | Keep / Defer |
|---|---|---|---|---|
| `src/components/layout/layers-panel.tsx` | Dual-region rendering; image layers in `SortableContext` (reversed); `baseBackground` in separate `BackgroundRow`. Reorder guarded by `minIndex = baseBackground ? 1 : 0`. No groups rendered. | `type === "generative"`, `type === "image"`, `GenerativeLayer`, `ImageLayer`, `addBackgroundLayer` | Unify into single list of `activeFrame.layers` (rendered bottom-to-top, visually reversed). Extend `SortableLayerRow` to render image thumbnails or procedural swatches based on `source.type`. Enforce backdrop protection via `layer.locked` and `disabled={layer.locked}` on `useSortable`. Render single-tier group headers and indented child layers. | **In Scope (Phase 4)** |
| `src/components/layout/inspector-panel.tsx` | Sections gated by `type === "image"` and `type === "generative"`. Effects & Looks hidden for generative layers. Effect mutations pass `activeImageId`. Empty inspector bug for canonical procedural layers. | `activeImageId`, `activeLayer?.type === "generative"`, `activeLayer?.type === "image"`, `isGenerativeLayerExplicitlyActive` | Gate `isPopulated` on `Boolean(activeLayer)`. Discriminate source UI on `activeLayer?.source?.type`. Make Effects and Looks universal across all active layers. Contextually render Source controls (Image fit vs Procedural parameters). Pass `activeLayerId` to all effect callbacks. | **In Scope (Phase 4)** |
| `src/components/layout/floating-effect-panel.tsx` | Gated on `!activeAsset \|\| !activeImageId`. Parameter mutations pass `activeImageId`. Invisible for procedural layers. | `activeAsset`, `activeImageId` | Gate on `!activeLayer \|\| !activeLayerId \|\| !selectedInstance \|\| !definition`. Pass `activeLayerId` to `updateInstanceParameters`, `resetInstanceParameters`, `selectInstance`. Remove `activeAsset` and `activeImageId` imports. | **In Scope (Phase 4)** |
| `src/components/layout/floating-background-panel.tsx` | Gated on `activeLayer?.type !== "generative"`. Mutates procedural background items. | `activeLayer?.type !== "generative"` | Gate on `activeLayer?.source?.type !== "procedural"`. Retain internal procedural background item editing for compatibility. | **In Scope (Phase 4)** |
| `src/components/layout/canvas-control-dock.tsx` | Destructures `activeImageId`; calls `addEffectToStack(activeImageId, effectId)`. | `activeImageId` | Destructure `activeLayerId`; call `addEffectToStack(activeLayerId, effectId)`. | **In Scope (Phase 4)** |
| `src/context/studio-context.tsx` (Group State) | Zero group mutation operations exist in context. `StudioContextType` has no group actions. | Missing canonical state methods | Add minimal Group state operations: `createGroup(name, layerIds)`, `removeGroup(groupId)`, `updateGroup(groupId, updates)`, `toggleGroupCollapse(groupId)`. Update `removeLayer` to clean up `group.layerIds` and `layer.groupId`. | **In Scope (Phase 4)** |
| `src/types/frame.ts` (Backdrop) | `createDefaultBackdropLayer()` leaves `locked` as `undefined`. Lock is enforced only by UI and reorder guards. | Implicit lock convention | Explicitly set `locked: true` on canonical backdrop layer instances so interaction rules derive cleanly from `layer.locked`. | **In Scope (Phase 4)** |
| `src/components/layout/asset-panel.tsx` | Destructures `activeImageId`; highlights asset tile when `selectedAssetIds.size === 0 && asset.id === activeImageId`. | `activeImageId` | Keep intact. Legitimate compatibility visual cue for active image asset. | **DEFER (Keep Intact)** |
| `src/components/layout/canvas-viewport.tsx` | Consumes `activeAsset` for image loading and fit zoom. Checks `layer.source?.type === "image" \|\| layer.type === "image"`. Does not consume `activeImageId` directly. | `activeAsset`, `layer.type === "image"` | Keep intact. Multi-layer viewport texture pipeline migration belongs to a dedicated viewport phase. | **DEFER (Keep Intact)** |
| `src/context/studio-context.tsx` (Compatibility Exports) | Exports derived `activeImageId`, `setActiveImageId`, `activeAsset`, `effectStacks`, `backgrounds`. | Legacy compatibility | Keep all compatibility getters and setters intact in `StudioContextType`. | **DEFER (Keep Intact)** |
| `src/storage/db.ts` | `DB_VERSION = 2`. Hydrates frames and session state with legacy `session.activeImageId` bridge. | Schema & hydration compatibility | Zero changes. No schema migration, no hydration changes. | **DEFER (Keep Intact)** |

---

## 4. Canonical Architecture

Phase 4 strictly implements the repository-confirmed canonical model:

```text
Project
└── Frame (canvas boundary, dimensions, export settings)
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

### Semantic Discriminator vs. Property States
The proposal explicitly enforces this architectural invariant:
- **`source.type`** is the **sole semantic content discriminator** (`"image"` vs `"procedural"`).
- **`locked`** is an **interaction state**, never a layer type. It determines whether a layer can be selected, edited, transformed, or dragged.
- **`visible`** is a **rendering state**, never a layer type.
- **`opacity`** and **`blendMode`** are **compositing properties**, never layer types.
- **`groupId`** is an **organizational reference**, never a layer type.
- **`effectStack`** is a **universal modification pipeline**, available on all layers regardless of source type.

### Prohibited Entities
Phase 4 introduces **zero** instances of:
- `BackgroundLayer` or `GenerativeLayer` as canonical document types.
- `ProceduralLayer`, `MaterialLayer`, or `SimulationLayer`.
- `BackgroundStack` or `BackgroundItem` as new UI architecture.

---

## 5. Phase 4 Scope

The implementation scope for Phase 4 is bounded to:

1. **Layers Panel Presentation:**
   - Eliminate dual-region split in `layers-panel.tsx`.
   - Render all `Frame.layers` in a single unified list in bottom-to-top z-order (visually reversed so top layer is at top of panel).
   - Extend `SortableLayerRow` to render image thumbnails (`source.type === "image"`) or procedural swatches (`source.type === "procedural"`).
   - Add single-tier Group row rendering (`GroupRow`), group collapse/expand toggling, and visual child indentation.
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
   - Ensure `createDefaultBackdropLayer()` in `types/frame.ts` initializes `locked: true`.
8. **Unit Test Updates:**
   - Update component test suites asserting `l.type === "generative"` or `l.type === "image"` to assert canonical `l.source.type` and `activeLayerId`.

---

## 6. Explicit Non-Goals

Phase 4 strictly excludes the following:

- **No WebGL compositor redesign:** The compositor pipeline in `src/rendering/webgl/` remains untouched.
- **No shader changes or additions:** Shader GLSL code is untouched.
- **No compositor effect execution for procedural sources:** Whether the WebGL compositor applies an effect stack to procedural-source layers is deferred to a dedicated rendering phase. Phase 4 aligns the UI surface only.
- **No IndexedDB schema upgrades:** Database version remains `DB_VERSION = 2`.
- **No removal of compatibility exports:** `activeImageId`, `setActiveImageId`, `activeAsset`, `effectStacks`, and `backgrounds` remain in `StudioContextType` for unmigrated consumers.
- **No removal of compatibility fields in `Layer`:** `type`, `assetId`, `backgrounds`, `sublayers`, and `backgroundConfig` remain on `Layer` in `types/frame.ts` for database hydration.
- **No canvas viewport texture pipeline rewrite:** `canvas-viewport.tsx` continues to consume `activeAsset` for image element decoding.
- **No nested groups:** `Group → Group` is forbidden.
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

## 8. Documentation Reconciliation

Forensic inspection of the documentation identified statements belonging to superseded architectures. These are classified per governance rules:

### A. Canonical Documents (Update Recommended in Future Docs Passes)
- `docs/design-system/effectsio-ui-system.md` (lines 330–340): Mentions separate "Generative layer" and "Image layer" inspector contexts. Should be updated to describe universal `Layer → Source → Effects`.
- `docs/design-system/effectsio-component-system.md` (§18 & §20): Lists "Generative" as an inspector context and discusses "Generative layers". Should be updated to "Procedural Sources".
- `docs/buildkit/architecture.md` (lines 33–40): ASCII diagram shows "Procedural Tab" and "Effects Stack Tab" instead of vertical panel sections. Should be updated to vertical panel layout.

### B. Historical Approval & Evidence Records (MUST BE PRESERVED UNTOUCHED)
- `docs/approvals/stage-1-frame-layer.md` (Approved 2026-09-05)
- `docs/approvals/unified-composition-model.md` (Approved 2026-09-08)
- `docs/approvals/phase-3-studio-context.md` (Approved 2026-09-09)
- `docs/approvals/phase-7-rendering-review.md` (Approved 2026-08-28)
- `docs/approvals/stage-1-frame-layer-review.md`
- `docs/approvals/unified-composition-model-review.md`
- `docs/worklog.md` (complete historical migration log)
- `docs/buildkit/Progress.md` (historical phase progression)

### C. Superseded Reference Studies (Preserve with Historical Context)
- `docs/reference-study.md` (records verified research findings; preserved for algorithmic references).
- Historical generative shader evidence and feature inventories under `docs/evidence/` (preserved for procedural and parametric formula reference).

### D. Truly Obsolete Documents Safe to Remove
- **Zero documents identified for removal.** Preserving historical context is prioritized. No deletions are performed or proposed.

---

## 9. Verification Plan

Phase 4 implementation will be verified through the following mandatory gates:

### 9.1 Static & Mechanical Verification
```bash
pnpm verify:approvals       # Confirms Phase 4 approval record is valid once signed
pnpm check:no-competitor-refs # Confirms 0 competitor references in tracked files
pnpm check:public-provenance  # Confirms 0 external runtime references
pnpm typecheck              # 0 TypeScript compiler errors required
pnpm test                   # 394+ unit tests passing (0 failures)
pnpm build                  # Production Vite build passes cleanly
pnpm graphify:update        # Synchronizes AST knowledge graph post-implementation
```

### 9.2 Browser Verification Checklist
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

## 10. Approval Boundary

```text
STATUS: PENDING PROJECT OWNER APPROVAL
```

This document is an **implementation approval proposal only**. No application source code has been modified in this session.

In accordance with `AGENTS.md` Rule 12, Phase 4 implementation **must not begin** until the project owner explicitly adds the following literal line to this document:

```text
APPROVED: <date>
```
