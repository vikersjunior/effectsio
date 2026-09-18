# Phase 5 — Group Architecture

APPROVED: 2026-09-18

**Status:** APPROVED
**Approval basis:** Project owner approval in working session (2026-09-18)
**Authoritative Reference:** `docs/approvals/EffectsIO-Phase-5-Canonical-Group-Architecture-and-Product-Specification.md`

## 1. Canonical Composition Model (Model B)

The approved composition model for EffectsIO is the single-tier composition tree (Model B):

```text
Project
└── Frame
    └── items: (Layer | Group)[]
        ├── Layer → Source → Effect Stack
        ├── Group
        │   └── children: Layer[]
        │       ├── Layer → Source → Effect Stack
        │       └── Layer → Source → Effect Stack
        └── Layer → Source → Effect Stack
```

Where:
- **`Frame`** is the bounded composition/canvas.
- **`Frame.items: (Layer | Group)[]`** is the single authoritative composition and render stack in bottom-to-top order.
- **`Layer`** is the universal, independently composited visual element owning its Source, transform, fit, opacity, blend mode, visibility, lock state, and effect stack.
- **`Group`** is an organizational composition container owning `id`, `name`, `children: Layer[]`, `visible`, `locked`, and `collapsed`.
- **`Group.children: Layer[]`** is the sole representation of group membership via physical containment.

## 2. Key Invariants

1. **Single Composition Authority:** `Frame.items` is the sole source of truth for composition and ordering. `Frame.layers` and `Frame.groups` are not canonical parallel runtime structures.
2. **Single Membership Authority:** Group membership is strictly physical containment in `Group.children`. Foreign keys (`Layer.groupId`, `Group.layerIds`) are eliminated from canonical document state.
3. **Protected Canonical Backdrop:** `Frame.items[0]` must permanently remain a canonical procedural backdrop `Layer`. It can never be a `Group`, cannot belong to a Group, cannot be deleted, cannot be reordered, cannot be ejected, and remains locked.
4. **No Nested Groups:** Single-tier nesting only. `Group → Group` is strictly prohibited in Phase 1/5.
5. **No Non-Contiguous Groups:** A Group occupies exactly one root composition slot in `Frame.items`. Children cannot be separated by outside root layers while remaining members of that Group.
6. **Single Property Editing Authority:** `activeFrameId + activeLayerId` is the sole property editing target in `StudioContext`. `selectedGroupId` is prohibited from canonical Studio state.
7. **Transient Multi-Selection:** `selectedLayerIds: Set<string>` is strictly transient UI state for batch structural actions (Delete, Group, Move). It does not alter single-layer Inspector editing.
8. **Group Responsibility Boundary:** Groups are organizational composition containers. Phase 5 Groups do NOT possess `opacity`, `blendMode`, `effectStack`, `mask`, or independent shader passes.
9. **Deferred Group Transforms:** Collective spatial transforms for Groups are explicitly deferred to a subsequent Motion/Animation phase.
10. **Effective State Formulas:**
    - Effective Visibility: `effectiveVisible = group.visible && layer.visible` (does not overwrite child visibility values).
    - Effective Lock: `effectiveLocked = group.locked || layer.locked` (locks children against structural moves, reordering, deletion, and property editing; does not overwrite child lock values).
11. **Collapse Presentation State:** `group.collapsed` is Layers Panel presentation state (`Persisted: YES, Undo/Redo: NO, Rendering: NO`).
12. **Lifecycle Policies:**
    - **Ungroup:** Dissolves container; children retain order and occupy the Group's former root slot.
    - **Delete Group:** Atomic deletion of Group and all its children.
    - **Empty Groups:** Not supported. A Group cannot be created empty; removing the final child automatically prunes the Group.
13. **Structural DnD:** Drag-and-drop operations in the Layers Panel operate structurally (`moveRootItem`, `reorderGroupChild`, `moveLayerToGroup`, `ejectLayerFromGroup`), not via flat-index array splicing.
14. **Compositor Rendering:** The WebGL2 compositor renders Layers bottom-to-top by unrolling `Frame.items`. Invisible groups are short-circuited in a single branch without rendering children. No intermediate offscreen FBOs are introduced.
15. **Boundary Normalization:** Legacy documents containing `layers` and `groups` are normalized once at the storage/input boundary into `items: (Layer | Group)[]`.

## 3. Explicit Phase 5 Scope

- Canonical document model update to `Frame.items: (Layer | Group)[]` and `Group.children: Layer[]` in `src/types/frame.ts`.
- Input-boundary migration adapter in `src/types/frame.ts` (`normalizeFrameToUniversalModel`) and `src/storage/db.ts`.
- `StudioContext` structural actions: `createGroup`, `ungroup`, `deleteGroup`, `toggleGroupVisibility`, `toggleGroupLock`, `toggleGroupCollapse`, `renameGroup`, `moveRootItem`, `reorderGroupChild`, `moveLayerToGroup`, `ejectLayerFromGroup`.
- Transient multi-selection state (`selectedLayerIds`) for structural/batch actions.
- Layers Panel Group UI (`GroupRow`, single-tier indentation, folder icon, expand/collapse caret, item count badge, action menu) and multi-container `@dnd-kit` sortable integration.
- WebGL2 compositor unrolling loop respecting `group.visible`.
- Full-frame and selected-layer export inheriting group visibility.

## 4. Explicit Exclusions

- Nested Groups (`Group → Group`).
- Group-level collective spatial transforms (deferred to Motion/Animation phase).
- Group-level opacity, blend modes, effect stacks, masks, or isolated FBO passes.
- `selectedGroupId` as permanent Studio state.
- Mixed-value / multi-layer property editing in the Inspector.
- Ambient mutable `frame.layers` facade.

## 5. Implementation Authorization

Implementation planning and execution for Phase 5 are authorized strictly under the canonical direction defined in `docs/approvals/EffectsIO-Phase-5-Canonical-Group-Architecture-and-Product-Specification.md`, this approval record, and the reconciled canonical PRD. Source-code implementation must not diverge from this contract.
