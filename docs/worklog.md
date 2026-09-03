# EffectsIO Migration & Worklog

## Custom Shell Preparation & Migration

- **Date**: 2026-08-26
- **Task**: Prep the repo for the custom EffectsIO shell.

### 1. Safety Net & Baseline
- Created baseline git tag `pre-rebuild-baseline` on a clean working tree.
- Confirmed via `git tag -l`: `pre-rebuild-baseline`.

### 2. Asset & Dependency Audit
- **Pixel-Effect Modules**:
  - All 12 effect modules (`ascii.ts`, `black-and-white.ts`, `duotone.ts`, `glitch.ts`, `grain.ts`, `halftone.ts`, `line-art.ts`, `original.ts`, `pixelate.ts`, `posterize.ts`, `screen-print.ts`, `vintage-film.ts`) inspected.
  - Verified 100% clean of external runtime/UI dependencies (only importing from relative `canvas-utils` and `types`).
- **Dependencies (package.json)**:
  - **Kept (17)**: `react`, `react-dom`, `tailwindcss`, `tw-animate-css`, `@fontsource-variable/inter`, `three`, `motion`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `fflate`, `mediabunny`, `class-variance-authority`, `clsx`, `tailwind-merge`, `react-resizable-panels`, `sonner`.
  - **Icon Choice**: Kept `lucide-react`, dropped `@phosphor-icons/react` (until native component migration in later pass).
  - **Dropped Legacy Packages**: `@base-ui/react`, `cmdk`, `@tanstack/react-router`, `@gltf-transform/core`, `@gltf-transform/extensions`, `meshoptimizer`, `cross-spawn`, `@playwright/test`, `fake-indexeddb`.
- **Scripts Audit**:
  - Audited 216 legacy governance/manifest scripts. Deleted obsolete `scripts/` directory.

### 3. Asset Relocation
- Relocated `src/app/effects/` to `src/effects/`.
- Updated all import specifiers in `src/effects/` and `src/app/`.

### 4. Minimal Keep-Alive Shell
- Built `src/App.tsx` rendering a full-viewport `<canvas>` element clearing to `var(--background)` (`oklch(0 0 0)`) on mount, and a `<button>` styled with token colors (`var(--primary)`, `var(--primary-foreground)`, `var(--radius)`).
- Updated `src/main.tsx` to mount `<App />` directly.
- Cleaned `src/styles.css` of legacy `@source` and `@import` lines.

### 5. Apparatus Deletion & Cleanup
- Deleted legacy template directories entirely.
- Deleted obsolete test apparatus (`e2e/`, legacy scripts, `playwright.config.ts`).
- Renamed package in `package.json` to `"effectsio"` and simplified scripts block (`dev`, `build`, `preview`, `typecheck`, `test`).
- Updated `index.html` title to `EffectsIO`.
- Updated `AGENTS.md` to reflect custom shell rules.

### 6. Verification
- `pnpm install`: Completed with exit code 0.
- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 16/16 unit tests passed in 1.17s.
- `pnpm build`: Successfully generated production bundle in `dist/`.
- `pnpm dev`: Running cleanly on `http://127.0.0.1:3002/`.
- Repository clean and verified.

---

## Governance Incident & Architecture Review Pass: Phase 7 Approval Gate

- **Date**: 2026-08-28
- **Task**: Governance audit, historical record correction, mechanical approval gate enforcement, and Phase 7 architecture review packet generation.

### 1. Incident Analysis: Premature Implementation of Phases 7.1–7.4
- **Context**: In `docs/buildkit/architecture.md` Section 11, an explicit project-owner approval gate was documented:
  `STATUS: OPEN — PROJECT OWNER DECISION REQUIRED` regarding Option A (Unified Native WebGL2 Ping-Pong Pipeline) vs Option B (Stacked Canvases).
- **Violation**: Subsequent coding sessions implemented Phase 7.1 (WebGL2 foundation), Phase 7.2 (texture upload & viewport), Phase 7.3 (core color shaders), and Phase 7.4 (complex shaders & parameter reactivity) before the project owner signed the approval gate.
- **Process Finding**: The presence of implemented code in `src/rendering/webgl/` does not constitute approval of Option A. Proceeding past a documented gate without a signed approval file was a process violation.

### 2. Remediation Actions
1. **Enforced Mechanical Gate (Rule 12)**:
   - Added Rule 12 to `AGENTS.md` specifying that decision gates are satisfied strictly by a physical `docs/approvals/<phase-slug>.md` file containing the literal line `APPROVED: <date>`.
   - Created `scripts/check-approval-gates.mjs` and added `pnpm verify:approvals` script to `package.json`.
2. **Corrected Historical Architecture Record**:
   - Updated `docs/buildkit/architecture.md` Section 11 to record the incident, clarify that Option A is not yet formally approved, and confirm that Phases 7.5–7.8 remain blocked.
3. **Prepared Architecture Review Packet**:
   - Generated `docs/approvals/phase-7-rendering-review.md` presenting an objective analysis of Option A vs Option B, shipped artifacts, Phase 7.5–7.8 commitments, reversal costs, and the single owner decision question.
4. **Strict Hold on Phase 7.5+**:
   - No Phase 7.5 (Procedural GPU Backgrounds), 7.6 (Animation Engine), 7.7 (GPU Export), or 7.8 (Fallback Hardening) code will be written until the project owner explicitly approves Option A via `pnpm verify:approvals`.

---

## UI Visual Polish: Panel Integration & Asset Grid

- **Date**: 2026-08-29
- **Task**: Final UI visual-polish pass for panel integration, design-system consistency, and compact 4-column square asset grid.

### 1. Finalized Design Decisions
- **Thumbnail Captions**: Removed completely. Asset tiles contain only the image itself (`aspect-square` with `object-cover`), creating a clean, dense visual media browser.
- **Add-Image Control**: Integrated directly into the thumbnail grid as the final square `+` tile (`grid grid-cols-4 gap-2`). The separate upload dropzone above the grid was removed, while full-panel drag-and-drop ingestion remains supported.

### 2. Component Migration & Chrome Harmonization
- **Asset Panel (`src/components/layout/asset-panel.tsx`)**:
  - Replaced hand-written outer `<aside>` with `<PanelSurface>`.
  - Replaced custom header markup with `<PanelHeader>` using `icon`, `title="Image Library"`, `count`, and action slot.
  - Rebuilt thumbnail presentation into a strict `grid grid-cols-4 gap-2` layout.
  - Integrated `+` add-image tile as the last grid item with `aspect-square`, `rounded-[calc(var(--radius-lg)-4px)]`, and `bg-[color:color-mix(in_oklab,var(--foreground)_6%,transparent)]`.
  - Applied refined active asset selection ring: `ring-2 ring-[color:color-mix(in_oklab,var(--link)_72%,transparent)] ring-offset-2 ring-offset-[color:var(--background)]`.
  - Integrated delete action using existing `Button` primitive (`variant="ghost" size="icon-sm"`) displaying in top-right corner on tile hover.
- **Top Navigation (`src/components/layout/top-nav.tsx`)**:
  - Standardized surface chrome to use shared popup surface and border tokens (`floating-popup-surface backdrop-blur-2xl`).
  - Strictly preserved `ToggleGroup` / `ToggleGroupItem` for the workspace layout mode selector (`Assets`, `Effects Studio`, `Preview`).
- **Inspector Panel (`src/components/layout/inspector-panel.tsx`)**:
  - Migrated outer container to `<PanelSurface>`.
  - Strictly preserved `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` for section navigation (`Effects`, `Looks`, `Backdrop`, `Info`).

### 3. Primitive API Extension (Step 11 Compliance)
- Extended `PanelHeaderProps` in `src/components/ui/panel/panel-header.tsx`:
  - Added optional `icon?: React.ReactNode`, `count?: number | string`, `action?: React.ReactNode`, `children?: React.ReactNode`, and `className?: string`.
  - Made `onToggleCollapsed` optional so `PanelHeader` can be utilized across static and collapsable panel surfaces without requiring ad-hoc wrapper containers.

