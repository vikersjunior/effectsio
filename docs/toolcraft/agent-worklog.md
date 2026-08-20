# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

EffectsIO is a visual-effects laboratory and reusable visual style preset workstation.

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

- Decision: Use Canvas 2D image processing pipeline inside EffectsCanvas component.
- Reason: Provides fast, high-quality pixel manipulation for halftone, duotone, screen print misregistration, posterization, and paper grain.
- Evidence: src/app/components/EffectsCanvas.tsx and src/app/effects/engine.ts.

### View Interaction

- Decision: Use non-spatial view interaction mode.
- Reason: The product is a 2D image-effects laboratory without 3D camera controls.
- Evidence: appProductReadiness.viewInteraction.

### Interaction Ownership

- Decision: Keep controls in panel and preview on canvas.
- Reason: Panel controls own preset selection and fine-tuning parameters while canvas previews live output.
- Evidence: appProductReadiness.interactionOwnership.

### Timeline

- Decision: Do not enable timeline.
- Reason: EffectsIO is a visual image effect workstation for still image outputs.
- Evidence: appSchema.panels.timeline is omitted.

### Layers

- Decision: Do not enable layers.
- Reason: The workstation applies style presets directly to source images.
- Evidence: appSchema.panels.layers is omitted.

### Controls

- Decision: Group controls into 5 workflow sections by entity.
- Reason: Organizes image upload, style presets, color tuning, effect module toggles, and fine-tuning controls logically.
- Evidence: appSchema.panels.controls.sections and appControlSectionInventory.

### Export

- Decision: Provide PNG image export.
- Reason: The workstation allows users to export processed visual outputs.
- Evidence: appProductReadiness.exportIntent.

### Performance

- Decision: Assign workload performance roles on pixel processing controls.
- Reason: Connects control parameter changes to canvas render pipeline calculations.
- Evidence: appSchema performanceRole declarations.

## Decision Trail

### Iteration 7 — EffectsIO visual-style workstation implementation

- Request: Build EffectsIO, a personal image-effects and visual-style workstation. Focus on reusable visual style presets (Chiwara Screen Print, Chiwara Blue/Cream, Editorial Halftone, Vintage Newspaper, Poster Print, Black & White Editorial, Custom Duotone, Parcelra Brand Treatment) and fine-tuning controls. Keep output strictly inside canvasContent.
- Task type: Schema, custom renderer, presets, export, acceptance, and performance.
- User-visible result: The canvas renders visual effects and exports PNG.
- Source/reference checked: User prompt.
- Reference inputs: None.
- Docs/contracts read: workflow.md, assembly-workflow.md, and performance.md.
- Contract rules applied: runtime-shell-required and output-export-required.
- View interaction intent: non-spatial; the product has no visible three-dimensional scene or model.
- Interaction ownership: No cross-surface product operations; panel controls own their distinct property edits.
- Decision: Render image effects using Canvas 2D pipeline inside EffectsCanvas mounted in ToolcraftAppComposition.canvasContent.
- Alternatives rejected: Hand-authoring separate UI controls or toolbar, using Tailwind CSS, modifying src/toolcraft runtime files.
- State/output mapping: Schema values feed EffectsCanvas.tsx and processImageEffect engine.
- Performance intent: ordinary-product-work
- Verification: pnpm verify:delivery.
- Risks: None; browser and performance gates cover the touched surfaces.

## Evidence

- Source reviewed: src/app/app-schema.ts and src/app/components/EffectsCanvas.tsx.
- Contract applied: runtime-shell-required and performance-coverage-levels.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `pnpm verify:delivery` narrative.

## Risks

- None: no known risk; tests and browser verification cover touched surfaces.
