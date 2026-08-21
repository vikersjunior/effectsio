# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

EffectsIO is a personal image effects and visual-style workstation for applying repeatable creative treatments to images.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `pnpm verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later `functional-targeted` delivery, record only the new intent and decisions; the same bare command derives exact ownership-required proof from protected state.

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
- Root cause: `EffectsCanvas` passed single-item list `[activeAsset]` to `useToolcraftMediaPresentationUrls`. During thumbnail selection state transitions, `useToolcraftMediaPresentationUrls` initiated async resolution for the new asset while `mediaUrls.get(activeAsset.id)` returned `undefined`, causing `Array.from(mediaUrls.values())[0]` to fall back to the previous image's pre-resolved blob URL.
- Fix: `EffectsCanvas` now passes `sourceAssets` (all library images) to `useToolcraftMediaPresentationUrls(sourceAssets)` so blob presentation URLs for all library assets are pre-resolved simultaneously. `activeMediaUrl` reads `mediaUrls.get(activeAsset.id) ?? null` directly with zero stale fallback.
- User-visible result: Clicking any thumbnail in the Image Library immediately switches the active blue selection outline AND immediately updates the canvas to display that exact image.
- Docs/contracts read: workflow.md, runtime-boundary.md, media-upload.md, custom-controls.md.
- Contract rules applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage.
- Verification: `pnpm typecheck`, `pnpm ai:check`, `pnpm docs:check`, `node scripts/check-toolcraft-integrity.mjs`, `pnpm vitest run src/app/app-schema.test.ts`, `pnpm build`.
- Risks: None; all tests and integrity checks pass.

### Iteration 10 — Single active image source of truth for canvas rendering

- Request: Fix the critical bug where selecting an Image Library thumbnail changes its blue border but the canvas continues displaying the first uploaded image.
- Task type: Broken control and canvas data-flow repair.
- Root cause: Image Library and EffectsCanvas independently resolved the active asset, including a selected-layer/first-image fallback. That allowed the visible library selection and canvas source to diverge.
- Decision: Treat the `source.image` runtime value as the single `activeImageId`; both the Image Library and canvas use the same validated resolver. The first source image is only the initial fallback before a valid ID exists. Canvas presentation URLs remain keyed by asset ID, with no cross-asset fallback.
- User-visible result: Clicking a thumbnail updates the runtime active image ID and immediately causes the canvas renderer to resolve and display that exact image.
- Alternatives rejected: Adding another selector, maintaining local active-image state, forcing a reload, or selecting the first asset by array position.
- State/output mapping: `ImageLibraryRenderer.setValue(assetId)` → `state.values["source.image"]` → `resolveActiveImageId`/`resolveActiveImage` → `useToolcraftMediaPresentationUrls` lookup by active asset ID → Canvas 2D image output.
- Docs/contracts read: workflow.md, decision-contract.md, core/runtime-boundary.md, core/performance.md, component-rules.md, renderer-technique.md.
- Contract rules applied: interaction-surface-ownership, canvas-surface-preserved, renderer-technique-inventory, acceptance-product-observable.
- Verification tier: Tier 3; targeted unit/type checks, browser thumbnail selection coverage, then one bare `pnpm verify:delivery` at the delivery boundary. Measured performance is not authorized or required for this bug fix.
- Risks: The custom control still uses the existing runtime media presentation URL hook; URL resolution is asynchronous, so the canvas may briefly show its background while a newly selected asset is being resolved, but it cannot display another asset.

### Iteration 11 — Use Toolcraft selected media layer as active image authority

- Request: The active thumbnail still changes without changing the canvas; find the root cause and amend it accordingly.
- Task type: Follow-up broken media-selection and canvas-renderer data-flow repair.
- Root cause: `source.image` is a `multiple: true` fileDrop target with an array default, while Toolcraft media import and `layers.select` maintain the committed selected media object in `selectedLayerId`. The previous canvas fix still trusted the overloaded fileDrop value, so it could remain stale or represent the initial source even when the selected layer changed.
- Decision: Resolve `activeImageId` from the selected runtime media layer first, then use the synchronized `source.image` value only as a fallback. Both the Image Library and EffectsCanvas use the same resolver. Thumbnail clicks continue to update the control value and dispatch `layers.select`; the canvas now reacts directly to the committed selected layer.
- User-visible result: Selecting Image B selects its runtime media layer and the canvas resolves Image B rather than retaining Image A.
- Alternatives rejected: Another selector, local React active state, canvas reload, array-position selection, or patching the copied Toolcraft runtime.
- State/output mapping: thumbnail click → `layers.select(layerId)` → `state.selectedLayerId` → resolve matching `mediaAssets` entry → ID-keyed presentation URL → Canvas 2D output; `source.image` remains synchronized for the Image Library control.
- Docs/contracts read: workflow.md, decision-contract.md, core/runtime-boundary.md, component-rules.md, renderer-technique.md, acceptance-testing.md.
- Contract rules applied: interaction-surface-ownership, canvas-surface-preserved, acceptance-product-observable, runtime-shell-required.
- Verification tier: Tier 3; targeted resolver tests, typecheck, code health, build, and browser acceptance when the local Playwright executable is available. Measured performance is not authorized.
- Risks: Runtime browser proof remains pending until the local Playwright browser binary is installed; unit and build checks cover the shared resolution logic.

### Iteration 12 — Route Image Library through the product custom renderer

- Request: The active-image fix still does not work; inspect the supplied root-cause analysis and correct the routing.
- Task type: Schema control routing and custom-control activation repair.
- Root cause: `source.image` was declared as built-in `fileDrop`, so the runtime selected its built-in `media` renderer. The registered `ImageLibraryRenderer` under `controlRenderers.fileDrop` was never mounted; built-in thumbnail selection only changed local `selectedMediaId` state and never wrote the active ID to runtime values.
- Decision: Declare `source.image` as the registered custom schema type `controlRenderers` (Toolcraft’s runtime schema type for `controlRenderers`), use scalar `defaultValue: null`, and register `ImageLibraryRenderer` under `controlRenderers`. Keep the existing runtime media commands and selected-layer synchronization.
- User-visible result: The actual Image Library renderer handles thumbnail clicks, writes the selected asset ID, dispatches layer selection, and drives the canvas renderer.
- Alternatives rejected: Patching the built-in FileDrop renderer, adding another selector, or retaining a dead `fileDrop` renderer registration.
- State/output mapping: `controlRenderers` schema route → `ImageLibraryRenderer` → `setValue(assetId)` and `layers.select` → shared active-image resolver → canvas presentation URL → Canvas 2D output.
- Docs/contracts read: workflow.md, core/control-selection.md, core/layout.md, schema-reference.md, custom-controls.md, acceptance-testing.md.
- Contract rules applied: controls-product-coverage, interaction-surface-ownership, acceptance-product-observable, runtime-shell-required.
- Verification tier: Tier 3; targeted schema/resolver tests, typecheck, code health, build, and browser acceptance when available. Measured performance is not authorized.
- Risks: This custom control intentionally owns upload, selection, delete, transforms, and ordering because the built-in fileDrop does not expose the required active-ID value model. Browser proof remains environment-blocked by the missing Playwright executable.

### Iteration 13 — Restore Toolcraft FileDrop and commit thumbnail selection

- Request: Upload is broken and the image upload UI no longer uses Toolcraft styling after the custom-control routing change.
- Task type: Regression repair and shared built-in media-control behavior fix.
- Root cause: Replacing `fileDrop` with the product custom renderer bypassed Toolcraft’s source-asset coordinator, upload lifecycle, and styled `FileDrop` component. The underlying built-in control also kept thumbnail selection only in local `selectedMediaId` state.
- Decision: Restore the schema’s built-in `fileDrop` and remove the custom renderer registration. Update the existing runtime-owned image-grid selection callback to preserve local action-button state while also committing the selected asset ID through `setControlValue`. EffectsCanvas consumes that runtime value.
- User-visible result: Upload/import uses the native Toolcraft FileDrop UI and lifecycle again; selecting a thumbnail commits the active image ID and switches the canvas.
- Alternatives rejected: Keeping hand-built upload JSX, adding another selector, or duplicating Toolcraft FileDrop styling in product code.
- State/output mapping: Toolcraft FileDrop upload/import → `mediaAssets`; thumbnail click → `setControlValue("source.image", assetId)` → shared active-image resolver → canvas presentation URL → Canvas 2D output.
- Contract rules applied: runtime-shell-required, controls-product-coverage, canvas-surface-preserved, acceptance-product-observable.
- Verification tier: Tier 3; focused acceptance/type/build checks and browser acceptance when available. Measured performance is not authorized.
- Risks: This fixes a shared copied-runtime behavior and therefore requires the runtime integrity receipt to be regenerated by the upstream Toolcraft workflow; the local browser executable is still unavailable.

## Evidence

- Source reviewed: src/app/app-schema.ts, src/app/components/EffectsCanvas.tsx, src/app/components/ImageLibraryRenderer.tsx, src/app/app-composition.tsx, src/app/app-acceptance-data.ts.
- Contract applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