### 4. Design System Documentation & Semantic Roles (Step 4)
- Created `docs/design-system.md` containing the canonical **Component Semantic Roles** table:
  - `Tabs`: Switching application content panels.
  - `ToggleGroup`: Mutually exclusive choices that are controls or filters.
  - `SegmentedControl`: Compact mutually exclusive option selection.
  - `ButtonGroup`: Physically connected action/compound controls.
  - `Button`: Discrete actions.
  - `PanelSurface`: Panel surfaces and chrome.
  - `PanelHeader`: Panel headers.

### 5. Untouched Systems Mechanical Confirmation (Step 13)
- Executed `git diff --stat d5cc0f5..HEAD` to mechanically confirm that no files under `src/rendering/`, `src/effects/`, or `src/export/` were modified:
```
 src/components/layout/asset-panel.tsx     | 237 +++++++++++++-----------------
 src/components/layout/inspector-panel.tsx |  11 +-
 src/components/layout/top-nav.tsx         |   4 +-
 src/components/ui/panel/panel-header.tsx  |  58 ++++++--
 docs/design-system.md                     |  34 +++++
 4 files changed, 184 insertions(+), 162 deletions(-)
```
*(Zero changes to rendering, effects, or export engines.)*

### 6. Verification Results
- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 122/122 tests passed across 13 test suites.
- `pnpm build`: Production bundle built cleanly in 6.00s.
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm graphify:update`: Knowledge graph updated (3,662 nodes, 9,489 edges, 132 communities).
- Real headless Chrome verification (`scripts/test-ui-polish-cdp.mjs`):
  - 1 image, 2 images, 4 images, 6 images flow verified in 4-column grid.
  - All thumbnails confirmed `aspect-square` with `object-cover`.
  - Selection ring treatment verified on active asset.
  - Delete button verified.
  - `+` tile verified as final square item in grid.
  - Tab & ToggleGroup semantic integrity verified.

---

## UI Issue Resolution & Final Visual Polish Pass (9 Issues Resolved)

- **Date**: 2026-08-29
- **Task**: Systematically resolve all 9 specific UI issues reported from direct source inspection, strictly maintaining the Phase 7.7 untouched boundary, design system token architecture, and empirical verification.

### 1. The 9 Issues Resolved

1. **Issue 0.1 — Image Library Dropzone Empty State vs. 4-Column Populated State (`src/components/layout/asset-panel.tsx`)**:
   - Implemented two distinct derived states (`assets.length === 0`):
     - **Empty state**: Dedicated large dropzone card with `"SOURCE IMAGE"` header, dashed border container (`border border-dashed border-[color:color-mix(in_oklab,var(--border)_25%,transparent)]`), `UploadCloud` icon, `"Click to upload an image or drag it onto the canvas."`, and format hints `"PNG, JPG, WebP"`.
     - **Populated state**: 4-column square thumbnail grid (`grid grid-cols-4 gap-2`) with `aspect-square`, `object-cover`, active ring selection, hover trash button, and `+` square tile as the final item.
     - **Revert**: Automatically transitions back to the large dropzone card when the last image is deleted.

2. **Issue 0.2 — Adopt Real Resizable Panels (`src/App.tsx`, `src/components/ui/composites/resizable.tsx`)**:
   - Created native `ResizablePanelGroup`, `ResizablePanel`, and `ResizableHandle` components wrapping `react-resizable-panels`.
   - Styled handles as single hairline `w-px` with `bg-[color:color-mix(in_oklab,var(--border)_12%,transparent)]`.
   - Removed `border-r` from `asset-panel.tsx` and `border-l` from `inspector-panel.tsx` so the resizable handle owns the seam with zero double borders.
   - Configured responsive default panel widths (`18%` / `56%` / `22%`) with `minSize` and `maxSize` bounds.

3. **Issue 0.3 — Split-View Circular Pill Drag Handle (`src/components/layout/canvas-viewport.tsx`)**:
   - Rebuilt the split-view drag knob as a centered 28px circular pill (`width: 28px`, `height: 28px`, `border-radius: 9999px`) on a 1.5px vertical divider line.
   - Contains a centered `ChevronLeft` and `ChevronRight` icon pair, styled with design system tokens and hover/drag accent borders.
   - Preserved all pointer drag and keyboard step navigation logic.

4. **Issue 0.4 — Search Toggle in Image Library Header (`src/components/layout/asset-panel.tsx`)**:
   - Removed redundant "+Add" button from the Image Library header.
   - Added a search toggle icon button (`Search` icon, `Button variant="ghost" size="icon-xs"`).
   - Toggles an inline search input (`placeholder="Find..."`, autoFocus, `X` clear/close button).

5. **Issue 0.5 — Top Bar Shadow Elimination (`src/components/layout/top-nav.tsx`)**:
   - Removed `floating-popup-surface` box-shadow and logo `shadow-xs` from `top-nav.tsx`.
   - Styled top navigation bar with clean hairline bottom border (`border-b border-[color:color-mix(in_oklab,var(--border)_12%,transparent)]`) and `shadow-none`.

6. **Issue 0.6 — Effect Picker Square Thumbnails with Real Rendered Previews (`src/components/effects/effect-browser-modal.tsx`, `effect-preview-cache.ts`)**:
   - Rebuilt the "Add Visual Effect" modal from text cards into a square thumbnail grid (`grid-cols-3 sm:grid-cols-4`).
   - Implemented `effect-preview-cache.ts` using the real effect pipeline (`applyEffect` from `src/effects/engine.ts`) on a reference image canvas to render and cache real previews for all 11 effects.
   - On hover, the effect name appears as a small overlay label at the bottom; hidden by default.

7. **Issue 0.7 — Native Real Color Picker Subsystem (`src/components/ui/controls/color/`)**:
   - Implemented native full color picker subsystem in `src/components/ui/controls/color/` and `src/components/ui/primitives/input-group.tsx`.
   - Supports Saturation/Value gradient surface dragging, Hue slider, Opacity slider/input, and color format dropdown (Hex, RGB, HSL, HSB).
   - Ensured backward compatibility with existing `ColorControlProps` (`value`, `onValueChange`).

8. **Issue 0.8 — Wire Real Drag-to-Reorder on Effect Stack (`src/components/layout/inspector-panel.tsx`)**:
   - Integrated `@dnd-kit/core` and `@dnd-kit/sortable` with `SortableContext` and `useSortable`.
   - Wired the `GripVertical` handle on each effect stack item to trigger sortable drag gestures and invoke `reorderEffectStack(activeImageId, oldIndex, newIndex)` in `studio-context.tsx`.

9. **Issue 0.9 — Looks Browser Secondary Badge Variant (`src/components/looks/looks-browser.tsx`)**:
   - Updated built-in look badges to `<Badge variant={look.isBuiltIn ? "secondary" : "outline"}>`.
   - Built-in category badges render as soft, muted pills (`h-[18px]`, `text-[0.6875rem]`, `rounded-full`) that sit quietly next to look titles and do not compete with the "Apply Look" button.

### 2. Graphify & Headroom Actual-Use Governance

1. **Graphify Actual Use**:
   - Pre-implementation query: `graphify query "App canvas-viewport effect-browser-modal color-control looks-browser"` to map symbol relationships across UI surfaces, effect registry, and control layout.
   - Post-implementation synchronization: `pnpm graphify:update` ran AST-only update, synchronizing 3,853 nodes, 10,076 edges, and 136 communities.
2. **Headroom Actual Use**:
   - Pre-flight diagnostic: Checked `http://127.0.0.1:8787/health`, confirming proxy active on PID 17417 (version 0.35.0, savings profile `coding`).
3. **Mechanical Approval Gates**:
   - Executed `pnpm verify:approvals` — 0 active decision gates pending, 1 approval verified (`docs/approvals/phase-7-gpu-pipeline.md`).

### 3. Verification Suite Results

