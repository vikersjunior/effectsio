# EffectsIO --- Phase 5 Canonical Group Architecture & Product Specification

Approved 18/09/2026

**Status:** Product decision approved by project owner\
**Phase:** 5 --- Group Composition\
**Purpose:** Canonical specification for reconciling the EffectsIO
composition model and implementing Groups without creating a second
composition architecture.

---

## 1. Executive Summary

EffectsIO is evolving from a composition model in which a Frame contains
only Layers into a model in which a Frame contains root composition
items that may be either a Layer or a Group.

The canonical Phase 5 model is:

```text
Project
└── Frame
    └── items[]
        ├── Layer → Source → Effect Stack
        ├── Group
        │   ├── Layer → Source → Effect Stack
        │   └── Layer → Source → Effect Stack
        └── Layer → Source → Effect Stack
```

A Group is an organizational composition container. It is not a
visual/effects-bearing Layer.

The Layer remains the fundamental independently editable visual element.
Sources remain attached to Layers. Effect stacks remain attached to
Layers. The Frame remains the composition/canvas. The WebGL2 compositor
ultimately renders Layers.

Phase 5 must therefore introduce structural grouping without changing
EffectsIO's underlying creative mental model.

---

# 2. Canonical Mental Model

## 2.1 Product hierarchy

```text
Project
└── Frame
    └── Root Composition Items
        ├── Layer
        │   └── Source
        │       └── Effect Stack
        │
        ├── Group
        │   └── Layer children
        │       ├── Source
        │       └── Effect Stack
        │
        └── Layer
            └── Source
                └── Effect Stack
```

## 2.2 Responsibilities

### Project

Owns the project-level document.

### Frame

Represents the canvas/composition.

### Layer

Represents an independently composited visual element.

A Layer may own:

- source
- transform
- fit
- opacity
- blend mode
- visibility
- lock state
- effect stack
- future animation properties

### Source

Produces or references the Layer's visual content.

Examples include:

- imported image source
- procedural source
- other approved source types

### Group

Organizes multiple Layers into a structural unit.

A Group may own organizational properties such as:

- id
- name
- visibility
- locked state
- collapsed UI state
- children

A Phase 5 Group does **not** own:

- opacity
- blend mode
- effect stack
- mask

Group-level spatial transforms are deferred to a later Motion/Animation
phase and must not be introduced as an accidental Phase 5 expansion.

---

# 3. Canonical Composition Data Model

The canonical Frame representation is:

```ts
type RootCompositionItem = Layer | Group;

interface Frame {
  id: string;
  name: string;
  dimensions: FrameDimensions;
  items: RootCompositionItem[];

  // Existing frame-level metadata as defined by the canonical model.
  activeLayerId?: string | null;

  createdAt: number;
  updatedAt: number;
}
```

The Group representation is conceptually:

```ts
interface Group {
  id: string;
  type: 'group';
  name: string;

  children: Layer[];

  visible: boolean;
  locked: boolean;
  collapsed: boolean;
}
```

The Layer remains the existing canonical Layer representation, with its
visual/source/effect properties.

## 3.1 Single source of truth

`Frame.items` is the sole authoritative composition structure.

The following must not exist on the canonical runtime Frame/Layer/Group
model:

```ts
frame.layers;
frame.groups;
layer.groupId;
group.layerIds;
```

Membership is represented by physical containment:

```text
Frame.items
└── Group
    └── Group.children
```

There must be no duplicated membership relationship that can become
inconsistent.

---

# 4. Root Composition Ordering

`Frame.items` is ordered according to the Frame's canonical compositing
order.

A Group occupies exactly one root composition slot.

Example:

```text
Frame.items

0  Backdrop
1  Layer A
2  Group G
3  Layer D
4  Layer E
```

Group G may contain:

```text
Group G
├── Layer B
├── Layer C
└── Layer D2
```

The Group remains one root composition item. Its children are rendered
as part of that Group's structural slot.

## 4.1 Atomic Group ordering

Moving a Group moves the Group and all children together.

A Group cannot be split by an outside Layer while those Layers remain
members of the Group.

Therefore:

```text
Group
├── A
├── B
└── C
```

cannot become:

```text
A
X
B
C
```

while still being the same Group.

---

# 5. Group Membership Rules

## 5.1 Physical containment

A Layer is a Group member only if it exists inside `Group.children`.

There is no separate membership ID.

## 5.2 No nested Groups

Phase 5 supports:

```text
Frame
├── Layer
├── Group
│   ├── Layer
│   └── Layer
└── Layer
```

