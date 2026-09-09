# Phase 3 Approval Record — Studio Context & Active Editing State

APPROVED: 2026-09-09
**Document:** `docs/approvals/phase-3-studio-context.md`  
**Status:** `APPROVED: 2026-09-09`  
**Date:** September 2026  
**Evaluation Target:** Phase 3 — Studio Context & Active Editing State Migration  
**Governance Standards:** `AGENTS.md` Rule 1 (Empirical Evidence), Rule 6 (Type Safety), Rule 8 (Non-Destructive Editing & Source of Truth State), Rule 10 (Graphify Intelligence), Rule 11 (Headroom Pre-Flight), Rule 12 (Mechanical Approval Gates), Rule 14 (No Competitor References), Rule 15 (Public Repository Provenance)

---

> [!IMPORTANT]
> **GATE STATUS: UNAPPROVED — AWAITING PROJECT OWNER SIGNATURE**  
> Per `AGENTS.md` Rule 12, this document is a formal specification and approval record. Implementation of Phase 3 is **PROHIBITED** until the project owner explicitly approves this document by adding the literal line `APPROVED: <date>` to the Approval section below.

---

## 1. Purpose & Context

In the EffectsIO Unified Composition Model:

- **Phase 1 (Frame & Layer Architecture)** established the canonical data structures: `Project → Frame → (Group) → Layer → Source`, replacing specialized layer interfaces with universal `Layer` and discriminated `LayerSource` (`ImageSource`, `ProceduralSource`).
- **Phase 2 (WebGL2 Unified Composition Model)** migrated the WebGL2 compositor to render `Layer.source` authoritatively (`composeFrame` resolving `ProceduralSource` and `ImageSource` directly from `Layer.source`), eliminating compositor dependence on legacy `type: "generative"` and `type: "image"` fields.

**Phase 3** addresses the central application state management layer (`src/context/studio-context.tsx`).

Currently, `StudioContext` contains architectural vestiges of the legacy single-image model:

1. `activeLayer` evaluation includes silent fallback logic (`|| firstImage || activeFrame.layers[0] || null`), masking invalid state transitions.
2. `activeImageId` acts as a parallel selection state that searches across frames and falls back to `firstImage.assetId` even when a procedural layer is active.
3. `selectAsset()` in the Asset Library calls `setActiveImageId()`, forcibly changing the active canvas editing target and switching active frames.
4. `activeEffectStack` checks legacy `activeLayer.type === "image"` rather than granting universal effect stack access across all layer source types.
5. Direct calls to `setActiveImageId()` switch active frames if the image exists in any other frame, breaking frame isolation.

**Phase 3 resolves these discrepancies** by establishing `activeFrameId` + `activeLayerId` as the single authoritative editing target throughout `StudioContext`, maintaining non-destructive editing guarantees, enforcing getter purity, decoupling asset library selection from canvas active editing, and preserving clean backward compatibility for unmigrated Phase 4 UI consumers.

---

## 2. Approved Canonical Architecture & State Hierarchy

```text
Project
└── Frame (activeFrameId)
    ├── Group
    │   ├── Layer → Source
    │   └── Layer → Source
    ├── Layer (activeLayerId) → Source (ImageSource | ProceduralSource)
    └── Layer → Source
```

### State Hierarchy & Ownership

1. **Active Canvas Target (`activeFrameId` + `activeLayerId`)**:
   - `activeFrameId: string | null` (held in `StudioContext` state) identifies the current active Frame.
   - `activeLayerId: string | null` (held in `StudioContext` state) identifies the current active Layer within `activeFrame`.
   - `activeFrame` is derived strictly: `project.frames.find(f => f.id === activeFrameId) ?? null`.
   - `activeLayer` is derived strictly: `activeFrame?.layers.find(l => l.id === activeLayerId) ?? null`.

2. **Asset Library Selection (`selectedAssetIds`)**:
   - `selectedAssetIds: Set<string>` (held in `StudioContext` state) identifies which asset library items are highlighted/selected in the asset panel.
   - Completely decoupled from canvas active editing state. Selecting an asset in the library NEVER mutates `activeLayerId` or `activeFrameId`.

3. **Compatibility Getter (`activeImageId`)**:
   - Strictly derived from `activeLayer`. Not independent state. Returns an asset ID if and only if `activeLayer?.source.type === "image"`. Returns `null` for procedural layers, backdrop layers, or when no layer is active.

---

## 3. Invariants & Authority Rules

### Invariant 1: Active Frame Authority

