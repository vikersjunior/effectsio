# EffectsIO UI System
## Canonical Product UI, Branding & Interaction System

**Status:** Canonical  
**Product:** EffectsIO  
**Companion:** `docs/design-system/effectsio-component-system.md`  
**Product source of truth:** `docs/buildkit/PRD.md`

---

## 1. Purpose

This document defines how EffectsIO should look, feel, and behave at the interface level.

It is intentionally separate from the product requirements document:

- `docs/buildkit/PRD.md` defines **what EffectsIO is and what it must do**.
- `docs/design-system/component-rules.md` defines the current repository component contract and operational design-system enforcement.
- This document defines the **visual and interaction direction**.
- `docs/design-system/effectsio-component-system.md` defines **which component should be used for which semantic job**.

The objective is to eliminate visual drift across future engineering and AI-agent sessions.

> EffectsIO should feel like one coherent creative instrument, not a collection of individually styled screens.

---

## 2. Product UI Character

EffectsIO is a general-purpose creative visual studio for building:

- image treatments
- generative visuals
- backgrounds
- posters
- social graphics
- covers
- campaign visuals
- animated visuals
- textures
- abstract artwork
- custom visual compositions

Hero backgrounds are one supported use case, not the product's information architecture.

### Visual character

- Dark-first
- Quiet
- Spacious
- Canvas-dominant
- Compact controls
- Strong hierarchy
- Restrained chrome
- High information density only where useful
- Distinctive pink brand accent
- Minimal visual noise
- Clear separation between artwork, controls, and application chrome

---

## 3. Appearance

### Default

**Dark**

### Supported

- Dark
- Light
- System

When `System` is selected, the application follows the operating-system/browser appearance preference.

The same semantic token system must drive all three appearances.

Dark is the primary reference used during visual QA.

---

## 4. Brand System

The visual identity uses a restrained pink accent against a near-black neutral interface.

### Semantic token families

At minimum:

```text
--background
--card
--surface
--surface-elevated
--surface-hover
--border
--border-subtle
--foreground
--muted-foreground
--primary
--primary-foreground
--link
--success
--warning
--danger
```

### Rules

- Use semantic tokens rather than page-specific colors.
- Do not hard-code dark colors when a semantic token exists.
- The pink accent communicates action, selection, focus, and important feedback.
- Avoid using the accent as a universal fill for every surface.

---

## 5. Desktop Workspace

The default desktop structure is:

```text
┌───────────────────────────────────────────────────────────────┐
│                         TOP NAV                               │
├──────────────┬─────────────────────────────────┬──────────────┤
│              │                                 │              │
│    ASSETS    │             CANVAS              │  INSPECTOR   │
│              │                                 │              │
│              │                                 │              │
├──────────────┴─────────────────────────────────┴──────────────┤
│                       CANVAS / TIMELINE                       │
└───────────────────────────────────────────────────────────────┘
```

### Default proportions

- Assets: **16%**
- Canvas: **68%**
- Inspector: **16%**

These are defaults; existing min/max constraints and user resizing remain valid.

### Structural seams

Use a restrained single-pixel seam treatment:

- right seam on Assets
- left seam on Inspector
- bottom seam on TopNav

Do not create double borders around a resizable seam.

---

## 6. Top Navigation

The top navigation is deliberately compact.

Preferred structure:

```text
EffectsIO   Project Name                           Account   Export
```

Possible future actions:

- project menu
- account menu
- settings
- appearance
- save/sync state
- share

### Dead-control rule

Never display a control that implies a workspace/state change if clicking it does nothing.

The former `Assets / Effects Studio / Preview` switcher must not remain as decorative chrome unless those modes become real functional workspaces.

---

## 7. Assets

The Assets panel is a library.

### Empty state

Show:

```text
Assets (0)

         Add media

Drag here, import from your computer

[ Import media ]
```

Keep it clean and compact.

Do not show:

- `Source Image`
- `Image Library`
- AI generation controls
- oversized instructional containers
- unnecessary metadata

### Populated state

Show:

```text
Assets (N)

[ Search ]

┌────┬────┬────┬────┐
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
├────┼────┼────┼────┤
│ +  │    │    │    │
└────┴────┴────┴────┘
```

Rules:

- 4 columns
- square tiles
- `object-cover`
- no filenames beneath thumbnails
- no dimensions beneath thumbnails
- `+` is part of the grid
- delete action appears on hover
- selection uses the canonical selection state
- search is compact and visible
- artwork remains the visual focus

---

## 8. Canvas

The canvas is the dominant visual surface.

### Default behavior

- no unnecessary guides
- no debug-looking overlays
- minimal persistent status text
- no always-on grid
- no unnecessary controls over the artwork

### Transparency preview

Transparency is useful because EffectsIO supports alpha-aware compositing and output.

It should be an optional View control, not permanent chrome.

### Grid

The viewport grid is optional.

Default:

**Off**

Possible location:

```text
View
├── Transparency
└── Grid
```

It should not compete with the artwork.

---

## 9. Canvas Dock

Keep the dock compact.

Primary controls may include:

- Pan
- Zoom
- Fit
- 1:1
- Compare
- View

Secondary display aids belong under View rather than permanently occupying the dock.

---

## 10. Inspector

The inspector should become contextual as the Frame/Layer model evolves.

### Design context

```text
Properties
Effects
Blend
Mask
Appearance
```

### Animate context

```text
Motion
Animatable properties
Timeline / keyframes when available
```

### Image layer

```text
Image
Transform
Appearance
Effects
Blend
Mask
```

### Generative layer

```text
Generative
Gradient
Pattern
Light
Noise
Blend
Motion
```

### Frame

```text
Frame
Size
Background
Content Area
Export
```

The inspector should expose the selected object's relevant controls rather than every possible control at once.

---

## 11. Effects

Effects are creative tools, not generic configuration forms.

Prefer:

- visual previews
- compact parameter groups
- immediate feedback
- meaningful grouping
- focused floating editors for complex effect-specific controls

Canonical controls should be used for:

- numeric values
- color
- toggles
- select values
- segmented options
- dialogs/popovers

---

## 12. Generative Visuals

Generative visuals are first-class content.

The system is intended to grow from the current six-mode floor into richer procedural composition.

Initial categories include:

- Gradient
- Pattern
- Light
- Glass
- Optics
- Waves
- Blobs
- Pixelate
- Dither
- Halftone
- Plaid
- ASCII
- Grain

A generative layer is a stack of independently enabled sub-layers.

---

## 13. Color & Gradient

Color is a first-class creative capability.

Use one coherent system for:

- effect colors
- palette presets
- gradient stops
- duotone
- background colors
- generative color values

Canonical components:

- `ColorControl`
- `PaletteControl`
- `GradientControl`
- `ColorValueControl`

Never create another page-specific palette or gradient editor.

---

## 14. Animation

Animation means changing a visual property over time.

Potential properties include:

- position
- scale
- rotation
- opacity
- color
- gradient angle
- gradient position
- noise amount
- pattern offset
- light position/intensity/radius
- wave amplitude/frequency
- particles
- blobs
- grain
- glitch intensity
- other meaningful supported properties

### Simple motion

Possible controls:

- Drift
- Flow
- Orbit
- Pulse
- Wave

Typical inputs:

- speed
- amount
- direction

### Complex motion

WebGL / shader animation handles procedural motion such as:

- noise evolution
- waves
- moving lights
- particles
- mesh distortion
- procedural patterns
- shader-driven effects

### UI motion

Use the approved Motion library for interface animation only:

- panel transitions
- dialog/popover transitions
- selection feedback
- subtle control choreography
- timeline UI

Motion must not replace shader animation or rendering timing.

---

## 15. Content-Safe Composition

Content-safe composition is a general creative capability.

It may reserve space for:

- text
- logos
- CTA elements
- product imagery
- screenshots
- subjects

Possible controls:

```text
Alignment
[ Left ] [ Center ] [ Right ]

Safe Area
──────●──────

Protection
ON
```

This must remain a composition aid, not a hero-only workflow.

---

## 16. Projects & Accounts

The product is local-first but account-enabled.

### Anonymous

Users can:

- create
- import
- experiment
- export locally
- use the local workspace

### Authenticated

Users can:

- save projects
- reopen work
- retain Looks
- synchronize settings
- access work across sessions/devices as cloud persistence becomes available
- share compositions
- create/remix published work

