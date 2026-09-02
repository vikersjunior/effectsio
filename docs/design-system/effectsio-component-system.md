# EffectsIO Component System
## Canonical Component Inventory, Ownership & Usage

**Status:** Canonical  
**Product:** EffectsIO  
**Companion:** `docs/design-system/effectsio-ui-system.md`  
**Product source of truth:** `docs/buildkit/PRD.md`

---

## 1. Purpose

This document is the canonical answer to:

> **Which component should an EffectsIO developer or AI agent use for this UI need?**

It prevents duplicated primitives, inconsistent styling, and semantic misuse.

EffectsIO owns the implementation under `src/components/`.

---

## 2. Component Layers

```text
Foundation
    ↓
Primitives
    ↓
Controls / Composites
    ↓
Product Components
```

### Foundation

The approved generic UI foundation, including shadcn components when a real gap exists and the repository's selected Base UI-compatible implementation is appropriate.

### Primitives

Reusable low-level building blocks.

### Controls / Composites

Reusable EffectsIO controls composed from primitives.

### Product Components

Application-specific compositions.

---

## 3. Selection Algorithm

Before adding a component:

1. Identify the semantic role.
2. Search this document.
3. Search `src/components/ui/`.
4. Check whether the existing component already satisfies the need.
5. Extend the existing component if only a reusable variant is missing.
6. Introduce a new component only when the semantic role is genuinely new.
7. Verify the result in a browser when visual behavior matters.
8. Update documentation for durable changes.

### Critical rule

> **Never create a second component just because the existing component needs a small visual adjustment.**

Prefer a justified variant.

---

## 4. Canonical Component Map

| Semantic need | Canonical component | Layer |
|---|---|---|
| Primary action | `Button` | Primitive |
| Secondary action | `Button` | Primitive |
| Icon action | `Button` | Primitive |
| Text input | `Input` | Primitive |
| Form field | `Field` | Primitive |
| Field label | `FieldLabel` | Primitive |
| Boolean value | `BooleanControl` / `Switch` | Control / Primitive |
| Numeric value | `SliderControl` | Control |
| Select value | `SelectControl` | Control |
| Mutually exclusive options | `ToggleGroup` / `SegmentedControl` | Primitive / Control |
| Content navigation | `Tabs` | Composite |
| Tooltip | `Tooltip` | Primitive |
| Popover | `Popover` | Primitive |
| Dialog | `Dialog` | Composite |
| Metadata | `Badge` | Primitive |
| Divider | `Separator` | Primitive |
| Scroll continuation | `ScrollFade` | Primitive |
| Color input | `ColorControl` | Control |
| Preset palette | `PaletteControl` | Control |
| Gradient editor | `GradientControl` | Control |
| Individual gradient color value | `ColorValueControl` | Control |
| Editable slider value | `EditableSliderValueLabel` | Primitive |
| Outer panel surface | `PanelSurface` | Panel |
| Panel header | `PanelHeader` | Panel |
| Panel content | `PanelSection` | Panel |
| Panel icon action | `PanelIconButton` | Panel |
| Standard control grouping | `ControlSection` / `ControlList` | Layout |
| Asset library | `AssetPanel` | Product |
| Canvas | `CanvasViewport` | Product |
| Inspector | `InspectorPanel` | Product |
| Looks | `LooksBrowser` | Product |
| Backdrop / background | `BackgroundControls` | Product |
| Timeline | `TimelineBar` | Product |
| Effect browser | `EffectBrowserModal` | Product |
| Save Look | `SaveLookModal` | Product |
| Export | `ExportModal` | Product |
| Top navigation | `TopNav` | Product |

---

## 5. Buttons

### `Button`

Use for:

- primary actions
- secondary actions
- icon actions
- destructive actions
- toolbar actions
- compact actions

Use the canonical variants and sizes.

Avoid raw `<button>` when `Button` already satisfies the need.

---

## 6. Inputs & Fields

Canonical components:

- `Input`
- `Label`
- `Field`
- `FieldLabel`
- `FieldSet`
- `FieldError`

Use for:

- search
- text entry
- names
- dimensions
- hex values
- metadata
- form controls

---

## 7. Slider System

Canonical components:

- `Slider`
- `SliderControl`
- `EditableSliderValueLabel`

Use for:

- effects
- opacity
- intensity
- spacing
- angles
- animation speed
- animation amount
- other numeric properties

Do not create page-specific range controls.

---

## 8. Selection Controls

### `Tabs`

Use for switching between genuine content panels or contexts.

Examples:

- Design / Animate
- Inspector content contexts

A tab must have actual associated panel content.

### `ToggleGroup`

Use for mutually exclusive options within the current context.

Examples:

- export formats
- backdrop types
- category filters
- other mode/value selection

### `SegmentedControl`

Use when the interaction is a compact segmented option selector.

### Rule

Do not choose between these components because one "looks nicer."

Choose by semantic meaning.

---

## 9. ButtonGroup

Use only for physically connected compound controls.

Examples:

- color swatch + hex input
- tightly joined action clusters

Never use `ButtonGroup` as a substitute for `Tabs`.

Never use `ButtonGroup` as a substitute for a semantic selection control.

---

## 10. Color Components

### `ColorControl`

Use for:

- custom color selection
- color editing
- swatch + picker + hex behavior

### `PaletteControl`

Use for:

- preset color palettes
- shade selection
- rapid color selection

### `ColorValueControl`

Use for:

- an individual editable color value inside a larger compound control
- gradient stop rows
- similar structured values

Do not create another custom swatch or palette system.

---

## 11. Gradient System

### `GradientControl`

Use for all editable gradients.

Responsibilities may include:

- type
- angle
- stops
- stop positions
- stop colors
- stop opacity
- add/remove stop
- drag interaction

Do not create separate page-specific gradient editors.

---

## 12. Panels

### `PanelSurface`

Outer panel surface.

### `PanelHeader`

Panel heading and utility actions.

### `PanelSection`

Grouped panel content.

### `PanelIconButton`

Compact panel action.

Page-level layout components must use these where their semantic roles match.

---

## 13. Control Layout

Canonical grouping components:

- `ControlSection`
- `ControlList`
- `ControlInlineGroup`
- `ControlItem`
- `ControlFieldLabel`

Use these to maintain the established spacing rhythm.

Avoid adding another one-off control-layout system.

---

## 14. Overlays

### `Tooltip`

Short contextual help and icon action explanation.

### `Popover`

Compact contextual editors and floating tool surfaces.

### `Dialog`

Focused workflows requiring modal attention.

Examples:

- effect browser
- save Look
- export
- future account/project/share workflows

---

## 15. Feedback

### `Badge`

Use for compact metadata:

- counts
- status
- categories
- small contextual state

Badges are subordinate to primary actions.

Do not turn metadata into oversized decorative UI.

---

## 16. Assets

### `AssetPanel`

Owns:

- library shell
- empty state
- populated state
- search
- 4-column thumbnail grid
- add tile
- selection
- delete interaction

### Grid rules

- square tiles
- `object-cover`
- no filename captions
- no dimensions
- integrated `+` tile
- shared selection treatment

---

## 17. Canvas

### `CanvasViewport`

Owns:

- visual canvas presentation
- pan
- zoom
- fit
- split view
- canvas dock
- timeline integration where applicable
- presentation-only state

Viewport state must remain separate from creative state.

---

## 18. Inspector

### `InspectorPanel`

Owns contextual editing.

It composes canonical controls rather than inventing page-specific primitives.

Possible contexts:

- Image
- Generative
- Frame
- Design
- Animate

---

## 19. Effects

Effect-specific editors are allowed when the interaction is genuinely specific to the effect.

Examples:

- duotone
- gradient
- halftone
- screen print
- ASCII
- advanced color mapping

Inside those editors, reusable controls must still use canonical EffectsIO components.

---

## 20. Generative Controls

Generative layers may use reusable product-specific controls for:

- Gradient
- Pattern
- Light
- Noise
- Waves
- Blobs
- Glass
- Optics
- Dither
- Halftone
- Plaid
- ASCII
- Grain

Only create a reusable new control when it represents a real recurring semantic role.

---

## 21. Timeline

### `TimelineBar`

Owns:

- play/pause
- reset
- step
- scrub
- timecode
- loop
- playback speed

Use canonical Button and Slider components.

The timeline UI must not own creative rendering logic.