- `pnpm typecheck`: PASSED (0 errors).
- `pnpm test`: 122/122 PASSED across 13 test files.
- `pnpm build`: PASSED in 4.09s (`dist/assets/index-*.js`, `dist/assets/index-*.css`).
- `pnpm verify:approvals`: PASSED.
- `pnpm graphify:update`: PASSED (3,853 nodes).
- Headless Chrome CDP suite (`scripts/test-ui-issues-cdp.mjs`):
  - Check 1 (Empty Dropzone & Top Bar Shadow): PASS (`01-zero-state-dropzone.png`)
  - Check 2 (Resizable Layout & Hairline Handles): PASS
  - Check 3 (Populated 4-Column Asset Grid): PASS (`02-populated-4-column-grid.png`)
  - Check 4 (Search Toggle Open & Filter): PASS (`03-search-toggle-open.png`, `04-search-filtered-results.png`)
  - Check 5 (Split-View Circular Pill Handle): PASS (`05-split-view-circular-handle.png`)
  - Check 6 (Effect Picker Rendered Preview Grid): PASS (`06-effect-browser-rendered-previews.png`)
  - Check 7 (Sortable Effect Stack Drag Handles): PASS (`07-sortable-effect-stack.png`)
  - Check 8 (Native Color Picker Popover): PASS (`08-color-picker-popover.png`)
  - Check 9 (Looks Browser Secondary Badges): PASS (`09-looks-browser-secondary-badges.png`)

---

## Canonical Asset Panel, Layout Chrome & Design System Rules Pass

- **Date**: 2026-08-29
- **Task**: Establish the canonical EffectsIO Component Rules specification, correct the Asset Panel empty and populated states, ensure consistent hairline panel borders, and verify in headless Chrome.

### 1. Key Accomplishments

1. **EffectsIO Component Rules Established (`docs/design-system/component-rules.md`)**:
   - Codified the canonical usage rules for layout chrome (`PanelSurface`, `PanelHeader`, `PanelSection`), navigation (`ToggleGroup` vs. `Tabs`), discrete actions (`Button` variants & sizes), selection formula (`selection-state.ts`), controls (`SliderControl`, `SelectControl`, `ColorControl`, `BooleanControl`, `SegmentedControl`), and badges.
   - Mandated zero custom button, badge, panel, or dropzone duplication.

2. **Asset Panel Empty State (`src/components/layout/asset-panel.tsx`)**:
   - Header title updated to `Assets` with count `(0)` -> `Assets (0)`.
   - Removed all `"Source Image"` and `"Image Library"` headings.
   - Clean canonical utility dropzone: `UploadCloud` icon, `"Add media"`, `"Drag here, import from your computer"`, and `<Button variant="outline" size="xs">Import media</Button>`.
   - Clean, compact utility sizing (no oversized boxes, no AI generation controls).

3. **Asset Panel Populated State (`src/components/layout/asset-panel.tsx`)**:
   - Header title displays `Assets (N)`.
   - Integrated prominent search input (`placeholder="Find..."`, autoFocus, clear `X` button) positioned at the top of the populated asset list.
   - 4-column square thumbnail grid (`grid grid-cols-4 gap-2`) with `aspect-square` tiles and `object-cover`.
   - **Zero filename, dimension, or caption text beneath thumbnails.**
   - Integrated `+` add-image tile as the final square item matching dimensions and hover styling.
   - Remove button appears as compact `Button variant="ghost" size="icon-sm"` in top-right of tile on hover.
   - Selected asset consumes canonical `selectedAssetRingClassName` from `selection-state.ts`.

4. **Layout Chrome & Structural Hairline Dividers (`src/App.tsx`, `src/components/layout/top-nav.tsx`)**:
   - Top navigation: Thin bottom border (`border-b border-[color:color-mix(in_oklab,var(--border)_12%,transparent)]`) with `shadow-none`.
   - Assets panel: Single hairline right border via `ResizableHandle`.
   - Inspector panel: Single hairline left border via `ResizableHandle`.
   - Zero double borders.

### 2. Graphify & Headroom Actual-Use Governance

1. **Graphify Actual Use**:
   - Pre-implementation query: `graphify query "asset-panel inspector-panel top-nav badge selection-state panel-header"`.
   - Post-implementation synchronization: `pnpm graphify:update` ran AST-only update, synchronizing **3,854 nodes**, **10,077 edges**, and **136 communities**.
2. **Headroom Actual Use**:
   - Pre-flight diagnostic: Checked `http://127.0.0.1:8787/health`, confirming proxy active on PID 17417 (version 0.35.0, savings profile `coding`).
3. **Mechanical Approval Gates**:
   - Executed `pnpm verify:approvals` — 0 active decision gates pending, 1 approval verified (`docs/approvals/phase-7-gpu-pipeline.md`).
4. **Phase 7.7 Untouched Boundary**:
   - `git diff --stat d5cc0f5..HEAD` confirms 0 modifications in `src/rendering/`, `src/export/`, or `src/effects/modules/`.

### 3. Verification Evidence

- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 122/122 PASSED across 13 test files.
- `pnpm build`: Built in 3.85s.
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm graphify:update`: Knowledge graph updated (3,854 nodes).
- Headless Chrome CDP Verification (`scripts/test-ui-issues-cdp.mjs`):
  - Check 1 (Empty Dropzone & Top Bar Shadow): PASS (`01-zero-state-dropzone.png`)
  - Check 2 (Resizable Panel Layout & Hairlines): PASS
  - Check 3 (4-Column Populated Asset Grid): PASS (`02-populated-4-column-grid.png`)
  - Check 4 (Prominent Search Input): PASS (`03-search-toggle-open.png`, `04-search-filtered-results.png`)
  - Check 5 (Split-View Circular Drag Handle): PASS (`05-split-view-circular-handle.png`)
  - Check 6 (Effect Picker Rendered Previews): PASS (`06-effect-browser-rendered-previews.png`)
  - Check 7 (Sortable Effect Stack Drag Handles): PASS (`07-sortable-effect-stack.png`)
  - Check 8 (Native Color Picker Popover): PASS (`08-color-picker-popover.png`)
  - Check 9 (Looks Browser Secondary Badges): PASS (`09-looks-browser-secondary-badges.png`)

---

## Phase 7.8 Final Functional MVP Implementation Pass

- **Date**: 2026-08-29
- **Task**: Implement Multi-Asset Selection, Batch Look Application, Global Undo / Redo history engine, and Selected-Asset Batch Export Scope across StudioContext, AssetPanel, LooksBrowser, TopNav, and ExportModal.

### 1. Key Accomplishments

1. **Multi-Asset Selection (`src/context/studio-context.tsx`, `src/components/layout/asset-panel.tsx`)**:
   - Implemented `selectedAssetIds: Set<string>` state coexisting with `activeImageId` as single source of truth for active editing context.
   - Implemented selection action primitives: `toggleAssetSelection(assetId)`, `selectAsset(assetId, clearOthers?)`, `selectAssetRange(fromAssetId, toAssetId, assetList)`, `deselectAsset(assetId)`, `clearAssetSelection()`, and `selectAllAssets()`.
   - Wired modifier interactions on AssetPanel thumbnail tiles:
     - Normal click: selects target asset exclusively and makes active (`selectAsset(id, true)`).
     - Cmd/Ctrl + click: toggles target asset in multi-selection set while updating active (`toggleAssetSelection(id)`).
     - Shift + click: selects contiguous range between anchor/active asset and target asset using displayed order (`selectAssetRange(...)`).
   - Cleaned `selectedAssetIds` on `removeAsset(id)` so deleted assets are never retained in selection.
   - Applied canonical `selectedAssetRingClassName` to all selected thumbnails in AssetPanel.

2. **Batch Look Application (`src/context/studio-context.tsx`, `src/components/looks/looks-browser.tsx`)**:
   - Implemented `applyLookToAssets(assetIds: string[], look: Look)`:
     - Clones effect stack independently for every target asset with fresh UUIDs for all effect instances.
     - Never shares mutable instance references across assets.
     - Preserves `activeImageId` context.
     - Persists all updated stacks to IndexedDB (`dbSaveEffectStack`).
     - Produces **exactly ONE history snapshot** entry for the entire batch mutation.
   - Updated LooksBrowser Apply button:
     - Displays `Apply to N Selected` and calls `applyLookToAssets(Array.from(selectedAssetIds), look)` when `selectedAssetIds.size > 1`.
     - Preserves single-asset `Apply Look` when $\le 1$ asset is selected.

3. **Global Undo / Redo History Engine (`src/context/studio-context.tsx`, `src/components/layout/top-nav.tsx`)**:
   - Implemented centralized history stacks `past` and `future` of `StudioHistorySnapshot` (`{ effectStacks, backgrounds, activeImageId, selectedAssetIds }`) capped at `MAX_HISTORY_LIMIT = 40`.
   - Implemented discrete operation recording: captures effect add, delete, duplicate, reorder, enable/disable, parameter reset, background reset, Look apply, batch Look apply, and selection.
   - Implemented continuous slider interaction debouncing: records pre-interaction snapshot on drag start and settles with 600ms debounce timer (1 continuous slider drag = 1 undo operation).
   - Implemented `undo()` and `redo()` with state restoration and automatic IndexedDB persistence synchronization.
   - Implemented global keyboard shortcut listeners for `Cmd+Z`, `Ctrl+Z`, `Cmd+Shift+Z`, `Ctrl+Shift+Z`, and `Ctrl+Y` with target filtering (bypasses input, textarea, select, contenteditable).
   - Wired TopNav Undo/Redo icon buttons (`Undo2`, `Redo2`) reflecting `canUndo`/`canRedo` enabled states.

4. **Selected-Asset Batch Export Scope (`src/types/export.ts`, `src/components/export/export-modal.tsx`)**:
   - Added `"selected"` to `ExportTarget` union type.
   - Integrated `"Selected (N)"` target option in ExportModal when `selectedAssetIds.size > 1`.
   - Connected `exportBatchAssets` filtering to target assets matching `selectedAssetIds`.

### 2. Graphify & Headroom Actual-Use Governance

1. **Graphify Actual Use**:
   - Pre-implementation query: `graphify query "studio-context activeImageId effectStacks backgrounds assets asset-panel looks-browser top-nav export-modal selection-state db"`.
   - Post-implementation synchronization: `pnpm graphify:update` ran AST-only update, synchronizing **3,961 nodes**, **10,365 edges**, and **138 communities**.
2. **Headroom Actual Use**:
   - Pre-flight diagnostic: Checked `http://127.0.0.1:8787/health`, confirming proxy active on PID 10000 (version 0.35.0, savings profile `coding`).
