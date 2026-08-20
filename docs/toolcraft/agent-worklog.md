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

## Evidence

- Source reviewed: src/app/app-schema.ts, src/app/components/EffectsCanvas.tsx, src/app/components/ImageLibraryRenderer.tsx, src/app/app-composition.tsx, src/app/app-acceptance-data.ts.
- Contract applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