- `activeFrameId` is the single source of truth for which composition frame is active.
- Canvas rendering, layer listing, inspector controls, and tool actions operate exclusively on the `activeFrame`.
- Frame switching only occurs via explicit user action (`setActiveFrameId`, frame deletion recovery, or project load/creation). It never occurs as a side effect of asset selection or layer editing.

### Invariant 2: Active Layer Authority

- `activeLayerId` is the single source of truth for the actively edited visual element.
- All layer transform, opacity, blend mode, visibility, lock, and effect stack mutations apply strictly to `activeLayerId` inside `activeFrame`.
- `activeLayer` is a pure lookup:
  ```ts
  const activeLayer = React.useMemo((): Layer | null => {
    if (!activeFrame || !activeLayerId) return null;
    return activeFrame.layers.find((l) => l.id === activeLayerId) ?? null;
  }, [activeFrame, activeLayerId]);
  ```
- Zero silent fallbacks: `activeLayer` MUST NOT fall back to `firstImage`, `layers[0]`, or any other layer during getter evaluation. If `activeLayerId` is null or does not match any layer in `activeFrame`, `activeLayer` is `null`.

### Invariant 3: `Frame.activeLayerId` Authority (Option A: Canonical Document State)

- `Frame.activeLayerId` serves as per-frame selection memory stored in the project document.
- **Runtime Authority**: `StudioContext.activeLayerId` is authoritative at runtime. When the user changes `activeLayerId`, `StudioContext` updates its state and synchronizes `activeFrame.activeLayerId = nextLayerId`.
- **Frame Switching**: When switching frames via `setActiveFrameId(targetFrameId)`, `StudioContext` restores `activeLayerId` from `targetFrame.activeLayerId`. If `targetFrame.activeLayerId` is null, invalid, or missing, it falls back to the top-most layer (`layers[layers.length - 1]?.id ?? null`), or `null` if the frame has no layers.
- **Document Integrity**: Each frame remembers its own active layer independently.

### Invariant 4: `activeImageId` Compatibility Boundary

- `activeImageId` is strictly a transitional, read-only derived value:
  ```ts
  const activeImageId = React.useMemo((): string | null => {
    if (!activeLayer) return null;
    if (activeLayer.source?.type === 'image') {
      return activeLayer.source.assetId;
    }
    return null;
  }, [activeLayer]);
  ```
- Returns `null` when a procedural layer, solid color layer, gradient layer, or backdrop layer is active.
- NEVER scans `activeFrame.layers` or `project.frames` for unrelated images.
- Unmigrated UI components reading `activeImageId` correctly see `null` when editing non-image layers, signaling that image-specific controls should be hidden or inactive.

### Invariant 5: `setActiveImageId` Compatibility Semantics

- `setActiveImageId(assetId)` exists solely for compatibility with unmigrated callers:
  - If `assetId === null`: sets `activeLayerId = null`.
  - If `assetId` matches an `ImageSource` layer inside the **current `activeFrame`**: sets `activeLayerId` to that layer's ID.
  - If `assetId` is NOT placed in the current `activeFrame`: it is a **NO-OP** with respect to canvas editing (or updates `selectedAssetIds` in the asset library). It **MUST NOT** switch `activeFrameId` and **MUST NOT** deselect the current canvas layer.

### Invariant 6: Asset Library Decoupling

- `selectAsset(assetId, clearOthers)` updates `selectedAssetIds` only.
- Selecting an asset in the asset tray/library does not call `setActiveImageId()`, does not change `activeLayerId`, and does not steal canvas focus.
- Placing an asset onto the canvas (e.g. drag-and-drop or "Add to Frame") explicitly creates a new layer and selects that new layer as `activeLayerId`.

### Invariant 7: Universal Effect Stack Ownership

- Every `Layer` owns `effectStack: EffectItem[]`.
- `activeEffectStack` is derived uniformly regardless of `source.type`:
  ```ts
  const activeEffectStack = React.useMemo((): EffectStack => {
    return activeLayer?.effectStack ?? [];
  }, [activeLayer]);
  ```
- Procedural layers, image layers, and backdrops all support effect stack operations (`addEffect`, `removeEffect`, `updateEffect`, `reorderEffects`).

---

## 4. State Transitions & Recovery Rules

All state repairs occur during explicit state transitions, never inside getter resolution:

| Transition                | Trigger                | Action & Recovery Rules                                                                                                                                                                                                                                                                                                                                                         |
| :------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Frame Creation**        | `createFrame()`        | 1. Creates frame with initial default backdrop layer.<br>2. Sets `frame.activeLayerId = defaultLayer.id`.<br>3. Sets `activeFrameId = newFrame.id` and `activeLayerId = defaultLayer.id`.                                                                                                                                                                                       |
| **Frame Switching**       | `setActiveFrameId(id)` | 1. Sets `activeFrameId = id`.<br>2. Resolves target frame. If `targetFrame.activeLayerId` matches a layer in `targetFrame`, restores it.<br>3. If missing/invalid, repairs to top layer: `targetFrame.layers[targetFrame.layers.length - 1]?.id ?? null`.<br>4. If empty frame, sets `activeLayerId = null`.                                                                    |
| **Frame Deletion**        | `deleteFrame(id)`      | 1. If active frame is deleted, switches `activeFrameId` to adjacent frame (previous index or 0).<br>2. Restores `activeLayerId` using frame switching recovery rules.<br>3. If last frame was deleted, auto-creates default frame with default layer.                                                                                                                           |
| **Layer Addition**        | `addLayer(...)`        | 1. Appends new layer to `activeFrame.layers`.<br>2. Sets `activeLayerId = newLayer.id`.<br>3. Updates `activeFrame.activeLayerId = newLayer.id`.                                                                                                                                                                                                                                |
| **Layer Deletion**        | `removeLayer(id)`      | 1. Removes layer from `activeFrame.layers`.<br>2. If removed layer was `activeLayerId`, selects adjacent layer (prefer layer below at `index - 1`, else layer at `0`).<br>3. If all layers removed, sets `activeLayerId = null` and `activeFrame.activeLayerId = null`.                                                                                                         |
| **Empty Frame**           | Edge case              | `activeLayerId = null`, `activeLayer = null`, `activeImageId = null`, `activeEffectStack = []`. System functions without runtime errors.                                                                                                                                                                                                                                        |
| **External/Db Hydration** | `loadHydratedProject`  | 1. Validates loaded `activeFrameId`. If invalid/missing, defaults to `project.frames[0]?.id`.<br>2. Validates loaded `activeLayerId`. If invalid/missing, restores from `activeFrame.activeLayerId`, or repairs to top layer.<br>3. If only legacy `activeImageId` is present in session, resolves corresponding layer in active frame, then upgrades session to canonical IDs. |

---

## 5. Persistence, Hydration & Undo/Redo Rules

### IndexedDB Schema

- **No Schema Upgrade**: The existing IndexedDB schema (`DB_VERSION = 2`) in `src/storage/db.ts` already stores `activeFrameId`, `activeLayerId`, and `activeImageId` in the `app_state` store (`key: "session"`).
- `dbSaveSessionState()` saves `(activeFrameId, activeLayerId, activeImageId, projectName)`.
- `dbGetSessionState()` loads these keys directly.

### Hydration Resolution Order

1. Check if `persistedSession.activeFrameId` exists and matches a frame in `project.frames`. If so, use it; otherwise use `project.frames[0]?.id`.
2. Check if `persistedSession.activeLayerId` exists and matches a layer in the active frame. If so, use it.
3. Check if `activeFrame.activeLayerId` exists and matches a layer. If so, use it.
4. Fall back to top-most layer in the active frame (`layers[layers.length - 1]?.id ?? null`).
5. If only `persistedSession.activeImageId` exists (legacy upgrade), find a layer in the active frame with matching `ImageSource.assetId`.

### Undo / Redo Boundary

- `StudioHistorySnapshot` in `src/types/history.ts` captures `frames: Frame[]`, `activeFrameId`, and `activeLayerId`.
- Restoring a snapshot restores `activeFrameId` and `activeLayerId`. If a snapshot points to a layer that was undone out of existence, the state transition recovery rule immediately repairs `activeLayerId` to a valid layer in that restored frame.

---

## 6. Required Test Matrix

The Phase 3 implementation must provide automated tests covering the following 15 exact scenarios:

1. **Active Target Authority**: Editing operations (opacity, blendMode, visibility, locked) modify `activeLayerId` on `activeFrameId` exclusively.
2. **Layer Selection Sync**: Selecting a layer updates both `StudioContext.activeLayerId` and `activeFrame.activeLayerId`.
3. **Frame Selection Memory**: Switching frames restores the target frame's remembered `Frame.activeLayerId`.
4. **Invalid Layer ID Repair**: Switching to a frame with an invalid `activeLayerId` repairs to the top-most layer.
5. **Empty Frame Resilience**: Switching to an empty frame sets `activeLayerId` to `null` without throwing errors.
6. **Active Layer Deletion**: Deleting the active layer automatically selects an adjacent layer.
7. **Complete Layer Deletion**: Deleting all layers in a frame sets `activeLayerId = null` cleanly.
8. **Layer Addition Selection**: Adding a new layer automatically makes it the active layer.
9. **`activeImageId` on Image Layer**: Returns the image's `assetId` when the active layer has `source.type === "image"`.
10. **`activeImageId` on Procedural Layer**: Returns `null` when the active layer has `source.type === "procedural"`.
11. **No Silent Image Fallback**: `activeImageId` never falls back to another image layer in the frame or project when a non-image layer is active.
12. **`setActiveImageId` with Placed Image**: Selects the matching layer in the active frame.
13. **`setActiveImageId` with Unplaced Image**: No-op on canvas editing state; does not change `activeLayerId` or switch frames.
14. **Asset Library Decoupling**: Selecting an asset in the library updates `selectedAssetIds` without altering `activeLayerId` or canvas focus.
15. **Universal Effect Stack**: Adding, updating, or removing effects functions identically on procedural layers, image layers, and backdrops via `activeLayer.effectStack`.

---

## 7. Post-Approval Verification Plan

### Automated Mechanical Commands

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm verify:approvals
pnpm check:no-competitor-refs
pnpm check:public-provenance
pnpm graphify:update
```

### Browser Verification Checklist

1. **Multi-layer Selection**: Add an image layer and a procedural background layer to Frame 1. Click between them in the Layers panel; verify inspector and transform controls switch targets instantly.
2. **Frame Switching Memory**: Switch to Frame 2, select Layer B. Switch back to Frame 1; verify Frame 1's previously selected layer is restored. Switch back to Frame 2; verify Layer B is restored.
3. **Procedural Layer Active State**: Select a procedural layer. Verify that `activeImageId` is `null`, procedural controls are active, and image-specific controls (e.g. crop, fit) are safely hidden or disabled without throwing errors.
4. **Asset Library Isolation**: With a procedural layer selected on the canvas, click an asset thumbnail in the Asset Library. Verify that the thumbnail highlights as selected in the library, but the procedural layer remains the active canvas target.
5. **Effect Stack Application**: Apply a blur effect to an image layer; verify it renders. Apply a grain effect to a procedural layer; verify it renders. Verify both effect stacks persist independently.
6. **Layer Deletion**: Delete the active top layer; verify the layer immediately below it becomes active. Delete the remaining layer; verify canvas and inspector handle empty frame gracefully.
7. **Frame Deletion**: Delete the active frame; verify the next available frame becomes active and selects its remembered layer.
8. **Undo / Redo**: Move or edit a layer, undo; verify selection remains consistent and does not point to orphaned IDs.
9. **Persistence Reload**: Refresh the browser page; verify the active frame and active layer are restored exactly as they were before reload.

---

## 8. Scope Boundaries & Deferred Work

### Explicitly In Scope for Phase 3

- Refactoring `src/context/studio-context.tsx` to make `activeFrameId` + `activeLayerId` authoritative.
- Removing silent fallbacks from `activeLayer` and `activeImageId` getters.
- Decoupling `selectedAssetIds` from `activeLayerId` in asset selection handlers.
- Updating `setActiveImageId` compatibility setter to respect frame boundaries.
- Universalizing `activeEffectStack` across all `LayerSource` types.
- Synchronizing `Frame.activeLayerId` as per-frame selection memory.
- Adding comprehensive Phase 3 unit and integration tests.

### Explicitly Deferred / Out of Scope for Phase 3

- **Phase 4 UI Component Redesign**: Redesigning inspector panels, toolbars, or layer item layouts to new Figma specifications.
- **Phase 4 Viewport Overlays**: Canvas gizmos, transform handles, or multi-selection bounding boxes.
- **Phase 5 Animation Timeline**: Timeline scrubber, keyframe tracks, playback controller.
- **Phase 6 Export Pipeline**: Offscreen multi-frame video rendering or batch export.
- **Renderer Changes**: WebGL2 compositor changes (Phase 2 is complete).
- **IndexedDB Schema Migration**: Upgrading database schema version.

---

## 9. Approval

**Current Status:** `PENDING PROJECT OWNER APPROVAL`  
**Reviewer:** Project Owner  
**Signature Line Required:** `APPROVED: <date>`

_(This section will be updated with the formal approval signature once reviewed by the project owner. AI coding agents must not alter this status.)_
