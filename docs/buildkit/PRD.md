# EffectsIO — Product Requirements Document

**Document:** `PRD.md`  
**Product:** EffectsIO  
**Repository:** `vikersjunior/effectsio`  
**Status:** **Canonical Product Definition — v1.1 Beta, Creative Studio Direction**  
**Last updated:** August 2026  
**Supersedes:** Previous PRD / v3 draft. This is the replacement source of truth; do not maintain competing PRD documents.

---

## 0. Revision Note — Read This First

EffectsIO is now defined as a **general-purpose creative visual studio**, not a hero-background builder or a filter-only image editor.

The product centers on the creation of **visual compositions**. Hero backgrounds are one important use case among many, alongside social graphics, posters, covers, presentation visuals, image treatments, textures, abstract artworks, campaign visuals, animated visuals, and other creative outputs the user may invent.

This revision keeps the successful v1 rendering, effects, WebGL, export, persistence, animation-clock, and functional MVP foundations, while making the product direction more explicit for the v1.1 Beta architecture.

### Decisions locked by this revision

1. EffectsIO is **frame-first and layer-first** for the next architecture stage.
2. A frame can exist without an uploaded image.
3. A layer can be an image layer or a generative layer; AI-generated layers remain parked.
4. A generative layer is a **stack of independently enabled generative sub-layers**, not a single background type.
5. Blend mode exists at two levels: **layer-level** and **per-effect/per-generative-sub-layer level**.
6. A Look snapshots the **entire composition**, not only an effect stack.
7. Animation means changing visual properties over time. Users animate gradients, light, noise, waves, particles, glitch and other supported visual properties rather than treating “effect animation” as a separate concept.
8. Animation has two implementation tiers: a cheap tier for simple gradient motion and a GPU/WebGL tier for procedural motion.
9. Keyframe curves remain deferred until the generative-layer system has enough real animatable properties to justify them.
10. AI generation remains parked. Stock-image sourcing is the nearer-term way to help users start from existing content.
11. A global effect mask ships before per-effect masks.
12. **shadcn** is the approved general-purpose UI foundation for genuine gaps, using its source-owned Base UI approach. It supplements EffectsIO's native component primitives rather than replacing them wholesale.
13. **Motion** (`motion.dev`) is the approved UI animation library for interface motion. It is separate from shader animation.
14. **EffectsIO owns its native component system and UI design tokens.**
15. The primary appearance is **dark**. Users may choose **Dark, Light, or System** in account/application settings; System follows the OS/browser preference.
16. EffectsIO remains **local-first** for fast local work, while authenticated users can save projects to their account and access them across sessions/devices as cloud persistence is introduced.
17. Published compositions can have **shareable links** and can be **remixed** by other users. Remix creates an independent copy rather than mutating the original.
18. Sharing/remixing is a product growth mechanism, but EffectsIO is **not** intended to become a general-purpose social network.

---

## 1. Product Definition

EffectsIO is a creative studio for building **images, backgrounds, and visual compositions** from layers — photographs, stock imagery, and rich generative visuals — combined with a composable effects system, blending, optional animation, and export.

### Core experience

> **Start a frame → Add layers → Experiment with effects and generative visuals → Blend and combine → Refine → Animate → Save/Share → Export**

### What EffectsIO is for

A user may use EffectsIO to create:

- a website hero background
- a social graphic
- a poster or cover
- a presentation visual
- a campaign graphic
- a product backdrop
- an abstract generative artwork
- an image treatment
- an animated background
- a texture or pattern
- a branded visual composition
- another visual output that fits the same composition model

Hero creation is therefore a **use case and optional starting template**, not the product's central information architecture.

---

## 2. Vision

EffectsIO should feel like a **creative instrument**, not a configuration panel.

A user should be able to open the app with nothing and still begin creating. They should be able to start from a blank frame, import an image, select stock imagery when available, or reuse/remix an existing composition.

The product should reward experimentation:

> **Bring something in. Or start from nothing. Build, blend, animate, and make it yours.**

