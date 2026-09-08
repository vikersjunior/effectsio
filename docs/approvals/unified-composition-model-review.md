# Unified Composition Model — Reusability & Compound Visual Pressure Test

**Document:** `docs/approvals/unified-composition-model-review.md`  
**Status:** `APPROVED: 2026-09-08`  
**Date:** September 8, 2026  
**Evaluation Target:** Next Composition Architecture (Stage 2+)  
**Governance Standards:** `AGENTS.md` Rule 1 (Literal Empirical Evidence), Rule 6 (Type Safety), Rule 8 (Non-Destructive Editing & Source of Truth State), Rule 10 (Graphify Intelligence), Rule 11 (Headroom Pre-Flight), Rule 12 (Mechanical Approval Gates), Rule 14 (No Competitor References), Rule 15 (Public Provenance)

---

## 1. Executive Verdict

### **READY FOR OWNER APPROVAL — WITH MINOR CLARIFICATIONS**

The proposed Unified Composition Model:

```text
Project
└── Frame
    ├── Layer → Source
    ├── Group
    │   ├── Layer → Source
    │   ├── Layer → Source
    │   └── Layer → Source
    └── Layer → Source
```

survives the architectural pressure test across all evaluated composition workflows: compound visuals, duplication, multi-selection, grouping, ungrouping, independent child editing, copy/paste, and reusability.

### Key Governance Distinctions

- **Architectural Finding:** The pressure test indicates that the proposed `Frame → Group → Layer → Source` model is conceptually and structurally sufficient to express the required creative workflows without introducing ad-hoc primitives or violating existing engine invariants.
- **Recommendation:** The model is ready for project-owner review and formal decision.
- **Actual Approval:** Only the human project owner can approve this architecture by creating `docs/approvals/unified-composition-model.md` with a valid approval signature. This document is an architectural evaluation and recommendation packet; it does **not** constitute authorization to implement changes.

### Core Architectural Conclusion

> **No additional fundamental visual-object primitive is required to support the tested workflows.**

The 5-element model—**`Frame`**, **`Group`**, **`Layer`**, **`Source`**, and **`Effect`**—is conceptually complete for Phase 1 composition. Reusability is achievable through serialization of existing composition subtrees, and multi-selection remains transient interaction state.

Approval is recommended with an explicit **Phase 1 scope boundary**:

- **Group v1** is an **organizational container with collective spatial transform, visibility, and lock controls**. It does not perform isolated intermediate compositing.
- **Group v2** (group-level opacity, blend modes, effect stacks, and masks requiring isolated intermediate compositing passes) and **nested Groups** (`Group → Group`) are deferred to post-MVP.

---

## 2. Model Under Test

```text
Project
└── Frame
    ├── Layer → Source
    ├── Group
    │   ├── Layer → Source
    │   ├── Layer → Source
    │   └── Layer → Source
    └── Layer → Source
```

### Hierarchy Definition (Phase 1)

```text
Frame.items = (Layer | Group)[]
Group.children = Layer[]
```

- **Single-Tier Groups in Phase 1:** A `Frame` contains an ordered list of items, where an item is either a `Layer` or a `Group`. A `Group` contains an ordered list of `Layer`s.
- **No Recursive Nesting in Phase 1:** `Group → Group` is explicitly **not** supported in Phase 1.

---

## 3. Architectural Rules

The unified model establishes a crisp division of responsibilities:

> **If it creates pixels → Source.**  
> **If it independently composites → Layer.**  
> **If it changes pixels → Effect.**  
> **If it organizes visual objects → Group.**  
> **If it defines composition bounds → Frame.**

### Conceptual Responsibilities