Local state should remain resilient when network operations fail.

---

## 17. Sharing & Remix

A shareable composition is a published composition snapshot.

Typical interaction:

```text
Published composition

[ Remix ]
```

Remix creates an independent editable copy.

It must preserve attribution/lineage where supported and must never mutate the original.

Privacy states should distinguish:

- Private
- Shared
- Remixable

Do not build a social-network UI unless explicitly required later.

---

## 18. Export

Export remains easy to reach but visually quiet.

Current capabilities include:

- PNG
- JPEG
- WebP
- native dimensions
- scaled dimensions
- custom dimensions
- transparent output
- batch export
- selected-asset export
- timeline-time evaluation for supported animated content

Animated export formats are separate future work.

---

## 19. Responsive Rules

When panels become narrow:

1. Preserve the canvas.
2. Preserve core functionality.
3. Reduce labels before removing important controls.
4. Use icon-only presentation where meaning remains clear.
5. Preserve accessible names/tooltips.
6. Allow inspector content to scroll.
7. Prefer canonical compact variants over custom shrinkage.

---

## 20. Accessibility

Every interactive component must maintain:

- semantic roles
- keyboard navigation
- visible focus
- accessible labels
- logical tab order
- disabled state semantics
- sufficient contrast

Never replace a semantic component with a clickable decorative element.

---

## 21. Component Reuse Rule

The default assumption is reuse.

Before creating a UI component:

1. Read the component system.
2. Search the repository.
3. Identify the semantic role.
4. Reuse the canonical component when one exists.
5. Extend it with a real variant when necessary.
6. Create a new component only for a genuinely new role.
7. Document the decision.

---

## 22. Owner-Provided Screens

The product owner has supplied actual EffectsIO screen designs.

Those screens are **approved visual direction**, not generic inspiration.

When implementing a corresponding surface:

- follow its hierarchy
- preserve its proportions
- preserve its information density
- preserve its visual restraint
- adapt only when functionality requires it

These screens are references for EffectsIO's own design language.

---

## 23. UI Governance

The UI is considered complete only when:

- the canonical component is used
- semantic behavior is correct
- styling uses EffectsIO tokens
- browser behavior is verified
- no duplicate primitive has been introduced
- the component documentation is updated when needed

A visually successful implementation that duplicates an existing primitive is not considered complete.

---

## 24. Source-of-Truth Relationship

```text
PRD.md
  ↓
Product requirements / sequencing

docs/design-system/effectsio-ui-system.md
  ↓
Visual + interaction direction

docs/design-system/effectsio-component-system.md
  ↓
Component ownership + semantic mapping

src/components/
  ↓
Actual implementation

docs/worklog.md
  ↓
Evidence + implementation history
```

No lower-level UI document may silently contradict the PRD.

---

## 25. Final Standard

> Every screen should feel intentionally designed by the same EffectsIO system.

Consistency should come from:

- hierarchy
- spacing
- typography
- component semantics
- borders
- surfaces
- selection states
- motion
- responsive behavior
- restrained branding
- canvas-first composition

The objective is a unified EffectsIO experience, not visual uniformity for its own sake.

---

## 26. Icon Sizing Consistency Rule

Use the canonical EffectsIO icon sizing conventions for shared UI actions. Equivalent icons at the same UI scale must use the same size. Do not introduce arbitrary icon dimensions for individual components. When Figma intentionally specifies a different size, follow Figma. Reuse existing icon components, tokens (`ICON_SIZES`), or variants whenever available.

- **Micro (11px)**: Micro actions, input clear triggers, asset hover badges.
- **Compact (12–13px)**: Input leading accessories, contextual help indicators.
- **Small (14px)**: Inline dropdown triggers, modal close triggers.
- **Medium (16px)**: Standard shell headers (+/−), panel actions (close, reset, reverse), row actions (eye, reorder).
- **Large (18px)**: Canvas Viewport Dock primary tool controls.
- **Extra Large / Hero (20–24px)**: Prominent modal headers, empty-state hero iconography.

Hit areas (button bounds such as `size-6`, `size-7`, or `!size-8`) are decoupled from icon glyph sizes. A larger clickable hit area must not inflate the icon glyph beyond its canonical scale.