---

## 3. Product Category

EffectsIO sits between:

- traditional image editors
- simple filter/effects tools
- generative visual studios
- lightweight motion/visual composition tools

Key technical paradigms and interaction patterns synthesized into EffectsIO:

- **Generative Sub-layer Stacking**: Generative layers operate as composable stacks of simultaneous sub-layers (gradients, noise fields, optical distortions, patterns, ASCII) rather than mutually exclusive choices, paired with lossless human-readable URL state serialization for instant sharing.
- **Master Composition Masking**: Framing presets (`Free, 16:9, 4:3, 1:1, 9:16, 21:9`) paired with a global master brush mask applied across the composite stack.
- **Procedural Shader Engines & Client-Side Media Export**: Multi-algorithm procedural shader generators, interactive pointer physics, and zero-server client-side 30fps MediaRecorder / WebCodecs video and image encoding.
- **Stackable Effect Taxonomy & Preset Looks**: 50+ modular creative effects across 7 categories (Adjustments, Color, Stylize, Texture, Distortion, Detail, Transform), snapshot Look recipe sharing, and multi-format export.
- **Procedural Pattern Library**: Curated library of 250+ CSS and gradient pattern recipes across geometric, gradient, decorative, and effect categories.
- **Bicubic Mesh Gradients**: Mathematical Bicubic Hermite Ferguson patch grids evaluated on CPU with analytical OKLab/CIELAB color space evaluation in fragment shaders for smooth hue transitions.
- **Multi-Track Animation & Keyframing**: Dedicated parameter modulation and timeline tracks for animating shader uniforms over time.
- **Analog Glitch & Degradation**: CRT scanlines, horizontal slice displacement, sync loss, and deterministic seed generation.
- **Tri-Tab Inspector Architecture**: Every effect in the stack exposes three dedicated operational surfaces: native mathematical effect parameters (**EFFECT**), layer blending and opacity (**BLEND**), and spatial geometric masking (**FORM**).

---

## 4. Product Principles

### 4.1 Visual first

Users should understand the result visually before they need to reason about implementation details.

### 4.2 Experimentation over configuration

Controls should support quick iteration and immediate visual feedback.

### 4.3 Immediate feedback

Parameter changes should update the visible result as quickly as the rendering architecture permits.

### 4.4 Non-destructive

Original assets remain intact. Creative operations modify composition state, not the source bitmap.

### 4.5 Composable

Effects, generative sub-layers, images, and other visual ingredients combine predictably.

### 4.6 Reusable

Useful creative states can be saved as Looks, reused, shared, and remixed.

### 4.7 Layout freedom

The workspace should support multiple ways of arranging the creation process without coupling the product to one permanent layout.

### 4.8 Frame-first

A frame is a first-class creative surface and does not require an uploaded image.

### 4.9 Layered blending, not flattened stacking

Blend mode exists at both layer level and within effect/generative stacks. Users should be able to reason about how one visual contribution interacts with the contribution below it.

### 4.10 Local-first, account-enabled

Local work should remain fast and resilient. Accounts add cloud persistence, cross-session access, settings, and sharing/remixing without removing the local-first foundation.

---

## 5. EffectsIO Native Component Architecture

EffectsIO owns 100% of its native application primitives and component architecture under `src/components/ui/`.

The canonical component system and design tokens are documented in `docs/design-system/effectsio-component-system.md` and `docs/design-system/component-rules.md`.

---

## 6. EffectsIO Design System

### 6.1 UI foundation policy

EffectsIO owns its own components.

### Canonical EffectsIO primitives are authoritative

Examples include:

- Button
- Slider
- Tabs
- ToggleGroup
- Select
- Panel family
- PaletteControl
- ColorControl
- GradientControl
- media/file-drop patterns
- asset thumbnail grid
- selection-state utilities

Do not replace working canonical components merely because another library contains an equivalent.

### shadcn policy

`shadcn` is approved for **genuine component gaps**.