It does not support:

```text
Group
└── Group
    └── Layer
```

Nested Groups are outside Phase 5 scope.

## 5.3 No non-contiguous Groups

Group membership is structurally contiguous.

A Layer must be explicitly moved/ejected out of a Group if it is to
exist outside that Group.

## 5.4 Backdrop cannot belong to a Group

The canonical backdrop is always:

```text
Frame.items[0]
```

and must be a Layer.

It cannot be:

- grouped
- moved into a Group
- deleted
- reordered above index 0
- ejected
- unlocked through ordinary UI operations

---

# 6. Group Lifecycle

## 6.1 Create Group

A Group is created from one or more selected eligible Layers.

Example:

```text
Layer A
Layer B
Layer C
```

becomes:

```text
Group
├── Layer A
├── Layer B
└── Layer C
```

The operation is atomic and produces one undo entry.

The backdrop is never eligible for grouping.

## 6.2 Empty Groups

Empty Groups are not supported.

There is no intentional "Create Empty Group" operation in Phase 5.

If the final child is removed from a Group, the Group is automatically
removed.

## 6.3 Delete Group

Delete Group means:

```text
Group
├── A
├── B
└── C
```

becomes:

```text
(no A, B, C, or Group)
```

The Group and all children are deleted as one atomic operation.

## 6.4 Ungroup

Ungroup means:

```text
Group
├── A
├── B
└── C
```

becomes:

```text
A
B
C
```

The children remain.

They are inserted into the root composition at the Group's former root
position while preserving their internal order.

Ungroup is one atomic undoable operation.

---

# 7. Selection Model

## 7.1 Existing editing authority remains

The authoritative property editing model remains:

```text
activeFrameId + activeLayerId
```

There must be no competing `selectedGroupId`.

## 7.2 Multi-selection

Phase 5 introduces transient:

```ts
selectedLayerIds: Set<string>;
```

This is UI state, not persisted composition state.

It is used for structural/batch actions such as:

- Group
- Delete
- Duplicate, if supported by the existing product action model
- Move
- batch visibility/lock actions, if implemented

## 7.3 Active Layer

When multiple Layers are selected, one Layer remains the active editing
target.

Example:

```text
selectedLayerIds = { A, B, C }
activeLayerId = A
```

The Inspector continues to operate on `activeLayerId`.

## 7.4 Group selection

A Group does not become a second active editing target.

When the user activates a Group row, the UI may select its child Layers:

```text
Group
├── A
├── B
└── C
```

results in:

```ts
selectedLayerIds = new Set(['A', 'B', 'C']);
activeLayerId = 'A';
```

Group-specific actions receive the Group ID directly from the UI:

```text
toggleGroupCollapse(groupId)
renameGroup(groupId, name)
toggleGroupVisibility(groupId)
toggleGroupLock(groupId)
deleteGroup(groupId)
ungroup(groupId)
```

No `selectedGroupId` state is required.

---

# 8. Inspector Behavior

The Inspector remains a Layer editing surface.

## 8.1 Single Layer

When one Layer is active:

```text
Inspector
├── Source
├── Effects
├── Transform
├── Opacity
├── Blend
└── other Layer properties
```

## 8.2 Multiple Layers

Phase 5 does not introduce a full multi-property editing system.

When multiple Layers are selected, the Inspector should clearly
communicate the multi-selection state and expose only approved
structural/batch actions.

It must not attempt to synthesize:

- mixed effect stacks
- mixed transform values
- mixed sources
- mixed blend modes
- mixed property values

unless a later product decision explicitly adds those capabilities.

`activeLayerId` remains the property editing target.

## 8.3 Group Inspector

A Group does not become a replacement for the Layer Inspector.

Group controls belong primarily in the Layers Panel and Group UI.

---

# 9. Visibility

Group visibility is inherited by its children.

Conceptually:

```ts
effectiveVisible = group.visible && layer.visible;
```

Example:

```text
Group: hidden
├── Layer A: visible
├── Layer B: visible
└── Layer C: visible
```

All three Layers are effectively hidden.

Turning the Group back on restores the Layers' individual visibility
values.

Toggling Group visibility must not mutate child Layer visibility
properties.

---

# 10. Locking

Group locking is inherited.

Conceptually:

```ts
effectiveLocked = group.locked || layer.locked;
```

A locked Group prevents structural and property editing of its child
Layers.

While effectively locked, a child cannot be:

- moved
- reordered
- ejected
- deleted individually
- edited through the Inspector

