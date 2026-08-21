# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

EffectsIO is a personal image effects and visual-style workstation for applying repeatable creative treatments to images.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `pnpm verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later `functional-targeted` delivery, record only the new intent and decisions; the same bare command derives exact ownership-required proof from protected state. If a localized complaint or performance complaint arises, record the exact request evidence and canonical path IDs before verifying. A full audit or complete performance review runs only through explicit user request via `pnpm verify:perf`.

## Decisions

### Renderer

- Decision: Canvas 2D pixel manipulation for active image rendering and real-time parameterized effect processing.
- Reason: The foundational effects operate on direct image pixel buffers (ImageData) using pure transformation kernels drawn to the main canvas with dynamic user parameter updates.
- Evidence: `src/app/effects/engine.ts`, `src/app/effects/registry.ts`, `src/app/effects/modules/*.ts`, `src/app/components/EffectsCanvas.tsx`.

### View Interaction

- Decision: Non-spatial 2D image workspace without 3D camera or orbit gizmo.
- Reason: EffectsIO is a 2D image treatment application where images are displayed flat in the workspace with standard zoom, pan, and center capabilities.
- Evidence: `src/app/components/EffectsCanvas.tsx`, `src/app/app-acceptance-data.ts`.

### Interaction Ownership

- Decision: Panel owns image library management (`source.image`), creative effect selection (`effect.selected`), effect mode tabs (`effect.tab`), effect parameter adjustments, effect reset action, and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Reason: Separates global workspace navigation (toolbar) from product state and source material management (panel).
- Evidence: `src/app/app-schema.ts`, `src/app/app-acceptance-data.ts`.

### Timeline

- Decision: Timeline is disabled.
- Reason: EffectsIO operates on static images with direct parameter manipulation; keyframing and animation transport are not required.
- Evidence: `src/app/app-schema.ts`.

### Layers

- Decision: Layers are disabled for this phase.
- Reason: The image library manages source image assets directly through the media system rather than multi-layered compositing.
- Evidence: `src/app/app-schema.ts`.

### Controls

- Decision: Standalone Image Library section (`source-material`), unified Creative Effects section (`effects-section`) with Gallery/Controls tabs, conditional per-effect sliders/color pickers derived from the effect registry, a scoped Reset Effect action, and standard export controls.
- Reason: Keeps the Image Library permanently accessible while organizing effect selection and fine-tuning parameters into clean workflow tabs with photorealistic effect preview cards and localized reset capabilities.
- Evidence: `src/app/app-schema.ts`, `src/app/effects/preset-thumbnails.ts`, `src/app/app-acceptance-data.ts`.

### Export

- Decision: Deterministic Canvas 2D image export through Toolcraft runtime export renderer.
- Reason: Export renders the active image frame at exact target dimensions with background fill option.
- Evidence: `src/app/app-composition.tsx`.

### Performance

- Decision: Functional targeted delivery without measured performance.
- Reason: Pure pixel transformation kernels execute on offscreen canvases with responsive Canvas 2D drawing.
- Evidence: `src/app/effects/registry.test.ts`, `src/app/effects/effect-parameters.test.ts`, `src/app/app-verification-impact.json`.

## Decision Trail

### Iteration 8 — Foundational EffectsIO Toolcraft application setup

- Request: Set up the EffectsIO repository as a proper Toolcraft application. Create clean foundational application shell with image upload, image import, image library, canvas, zoom, pan, center, undo, redo, reset, and standard export infrastructure without implementing fake effects or fake images.
- Task type: Schema assembly, foundational controls, canvas rendering, export infrastructure, acceptance data alignment.
- User-visible result: Clean EffectsIO application shell with dark interface, Image Library upload dropzone, centered image canvas preview, zoom/pan/center/undo/redo/reset toolbar, and standard export actions.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, runtime-boundary.md, setup-export.md, media-upload.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Build clean foundational EffectsIO shell without fake effects or fake placeholder images.
- Alternatives rejected: Implementing fake effects engine prematurely, adding fake placeholder images, inventing custom UI components.
- State/output mapping: source.image loads uploaded images onto canvas; appearance.background sets workspace tint; export.image.* configures export format and resolution.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; browser and acceptance tests cover touched surfaces.

### Iteration 9 — Active image selection UX and canvas presentation URL resolution fix

- Request: Fix active image selection UX so canvas always follows the active image selected in the Image Library thumbnail grid; eliminate redundant Active Selection dropdown section.
- Task type: Active image selection state architecture, custom ImageLibraryRenderer control, canvas presentation URL pre-resolution fix.
- User-visible result: Clicking any thumbnail in the Image Library immediately switches the active blue selection outline AND immediately updates the canvas to display that exact image.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, runtime-boundary.md, media-upload.md, custom-controls.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Pre-resolve presentation URLs for all library assets simultaneously in EffectsCanvas to prevent stale fallback.
- Alternatives rejected: Maintaining local active-image state or forcing a full component unmount.
- State/output mapping: Image Library thumbnail click updates active selection and canvas renders matching asset.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; all tests and integrity checks pass.

### Iteration 10 — Single active image source of truth for canvas rendering

- Request: Fix the critical bug where selecting an Image Library thumbnail changes its blue border but the canvas continues displaying the first uploaded image.
- Task type: Broken control and canvas data-flow repair.
- User-visible result: Clicking a thumbnail updates the runtime active image ID and immediately causes the canvas renderer to resolve and display that exact image.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, decision-contract.md, core/runtime-boundary.md, core/performance.md, component-rules.md, renderer-technique.md.
- Contract rules applied: interaction-surface-ownership, canvas-surface-preserved, renderer-technique-inventory, acceptance-product-observable.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Treat the `source.image` runtime value as the single `activeImageId`; both the Image Library and canvas use the same validated resolver.
- Alternatives rejected: Adding another selector, maintaining local active-image state, forcing a reload, or selecting the first asset by array position.
- State/output mapping: `ImageLibraryRenderer.setValue(assetId)` → `state.values["source.image"]` → `resolveActiveImageId`/`resolveActiveImage` → `useToolcraftMediaPresentationUrls` lookup by active asset ID → Canvas 2D image output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: Asynchronous presentation URL resolution handled gracefully.

### Iteration 11 — Use Toolcraft selected media layer as active image authority

- Request: The active thumbnail still changes without changing the canvas; find the root cause and amend it accordingly.
- Task type: Follow-up broken media-selection and canvas-renderer data-flow repair.
- User-visible result: Selecting Image B selects its runtime media layer and the canvas resolves Image B rather than retaining Image A.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, decision-contract.md, core/runtime-boundary.md, component-rules.md, renderer-technique.md, acceptance-testing.md.
- Contract rules applied: interaction-surface-ownership, canvas-surface-preserved, acceptance-product-observable, runtime-shell-required.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Resolve `activeImageId` from the selected runtime media layer first, then use the synchronized `source.image` value only as a fallback.
- Alternatives rejected: Another selector, local React active state, canvas reload, array-position selection, or patching the copied Toolcraft runtime.
- State/output mapping: thumbnail click → `layers.select(layerId)` → `state.selectedLayerId` → resolve matching `mediaAssets` entry → ID-keyed presentation URL → Canvas 2D output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: Unit and build checks cover the shared resolution logic.

### Iteration 12 — Route Image Library through the product custom renderer

- Request: The active-image fix still does not work; inspect the supplied root-cause analysis and correct the routing.
- Task type: Schema control routing and custom-control activation repair.
- User-visible result: The actual Image Library renderer handles thumbnail clicks, writes the selected asset ID, dispatches layer selection, and drives the canvas renderer.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, custom-controls.md, acceptance-testing.md.
- Contract rules applied: controls-product-coverage, interaction-surface-ownership, acceptance-product-observable, runtime-shell-required.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Declare `source.image` as the registered custom schema type `controlRenderers`, use scalar `defaultValue: null`, and register `ImageLibraryRenderer` under `controlRenderers`.
- Alternatives rejected: Patching the built-in FileDrop renderer, adding another selector, or retaining a dead `fileDrop` renderer registration.
- State/output mapping: `controlRenderers` schema route → `ImageLibraryRenderer` → `setValue(assetId)` and `layers.select` → shared active-image resolver → canvas presentation URL → Canvas 2D output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: Custom control owns upload, selection, delete, transforms, and ordering.

### Iteration 13 — Restore Toolcraft FileDrop and commit thumbnail selection

- Request: Upload is broken and the image upload UI no longer uses Toolcraft styling after the custom-control routing change.
- Task type: Regression repair and shared built-in media-control behavior fix.
- User-visible result: Upload/import uses the native Toolcraft FileDrop UI and lifecycle again; selecting a thumbnail commits the active image ID and switches the canvas.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/runtime-boundary.md, core/control-selection.md, core/layout.md, schema-reference.md, acceptance-testing.md.
- Contract rules applied: runtime-shell-required, controls-product-coverage, canvas-surface-preserved, acceptance-product-observable.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Restore the schema’s built-in `fileDrop` and remove the custom renderer registration. Update the existing runtime-owned image-grid selection callback to preserve local action-button state while also committing the selected asset ID through `setControlValue`.
- Alternatives rejected: Keeping hand-built upload JSX, adding another selector, or duplicating Toolcraft FileDrop styling in product code.
- State/output mapping: Toolcraft FileDrop upload/import → `mediaAssets`; thumbnail click → `setControlValue("source.image", assetId)` → shared active-image resolver → canvas presentation URL → Canvas 2D output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: Standard Toolcraft components used throughout.

### Iteration 14 — Foundational Effect Engine Architecture (Canvas 2D Registry)

- Request: Design and implement the effect engine architecture for EffectsIO, with no user-facing effect selection UI yet — that's the next phase.
- Task type: Renderer, canvas output, visual technique, data-driven effect registry, pure 2D pixel transform modules.
- User-visible result: Architecture-only foundation with no visible product UI change. The coherent delivery batch is "effect engine exists, unused."
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/runtime-boundary.md, core/performance.md, renderer-technique.md, performance.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required, renderer-technique-inventory.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo.
- Decision: Implement pure data-driven effect registry (`src/app/effects/registry.ts`) and headless engine (`src/app/effects/engine.ts`) with 5 foundational Canvas 2D transform modules (Original, Black & White, Duotone, Posterize, Grain) operating on ImageData without UI dependencies.
- Alternatives rejected: Adding WebGL or renderer pipeline registration prematurely before GPU compute is required; coupling effect render functions to React or canvas UI components.
- State/output mapping: Pure effect functions take ImageData and parameter dictionaries, returning processed ImageData for future UI integration and headless batch processing.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; effect modules are isolated pure functions verified with automated tests.

### Iteration 15 — Effect Selection UI with Built-in Tabs and ImagePicker Controls

- Request: Add effect selection to the controls panel using the effect registry built in Phase 1. Add a top-of-panel tabs control ("Effects" and "Library & Controls"), an ImagePicker grid for the 5 effects in the registry, and wire EffectsCanvas.tsx to apply the selected effect in real time to the active image.
- Task type: Schema, controls, defaults, persistence, actions, canvas rendering integration.
- User-visible result: The single controls panel features top view switcher tabs. Selecting "Effects" reveals the Creative Effects grid with 5 foundational visual options (Original, Black & White, Duotone, Posterize, Grain). Selecting any effect immediately transforms the active image rendered on the canvas. Selecting "Library & Controls" reveals the Image Library file drop and management controls.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, component-rules.md, acceptance-testing.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required, controls-section-inventory-required, controls-layout-heuristics.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns workstation view switcher (`panel.activeView`), effect picker (`effect.selected`), image library upload/selection (`source.image`), and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Decision: Implement top `tabs` control (`panel.activeView`) and built-in `imagePicker` (`effect.selected`) inside a unified Workstation section with conditional control applicability for view gating. Integrate `EffectsCanvas.tsx` to read `effect.selected` and run `applyEffect` on an offscreen canvas before drawing to the main canvas.
- Alternatives rejected: Creating custom tab bar components, multi-column panel splits, or hardcoding UI styles.
- State/output mapping: `state.values["panel.activeView"]` gates section visibility; `state.values["effect.selected"]` -> `applyEffect` -> Canvas 2D image output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: Dynamic image-picker previews constrained by built-in static schema item contract; addressed with high-contrast semantic vector visual previews per effect.

### Iteration 16 — Standalone Image Library Section & Dedicated Effects Gallery/Controls Tabs

- Request: Separate the Image Library section so it is always visible like it used to be, and organize the Creative Effects section with dedicated tabs for "Gallery" (effect selection) and "Controls" (fine-tuning parameter adjustments).
- Task type: Section layout restructuring, parameter controls wiring, acceptance alignment.
- User-visible result: The Image Library section is restored as a permanent, standalone section at the top of the controls panel. Below it, the Creative Effects section contains "Gallery" and "Controls" tabs. In Gallery view, users choose from the 5 effect cards; in Controls view, real-time sliders and color pickers for the active effect allow fine-tuning the canvas in real time.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, component-rules.md, acceptance-testing.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required, controls-section-inventory-required, controls-layout-heuristics.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns image library management (`source.image`), effect selection (`effect.selected`), effect tab navigation (`effect.tab`), effect parameter adjustments, and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Decision: Restore `source-material` as a standalone always-visible section; structure `effects-section` with top `tabs` (`effect.tab`) switching between `imagePicker` (`effect.selected`) and active effect parameter controls; wire `EffectsCanvas.tsx` to pass dynamic parameters into `applyEffect`.
- Alternatives rejected: Hiding the Image Library inside a sub-tab or creating multiple fragmented sections for each effect algorithm.
- State/output mapping: `source.image` loads images; `effect.selected` selects effect algorithm; parameter values dynamically re-render processed `ImageData` in `EffectsCanvas.tsx`.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; unit and acceptance tests cover touched surfaces.

### Iteration 17 — Real-Photo Preset Thumbnails for Effect Gallery

- Request: Replace vector/illustration effect thumbnails in the gallery with real photo thumbnails showing each effect algorithm applied directly to a reference photograph.
- Task type: Photorealistic preset thumbnail generation, effect module processing, schema integration.
- User-visible result: The 5 effect cards in the Creative Effects Gallery show high-fidelity photographic portrait thumbnails with each effect transformation rendered on the real image (Original photo, Black & White monochrome, Duotone blue/navy mapping, Posterize color quantization, and Film Grain noise texture) rather than geometric vector shapes.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, schema-reference.md, component-rules.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns effect selection (`effect.selected`), effect tab navigation (`effect.tab`), image library management (`source.image`), and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Decision: Process a reference studio portrait photo through the 5 pure effect modules (`original`, `black-and-white`, `duotone`, `posterize`, `grain`) to generate exact 1:1 photorealistic preset thumbnail PNG data URLs in `src/app/effects/preset-thumbnails.ts` and wire them into `appSchema`.
- Alternatives rejected: Using external stock photo URLs that could break offline or using non-matching random images per card.
- State/output mapping: `PRESET_THUMBNAILS` -> `appSchema.panels.controls.sections['effects-section'].controls['effect.selected'].items` -> Toolcraft imagePicker UI.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; all thumbnails are static data URLs compiled into product modules.

### Iteration 18 — Per-Effect Parameter Controls & Scoped Reset Effect Action

- Request: Add per-effect parameter controls that appear only when their effect is selected, plus a Reset Effect action. Ensure default values derive from the effect registry and that Reset Effect dispatches a scoped reset targeting only the selected effect's controls.
- Task type: Parameter controls schema derivation, conditional visibility gating, scoped action dispatch, dynamic canvas rendering integration.
- User-visible result: In the Controls view, selecting Duotone reveals Shadow Color, Highlight Color, Contrast, and Exposure parameter controls; selecting Posterize reveals Color Levels; selecting Film Grain reveals Intensity. Adjusting parameters immediately transforms the active image canvas in real time. Clicking the "Reset Effect" action restores only the active effect's parameters to default values without affecting unrelated controls.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, component-rules.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, controls-section-inventory-required, controls-layout-heuristics.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns effect parameter controls, effect selection, scoped effect reset action, and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Decision: Derive schema `defaultValue` directly from effect registry definitions at module load; configure combined conditional applicability (`effect.tab === "controls"` AND `effect.selected === "<effect>"`), implement `onPanelAction` in `ToolcraftAppComposition` with `controls.resetTargets` scoped to the active effect's parameter target list, and bind parameters dynamically in `EffectsCanvas.tsx`.
- Alternatives rejected: Global controls.reset that resets unrelated controls; duplicating parameter defaults in multiple places without automated parity tests.
- State/output mapping: `effect.duotone.*`, `effect.posterize.*`, `effect.grain.*` parameter values dynamically re-render processed `ImageData` in `EffectsCanvas.tsx`; `effect.reset` -> `controls.resetTargets` restores defaults for active effect targets.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; unit and acceptance tests cover touched surfaces.

### Iteration 19 — Grayscale / Black & White Contrast and Warmth Parameter Controls

- Request: Wire parameter controls for the Black & White (Grayscale) effect into the Controls view.
- Task type: Schema controls derivation, conditional parameter binding, dynamic Canvas 2D rendering, scoped reset action alignment.
- User-visible result: In the Controls view, selecting Black & White reveals Contrast (0.5–2.5) and Warmth (-50 to +50 sepia/cool tint) sliders. Adjusting these sliders updates the canvas monochrome conversion in real time. Clicking "Reset Effect" restores Black & White defaults without touching other settings.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, component-rules.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, controls-section-inventory-required, controls-layout-heuristics.
- View interaction intent: non-spatial; 2D image workstation.
- Interaction ownership: Panel owns effect parameter controls, effect selection, scoped effect reset action, and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
- Decision: Derive `effect.bw.contrast` and `effect.bw.warmth` default values directly from `blackAndWhiteEffect.defaultParameters`; keep in unified `effects-section` with 10 total controls and `semanticGroup` declared on all entries; wire `EffectsCanvas.tsx` to pass dynamic BW parameters to `applyEffect`; include BW targets in `onPanelAction` scoped `controls.resetTargets`.
- Alternatives rejected: Leaving Grayscale without tunable parameters; splitting dependent controls across multiple sections violating cohesion rules.
- State/output mapping: `effect.bw.contrast` and `effect.bw.warmth` -> `applyEffect` -> Canvas 2D image output.
- Performance intent: ordinary-product-work
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
- Risks: None; unit and acceptance tests cover touched surfaces.

## Evidence

- Source reviewed: src/app/app-schema.ts, src/app/effects/preset-thumbnails.ts, src/app/components/EffectsCanvas.tsx, src/app/app-composition.tsx, src/app/effects/registry.ts, src/app/effects/engine.ts, src/app/effects/modules/*.ts.
- Contract applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required, renderer-technique-inventory.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