Use it on demand rather than installing a speculative library surface.

The preferred underlying primitive foundation is Base UI where the selected shadcn component supports it, consistent with the existing EffectsIO architecture.

Before adding a shadcn component:

1. Check whether EffectsIO already has the needed component.
2. Confirm the gap is real.
3. Add only the required component.
4. Re-skin it to EffectsIO tokens without creating another parallel visual system.

### Motion policy

`motion` is used for **UI motion**, including:

- panel transitions
- popover/dialog motion
- subtle control transitions
- hover/press feedback where useful
- timeline UI transitions
- non-rendering interface choreography

`motion` does not replace WebGL animation. Creative pixel motion remains the responsibility of the rendering system and shader timeline.

### 6.2 Appearance / Theme

EffectsIO uses a dark-first appearance model:

- **Default:** Dark
- **Supported:** Dark / Light / System
- **System:** follows the OS/browser color-scheme preference
- **Persistence:** appearance preference should be retained in user settings; local fallback may be used before authentication

Dark mode remains the primary visual reference for product QA and screenshots.

### 6.3 Brand system

The v1.1 Beta brand direction uses the modern pink accent on a sleek near-black canvas.

Current product direction:

- `--primary`: pink brand accent
- `--background`: near-black application background
- `--card`: near-black panel surface
- `--link`: harmonized with the pink brand family
- `--primary-foreground`: dark foreground appropriate for the light pink primary surface

Exact values should be maintained in `src/styles.css` and treated as token-owned rather than hardcoded throughout components.

---

## 7. Target Users

### Designers

People creating visual treatments, posters, campaign assets, social content, covers, or presentation visuals.

### Developers / creative technologists

People generating backgrounds, textures, motion visuals, and reusable visual systems for digital products.

### Marketers / creators

People who need distinctive visuals quickly without operating a full traditional design application.

### Explorers

Users who want to experiment with procedural and stylistic effects for their own creative work.

---

## 8. Core Workflows

### 8.1 Frame-first workflow

```text
Open EffectsIO
      ↓
Start a frame
      ↓
Choose a frame size or custom dimensions
      ↓
Add a generative layer
      ↓
Build a generative sub-layer stack
      ↓
Optionally add an image or stock-image layer
      ↓
Adjust layer opacity and blend mode
      ↓
Adjust per-effect / per-sub-layer blend modes
      ↓
Refine visual treatment
      ↓
Optionally animate supported properties
      ↓
Save / Share / Remix / Export
```

### 8.2 Image-first workflow

```text
Open EffectsIO
      ↓
Import an image
      ↓
Place it in a frame
      ↓
Add effects
      ↓
Adjust parameters
      ↓
Add background/generative content
      ↓
Blend and refine
      ↓
Optionally animate
      ↓
Save / Share / Export
```

### 8.3 Batch workflow

```text
Select multiple images
      ↓
Choose a Look or common treatment
      ↓
Apply to selected images
      ↓
Review
      ↓
Export selected or all
```

### 8.4 Remix workflow

```text
Discover shared composition
      ↓
Open share link
      ↓
Preview composition
      ↓
Choose Remix
      ↓
Create independent copy
      ↓
Edit / animate / export / reshare
```

---

## 9. Assets, Selection & History

The existing functional foundation carries forward:

- multi-asset selection
- batch Look application
- selected-asset export scope
- undo/redo
- non-destructive asset handling

`activeImageId` remains authoritative for the **active asset** until the frame/layer architecture migrates the editor toward active-frame/active-layer selection.

`selectedAssetIds` is a separate batch-target selection state and must not replace `activeImageId`.

The history system records meaningful creative mutations and excludes transient presentation state.

---

## 10. The Frame & Layer Model

### 10.1 Frame

A frame is the primary composition surface.

A frame can exist without an uploaded image.

#### Frame presets

**Square**
- `1:1`

**Free**
- arbitrary custom width/height

**Landscape**
- `6:5`
- `5:4`
- `4:3`
- `3:2`
- `16:9`
- `2:1`