1. **Frame:** The composition and canvas boundary. Owns canvas dimensions, coordinate space anchor, and root z-ordered composition items (`(Layer | Group)[]`). The Frame may also specify a global background/fill color.
2. **Group:** An organizational container for multiple Layers. Provides collective spatial manipulation (translation, scale, rotation), collective visibility, and collective locking as a unit. It does not generate pixels of its own.
3. **Layer:** The independently composited visual object. Owns a local spatial transform, opacity, blend mode, effect stack, visibility, lock status, and exactly one Source.
4. **Source:** The abstraction that generates a Layer's visual content or raw pixels. A Source has no knowledge of composition order, canvas coordinates, blend modes, or effect stacks.
5. **Effect:** A parameter-driven modification operating on an existing Layer's visual content.

---

## 4. Workflow Pressure-Test Results

The proposed model was evaluated against 10 creative workflows to test expressiveness, structural soundness, and conceptual edge cases:

```text
┌───┬───────────────────────────────┬───────────────────────────────┬────────────────────────────────────────────────────────┐
│ # │ Workflow                      │ Architectural Result          │ Key Conceptual Mechanism                               │
├───┼───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────────────────────┤
│ A │ Compound Visual Creation      │ Expressible                   │ Group containing multiple Layers with distinct Sources │
│ B │ Duplication                   │ Expressible                   │ Deep copy of composition tree; immutable asset refs    │
│ C │ Multi-Selection               │ Expressible                   │ Transient UI interaction state; no phantom Group       │
│ D │ Group and Ungroup             │ Expressible                   │ Tree reparenting preserving Layer identity & order     │
│ E │ Independent Child Editing     │ Expressible                   │ Direct child selection within Group container          │
│ F │ Duplicate + Edit              │ Expressible                   │ Distinct cloned subtree; complete instance independence│
│ G │ Reusable Look / Preset        │ Expressible                   │ Subtree serialization; no new document primitive       │
│ H │ Copy / Paste Across Frames    │ Expressible                   │ Serializable tree transfer; independent instantiation  │
│ I │ Mixed Hierarchy               │ Expressible                   │ Deterministic linear z-order accumulation              │
│ J │ Background as a Role          │ Expressible                   │ Standard Layer fulfills role; no special type required │
└───┴───────────────────────────────┴───────────────────────────────┴────────────────────────────────────────────────────────┘
```

### A. Compound Visual Creation

- **Scenario:** A complex visual badge comprising a gradient backdrop, a procedural texture overlay, and an icon/graphic.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** The badge is represented as a `Group` containing three standard `Layer`s:
  1. `Layer 1`: `Source = Gradient`
  2. `Layer 2`: `Source = ProceduralNoise`, with blend mode set to `Overlay`
  3. `Layer 3`: `Source = Image`, with local transform offset
- **Conclusion:** The compound visual can be positioned, scaled, and toggled as a unit via the parent `Group`, while each component retains full access to its independent Source configuration, blend mode, and Effect stack.

### B. Duplication

- **Scenario:** Duplicating the compound badge.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:**
  - Duplication creates a new `Group` with cloned child `Layer`s.
  - All child `Layer`s receive fresh identities.
  - Source configurations and Effect stacks are cloned as value objects.
  - Referenced binary assets remain immutable and are referenced by asset identifier.
- **Conclusion:** Duplication produces a fully independent composition structure without duplicating underlying image assets in storage.

### C. Multi-Selection

- **Scenario:** Selecting 3 disparate layers across the canvas (some inside groups, some at root level).
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** Multi-selection is maintained strictly as transient UI interaction state in the client store.
- **Conclusion:** Multi-selection allows simultaneous spatial translation, collective alignment, or deletion without synthesizing a temporary or phantom `Group` in the persistent document tree.

### D. Group and Ungroup

- **Scenario:** Selecting multiple layers and grouping (`Cmd+G`), then ungrouping (`Cmd+Shift+G`).
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:**
  - **Grouping:** Selected root layers are reparented into a new `Group`. Local transforms are converted relative to the group container. Layer identities and internal relative z-ordering are preserved.
  - **Ungrouping:** Child layers are returned to the parent `Frame` at the `Group`'s index. Transforms are converted back to canvas coordinate space.