The Group itself may still support organizational operations such as:

- collapse/expand
- rename
- visibility
- lock/unlock

unless another explicit invariant prevents the operation.

Child `locked` values are not overwritten when Group lock changes.

---

# 11. Collapse State

`collapsed` is a Layers Panel presentation state.

Example:

```text
Group ▼
├── Layer A
├── Layer B
└── Layer C
```

can become:

```text
Group ▶
```

The Layers remain present and continue rendering.

Collapse:

- does not affect rendering
- does not affect composition order
- does not affect selection authority
- does not create an undo entry

Collapse state may be persisted so the editor can reopen with the user's
organizational view intact.

Therefore:

```text
Persisted: YES
Undo/Redo: NO
Rendering: NO
```

---

# 12. Drag and Drop

The Layers Panel must represent the actual composition tree.

Conceptually:

```text
Layers Panel

Backdrop
Layer A

Group
  Layer B
  Layer C

Layer D
```

DnD must operate through structural actions, not flat layer indices.

Required operation classes:

### Root item → root item

```text
moveRootItem(...)
```

Moves a root Layer or Group atomically.

### Child → sibling inside same Group

```text
reorderGroupChild(...)
```

Reorders only that Group's children.

### Root Layer → Group

```text
moveLayerToGroup(...)
```

Moves the Layer into the Group at an explicit child position.

### Group child → root

```text
ejectLayerFromGroup(...)
```

Removes the Layer from the Group and inserts it into the root
composition at the requested valid position.

### Group → root

A Group is moved using root-item semantics. All children move atomically
with it.

## 12.1 Forbidden ambiguous behavior

The UI must not interpret a flat index as sufficient information to
decide whether the user intends to:

- reorder a sibling
- move into a Group
- eject from a Group
- move an entire Group

Drop targets must communicate structural intent.

---

# 13. Rendering Architecture

The WebGL2 compositor must consume the canonical tree directly.

It must not depend on:

```ts
frame.layers;
```

or a flattened runtime projection.

Conceptually:

```text
for each item in frame.items:

  if Layer:
      render Layer

  if Group:
      if Group is hidden:
          skip children
      else:
          for each child in Group.children:
              render child
```

Each Layer continues through the normal rendering pipeline:

```text
Layer
→ Source
→ Effect Stack
→ Transform
→ Opacity
→ Blend
→ Composite
```

Phase 5 organizational Groups do not require group-specific FBOs.

Group visibility can short-circuit traversal.

Group-level transforms are deferred.

---

# 14. Active Layer Resolution

`activeLayerId` must resolve against the canonical tree.

The runtime needs a structural lookup equivalent to:

```ts
findLayerInItems(items, activeLayerId);
```

It must search:

1.  root Layers
2.  Group children

No flattened `frame.layers` property should be required.

The lookup is expected to be O(N) for the current editor scale and
should avoid unnecessary allocations.

---

# 15. Persistence

Canonical persistence must store the hierarchy directly.

Example:

```json
{
  "id": "frame-1",
  "items": [
    {
      "id": "backdrop",
      "type": "layer"
    },
    {
      "id": "group-1",
      "type": "group",
      "name": "Header Graphics",
      "visible": true,
      "locked": false,
      "collapsed": false,
      "children": [
        {
          "id": "layer-logo",
          "type": "layer"
        },
        {
          "id": "layer-title",
          "type": "layer"
        }
      ]
    },
    {
      "id": "layer-photo",
      "type": "layer"
    }
  ]
}
```

Canonical persistence must not contain:

```text
frame.layers
frame.groups
layer.groupId
group.layerIds
```

## 15.1 Legacy input normalization

Legacy documents may still contain the previous representation.

Normalization happens once at the input boundary:

```text
Legacy document
    ↓
normalizeFrameToUniversalModel()
    ↓
Canonical Model B
    ↓
Runtime
```

After normalization, legacy composition structures must not survive in
runtime state.

The normalization boundary must:

- recognize canonical `items`
- recognize legacy `layers`
- recognize legacy `groups` where necessary
- construct Group children from legacy membership
- remove legacy membership fields
- enforce the protected backdrop invariant
- reject or repair malformed nested Groups according to canonical
  normalization rules
- produce a structurally valid canonical Frame

---

# 16. Undo / Redo

Composition hierarchy changes are undoable.

Examples:

```text
Create Group       → one history entry
Ungroup            → one history entry
Delete Group       → one history entry
Move Group         → one history entry
Move Layer to Group → one history entry
Eject Layer        → one history entry
Reorder child      → one history entry
```