3. **Mechanical Approval Gates**:
   - Executed `pnpm verify:approvals` — 0 active decision gates pending, 1 approval verified (`docs/approvals/phase-7-gpu-pipeline.md`).

### 3. Verification Evidence

- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 137/137 PASSED across 14 test files (`src/context/studio-history.test.tsx` 15/15 passed).
- `pnpm build`: Production build succeeded in 1.33s.
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm graphify:update`: Updated knowledge graph (3,961 nodes, 10,365 edges).
- Automated Headless Chrome CDP Verification (`scripts/test-phase-7-8-cdp.mjs`):
  - Step 1 (Ingest 4 Assets): PASS (`01-four-assets-populated.png`)
  - Step 2 (Single Selection): PASS (`02-single-asset-selected.png`)
  - Step 3 (Multi-Selection Cmd/Ctrl+Click): PASS (`03-multi-assets-selected-rings.png`, `04-looks-browser-multi-apply-button.png`)
  - Step 4 (Batch Look Application to 3 Assets): PASS (`05-look-applied-to-multi-assets.png`)
  - Step 5 (Global Undo Reverts All 3 Assets in 1 Step): PASS (`06-after-undo-reverted.png`)
  - Step 6 (Global Redo Reapplies Look Across All 3 Assets): PASS (`07-after-redo-reapplied.png`)
  - Step 7 (Export Modal with "Selected (3)" Scope): PASS (`08-export-modal-selected-scope.png`)

---

## MVP Feature Freeze & Repository-Wide UI Audit Pass

- **Date**: 2026-08-30
- **Task**: Declare MVP Feature Freeze, perform comprehensive repository-wide audit of all UI components in `src/components/`, establish permanent canonical component decision rules in `docs/design-system/component-rules.md`, replace ad-hoc elements with canonical shared primitives, and verify across headless Chrome CDP suites.

### 1. Key Accomplishments & Audit Findings

1. **Permanent Architectural Rule Established (`docs/design-system/component-rules.md`)**:
   - Codified the **"Canonical First"** permanent architectural decision rule: Before creating or styling a new UI component in EffectsIO, inspect canonical primitives first; if an equivalent exists, EffectsIO must use or adapt the shared primitive in `src/components/ui/`.
   - Established the strict unidirectional derivation hierarchy:
     `Design Tokens (src/styles.css) → EffectsIO Shared Primitives (src/components/ui/) → Page/Panel Usage`.
   - Added the **Canonical Component Mapping Table** documenting 20 UI needs mapped directly to approved EffectsIO shared primitives.

2. **Repository-Wide UI Audit & Component Replacements**:
   - **Components Audited**: 32 files across `src/components/ui/`, `src/components/layout/`, `src/components/background/`, `src/components/looks/`, `src/components/effects/`, `src/components/export/`, and `src/components/timeline/`.
   - **Replaced / Standardized Elements**:
     1. **`Textarea` Primitive**: Added `src/components/ui/primitives/textarea.tsx` implementing auto-sizing textarea with `SHARED_INPUT_CONTROL_BASE_CLASS_NAME` tokens. Replaced ad-hoc raw `<textarea className="...">` in `SaveLookModal` (`src/components/looks/save-look-modal.tsx`).
     2. **Vertical Dividers / Seams**: Replaced raw `<div>` dividers with `<Separator orientation="vertical" />` in `TopNav` (`src/components/layout/top-nav.tsx`), `CanvasViewport` dock (`src/components/layout/canvas-viewport.tsx`), and `TimelineBar` (`src/components/timeline/timeline-bar.tsx`).
     3. **TopNav Button Tokens**: Normalized Undo/Redo button classes to standard `Button variant="ghost" size="icon-xs"` without custom inline color overrides.
   - **Intentionally Retained Components**:
     - `AssetPanel` 4-column thumbnail grid with square tiles and `+` add-image tile (explicitly required layout structure).
     - `CanvasViewport` interactive canvas surface and split comparison pill drag handle (specialized WebGL2 rendering surface).
     - `TimelineBar` floating playback dock (specialized animation scrubbing surface).

3. **Feature Freeze Enforcement**:
   - `src/rendering/` (WebGL2 context, quad, shaders, pipeline, animation): 100% frozen and untouched.
   - `src/export/` (GPU export renderer, CPU fallback, ZIP encoder): 100% frozen and untouched.
   - `src/effects/modules/` (Pure ImageData transform modules): 100% frozen and untouched.
   - Phase 7.8 functional architecture (`selectedAssetIds`, `activeImageId`, batch Look application, undo/redo history, IndexedDB sync): 100% intact and verified.

### 2. Graphify & Headroom Actual-Use Governance

1. **Graphify Actual Use**:
   - Pre-implementation query: `graphify query "asset-panel inspector-panel top-nav background-controls gradient-control color-control palette-control looks-browser effect-browser effect-stack panel button badge toggle toggle-group tabs select slider dropzone selection-state export-modal studio-context"`.
   - Post-implementation synchronization: `pnpm graphify:update` ran AST-only update, synchronizing **3,951 nodes**, **10,338 edges**, and **138 communities**.
2. **Headroom Actual Use**:
   - Pre-flight diagnostic: Checked `http://127.0.0.1:8787/health`, confirming proxy active on PID 10000 (version 0.35.0, savings profile `coding`).
3. **Mechanical Approval Gates**:
   - Executed `pnpm verify:approvals` — 0 active decision gates pending, 1 approval verified (`docs/approvals/phase-7-gpu-pipeline.md`).

### 3. Verification Evidence

- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 137/137 PASSED across 14 test files (`src/context/studio-history.test.tsx` 15/15 passed).
- `pnpm build`: Production bundle built cleanly in 2.40s.
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm graphify:update`: Updated knowledge graph (3,951 nodes, 10,338 edges).
- Headless Chrome CDP Verification Suite 1 (`scripts/test-phase-7-8-cdp.mjs`):
  - Step 1 (Ingest 4 Assets): PASS (`01-four-assets-populated.png`)
  - Step 2 (Single Selection): PASS (`02-single-asset-selected.png`)
  - Step 3 (Multi-Selection Cmd/Ctrl+Click): PASS (`03-multi-assets-selected-rings.png`, `04-looks-browser-multi-apply-button.png`)
  - Step 4 (Batch Look Application to 3 Assets): PASS (`05-look-applied-to-multi-assets.png`)
  - Step 5 (Global Undo Reverts All 3 Assets in 1 Step): PASS (`06-after-undo-reverted.png`)
  - Step 6 (Global Redo Reapplies Look Across All 3 Assets): PASS (`07-after-redo-reapplied.png`)
  - Step 7 (Export Modal with "Selected (3)" Scope): PASS (`08-export-modal-selected-scope.png`)
- Headless Chrome CDP Verification Suite 2 (`scripts/test-ui-issues-cdp.mjs`):
  - Check 1 (Empty Dropzone & Top Bar Shadow): PASS (`01-zero-state-dropzone.png`)
  - Check 2 (Resizable Panel Layout & Hairlines): PASS
  - Check 3 (4-Column Populated Asset Grid): PASS (`02-populated-4-column-grid.png`)
  - Check 4 (Prominent Search Input): PASS (`03-search-toggle-open.png`, `04-search-filtered-results.png`)
  - Check 5 (Split-View Circular Drag Handle): PASS (`05-split-view-circular-handle.png`)
  - Check 6 (Effect Picker Rendered Previews): PASS (`06-effect-browser-rendered-previews.png`)
  - Check 7 (Sortable Effect Stack Drag Handles): PASS (`07-sortable-effect-stack.png`)
  - Check 8 (Native Color Picker Popover): PASS (`08-color-picker-popover.png`)
  - Check 9 (Looks Browser Secondary Badges): PASS (`09-looks-browser-secondary-badges.png`)
  - Check 10 & 11 (PaletteControl 5×5 Swatches & Shade Rail): PASS (`10-backdrop-palette-control.png`, `11-backdrop-palette-swatch-selected.png`)
  - Check 12 (GradientControl Stops Track & List): PASS (`12-backdrop-gradient-control.png`)

---

## Icon Library Migration: `lucide-react` → `@phosphor-icons/react`

- **Date**: 2026-08-30
- **Task**: Complete repository-wide icon migration from `lucide-react` to `@phosphor-icons/react` (`^2.1.10`), aligning with canonical design system standards.

### 1. Scope & Migrated Files (15 Files, 100% Migrated)

1. **`src/components/timeline/timeline-bar.tsx`**:
   - Migrated: `Play`, `Pause`, `RotateCcw`, `SkipBack`, `SkipForward`, `Repeat`, `Gauge`
   - Replaced with: `PlayIcon`, `PauseIcon`, `ArrowCounterClockwiseIcon`, `SkipBackIcon`, `SkipForwardIcon`, `RepeatIcon`, `GaugeIcon`
2. **`src/components/looks/looks-browser.tsx`**:
   - Migrated: `Sparkles`, `BookmarkPlus`, `Trash2`, `Check`, `ArrowRight`
   - Replaced with: `SparkleIcon`, `BookmarkSimpleIcon`, `TrashIcon`, `CheckIcon`, `ArrowRightIcon`
3. **`src/components/export/export-modal.tsx`**:
   - Migrated: `Download`, `Loader2`, `Check`, `AlertCircle`
   - Replaced with: `DownloadSimpleIcon`, `SpinnerGapIcon`, `CheckIcon`, `WarningCircleIcon`
4. **`src/components/background/background-controls.tsx`**:
   - Migrated: `RotateCcw`
   - Replaced with: `ArrowCounterClockwiseIcon`
5. **`src/components/effects/effect-browser-modal.tsx`**:
   - Migrated: `Search`, `Sparkles`, `X`
   - Replaced with: `MagnifyingGlassIcon`, `SparkleIcon`, `XIcon`
6. **`src/components/layout/canvas-viewport.tsx`**:
   - Migrated: `ZoomIn`, `ZoomOut`, `Maximize2`, `Grid`, `Eye`, `UploadCloud`, `Hand`, `SquareSquare`, `Loader2`, `ChevronLeft`, `ChevronRight`
   - Replaced with: `MagnifyingGlassPlusIcon`, `MagnifyingGlassMinusIcon`, `CornersOutIcon`, `GridFourIcon`, `EyeIcon`, `CloudArrowUpIcon`, `HandIcon`, `SquareSplitHorizontalIcon`, `SpinnerGapIcon`, `CaretLeftIcon`, `CaretRightIcon`
7. **`src/components/layout/inspector-panel.tsx`**:
   - Migrated: `Sparkles`, `Plus`, `Eye`, `EyeOff`, `Trash2`, `RotateCcw`, `ChevronUp`, `ChevronDown`, `Copy`, `Layers`, `Palette`, `Info`, `GripVertical`
   - Replaced with: `SparkleIcon`, `PlusIcon`, `EyeIcon`, `EyeSlashIcon`, `TrashIcon`, `ArrowCounterClockwiseIcon`, `CaretUpIcon`, `CaretDownIcon`, `CopyIcon`, `StackIcon`, `PaletteIcon`, `InfoIcon`, `DotsSixVerticalIcon`
8. **`src/components/ui/control-layout/index.tsx`**:
   - Migrated: `HelpCircle`, `ChevronDown`, `ChevronUp`
   - Replaced with: `QuestionIcon` (with `weight="fill"`), `CaretDownIcon`, `CaretUpIcon`
9. **`src/components/ui/primitives/select.tsx`**:
   - Migrated: `Check`, `ChevronDown`, `ChevronUp`
   - Replaced with: `CheckIcon`, `CaretDownIcon`, `CaretUpIcon`
10. **`src/components/ui/controls/gradient/gradient-stop-list.tsx`**:
    - Migrated: `Minus`, `Plus`
    - Replaced with: `MinusIcon`, `PlusIcon`
11. **`src/components/ui/panel/panel-header.tsx`**:
    - Migrated: `RotateCcw`, `ChevronDown`, `ChevronUp`
    - Replaced with: `ArrowCounterClockwiseIcon`, `CaretDownIcon`, `CaretUpIcon`
12. **`src/components/layout/top-nav.tsx`**:
    - Migrated: `Sparkles`, `Layers`, `Sliders`, `Play`, `Download`, `Settings`, `Undo2`, `Redo2`
    - Replaced with: `SparkleIcon`, `StackIcon`, `SlidersIcon`, `PlayIcon`, `DownloadSimpleIcon`, `GearIcon`, `ArrowUUpLeftIcon`, `ArrowUUpRightIcon`
13. **`src/components/looks/save-look-modal.tsx`**:
    - Migrated: `BookmarkPlus`
    - Replaced with: `BookmarkSimpleIcon`
14. **`src/components/ui/composites/dialog.tsx`**:
    - Migrated: `X`
    - Replaced with: `XIcon`
15. **`src/components/layout/asset-panel.tsx`**:
    - Migrated: `UploadCloud`, `Loader2`, `Trash2`, `AlertCircle`, `X`, `Plus`, `Search`, `Images`
    - Replaced with: `CloudArrowUpIcon` (with `weight="light"` for dropzone), `SpinnerGapIcon`, `TrashIcon`, `WarningCircleIcon`, `XIcon`, `PlusIcon`, `MagnifyingGlassIcon`, `ImagesIcon`

### 2. Dependency Purge & Rulebook Synchronization

1. **Package Purge**:
   - Removed `"lucide-react": "^0.511.0"` from `package.json`.
   - Added `"@phosphor-icons/react": "^2.1.10"` to `package.json`.
   - Executed `pnpm install` — lockfile updated, `lucide-react` completely removed from node_modules.
   - Verified `grep -rl "lucide-react" src` returned **0 matches**.
2. **Rulebook & Specification Update**:
   - Updated `AGENTS.md` Rule 5: Specified `@phosphor-icons/react` as canonical icon library with default regular weight.
   - Updated `docs/design-system/component-rules.md`: Added Icons to Canonical Component Mapping Table and added Section 9 ("Icon System Specification (`@phosphor-icons/react`)").

### 3. Graphify & Headroom Actual-Use Governance

1. **Graphify Actual Use**:
   - Pre-implementation query: `graphify query "lucide-react icons components UI layout primitives"`.
   - Post-implementation synchronization: `pnpm graphify:update` ran AST-only update, synchronizing **3,955 nodes**, **10,340 edges**, and **152 communities**.
2. **Headroom Actual Use**:
   - Pre-flight diagnostic: Verified Headroom proxy active at `http://127.0.0.1:8787/health` (PID 10000).