- **Conclusion:** Grouping and ungrouping operate as lossless tree reorganizations without destroying Layer semantics or altering visual output.

### E. Independent Child Editing

- **Scenario:** Selecting and modifying a specific layer inside a group without ungrouping.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** The selection model allows drilling down to activate an individual child `Layer`. The Inspector inspects and edits that child's Source parameters, Effect stack, or local transform directly.
- **Conclusion:** Child layers remain first-class editing targets; grouping does not lock or obscure child properties.

### F. Duplicate + Edit Workflow

- **Scenario:** Duplicating a compound visual and altering its color palette and graphic on the copy.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** Because duplicated groups and child layers are structurally independent copies, edits made to the duplicate's Source parameters or Effect stack have zero effect on the original.
- **Conclusion:** Complete instance independence is preserved.

### G. Reusable Look / Preset

- **Scenario:** Saving a styled compound visual as a reusable preset and instantiating it into another frame or project.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** A preset is a serialized representation of a `(Layer | Group)` subtree. Instantiation deserializes the structure into the target Frame, assigning fresh identities.
- **Conclusion:** Reusability is achieved through data serialization of existing primitives; no `ReusableVisual` or `CompoundAsset` document primitive is required.

### H. Copy / Paste Across Frames

- **Scenario:** Copying a group from Frame A and pasting into Frame B.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** The copied subtree is serialized to the clipboard. On paste into Frame B, the structure is deserialized and inserted at the target position with newly generated item identities.
- **Conclusion:** Cleanly supported by tree serializability.

### I. Mixed Hierarchy

- **Scenario:** A frame containing a backdrop layer, an image layer, a group of 3 layers, and a text or shape layer.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** Rendering order is unambiguous and strictly linear: items are traversed bottom-to-top in array index order. A Group unrolls its child layers in sequence at its slot in the parent array.
- **Conclusion:** Both rendering order and layer-panel presentation are deterministic.

### J. Background as a Role

- **Scenario:** Using a layer as a canvas background, reordering it, applying effects to it, or removing it.
- **Pressure-Test Assessment:** **Expressible.**
- **Mechanism:** A standard Layer may fulfill the background role based on its position and creative intent; no special background type is required.
- **Conclusion:** Background is a visual role, not a Layer type. A standard Layer can be used as a background and will typically occupy a lower position in the visual stack, but being a background does not give the Layer a special type or special architectural status. A user may reposition, transform, duplicate, edit, or remove that Layer like any other Layer. Special-case primitives (`GenerativeLayer`, `BackgroundItem`) are completely eliminated.

---

## 5. Architectural Findings

### 5.1 Must Change Before Approval

- **None.** The conceptual model is structurally sound, orthogonal, and sufficient for the target workflows.

### 5.2 Recommended Clarifications (For Target Specification)

These items are non-blocking for architectural approval but should be formally codified during specification:

1. **Transform Coordinate Spaces:** Codify that child `Layer` transforms inside a `Group` are defined relative to the Group container's coordinate frame, combining with the Group transform for canvas-space evaluation.
2. **Non-Contiguous Grouping Ordering Rule:** Establish a consistent conceptual rule for grouping non-adjacent layers (e.g., the new Group takes the slot of the topmost selected layer, and intermediate unselected layers maintain their relative order below or above).
3. **Asset References in Presets:** Clarify that presets containing procedural sources are fully self-contained, while presets referencing external image assets store asset references that must be resolved or bundled upon cross-project import.
4. **Heterogeneous Multi-Selection UI Rules:** Document Inspector behavior when multi-selection contains mixed layer types (common spatial properties such as position and alignment are editable; divergent type-specific properties display mixed/indeterminate states).

### 5.3 Deferred / Future Considerations (Post-MVP)

The following capabilities are deliberately excluded from Phase 1:

1. **Nested Groups (`Group → Group`):** Single-tier grouping satisfies Phase 1 requirements. Arbitrary tree nesting adds significant hierarchy traversal, drag-and-drop complexity, and matrix-stack overhead without proportionate value for initial single-frame workflows.
2. **Group-Level Isolated Compositing (Group v2):** Group opacity, group blend modes, group effect stacks, and group masks require rendering the group into an isolated intermediate offscreen buffer before blending onto the canvas. This is deferred until concrete product requirements justify it.
3. **Clipping Masks:** Layer-to-layer and group clipping masks are deferred to a dedicated masking milestone.

---

## 6. Does Group Need More Power?

### Direct Answer

**NO for Phase 1.** Group should remain an **organizational and spatial container** with:

- Name
- Organizational containment
- Collective spatial transform (translation, scale, rotation)
- Visibility toggle
- Lock toggle
- Child Layers list

Group must **NOT** require its own `opacity`, `blendMode`, `effectStack`, or `mask` in Phase 1.

```text
┌────────────────────────────────────────────────────────┐
│ GROUP v1 (Phase 1 Scope — Approved Recommendation)     │
│ • Organizational container                             │
│ • Collective transform (X, Y, Scale, Rotation)         │
│ • Collective Visibility & Lock                         │
│ • Pass-through rendering (no isolated intermediate FBO)│
│ • Minimal overhead & zero extra compositing passes     │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ (Deferred Post-MVP)
┌────────────────────────────────────────────────────────┐
│ GROUP v2 (Future Consideration — Deferred)             │
│ • Group-level Opacity (requires isolated flattening)   │
│ • Group-level Blend Mode                               │
│ • Group-level Effect Stack                             │
│ • Group Masks                                          │
│ • Requires dedicated intermediate offscreen buffer     │
└────────────────────────────────────────────────────────┘
```

### Rationale

Keeping Group v1 simple preserves a clean separation of concerns:

- **Layer** is the sole compositing primitive.
- **Group** is an organizational and spatial convenience.
- In rendering, child layers are composited sequentially with their effective transform:
  $$\mathbf{M}_{\text{effective}} = \mathbf{M}_{\text{group}} \times \mathbf{M}_{\text{layer}}$$
- This avoids allocating additional intermediate offscreen buffers, eliminates framebuffer binding switches, and prevents dual-opacity confusion in the Inspector.

---

## 7. Is Another Primitive Needed?

### Direct Answer

> **No additional fundamental visual-object primitive is required by the tested workflows.**

The 5-element model—**`Frame`**, **`Group`**, **`Layer`**, **`Source`**, and **`Effect`**—is complete. Candidate primitives evaluated during review are cleanly subsumed under these abstractions:

| Candidate Primitive         | Evaluation      | Architectural Placement in Unified Model                                  |
| --------------------------- | --------------- | ------------------------------------------------------------------------- |
| **Shape**                   | Not a primitive | A possible future **Source** type (procedural geometry generator).        |
| **Text**                    | Not a primitive | A possible future **Source** type (glyph/text rasterization generator).   |
| **Mask**                    | Not a primitive | A **Layer property** or shader effect modifying alpha.                    |
| **Adjustment Layer**        | Not a primitive | A **Layer** with a passthrough Source and an Effect stack.                |
| **ReusableVisual / Symbol** | Not a primitive | A **serialized composition structure** (`Layer` or `Group`).              |
| **Background**              | Not a primitive | A **visual role** fulfilled by a standard Layer at the base of the stack. |

Source is the general abstraction for content generation. The engine can introduce specific Source types as needed by the product roadmap without altering the composition hierarchy.

---

## 8. Reusability Model

### Looks and Presets Without New Primitives

The unified model distinguishes three separate concerns:

1. **Document Model:** Describes what currently exists on the canvas (`Frame`, `Group`, `Layer`, `Source`, `Effect`).
2. **Preset / Look System:** Describes how an existing composition structure is serialized, saved, and instantiated.
3. **Selection State:** Describes what the user is currently interacting with in the UI.