**Portrait**
- `5:6`
- `4:5`
- `3:4`
- `2:3`
- `9:16`
- `1:2`

Hero-friendly presets may be presented as convenient starting points, but they are not privileged over other formats.

### 10.2 Layers

Each frame contains ordered layers.

Initial layer types:

- **Image layer**
- **Generative layer**
- **AI-generated layer** — parked / future

Each layer can have:

- visibility
- opacity
- layer blend mode
- its own effect stack

### 10.3 Image layer

An image layer references an imported or sourced asset.

The source bitmap remains immutable.

The layer owns presentation and creative treatment state.

### 10.4 Generative layer

A generative layer is a **stack of independently toggleable generative sub-layers**.

Initial target sub-layer categories:

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

Each sub-layer has:

- enabled state
- parameters
- blend mode

### 10.5 What does not change

The canvas remains a rendering surface.

Viewport presentation remains separate from creative state.

Export remains independent of viewport pan/zoom.

---

## 11. Effects

The existing effect engine and 12 migrated GPU effects carry forward.

### Effect taxonomy target

The effect browser should converge on these seven categories:

1. Adjustments
2. Color
3. Stylize
4. Texture
5. Distortion
6. Detail
7. Transform

This taxonomy is a content and organization target, not a requirement to build all 53 reference effects at once.

### Current 12-effect foundation

- Original
- Black & White
- Duotone
- Posterize
- Grain
- Halftone
- Screen Print
- Vintage Film
- Glitch
- Pixelate
- Line Art
- ASCII

The existing GPU shader coverage remains the technical foundation.

### Effect mechanics

Each effect should support where applicable:

- enabled / disabled
- parameters
- reorder
- duplicate
- remove
- reset
- visibility
- preset/default values
- per-effect blend mode

Reordering should remain visibly order-dependent when blending is involved.

---

## 12. Effect Discovery

Effects should be preview-driven.

The effect browser should show real rendered previews rather than only text labels.

Category filtering should use the canonical effect taxonomy.

---

## 13. Effect Stack & Blend Modes

### 13.1 Per-effect blend mode

Each effect instance carries its own blend mode and composites against the result of the effects below it in the same stack.

### 13.2 Layer blend mode

Each layer separately carries a blend mode describing how the entire layer interacts with the layer beneath it.

### 13.3 Mechanics

Existing stack mechanics continue to apply:

- enable/disable
- parameter editing
- drag reorder
- duplicate
- remove
- reset

Rendering architecture must explicitly account for blend-mode composition rather than assuming simple sequential pixel transforms always commute.

---

## 14. Looks — Unified Composition Presets

A Look is a reusable snapshot of an entire composition.

It can include:

- image-layer effect stacks
- per-effect blend modes
- generative sub-layers
- sub-layer enabled states
- sub-layer parameters
- sub-layer blend modes
- layer opacity
- layer blend modes
- supported animation settings

A Look is a composition snapshot, not a separate rendering mechanism.

### 14.1 Built-in Looks

The existing built-in Look foundation carries forward.

The library can expand over time using the reference preset taxonomy as inspiration.

### 14.2 Shareable Looks / compositions

A Look or full composition may be serialized into a shareable URL or server-backed share record depending on payload size and account state.

### 14.3 Random Mix

A randomized effect/Look mix remains a low-priority exploration feature and should only be added after the effect library has enough breadth to make it useful.

---

## 15. Color System

Color is a first-class creative capability.

Users should be able to work with:

- foreground/background colors
- effect colors
- duotone colors
- gradients
- palettes
- color ramps
- channel values
- palette limits

Shared controls remain canonical:

- `ColorControl`
- `PaletteControl`
- `GradientControl`

Do not create parallel color-picker/palette systems.

---

## 16. Generative Visual System

Generative visuals are first-class content, not merely background decoration.

The initial system should cover the 13 sub-layer categories defined in Section 10.4 progressively.

### Floor

Begin with the existing static modes:

- transparent
- solid
- linear gradient
- radial gradient
- dots
- grid

Reorganize these as generative sub-layers rather than a single mutually exclusive background choice.

### Ceiling

Later expand toward:

- mesh gradients (Bicubic Hermite Ferguson patch grid + analytical OKLab fragment evaluation)
- noise fields
- particle systems
- waves
- light fields
- glass / optical distortion (ripples, refraction, chromatic aberration)
- richer procedural geometry (12 pattern modes, tartan plaid grids, ASCII density ramps)

Technical foundations and mathematical formulations are drawn from verified procedural shader pipelines, Bicubic Hermite lattices, and composable generative sub-layer architectures.

---

## 17. Global Effect Mask

The first masking implementation is one shared mask at the frame/layer effect level.

Requirements:

- paintable mask
- brush size
- feather
- invert
- show-paint visualization
- restrict where active effects apply

Per-effect masks remain deferred until the global model proves insufficient.

---

## 18. Content Sourcing

### 18.1 Imported assets

Users can import supported local image files.

### 18.2 Stock imagery

Stock photo sourcing is the near-term way to help a user start from something without requiring AI generation.

Target workflow follows the established reference pattern:

- Curated
- Pexels
- Unsplash

Provider specifics remain subject to implementation-time API and licensing decisions.

### 18.3 AI-generated content

AI generation is parked, not permanently banned.

Revisit only after the generative-layer system and stock sourcing are mature enough to justify the added provider, cost, and operational complexity.

---

## 19. Animation & Motion

Animation is about **changing visual properties over time**.

The user should think in terms of motion applied to visual ingredients, not “animating an effect” as a separate product concept.

### 19.1 Animatable property families

Potential supported properties include:

**Generative**
- gradient position
- gradient angle
- color drift
- scale
- light position
- light intensity
- light radius
- wave amplitude
- wave frequency
- noise scale
- noise intensity
- particle position/velocity/density
- blob position/deformation
- pattern offset

**Image / effect**
- effect intensity
- grain amount
- glitch intensity
- contrast
- color parameters where meaningful
- layer opacity
- layer blend strength where meaningful

**Layer/composition**
- position
- scale
- rotation
- opacity

Only properties with meaningful visual behavior should expose animation controls.

### 19.2 Free animation tier

Simple gradient motion can use browser/GPU-composited CSS techniques such as `background-position` drift where technically appropriate.

This tier is intended to be cheap and easy to enable.

### 19.3 GPU animation tier

Complex procedural motion uses WebGL/WebGL2 and the existing `u_time` infrastructure.

Examples:

- noise evolution
- particles
- waves
- moving light
- mesh distortion
- procedural patterns
- shader-driven effect motion

### 19.4 Animation clock

The existing centralized timeline clock from Phase 7.6 carries forward as infrastructure.

All shader passes in a frame must receive one deterministic frame timestamp.

### 19.5 Keyframes

Full keyframe curves remain deferred until the generative-layer model has enough real properties to justify them.

When implemented, keyframes must operate on real compositional properties rather than forcing a generic timeline onto every control.

---

## 20. Rendering Architecture

EffectsIO uses complementary rendering approaches.

### Canvas 2D

Use for deterministic pixel transformations and the authoritative CPU reference engine.

### WebGL / WebGL2

Use for:

- GPU-accelerated effects
- generative visuals
- animated procedural visuals
- real-time motion
- complex compositing where appropriate

### Explicit composition stage

Once multiple frame layers are implemented, composition must explicitly combine N layers, each potentially carrying:

- its own opacity
- layer blend mode
- effect stack
- per-effect blend modes
- global mask behavior

Do not assume the existing single-image effect pipeline is sufficient for multi-layer composition without an explicit compositing design pass.

---

## 21. Export

### Initial formats

- PNG
- JPG / JPEG
- WebP

### Current verified capabilities