### 4. Verification Evidence (Empirical Proof)

- `pnpm typecheck`: Clean (0 errors across whole repository).
- `pnpm test`: 137/137 PASSED across 14 test suites in 27.39s.
- `pnpm build`: Clean production bundle built in 6.17s (`dist/assets/index-d8dNyFn4.js` 892.85 kB).
- `grep -rl "lucide-react" src`: 0 results found.
- Live Headless Chrome CDP Verification (`scripts/test-phosphor-icons-cdp.mjs`):
  - Test 1 (Dropzone with `CloudArrowUpIcon`): PASS (`01-phosphor-zero-state-dropzone.png`)
  - Test 2 (Asset Grid & Search with `MagnifyingGlassIcon`, `XIcon`, `TrashIcon`, `PlusIcon`): PASS (`02-phosphor-populated-asset-grid.png`)
  - Test 3 (Add Effect Browser Modal with `SparkleIcon`, `MagnifyingGlassIcon`, `XIcon`): PASS (`03-phosphor-effect-browser-modal.png`)
  - Test 4 (Effect Stack with `DotsSixVerticalIcon`, `CaretUpIcon`, `CaretDownIcon`, `EyeIcon`, `CopyIcon`, `TrashIcon`): PASS (`04-phosphor-effect-stack-inspector.png`)
  - Test 5 (Looks Browser Tab with `SparkleIcon`, `BookmarkSimpleIcon`, `CheckIcon`): PASS (`05-phosphor-looks-browser-tab.png`)
  - Test 6 (Backdrop Tab with `ArrowCounterClockwiseIcon`, `PlusIcon`, `MinusIcon`): PASS (`06-phosphor-backdrop-tab.png`)
  - Test 7 (Split View Comparison & Dock with `CaretLeftIcon`, `CaretRightIcon`, `MagnifyingGlassPlusIcon`, `MagnifyingGlassMinusIcon`, `CornersOutIcon`, `HandIcon`, `SquareSplitHorizontalIcon`, `GridFourIcon`, `EyeIcon`): PASS (`07-phosphor-split-view-dock.png`)
  - Test 8 (Export Modal with `DownloadSimpleIcon`, `XIcon`): PASS (`08-phosphor-export-modal.png`)

---

## Competitor Reference Scrub Pass (Working Tree Sanitization)

- **Date**: 2026-09-02
- **Task**: Remove competitor names, references, and scraping/analysis scripts from git tracking in the working tree prior to eventual history rewrite.

### 1. Safety Net
- Created git tag `pre-competitor-scrub` on the working tree before any modifications.

### 2. Scraping & Reverse-Engineering Scripts Removed from Git
Executed `git rm` on 18 competitor-specific scraping, downloading, and reverse-engineering scripts:
- `scripts/analyze-dot-grid.mjs`
- `scripts/analyze-gradlab-bundle.mjs`
- `scripts/analyze-ladybug-bundle.mjs`
- `scripts/analyze-pryzm-schema.mjs`
- `scripts/decode-pryzm-full.mjs`
- `scripts/download-pryzm-bundle.mjs`
- `scripts/extract-pattern-craft.mjs`
- `scripts/extract-pryzm-code.mjs`
- `scripts/find-gradlab-code-export.mjs`
- `scripts/find-gradlab-mp4.mjs`
- `scripts/find-gradlab-param-code.mjs`
- `scripts/inspect-herokit-studio.mjs`
- `scripts/inspect-pryzm-cdp.mjs`
- `scripts/inspect-site-standalone.mjs`
- `scripts/inspect-tier1-cdp.mjs`
- `scripts/inspect-tier2-cdp.mjs`
- `scripts/inspect-zoxilsi-cdp.mjs`
- `scripts/run-cdp-inspections.mjs`

### 3. Reference Study Documentation Untracked
- Executed `git rm --cached docs/reference-study.md docs/reference-study-prompts.md` to stop tracking in git while retaining local untracked copies.
- Added `docs/reference-study.md` and `docs/reference-study-prompts.md` to `.gitignore`.

### 4. PRD Rewording (`docs/buildkit/PRD.md`)
- **Section 3 (Product Category)**: Rewrote the competitor reference list into EffectsIO's own product voice, preserving all technical capabilities, architectures, and design principles (Generative Sub-layer Stacking, Master Composition Masking, Procedural Shader Engines & Client-Side Media Export, 50+ Effect Taxonomy, Procedural Pattern Library, Bicubic Mesh Gradients, Multi-Track Animation, Analog Glitch, and Tri-Tab Inspector Architecture) without external competitor citations.
- **Section 16 (Generative Sub-layers - Ceiling)**: Reworded Bicubic Hermite patch grid and optical distortion ceiling definitions to reference mathematical foundations and procedural shader pipelines without competitor attributions.

### 5. Verification & Codebase Integrity
- **Step 4 Verification Grep**:
  - Command: `git grep -inE "Pryzm|GradLab|HeroKit|Ditther|fx/studio|fxstudio|zoxilsi|pattern-craft|Ladybug|theladybug|designminis|basement\.studio|willnewton|kacemmathlouthi"`
  - Result: **0 matches in tracked files**.
- `pnpm typecheck`: Clean (0 errors).
- `pnpm build`: Clean production bundle in 5.03s.
- `pnpm test`: 137/137 tests passing across 14 test suites.
- `pnpm graphify:update`: AST knowledge graph refreshed and synchronized.

---

## Permanent Rule 14 & Mechanical Gatekeeper Pass (Competitor Reference Prevention)

- **Date**: 2026-09-02
- **Task**: Establish permanent Rule 14, codify private research locations, and implement mechanical validator (`scripts/check-no-competitor-refs.mjs` / `pnpm check:no-competitor-refs`).

### 1. Private Research Locations Established
- Added `docs/research/` (full attributed findings/evidence) and `.research-scratch/` (scratch downloading/scraping tools) to `.gitignore`.
- Established convention that future reference research is conducted in these git-ignored directories, keeping git tracking 100% clean.

### 2. Rule 14 Added to `AGENTS.md`
- Added Rule 14 ("No competitor references in tracked files") prohibiting product names in filenames, code comments, PRD, or any tracked files.
- Codified that tracked documents state findings by conclusion and rationale only.
- Added mandate to execute `pnpm check:no-competitor-refs` before committing reference-study output.

### 3. Mechanical Validator (`scripts/check-no-competitor-refs.mjs`)
- Created validator script maintaining a deny-list of 14 competitor/product/author names (`Pryzm`, `GradLab`, `HeroKit`, `Ditther`, `fx/studio`, `fxstudio`, `zoxilsi`, `pattern-craft`, `Ladybug`, `theladybug`, `designminis`, `basement.studio`, `willnewton`, `kacemmathlouthi`).
- Scans all files returned by `git ls-files` (ignoring git-ignored directories like `docs/research/` and `.research-scratch/`, as well as exempt historical audit records and binary files).
- Exits with code 1 and prints specific file, line number, and line content on any violation.
- Added top-of-file instructions for future sessions to append newly studied product names to the deny-list array.