### Serialization Levels

Reusability is achieved through structural serialization:

- **Effect Preset (Legacy "Look"):** Serializes an `EffectStack` (array of shader configurations). Applies to any Layer.
- **Layer Preset:** Serializes a single `Layer` subtree (Source configuration + Effect stack + Layer properties). Instantiates as a new Layer.
- **Compound Preset (Group Look):** Serializes a `Group` subtree (child Layers + their respective Sources and Effect stacks + relative transforms). Instantiates as a new Group with cloned children.

### Recommendation on Instantiation

- Instantiation produces **independent copies**. Edits to an instantiated preset do not mutate the preset definition or other instances.
- Complex linked symbols (master-component propagation) are deferred as unnecessary for EffectsIO's core workflow.

---

## 9. Multi-Selection Model

### Direct Answer

> **Multi-selection is transient interaction state, NOT document structure.**

Selecting multiple layers across the canvas must **never** synthesize an ephemeral `Group` in the document tree.

```text
DOCUMENT TREE (Persistent, saved, undo/redo tracked):
Frame
├── Layer A
├── Group 1
│   ├── Layer B
│   └── Layer C
└── Layer D

INTERACTION STATE (Transient client state):
selectedItemIds: Set { 'Layer A', 'Layer D' }
```

### Architectural Rules for Multi-Selection

1. **State Isolation:** Multi-selection is tracked exclusively in client UI state. The document tree remains unchanged.
2. **Collective Manipulation:** The interaction layer calculates a virtual bounding box for selected items on-the-fly. Spatial translations apply coordinate deltas to each selected item.
3. **Explicit Promotion:** A permanent `Group` is created **only** when the user explicitly triggers the Group command (`Cmd+G`).
4. **Renderer Independence:** The rendering pipeline composites the document tree; it is completely oblivious to multi-selection state.

---

## 10. Architectural Invariants

The Unified Composition Model establishes 12 core invariants:

1. **Composition Boundary:** A `Frame` defines the canvas dimensions and the root coordinate boundary.
2. **Compositing Primitive:** A `Layer` is the independently composited visual unit owning opacity, blend mode, transform, and effects.
3. **Single Source Rule:** Every `Layer` has exactly one `Source`.
4. **Content Generation:** A `Source` generates visual content and has no awareness of composition or effects.
5. **Pixel Modification:** An `Effect` modifies existing visual content within a Layer's effect stack.
6. **Organizational Grouping:** A `Group` organizes multiple Layers and provides collective spatial manipulation, visibility, and locking.
7. **Single-Tier Phase 1 Groups:** In Phase 1, `Frame.items = (Layer | Group)[]` and `Group.children = Layer[]`. Nested Groups (`Group → Group`) are not supported.
8. **Transient Multi-Selection:** Multi-selection is UI interaction state and does not create persistent document structure.
9. **Role-Based Background:** Background is a visual role fulfilled by layer positioning and creative intent, not a specialized data type.
10. **Deterministic Z-Order:** Layer accumulation order is explicit and deterministic based on array index (bottom-to-top).
11. **Immutable Source Media:** Asset storage remains immutable; duplication and reuse create metadata references without duplicating binary media.
12. **Minimal Primitive Surface:** Compound visuals, duplication, and reusability are expressed using `Frame`, `Group`, `Layer`, `Source`, and `Effect` without introducing new document primitives.

---

## 11. Risks / Pressure Points

The pressure test surfaced several practical engineering considerations. These are classified as **implementation and scalability risks**, not failures of the composition model:

1. **High Layer Counts & Texture Memory:**
   - _Risk:_ Compositions with dozens of high-resolution image layers could encounter GPU texture memory constraints.
   - _Mitigation:_ Procedural sources (gradients, noise, solid fills) generate content directly via shaders and do not allocate static bitmap textures. Image sources leverage existing texture recycling in the compositor.