- native resolution export
- scale export
- custom dimensions
- transparent backgrounds
- solid/gradient/pattern backgrounds
- multi-pass GPU effects
- CPU fallback
- batch export
- selected-asset export
- ZIP packaging
- timeline-time evaluation for supported animated shader content

### Future formats

- GIF
- WebM
- MP4
- image sequence

Animated export must eventually account for the two animation tiers separately because browser-composited CSS motion and shader-rendered motion are not technically equivalent export problems.

---

## 22. Project State

The v1.1 Beta target state model is:

```text
Account
├── Settings
│   └── Appearance (Dark | Light | System)
├── Projects[]
│   └── Project
│       ├── Assets[]
│       ├── Frames[]
│       │   └── Frame
│       │       ├── Layers[]
│       │       │   ├── Image Layer
│       │       │   ├── Generative Layer
│       │       │   │   └── Generative Sub-Layers[]
│       │       │   └── AI Layer [parked]
│       │       ├── Effect / Blend State
│       │       ├── Global Mask
│       │       ├── Animation State
│       │       └── Export Settings
│       ├── User Looks
│       └── Versions / Share Snapshots
└── Shared / Remixed Compositions
```

The exact backend/storage implementation is not prescribed by this PRD. The state ownership and user-facing semantics are the requirement.

---

## 23. Accounts, Saving & Cloud Persistence

Accounts are part of the v1.1 Beta product direction.

### 23.1 Anonymous usage

Anonymous users should be able to:

- open EffectsIO
- create compositions
- import assets
- experiment
- export locally
- use the local-first workspace

### 23.2 Authenticated usage

Users with accounts should be able to:

- save projects
- reopen projects
- retain Looks
- retain appearance/settings preferences
- access work across sessions/devices as cloud persistence becomes available
- create shareable compositions
- manage remixable/shared work

### 23.3 Persistence model

The intended direction is:

```text
Local Workspace
      ↕
Local Cache / IndexedDB
      ↕
Authenticated Cloud Project
```

Local-first behavior remains important even after accounts are introduced.

### 23.4 Save behavior

The user should not need to think about implementation details of persistence.

Where possible:

- local changes save automatically
- authenticated changes synchronize to the account
- sync failures do not destroy the local working state

Conflict-resolution details remain an implementation-design task and are not finalized by this PRD.

---

## 24. Sharing & Remixing

Sharing is a core growth mechanism for v1.1 Beta, but EffectsIO is not intended to become a general-purpose social network.

### 24.1 Shareable composition

A user can publish a composition snapshot to a shareable URL.

Example:

```text
https://effectsio.com/r/8Kx21
```

The shared state should preserve enough information to reproduce the published composition according to the supported snapshot model.

### 24.2 Privacy states

At minimum, the product should distinguish:

- Private
- Shared / link-accessible
- Remixable

The exact account/permission implementation can evolve without changing the product concept.

### 24.3 Remix

A visitor to a remixable composition can choose:

> **Remix**

Remix behavior:

1. Copy the published composition snapshot.
2. Create an independent editable version.
3. Associate the remix with the original composition for attribution/lineage.
4. Never mutate the original project.

### 24.4 Growth loop

```text
Create
  ↓
Publish
  ↓
Share
  ↓
Discover
  ↓
Remix
  ↓
Modify
  ↓
Publish again
```

This loop is product growth, not a requirement to build feeds, likes, followers, or a full social graph.

---

## 25. Content-Safe Composition Assistance

EffectsIO should eventually support composition-aware assistance for situations where users need clear space for content such as:

- text
- logos
- UI screenshots
- product imagery
- other foreground content

This is a **general composition feature**, not a hero-only feature.

Possible future behavior includes:

- content-safe area overlay
- left / center / right content preference
- subject-protection guidance
- local contrast checks
- visual-density guidance

The feature should help preserve readable space without requiring EffectsIO to become a general layout/design application.

This capability remains a planned product direction and should be sequenced after the core frame/layer model is stable.

---

## 26. Batch Processing & Export

Batch operations must remain independent from the interactive viewport.

Existing capabilities include:

- multiple asset selection
- common Look application
- selected-asset export
- all-asset batch export
- sequential processing
- ZIP packaging

The batch renderer must remain usable independently of UI presentation state.

---

## 27. Workspace Architecture

EffectsIO should not prescribe one permanent workspace layout.

Potential workspace modes include:

### Asset-focused

```text
Assets | Canvas | Inspector
```

### Effects-focused

```text
Effects | Canvas | Parameters
```

### Full canvas

```text
              Canvas
```

### Generative-focused

```text
Generative | Canvas | Layer Stack
```

The exact layout should evolve around task focus while preserving the component/design-system rules.

---

## 28. Appearance & Settings

The application settings area should eventually expose at least:

- Appearance: Dark / Light / System
- account information
- saved-project/account state
- share/remix preferences where needed

Dark is the default product presentation.

Light mode must remain a true theme of the same design system, not a separately designed application.

---

## 29. Local-First Direction

EffectsIO remains local-first.

Current local capabilities such as IndexedDB-backed asset/effect/background persistence should continue to work independently of authentication.

Account-based cloud persistence should layer on top rather than replacing the local-first architecture.

Network-dependent features include:

- account authentication
- cloud project synchronization
- stock image sourcing
- shareable composition retrieval

AI generation remains parked.

---

## 30. AI-Native Development

AI coding agents are first-class development contributors.

The repository's governance system remains authoritative.

AI agents must:

- use Graphify for repository intelligence before architectural/cross-cutting changes
- use Headroom where configured and practical
- provide literal empirical evidence
- preserve strict type safety
- keep the application runnable
- respect component ownership rules
- avoid speculative UI/component duplication

See `AGENTS.md` and `docs/design-system/component-rules.md` for the detailed engineering contract.

---

## 31. Development Source of Truth

The development source of truth is distributed intentionally:

- `AGENTS.md` → engineering/governance rules
- `docs/design-system/component-rules.md` → UI/component ownership and usage rules
- `docs/buildkit/architecture.md` → technical architecture
- `docs/worklog.md` → implementation evidence/history
- this `PRD.md` → product requirements and sequencing

No lower-level document may silently redefine a product requirement established here.

---

## 32. Non-Goals

EffectsIO is not initially intended to become:

- Photoshop
- a general-purpose photo editor
- a vector design application
- a full video editor
- a social network
- a cloud DAM
- a collaborative design platform

EffectsIO can support sharing and remixing without becoming a social network.

AI image generation is **not banned**, but is parked behind the generative and stock-sourcing roadmap.

---

## 33. Current Capability Baseline

The following foundation is already implemented and should be preserved while v1.1 work begins:

- asset ingestion and local asset library
- effect discovery and previewing
- 12 canonical effects
- CPU reference engine
- WebGL2 effect pipeline
- procedural background floor (6 modes)
- GPU background compositing
- centralized animation timeline clock
- playback/timeline UI foundation
- viewport-independent GPU export
- PNG/JPEG/WebP export
- batch ZIP export
- IndexedDB persistence
- Looks and Look application
- multi-asset selection
- batch Look application
- global undo/redo
- selected-asset export scope
- Native EffectsIO UI component system
- canonical EffectsIO component rules

These capabilities are foundations to carry forward, not reasons to recreate the architecture.

Graphify and Headroom are AI-agent development tooling, not product capabilities — they govern how the codebase gets built, not what EffectsIO does for a user. They're documented in `AGENTS.md`, not listed here, to keep this section describing the actual product.

---

## 34. V1.1 Beta Sequencing

The sequencing below is the recommended product order. It is intentionally capability-based rather than tied to the earlier Phase 7 numbering.

### Stage 0 — Baseline freeze

**Status: Complete**

Preserve the verified v1 functional foundation.

Includes the existing rendering, effects, export, animation-clock, selection, batch, history, and persistence foundations.

### Stage 1 — Frame & Layer Architecture

Build:

- first-class Frame state
- frame creation
- frame-size presets
- active frame / active layer context
- Image Layer
- Generative Layer
- layer ordering
- layer visibility
- layer opacity
- layer-level blend mode
- explicit multi-layer compositing stage

This is the architectural foundation for the rest of v1.1.

### Stage 2 — Generative Layer Depth

Build the generative sub-layer stack.

Start with the existing six modes and reorganize them as independently toggleable sub-layers.

Then expand progressively toward:

- Light
- Noise
- Waves
- Blobs
- Glass
- Optics
- Patterns
- other approved categories

Add global effect masking during this stage.

### Stage 3 — Effect Taxonomy & Content Expansion

Expand the effect catalog toward the seven-category taxonomy.

Prioritize:

1. Adjustments
2. Color
3. Detail
4. Stylize
5. Texture
6. Distortion
7. Transform

Do not treat the reference count as a requirement to build every effect immediately.

### Stage 4 — Motion

Implement the two animation tiers:

1. Free/cheap gradient motion.
2. GPU/WebGL procedural motion using `u_time`.

The existing Phase 7.6 timeline clock is reused.

### Stage 5 — Accounts & Persistence

Introduce:

- authentication
- account settings
- appearance preference
- cloud project storage
- local/cloud synchronization
- safe failure behavior preserving local work

Anonymous use remains available.

### Stage 6 — Looks as Composition Snapshots

Upgrade Looks from effect-stack snapshots to full composition snapshots.

Support:

- all layers
- generative sub-layers
- blend modes
- opacity
- supported animation configuration

### Stage 7 — Sharing & Remix

Build:

- shareable composition URLs
- published snapshots
- remix action
- remix lineage/attribution
- permission states

This stage should optimize for a simple growth loop rather than social-network complexity.

### Stage 8 — Content Sourcing

Integrate stock-image sourcing.

AI remains parked until the product and operational model justify it.

### Stage 9 — Advanced Animation

Only after generative content is sufficiently mature:

- keyframe curves
- property-specific animation controls
- richer timeline workflows
- Video export (MP4/WebM) via the browser's native MediaRecorder and
  captureStream APIs. Not deferred for technical difficulty — confirmed
  as a zero-server, client-side-only pattern during this project's
  generative-tooling research. Sequenced here because it requires Stage
  4's real animated content to exist first, not because it's unsolved.

### Ongoing

- Looks content expansion
- effect-library expansion
- performance hardening
- accessibility improvements
- browser compatibility
- UI design-system maintenance
- Component system maintenance
- shadcn adoption only for verified gaps
- Motion adoption only for UI motion

### Deferred

- video file ingestion
- GIF export
- image-sequence export
- per-effect masking
- AI-generated layers
- advanced collaboration

---

## 35. Success Criteria

EffectsIO should allow a user to:

1. Open the app and start from nothing.
2. Import an image in seconds.
3. Start a frame without requiring an image.
4. Choose a useful frame size or custom dimensions.
5. Add multiple layers.
6. Add multiple generative sub-layers without flattening them into one background choice.
7. Browse real visual effect previews.
8. Apply and tune effects immediately.
9. Blend effects and layers independently.
10. Save a complete visual treatment as a Look.
11. Apply a Look to multiple images.
12. Undo and redo meaningful creative operations.
13. Animate supported visual properties over time.
14. Export a frame independently of viewport zoom/pan.
15. Save work locally without losing it when offline.
16. Sign in and save projects to an account.
17. Share a composition with a link.
18. Remix another creator's published composition into an independent copy.
19. Build a distinctive visual without being forced into a hero-specific workflow.
20. Keep experimenting rather than feeling forced into a one-shot transformation workflow.

---

## 36. Product North Star

> **EffectsIO is a creative visual studio for building and experimenting with images, layered compositions, generative visuals, and motion.**

> **Start with something, or start with nothing. Build it up. Move it. Blend it. Share it. Remix it. Export it.**

The product should remain broad enough to support many creative outcomes while being opinionated enough to make experimentation fast and visually rewarding.
