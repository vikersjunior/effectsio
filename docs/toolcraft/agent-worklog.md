# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

EffectsIO is a personal image effects and visual-style workstation for applying repeatable creative treatments to images.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `pnpm verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later `functional-targeted` delivery, record only the new intent and decisions; the same bare command derives exact ownership-required proof from protected state. If a localized complaint or performance complaint arises, record the exact request evidence and canonical path IDs before verifying. A full audit or complete performance review runs only through explicit user request via `pnpm verify:perf`.

## Decisions

### Renderer

- Decision: Use Canvas 2D pixel manipulation for image rendering and effect processing.
- Reason: The 5 foundational effects (Original, Black & White, Duotone, Posterize, Grain) operate on direct image pixel buffers (ImageData) without requiring complex WebGL shaders or GPU pipeline registration.
- Evidence: `src/app/effects/engine.ts`, `src/app/effects/registry.ts`, `src/app/effects/modules/*.ts`, `src/app/effects/registry.test.ts`.

### View Interaction

- Decision: Non-spatial 2D image workspace without 3D camera or orbit gizmo.
- Reason: EffectsIO is a 2D image treatment application where images are displayed flat in the workspace with standard zoom, pan, and center capabilities.
- Evidence: `src/app/components/EffectsCanvas.tsx`, `src/app/app-acceptance-data.ts`.

### Interaction Ownership

- Decision: Panel owns image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, undo, and redo.
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

- Decision: Standard Toolcraft schema controls for background configuration and export settings; no user-facing effect controls yet for this architecture phase.
- Reason: The effect engine is built headlessly in this phase to establish clean registry and data-flow contracts prior to UI wiring.
- Evidence: `src/app/app-schema.ts`, `src/app/effects/types.ts`.

### Export

- Decision: Deterministic Canvas 2D image export through Toolcraft runtime export renderer.
- Reason: Export renders the active image frame at exact target dimensions and returns standard image artifacts.
- Evidence: `src/app/app-composition.tsx`.

### Performance

- Decision: Functional targeted delivery without measured performance.
- Reason: Initial architecture delivery establishing pure data structures and pure pixel transformation functions.
- Evidence: `src/app/effects/registry.test.ts`, `src/app/app-verification-impact.json`.

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

## Evidence

- Source reviewed: src/app/app-schema.ts, src/app/components/EffectsCanvas.tsx, src/app/components/active-image.ts, src/app/effects/registry.ts, src/app/effects/engine.ts, src/app/effects/types.ts, src/app/effects/canvas-utils.ts, src/app/effects/modules/*.ts.
- Contract applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required, renderer-technique-inventory.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