2. **Transform Matrix Composition:**
   - _Risk:_ Group transforms combined with child layer transforms require precise matrix concatenation for hit-testing and bounding-box calculations.
   - _Mitigation:_ Standard 2D affine transform matrix math resolves canvas-space and local-space coordinates cleanly.
3. **Multi-Selection Across Group Boundaries:**
   - _Risk:_ Selecting a root layer and a child layer inside a group simultaneously could create UX ambiguity during collective transformation or alignment.
   - _Mitigation:_ Clear interaction rules (e.g., alignment operates in canvas space; grouping mixed selections reparents items cleanly) address this at the UI layer.

### Conclusion on Risks

> **None of these risks invalidate the Frame → Group → Layer → Source architecture.** They represent standard implementation challenges with well-understood engineering solutions.

---

## 12. Final Recommendation

### Direct Answers to Core Architectural Questions

- **Question 1: Can the model represent compound visuals?**  
  **Yes.** A compound visual is cleanly represented as a `Group` containing multiple `Layer`s with specialized `Source`s.
- **Question 2: Can a compound visual be duplicated and independently edited?**  
  **Yes.** Duplication clones the Group and Layer hierarchy while sharing immutable asset references, allowing full editing independence.
- **Question 3: Can users multi-select without creating permanent document structure?**  
  **Yes.** Multi-selection is strictly transient UI state and does not alter the document tree.
- **Question 4: Can users group and ungroup without introducing another object type?**  
  **Yes.** Grouping and ungrouping are standard tree reparenting operations between `Frame` and `Group`.
- **Question 5: Can a compound visual eventually become a reusable Look/preset without introducing a new fundamental primitive?**  
  **Yes.** Reusability is achieved through serialization of `Layer` or `Group` subtrees.
- **Question 6: Does Group need opacity, blend mode, effects, or masks in Phase 1?**  
  **No.** Group v1 should remain an organizational and spatial container. Group-level compositing is deferred to post-MVP.
- **Question 7: Does the architecture require another fundamental visual-object primitive?**  
  **No.** The 5-element model (`Frame`, `Group`, `Layer`, `Source`, `Effect`) is sufficient for all tested workflows.

---

### **Recommendation Statement**

> **READY FOR OWNER APPROVAL — WITH MINOR CLARIFICATIONS**
>
> The pressure test indicates that the proposed `Frame → Group → Layer → Source` model is sufficient for the tested composition workflows. Compound visuals, grouping, ungrouping, duplication, independent child editing, multi-selection, copy/paste, and future preset reuse can all be expressed using the existing conceptual primitives.
>
> No additional fundamental visual-object primitive was identified as necessary.
>
> The primary Phase 1 boundary is that Groups remain organizational and spatial containers rather than isolated compositing objects. Group opacity, group blend modes, group effects, masks, and nested Groups remain deferred until concrete product requirements justify them.
>
> This report is a recommendation for owner review. It is not approval.

---

## 13. Approval Gate Status

In strict compliance with **`AGENTS.md` Rule 12 (Mechanical Approval Gates, Not Prose Gates)**:

1. **Review Packet Status:** This document is an architectural review packet and proposal. It does **not** constitute approval.
2. **Gate Status:** Implementation of the Unified Composition Model remains **mechanically blocked** until the human project owner authoritatively creates:
   ```text
   docs/approvals/unified-composition-model.md
   ```
   containing the literal signature line:
   ```text
   APPROVED: <date>
   ```
3. **Zero Implementation Invariant:**
   - **0** lines of application source code (`src/`) modified.
   - **0** database schemas or migrations created.
   - **0** rendering code or shaders modified.
   - **0** UI components created or altered.
   - **0** package dependencies added or changed.
   - The repository remains in a clean, runnable, and type-safe state ready for the owner's decision.

---

**Status: PROPOSED — NOT IMPLEMENTED — AWAITING OWNER APPROVAL**