### 4. Verification Chain Integration
- Added `"check:no-competitor-refs": "node scripts/check-no-competitor-refs.mjs"` to `package.json`.
- Wired `check:no-competitor-refs` directly into `"test"` and `"verify:all"` in `package.json` so validation runs automatically on every test run.

### 5. Empirical Verification Evidence (Pass & Deliberate Fail Tests)
- **Clean Repo Scan**:
  ```
  > pnpm check:no-competitor-refs
  Checking git-tracked files for competitor references...
  ✓ Pass: Scanned 618 tracked files against 14 deny-list terms. Zero competitor references found.
  ```
- **Deliberate Failure Test (Staged `test-scratch-competitor-fail.txt`)**:
  ```
  > pnpm check:no-competitor-refs
  Checking git-tracked files for competitor references...

  ❌ VIOLATION: Found 1 competitor reference(s) in git-tracked files!

    - test-scratch-competitor-fail.txt:1: matched 'Pryzm' -> "This temporary file intentionally contains a deny-listed reference: Pryzm."

  Per Rule 14 (AGENTS.md): Full attributed research belongs in docs/research/ (git-ignored) or .research-scratch/ (git-ignored), never in tracked files.
  Command failed with exit code 1.
  ```
- **Post-Cleanup Clean Re-test**:
  ```
  > pnpm check:no-competitor-refs
  Checking git-tracked files for competitor references...
  ✓ Pass: Scanned 618 tracked files against 14 deny-list terms. Zero competitor references found.
  ```
- `pnpm test`: 137/137 tests passing across 14 test suites with competitor check preceding vitest execution.
- `pnpm typecheck`: Clean (0 errors).
- `pnpm build`: Clean production bundle built in 2.85s.
- `pnpm graphify:update`: Knowledge graph updated (3,962 nodes, 10,346 edges).

---

## Design-System Documentation Consolidation Pass

- **Date**: 2026-09-02
- **Task**: Consolidate duplicate design-system documents in `docs/design-system/` without losing information.

### 1. Document Comparison & Verification
- Compared duplicate document pairs with literal unified diffs:
  - `docs/design-system/effectsio-ui-system.md` vs `docs/design-system/effectsio-ui-system-v1.1.md`
  - `docs/design-system/effectsio-component-system.md` vs `docs/design-system/effectsio-component-system-v1.1.md`
- Confirmed no substantive content was lost: unversioned files are the complete, canonical documents where obsolete "V1.1 Beta" version tags were removed and local relative links were updated to full repository-canonical paths.
- Confirmed zero stale references: all governance (`AGENTS.md`), product (`PRD.md`), and operational rules (`component-rules.md`) already point exclusively to the unversioned documents.

### 2. Redundant File Removal
- Deleted redundant files:
  - `docs/design-system/effectsio-ui-system-v1.1.md`
  - `docs/design-system/effectsio-component-system-v1.1.md`
- Canonical documents retained untouched:
  - `docs/design-system/effectsio-ui-system.md`
  - `docs/design-system/effectsio-component-system.md`
  - `docs/design-system/component-rules.md`

### 3. Verification
- `pnpm typecheck`: Clean (0 errors).
- `pnpm build`: Clean production bundle built in 3.36s.
- `pnpm check:public-provenance`: Passed (0 external runtime/provenance references).
- `pnpm check:no-competitor-refs`: Passed (scanned tracked files against deny-list, zero violations).

---

## Correction 02.2: Bottom Canvas Tool Dock Redesign & Contextual Animate Playback

- **Date**: 2026-09-02
- **Task**: Redesign bottom floating canvas controls to match Figma node `61:1277` and make animation/timeline playback contextual to `Animate` mode.

### 1. Files Changed
- `src/context/studio-context.tsx`:
  - Elevated `editorMode: "design" | "animate"` and `setEditorMode` to `StudioContextType` as the single source of truth for active editing context across workspace panels.
  - Added workspace-level `isEffectBrowserOpen: boolean` and `setIsEffectBrowserOpen` to `StudioContextType` so all surfaces can trigger the canonical effects picker.
- `src/components/layout/inspector-panel.tsx`:
  - Replaced isolated local `useState` with `editorMode`, `setEditorMode`, `isEffectBrowserOpen`, and `setIsEffectBrowserOpen` from `useStudioStore()`.
- `src/components/layout/canvas-control-dock.tsx`:
  - Redesigned floating toolbar layout according to Figma node `61:1277`:
    - `[ Hand ] [ Resize ] [ Magic Wand ] [ Compare ] │ [ Undo ] [ Redo ] │ [ 85% ▼ ]`
  - Compact floating surface with `rounded-[16px]`, 8px padding (`p-2`), 8px group spacing (`gap-2`), 32px icon button targets (`!size-8 rounded-lg`), prominent 18px icons (`size={18}` / `[&_svg]:!size-[18px]`), and thin vertical dividers (`h-5`).
  - Hand tool: toggles pan mode with pink active surface (`bg-[color:var(--primary)] text-[color:var(--primary-foreground)]`).
  - Resize tool: entry point for upcoming frame size selection without inventing competing state.
  - Magic Wand tool: opens canonical `EffectBrowserModal`.
  - Compare tool: toggles `viewport.splitView` with active surface, rendered with `ArrowsOutLineHorizontalIcon` (Phosphor `ArrowsOutLineHorizontal`) for the before/after split divider.
  - Undo/Redo: wired to existing history actions with disabled states.
  - Zoom control: shows `85% ▼` with popover menu offering Zoom In, Zoom Out, Fit to screen, and Actual size (1:1).
  - Legacy direct controls (`Zoom -`, `Zoom +`, `Fit`, `1:1`, `Grid`, `Checkerboard`) removed from persistent dock surface.
  - `TimelineBar` rendered conditionally: appears directly above bottom dock ONLY when `editorMode === "animate"`; absent outside `Animate`.
- `src/components/effects/effect-preview-cache.ts`:
  - Safely falls back to `createImageData` from `canvas-utils` in headless/jsdom testing environments without DOM canvas context.
- `src/components/layout/phase3-1-fidelity.test.tsx`:
  - Updated CanvasControlDock assertions for Figma node `61:1277` layout.
- `src/components/layout/canvas-control-dock.test.tsx`:
  - Added comprehensive 7-test suite verifying tool order, contextual timeline rendering, hand tool active styling, split view compare toggle, effect browser modal opening, and zoom popover operations.

### 2. Behavior Changes
- In `Design` mode, the workspace displays only the clean floating bottom tool dock. The playback bar is completely unmounted.
- In `Animate` mode, `TimelineBar` renders above the bottom tool dock with clear vertical hierarchy (`Timeline / Playback ↓ Bottom Tool Dock`).
- The persistent bottom toolbar is centered, compact, and features prominent 18px icons inside 32px touch/click button targets for high visibility and ergonomic control.