Transient UI state is not history:

```text
selectedLayerIds
activeLayerId changes caused only by selection
collapsed
```

The history snapshot must capture the complete `Frame.items` tree.

A single snapshot therefore captures:

- root Layers
- Groups
- Group children
- sources
- transforms
- effect stacks
- visibility
- lock state
- composition ordering

without relational group pointers.

---

# 17. Backdrop Invariants

The canonical backdrop remains a special protected Layer.

Required invariant:

```text
Frame.items[0]
    ↓
Layer
    ↓
canonical procedural backdrop
```

The backdrop:

- must always exist
- must remain at root index 0
- cannot be a Group
- cannot belong to a Group
- cannot be deleted
- cannot be reordered
- cannot be ejected
- remains locked

These rules must be enforced at the mutation boundary, not only by UI
controls.

Normalization must also repair malformed persisted documents so that the
invariant is restored.

---

# 18. API / Action Boundary

The old flat mutation API must not survive as a parallel composition
architecture.

Do not retain generic operations whose semantics depend on a flat
`Layer[]`, such as:

```text
reorderLayers(fromIndex, toIndex)
```

as the canonical Group-aware API.

Instead use explicit structural operations.

Minimum conceptual action set:

```text
addRootLayer(...)
addProceduralLayer(...)

updateLayer(layerId, updater)
updateLayerSource(layerId, updater)

removeLayer(layerId)

moveRootItem(fromIndex, toIndex)
reorderGroupChild(groupId, fromIndex, toIndex)

createGroup(layerIds)
ungroup(groupId)
deleteGroup(groupId)

moveLayerToGroup(layerId, groupId, insertIndex)
ejectLayerFromGroup(layerId, rootIndex)

renameGroup(groupId, name)
setGroupVisibility(groupId, visible)
setGroupLocked(groupId, locked)
setGroupCollapsed(groupId, collapsed)
```

Exact names may follow the existing codebase conventions, but the
semantics must remain structural.

---

# 19. `frame.layers` Compatibility Boundary

`frame.layers` must not exist as an ambient property on the canonical
Frame type.

Do not introduce:

```ts
get layers(): Layer[]
```

as a permanent compatibility API.

Reasons:

- it creates an implicit second composition representation
- it encourages future flat-array access
- it creates allocation and identity problems if implemented through
  flattening
- flat indices become structurally ambiguous
- mutations can target temporary projections rather than canonical
  state
- group state becomes invisible to consumers
- backdrop validation can be obscured by flattening

If a diagnostic or migration utility genuinely needs a flat list, it
must be an explicitly named standalone utility and must not be used for
rendering, mutation, persistence, or composition decisions.

---

# 20. UI Architecture

The Layers Panel should visually communicate the canonical tree.

Example:

```text
Layers

🔒 Background

    Layer A

▾   Group — Header
      Layer B
      Layer C
      Layer D

    Layer E
```

The exact visual design must follow the current EffectsIO UI System and
Component System.

Reuse existing primitives before creating new components.

A Group row should be treated as a shared reusable component rather than
an ad-hoc special row.

The UI should support:

- group expand/collapse
- group naming
- group visibility
- group lock
- group selection
- group delete
- group ungroup
- structural DnD

without introducing a competing selection architecture.

---

# 21. Phase 5 Scope

## In scope

- Canonical `Frame.items`
- Canonical `Group.children`
- Group creation
- Group deletion
- Ungroup
- Layer-to-Group movement
- Layer ejection
- Group movement
- Group child reordering
- Multi-layer selection
- Group visibility
- Group locking
- Group collapse
- Group persistence
- Group-aware undo/redo
- Group-aware WebGL2 traversal
- Group-aware Layers Panel
- Input-boundary legacy normalization
- Backdrop protection
- Removal of flat composition mutation APIs
- Documentation reconciliation

## Explicitly out of scope

- Nested Groups
- Group effect stacks
- Group opacity
- Group blend modes
- Group masks
- Group-specific shader pipelines
- Group-level FBO compositing
- AI features
- Video architecture
- Keyframe curve editors
- Full multi-selection property editing
- Group-level animation
- Group-level transforms

Group transforms belong to a later Motion/Animation decision unless
explicitly re-approved.

---

# 22. Engineering Invariants

The implementation must enforce these invariants.

### Invariant 1 --- One composition source of truth

```text
Frame.items
```

is the authoritative composition structure.

### Invariant 2 --- No relational membership