---

## 22. Looks

### `LooksBrowser`

Owns:

- Look browsing
- filtering
- previews
- Apply Look
- batch Apply Look
- Save as Look entry

Do not duplicate asset-library responsibilities inside LooksBrowser.

---

## 23. Background Controls

### `BackgroundControls`

Owns:

- backdrop/background type
- preset palette
- custom color
- gradients
- framing
- pattern settings
- shadow

Use the canonical color and gradient components.

---

## 24. Product Components

Product-specific components are expected and permitted when they represent application-level responsibilities.

Examples:

- `AssetPanel`
- `CanvasViewport`
- `InspectorPanel`
- `LooksBrowser`
- `TimelineBar`
- `BackgroundControls`
- `EffectBrowserModal`
- `SaveLookModal`
- `ExportModal`
- future `ProjectMenu`
- future `AccountMenu`
- future `ShareDialog`
- future `RemixDialog`
- future `GenerativeLayerEditor`

The rule is:

> Product-specific composition is allowed. Duplicate generic primitives are not.

---

## 25. shadcn Policy

Use shadcn only when EffectsIO has a genuine generic UI gap.

Before introducing one:

1. Search the existing EffectsIO component system.
2. Confirm that the need is not already covered.
3. Confirm that the new component is generic rather than a duplicate creative control.
4. Add only the required source.
5. Adapt it to EffectsIO tokens.
6. Document it.

Do not introduce a shadcn component merely because it exists in the catalog.

---

## 26. Motion Policy

Use Motion for interface behavior:

- entrance/exit
- panel transitions
- popovers/dialogs
- subtle control feedback
- hover/press transitions
- timeline UI choreography

Do not use Motion to replace:

- WebGL animation
- `u_time`
- shader timing
- creative rendering

---

## 27. Forbidden Patterns

Do not create:

```text
CustomButton
SmallButton
ToolbarButton
PanelButton
CustomBadge
CustomToggle
CustomSlider
ColorPicker2
GradientPicker2
CustomTabs
```

when the existing semantic component already covers the need.

Do not:

- use buttons as tabs
- use button groups as selection controls
- create a second color palette
- create a second gradient editor
- create page-specific modal primitives
- create page-specific panel primitives
- use raw interactive HTML when the canonical component exists

---

## 28. Variants vs New Components

Create a **variant** when:

- semantic role is unchanged
- interaction model is unchanged
- only density, visual state, or presentation changes

Create a **new component** when:

- semantic role changes
- interaction model changes
- responsibility is genuinely new
- the component is product-specific and reusable

---

## 29. AI-Agent Implementation Contract

Every UI coding agent must:

1. Read `docs/buildkit/PRD.md`.
2. Read `docs/design-system/effectsio-ui-system.md`.
3. Read this component document.
4. Search the repository before creating a component.
5. Prefer the canonical component.
6. Reuse EffectsIO tokens.
7. Use shadcn only for verified generic gaps.
8. Use Motion only for UI motion.
9. Verify visually in a real browser when practical.
10. Record meaningful durable changes in the worklog.
11. Never fabricate browser or tool usage.

Graphify and Headroom remain engineering/development tooling governed by `AGENTS.md`; they are not product UI components.

---

## 30. Verification

For component changes:

```bash
pnpm typecheck
pnpm test
pnpm build
```

When governance applies:

```bash
pnpm verify:approvals
```

For cross-cutting architectural/UI changes:

```bash
pnpm graphify:update
```

Browser verification should confirm actual rendered behavior, not expected behavior inferred from code.

---

## 31. Source-of-Truth Relationship

```text
docs/buildkit/PRD.md
  ↓
Product requirements

docs/design-system/effectsio-ui-system.md
  ↓
Visual + interaction rules

docs/design-system/effectsio-component-system.md
  ↓
Component ownership + usage

src/components/
  ↓
Actual implementation

docs/worklog.md
  ↓
Evidence + history
```

When documents disagree, higher-level product requirements win over implementation convenience.

---

## 32. Final Principle

> **One semantic job, one canonical component.**

For every interactive element, EffectsIO should be able to answer:

> "What is the canonical component for this?"

If that answer is unclear, update the component system before another one-off implementation is created.
