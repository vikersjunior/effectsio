# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

EffectsIO is a personal image effects and visual-style workstation for applying repeatable creative treatments to images.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `pnpm verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later `functional-targeted` delivery, record only the new intent and decisions; the same bare command derives exact ownership-required proof from protected state.

Classifier output establishes complaint authority only and never path localization. A localized performance complaint adds the domain authority below, then one bare `pnpm verify:delivery` runs one targeted iteration. If localization remains unresolved regardless of classifier result, ask one user-facing question naming visible operations and offering targeted diagnosis or a complete review; record neither `performance-iteration` intent nor canonical path authority until the answer supplies exact localization evidence. Never ask the user to choose internal path IDs. A broad or honestly unlocalizable problem may present that single choice with a recommendation for complete review, but the user still chooses. A direct complete-review request needs no further clarification. The full audit remains separate and requires an explicit operator request or accepted offer before `pnpm verify:perf` may run. Protected receipts own changed files, plans, checks, reports, measurements, and pass/fail evidence.

When `canvas.renderScale` is enabled, record the renderer decision to preserve selected backing quality and map it to functional `renderScaleCoverage` for interaction and steady state, plus playback when timeline is enabled. The worklog may name the protected `canvas-render-scale-backing` recipe, but it cannot claim its evidence or turn a quality failure into performance authority.

## Performance Iteration Entry Contract

For high-confidence ordinary work, record `Performance intent: ordinary-product-work`. For unresolved localization, whether classification returned high-confidence `performance-iteration` or `needs-agent-judgment`, record the unresolved visible operation but no `Performance intent: performance-iteration` field or `Performance paths` until the user's one clarification provides exact localization. For a localized performance complaint or post-clarification targeted choice, record exactly these domain fields in the latest iteration:

```md
- Performance intent: performance-iteration
- Performance request evidence: "<verbatim exact Request quote>"
- Performance paths: ["performance-path:%5B...%5D"]
- Verification: One bare `pnpm verify:delivery` will derive and run the protected proof.
```

## Decisions

### Renderer

- Decision: Render uploaded source image onto Canvas 2D surface inside EffectsCanvas component.
- Reason: Provides clean, high-performance image scaling and centered artboard presentation.
- Evidence: src/app/components/EffectsCanvas.tsx.

### View Interaction

- Decision: Use non-spatial view interaction mode.
- Reason: The product is a 2D image workstation without 3D scene geometry.
- Evidence: appProductReadiness.viewInteraction.

### Interaction Ownership

- Decision: Panel controls own image library upload and background settings; toolbar owns zoom, pan, radar, center, theme, and undo/redo history.
- Reason: Clear separation between workspace viewport navigation and panel parameter edits.
- Evidence: appProductReadiness.interactionOwnership.

### Timeline

- Decision: Do not enable timeline.
- Reason: EffectsIO is a visual image workstation focused on still image treatments.
- Evidence: appSchema.panels.timeline is omitted.

### Layers

- Decision: Do not enable layers.
- Reason: Single-image workstation workflow focused on source image treatments.
- Evidence: appSchema.panels.layers is omitted.

### Controls

- Decision: Structure foundational schema into Image Library (`source-material`), Background (`background-section`), and Image Export (`image-export`).
- Reason: Delivers a minimal, compact, typography-focused UI giving canvas maximum visual prominence.
- Evidence: appSchema.panels.controls.sections and appControlSectionInventory.

### Export

- Decision: Provide standard Image Export infrastructure (PNG/JPG, 2K/4K/8K, export-image action).
- Reason: Allows users to export full-resolution images from the workstation.
- Evidence: appProductReadiness.exportIntent and exportRenderer in appComposition.tsx.

### Performance

- Decision: Assign responsiveness roles to image upload and background controls.
- Reason: Connects control state updates to canvas render pipeline calculations.
- Evidence: appSchema performanceRole declarations.

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

## Evidence

- Source reviewed: src/app/app-schema.ts, src/app/components/EffectsCanvas.tsx, src/app/app-composition.tsx, src/app/app-acceptance-data.ts.
- Contract applied: runtime-shell-required, canvas-no-app-ui, controls-product-coverage, output-export-required.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