No:

```text
layer.groupId
group.layerIds
```

in canonical runtime state.

### Invariant 3 --- No ambient flat layer architecture

No:

```text
frame.layers
```

on canonical Frame.

### Invariant 4 --- Protected backdrop

```text
items[0]
```

is always the protected backdrop Layer.

### Invariant 5 --- No nested Groups

Group children are Layers only.

### Invariant 6 --- Group atomicity

A Group occupies one root composition slot and moves atomically.

### Invariant 7 --- Single editing authority

```text
activeFrameId + activeLayerId
```

remains the property-editing authority.

### Invariant 8 --- Multi-selection is transient

```text
selectedLayerIds
```

is not persisted.

### Invariant 9 --- Group visibility inheritance

Group visibility affects effective child visibility without overwriting
child values.

### Invariant 10 --- Group lock inheritance

Group lock affects effective child editability without overwriting child
lock values.

### Invariant 11 --- Empty Groups do not persist

A Group must contain at least one Layer.

### Invariant 12 --- Structural mutations are atomic

Grouping, ungrouping, deleting a Group, moving a Group, and moving
Layers across Group boundaries each produce one coherent history
operation.

---

# 23. Documentation Reconciliation

Before implementation begins, canonical documentation must agree with
this specification.

Required corrections include:

## PRD

Update the composition representation so that the canonical model is:

```text
Frame
└── items: (Layer | Group)[]
    └── Group.children: Layer[]
```

Remove or clarify diagrams that present:

```text
Frame → Groups[]
Frame → Layers[]
```

as parallel authoritative structures.

## Group transforms

Clarify that collective spatial transforms are deferred and are not part
of the Phase 5 organizational Group implementation.

## UI System / Component System

Document the Group row and its interaction states.

At minimum define:

- row height
- indentation
- expand/collapse affordance
- visibility control
- lock control
- group naming
- selection state
- child indentation
- DnD affordances
- multi-selection treatment

The actual values must follow the established EffectsIO design system
rather than inventing a separate visual language.

---

# 24. Testing Requirements

The implementation must test behavior, not merely types.

## Data model

Test:

- Layer root item
- Group root item
- Group children
- no nested Groups
- no duplicate membership
- empty Group removal
- backdrop invariant

## Selection

Test:

- single Layer selection
- multi-selection
- active Layer resolution
- Group interaction selecting children
- absence of `selectedGroupId`

## Group lifecycle

Test:

- create Group
- ungroup
- delete Group
- automatic empty Group removal
- grouping excludes backdrop

## Structural movement

Test:

- root Layer reorder
- Group reorder
- Group child reorder
- move root Layer into Group
- eject Group child
- move Group atomically
- locked Group rejects child structural mutation

## Visibility / locking

Test:

- Group visibility inheritance
- restoration of child visibility
- Group lock inheritance
- restoration of child lock behavior

## Persistence

Test:

- save canonical tree
- reload canonical tree
- legacy input normalization
- removal of legacy membership fields
- malformed hierarchy repair
- idempotent normalization

## Undo / redo

Test:

- Group creation
- Group deletion
- ungroup
- movement
- reordering
- child movement
- no history entry for collapse
- no history entry for transient selection

## Rendering

Test:

- root Layer rendering
- Group child rendering
- Group visibility
- compositing order
- Group atomic ordering
- effects remain independent per Layer
- WebGL2 compositor uses canonical tree

---

# 25. Browser QA Requirements

Browser verification must cover at minimum:

1.  App mounts without console errors.
2.  WebGL2 compositor is genuinely active.
3.  Backdrop remains protected.
4.  Add multiple Layers.
5.  Multi-select Layers.
6.  Create Group.
7.  Group expands/collapses.
8.  Group visibility works.
9.  Group lock works.
10. Move Group.
11. Reorder Group children.
12. Move a Layer into a Group.
13. Eject a Layer.
14. Ungroup.
15. Delete Group.
16. Inspector remains tied to active Layer.
17. Effects remain independently editable.
18. Reload preserves Group structure.
19. Undo/redo restores structural changes.
20. No hidden flat Background/Layer selection architecture appears.

Pointer-based DnD must be browser-tested, not only unit-tested.

---

# 26. Implementation Order

The implementation should proceed in this order:

### Stage 1 --- Documentation and type model

1.  Reconcile PRD/UCM.
2.  Update canonical Frame/Group types.
3.  Remove canonical `layers/groups/groupId/layerIds`.
4.  Establish normalization boundary.

