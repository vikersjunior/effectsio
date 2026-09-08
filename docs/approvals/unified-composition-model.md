# Unified Composition Model — Approval

APPROVED: 2026-09-08

**Status:** APPROVED

**Approval basis:** Project owner approval

## Approved Model

The approved composition model is:

`Project → Frame → (Group) → Layer → Source`

Where:

* **Frame** is the composition/canvas boundary.
* **Layer** is the universal compositional object.
* **Source** generates the visual content/pixels for a Layer.
* **Effects** modify existing visual content.
* **Properties** control compositing and presentation behavior.
* **Groups** organize Layers without introducing another compositional primitive.
* **Background** is a visual role, not a Layer type.

## Approved Constraints

1. There is no user-facing `GenerativeLayer`.
2. There is no user-facing `BackgroundLayer`.
3. There is no user-facing `BackgroundStack`.
4. There is no user-facing `BackgroundItem`.
5. Procedural/generative content is represented through Sources attached to standard Layers.
6. Independent visual content must be represented as independent Layers.
7. A visual that needs independent position, order, blend, visibility, lock, transform, animation, or selection must be a Layer.
8. Groups may contain Layers but may not contain Groups in Phase 1.
9. Multi-selection remains transient interaction state.
10. Background is a role based on composition position and creative intent.
11. The active editing model is `activeFrameId` + `activeLayerId`.
12. The renderer must treat Layers as independently composited visual elements.

## Implementation Authority

This approval authorizes implementation planning and implementation of the approved Unified Composition Model, subject to the repository's normal engineering gates and verification requirements.

The canonical implementation/product requirements remain:

* `docs/buildkit/PRD.md`
* `docs/buildkit/architecture.md`
* `docs/buildkit/`
* the approved EffectsIO UI and Component System documentation

This approval record does not override those documents.