### 3. Verification Performed
- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 159/159 tests passed across 17 test suites.
- `pnpm build`: Production bundle built cleanly in 5.42s.
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm check:no-competitor-refs`: Passed (616 files scanned against deny-list, 0 violations).
- `pnpm check:public-provenance`: Passed (0 external runtime references).
- `pnpm graphify:update`: Knowledge graph updated (3,994 nodes, 10,552 edges, 137 communities).
- Real Headless Chrome Browser Verification:
  - 1440×900, 1280×800, 1024×768 tested and verified.
  - Confirmed bottom dock centered and visually balanced with prominent 18px icons.
  - Confirmed Hand tool pink active state.
  - Confirmed Zoom popover opens and renders actions.
  - Confirmed TimelineBar appears ONLY when `Animate` tab is active and disappears when switching back to `Design`.

### 4. Known Limitations
- Resize button acts as a structural entry point for upcoming Frame Size capability; full Frame/Layer architecture awaits Stage 1 mechanical approval per `docs/approvals/stage-1-frame-layer.md`.

---

## Correction 02.3: Rebuild Right Inspector Panel from Figma (Nodes 10:920 & 61:1306)

- **Date**: 2026-09-03
- **Task**: Faithfully rebuild right-side Inspector panel from Figma: Default/Empty Inspector (node `10:920`) and Populated/Design Inspector (node `61:1306`).

### 1. Files Changed
- `src/context/studio-context.tsx`:
  - Added centralized `theme: "system" | "light" | "dark"` and `setTheme` to `StudioContextType` with `localStorage` persistence (`effectsio_theme`) and OS color-scheme listener via `window.matchMedia("(prefers-color-scheme: dark)")`.
  - Added `appliedLook: Look | null`, `setAppliedLook`, and `clearAppliedLook` to track the applied preset.
  - Enhanced hydration state protection so newly initialized in-memory assets are never clobbered by async hydration completion in testing or runtime environments.
- `src/components/looks/looks-browser.tsx`:
  - Added `onSelectLook?: (look: Look) => void` to `LooksBrowserProps`, auto-closing the popover upon selecting a preset.
- `src/components/layout/asset-panel.tsx`:
  - Updated Project Identity header height from `h-12 min-h-12` (48px) to `h-14 min-h-14` (56px), equalizing it with the right-side Inspector panel header (`h-14 min-h-14`).
  - Updated Assets section header height from `h-10 min-h-10` (40px) to `h-11 min-h-11` (44px), giving it the exact same height as the Design/Animate mode row, Effects row, Looks row, and Background row.
- `src/components/layout/inspector-panel.tsx`:
  - Updated Design/Animate mode row height from `h-10 min-h-10` (40px) to `h-11 min-h-11` (44px), providing top and bottom breathing space around the mode buttons and establishing uniform 44px section heights across all five sections (Assets, Design/Animate, Effects, Looks, Background).
  - Ensured `min-h-11` explicit constraints on Effects, Looks, and Background header rows.
  - Rebuilt Inspector layout according to Figma node `10:920` (empty) and `61:1306` (populated):
    - **56px Header (`h-14`)**:
      - 32×32 (`size-8 rounded-full`) interactive `JD` avatar triggering canonical `Popover` for Account Menu:
        - John Doe (`john@example.com`), Account Settings, Saved Projects.
        - Appearance selector: System, Light, Dark with active checkmarks, synchronized with the application theme.
      - Pink primary `Export` button (`Button variant="primary" size="sm"`) opening canonical `ExportModal`.
    - **40px Editor Mode Row (`h-10`)**:
      - `Design` and `Animate` tabs with 14px medium typography, with active surface `bg-[color:var(--secondary)] rounded-[4px] px-2.5 py-1`, bound to `editorMode`.
    - **Empty State (`!activeAsset`)**:
      - Exactly matches Figma node `10:920`: Header → Design/Animate → completely empty body space.
      - Zero Page section, zero color control, zero placeholder content.
    - **Populated Design State (`activeAsset && editorMode === "design"`)**:
      - Matches Figma node `61:1306` with stacked sections separated by full-width border lines (`border-b border-[color:var(--border)]`):
        1. **Effects**: Header `Effects +` (`+` opens `EffectBrowserModal`). Zero "No active effects" placeholder text when empty so the row looks identical to Looks and Background. Real draggable effect stack (`@dnd-kit`), title (12px medium), parameter disclosure (`SlidersIcon`), visibility toggle (`EyeIcon`/`EyeSlashIcon`), and remove (`TrashIcon`). Selected row styled with secondary surface. Parameter disclosure reveals inline drawer with `SliderControl`, `SelectControl`, `ColorControl`, and `BooleanControl`.
        2. **Looks**: Header `Looks +` (`+` opens `LooksBrowser` in a Popover). When applied, displays `✨ {appliedLook.name}` and changes button to `−` (`MinusIcon`), which clears the applied look.
        3. **Background**: Header `Background +` (`+` opens Background Type Picker Popover: Solid Color, Linear Gradient, Radial Gradient, Dots Pattern, Grid Pattern). When active, renders `<BackgroundControls />` and changes button to `−` (`MinusIcon`), which removes the active background. Closed with bottom border separating it from the clean canvas space below.
    - **Animate State (`editorMode === "animate"`)**:
      - Renders Animation Timeline with Duration, Loop toggle, and Playback Speed segmented buttons (0.5x, 1x, 2x).
- `src/components/layout/inspector-panel.test.tsx`:
  - Created comprehensive 14-test suite covering empty state constraints, avatar menu and theme switching, populated stack operations, inline parameter drawer toggling, Looks and Background `+`/`−` lifecycles, and Design/Animate mode switching.

### 2. Behavior Changes
- The empty Inspector now faithfully reflects Figma node `10:920`, showing only the 56px header and mode row with completely empty space below.
- The previous unapproved Page / Color section was removed entirely.
- The avatar provides a unified account and theme switcher supporting System, Light, and Dark without introducing duplicate theme logic.
- Looks and Background now use standard plus/minus semantics:
  - `+` initiates creation / selection via popovers.
  - `−` removes / clears the active look or background layer.
- Mode switching (`Design` vs `Animate`) synchronizes across the workspace through `StudioContext`.

### 3. Verification Performed
- `pnpm typecheck`: Clean (0 errors).
- `pnpm test`: 173/173 tests passed across all 18 test suites (including all 14 `inspector-panel.test.tsx` tests).
- `pnpm build`: Clean production bundle built in 4.18s (`dist/assets/index-FtYkTcmV.js` 843.11 kB).
- `pnpm verify:approvals`: All mechanical approval gates verified.
- `pnpm check:no-competitor-refs`: 618 tracked files scanned against deny-list, 0 violations.
- `pnpm check:public-provenance`: Clean (0 external runtime/provenance references).
- `pnpm graphify:update`: Knowledge graph updated (4,002 nodes, 10,565 edges, 140 communities).
- Real Headless Chrome CDP Verification:
  - Empty Inspector (Figma node `10:920`) at 1440×900, 1280×800, 1024×768: verified 56px header, 32px avatar, pink export button, Design/Animate tabs, and empty space without Page/Color controls.
  - Populated Inspector (Figma node `61:1306`): verified stacked Effects, Looks, and Background sections with correct typography, icons, and density.
  - Avatar Popover: verified Account info and System/Light/Dark appearance options.
  - Inline Parameter Drawer: verified parameters disclosure under selected effect row.
  - Looks Popover: verified `LooksBrowser` opening and preset application.
  - Background Popover & Controls: verified type picker and `BackgroundControls`.
  - Animate Mode: verified Animation Timeline controls.

### 4. Graphify & Headroom Actual-Use
- **Graphify**:
  - Pre-implementation queries mapped `StudioContextType`, `InspectorPanel`, `LooksBrowser`, `EffectBrowserModal`, `BackgroundControls`, and `canvas-control-dock`.
  - Post-implementation AST synchronization executed (`pnpm graphify:update`), updating knowledge graph to 4,002 nodes and 10,565 edges across 140 communities.
- **Headroom**:
  - Checked proxy availability; verified direct CLI execution.
  - No Headroom proxy metrics claimed.

### 5. Known Limitations
- None. Frame/Layer architecture was strictly omitted per `docs/approvals/stage-1-frame-layer.md`.

---

## PRD Refinement: Video Export Scoping in Section 34

- **Date**: 2026-09-03
- **Task**: Scope client-side video export (MP4/WebM) into Section 34 Stage 9 ("Advanced Animation") and remove them from the Deferred list in `docs/buildkit/PRD.md`.

### 1. Files Changed
- `docs/buildkit/PRD.md`:
  - Added video export (MP4/WebM) via native `MediaRecorder` and `captureStream` APIs to Section 34 Stage 9 ("Advanced Animation"), documenting that it is not deferred for technical difficulty but sequenced after Stage 4 motion.
  - Removed `MP4 export` and `WebM export` from Section 34 "Deferred" list while preserving `GIF export`, `video file ingestion`, and `image-sequence export`.

### 2. Verification Performed
- Documentation-only change; ran verification suite per Rule 1 and Rule 6:
  - `pnpm typecheck`: Clean (0 errors).
  - `pnpm build`: Clean production build.
  - `pnpm check:no-competitor-refs`: Verified clean (0 violations).
  - `pnpm check:public-provenance`: Clean (0 violations).