### Stage 2 --- Pure composition helpers

Implement and test tree operations before wiring UI.

Examples:

```text
findLayerInItems
findItemInItems
createGroup
ungroup
deleteGroup
moveRootItem
reorderGroupChild
moveLayerToGroup
ejectLayerFromGroup
```

### Stage 3 --- Studio Context

Replace flat mutations with structural actions.

Maintain:

```text
activeFrameId
activeLayerId
selectedLayerIds
```

Do not add `selectedGroupId`.

### Stage 4 --- Rendering

Update WebGL2 compositor to traverse:

```text
frame.items
```

and Group children directly.

### Stage 5 --- Persistence

Persist the canonical tree.

Normalize legacy documents only at the input boundary.

### Stage 6 --- Layers Panel

Implement the hierarchical Group UI and structural DnD.

### Stage 7 --- Inspector / selection integration

Preserve single-Layer property editing and introduce only the approved
multi-selection behavior.

### Stage 8 --- Undo/Redo

Verify atomic structural history behavior.

### Stage 9 --- Browser QA

Test the actual editor end to end.

### Stage 10 --- Mechanical verification

Run the repository's required checks, including where applicable:

```text
pnpm test
pnpm typecheck
pnpm build
pnpm verify:approvals
pnpm graphify:update
```

Do not claim completion based only on tests/build. Browser verification
is required for UI behavior.

---

# 27. Migration Strategy

EffectsIO currently has no production-user migration burden requiring
preservation of an old public runtime API.

Therefore the preferred strategy is a clean core migration:

```text
Legacy input
    ↓
Boundary normalization
    ↓
Canonical Model B
    ↓
Runtime
```

The runtime should not carry the legacy model merely to avoid changing
internal consumers.

This is particularly important because EffectsIO's canonical
architecture is still being established.

Compatibility should be localized to the boundary rather than becoming
permanent application architecture.

---

# 28. Relationship to Existing Decision A

Phase 5 does not invalidate Decision A.

Decision A established that procedural backgrounds are canonical Layers:

```text
Frame
├── Layer → ProceduralSource(Solid)
├── Layer → ProceduralSource(Gradient)
├── Layer → ProceduralSource(Grid)
├── Layer → ProceduralSource(Dots)
└── Layer → ImageSource
```

Phase 5 simply allows those Layers to be structurally organized:

```text
Frame
├── Layer → ProceduralSource(Solid)
├── Group
│   ├── Layer → ProceduralSource(Gradient)
│   ├── Layer → ProceduralSource(Grid)
│   └── Layer → ImageSource
└── Layer → ProceduralSource(Dots)
```

A procedural background remains a Layer.

A Group does not become a background stack.

The old background-centric mental model must not return.

---

# 29. Relationship to the EffectsIO Creative Workflow

The broader product workflow remains:

```text
Import
  ↓
Compose
  ↓
Style
  ↓
Effects
  ↓
Animate
  ↓
Preview
  ↓
Export
  ↓
Save
  ↓
Share
  ↓
Remix
```

Groups strengthen the **Compose** stage.

They do not redefine EffectsIO as a hierarchy-management product.

Layers remain the objects users ultimately style, transform, affect,
animate, preview, and export.

---

# 30. Phase 5 Approval Boundary

This specification represents the approved product direction.

Implementation must still respect the repository's mechanical approval
system.

Before implementation is considered authorized by the repository:

```text
docs/approvals/phase-5-group-architecture.md
```

must contain the required literal approval format:

```text
APPROVED: YYYY-MM-DD
```

The date must reflect the actual project-owner approval date. It must
never be fabricated.

The coding agent must not self-approve the architecture.

---

# 31. Final Canonical Statement

The canonical EffectsIO composition model after Phase 5 is:

```text
Project
└── Frame
    └── items[]
        ├── Layer
        │   └── Source
        │       └── Effect Stack
        │
        ├── Group
        │   └── children[]
        │       ├── Layer
        │       │   └── Source
        │       │       └── Effect Stack
        │       └── Layer
        │           └── Source
        │               └── Effect Stack
        │
        └── Layer
            └── Source
                └── Effect Stack
```

**Frame is the composition.**

**Layer is the visual/effects-bearing element.**

**Source provides the visual content.**

**Group organizes Layers.**

**`Frame.items` is the sole composition source of truth.**

**`activeFrameId + activeLayerId` remains the property-editing
authority.**

**Groups do not become a second rendering/effects architecture.**

This is the canonical Phase 5 direction for EffectsIO.
