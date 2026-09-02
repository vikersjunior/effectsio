# EffectsIO Architectural Specification

**Document:** `architecture.md`  
**Product:** EffectsIO  
**Status:** Phase 6 Complete / Phase 7 Architecture Proposal & Readiness  
**Last updated:** August 2026

---

## 1. Executive Summary & Core Invariants

EffectsIO is a high-performance, local-first browser creative studio for image effects, composition, and visual experimentation built with **React 19, TypeScript, Vite, Tailwind CSS v4, and Canvas 2D**.

### Core Architecture Invariants:
1. **Empirical Evidence First**: All claims of functionality, performance, or correctness require runtime evidence (typecheck, tests, build).
2. **Single Source of Truth (`activeImageId`)**: The active composition image is strictly identified by `activeImageId` in `StudioContext`. Thumbnail selection in the Image Library sets `activeImageId`. Canvas, Inspector, and Effects consume `activeImageId`. No duplicate selection dropdowns exist.
3. **Pure Effect Module Separation**: Pixel transformation algorithms (`src/effects/modules/*.ts`) are pure, side-effect-free functions operating on raw `ImageData` parameters, 100% decoupled from React, DOM, and stores.
4. **Canvas Output Isolation**: Visual results render inside canvas pipelines. Interactive controls (sliders, toolbars, selection handles, split divider knobs) live strictly in DOM overlays.
5. **Native Component Ownership**: All UI components in `src/components/` are native EffectsIO primitives styled with design tokens declared in `src/styles.css`.
6. **Non-Destructive Source Assets**: Original imported image bitmaps and `Asset` objects remain immutable.
7. **Strict Viewport Independence in Export**: Viewport camera transforms (`zoom`, `panX`, `panY`, `fitMode`, `splitView`, `splitPosition`, `showGrid`, `showCheckerboard`) have zero effect on exported pixels.

---

## 2. Application Architecture Overview

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             TopNav (Studio Shell)                                │
├──────────────────────────┬─────────────────────────────┬─────────────────────────┤
│    Asset Library Panel   │    Canvas Viewport (Center) │   Inspector Panel       │
│  ┌────────────────────┐  │  ┌────────────────────────┐ │  ┌────────────────────┐ │
│  │ Image Ingestion    │  │  │ RAF Viewport Matrix    │ │  │ Effects Stack Tab  │ │
│  │ Raw Blob IDB Store │  │  │ Split View HUD Overlay │ │  │ Looks Library Tab  │ │
│  │ Thumbnail Grid     │  │  │ Creative Background    │ │  │ Background Tab     │ │
│  └─────────┬──────────┘  │  │ Canvas 2D Buffer       │ │  │ Asset Info Tab     │ │
│            │             │  └───────────▲────────────┘ │  └────────▲───────────┘ │
└────────────┼─────────────┴──────────────┼──────────────┴───────────┼─────────────┘
             │                            │                          │
             │ Selection                  │ Consumes                 │ Consumes
             ▼                            │ activeImageId            │ activeImageId
┌─────────────────────────────────────────┴──────────────────────────┴─────────────┐
│                          StudioContext (React Context)                           │
│  - assets: Asset[] (with fresh Object URLs from raw Blobs)                       │
│  - activeImageId: string | null                                                  │
│  - effectStacks: Record<string, EffectStack>                                     │
│  - backgrounds: Record<string, BackgroundState>                                  │
│  - userLooks: Look[]                                                             │
│  - viewport: ViewportState (ephemeral pan/zoom camera)                           │
│  - isHydrated: boolean (startup lifecycle gate)                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Application State Architecture (React Context)

Application state is managed centrally via **React Context** in `src/context/studio-context.tsx` (`StudioProvider` and `useStudioStore`).

### Entity Definitions & Schema:

#### 1. `Asset` Model (`src/types/asset.ts`):
```typescript
export interface Asset {
  id: string;                  // Unique UUID
  filename: string;            // Original filename (e.g. "photo.png")
  mimeType: string;            // MIME type ("image/png", "image/jpeg", "image/webp")
  fileSize: number;            // File size in bytes
  objectUrl: string;           // Ephemeral runtime Object URL (URL.createObjectURL)
  rawBlob?: Blob;              // Raw binary Blob for IndexedDB persistence
  width: number;               // Natural pixel width
  height: number;              // Natural pixel height
  aspectRatio: number;         // width / height
  thumbnailUrl: string;        // Preview data URL
  createdAt: number;           // Import timestamp
}
```

#### 2. `EffectInstance` & `EffectStack` (`src/types/asset.ts`):
```typescript
export interface EffectInstance {
  instanceId: string;          // Unique UUID for this stack entry
  effectId: EffectId;          // Canonical Catalog ID (e.g. "halftone", "duotone")
  enabled: boolean;            // Visibility toggle
  parameters: Record<string, unknown>; // User parameters
}

export type EffectStack = EffectInstance[];
```

#### 3. `BackgroundState` (`src/types/look.ts`):
```typescript
export type BackgroundType = "transparent" | "solid" | "linear-gradient" | "radial-gradient" | "dots" | "grid";

export interface BackgroundState {
  type: BackgroundType;
  color: string;                  // Solid color or primary gradient/pattern color
  gradientEndColor?: string;      // Second color stop
  gradientAngle?: number;         // Linear gradient angle (0° to 360°)
  patternSpacing?: number;        // Pattern grid/dot spacing (8px to 64px)
  padding?: number;               // Canvas framing margin (0px to 120px)
  borderRadius?: number;          // Framed image corner radius (0px to 48px)
  shadowBlur?: number;            // Drop shadow blur (0px to 64px)
  shadowOpacity?: number;         // Drop shadow opacity (0.0 to 1.0)
}
```

#### 4. `Look` Preset (`src/types/look.ts`):
```typescript
export interface Look {
  id: string;                  // Unique UUID or built-in slug
  name: string;                // Display name
  category: LookCategory;      // "editorial" | "retro" | "experimental" | "monochrome" | "custom"
  description: string;
  isBuiltIn: boolean;          // Factory built-in vs user preset
  effectStack: EffectStack;
  createdAt: number;
}
```

#### 5. `ViewportState` (Ephemeral Presentation State):
```typescript
export interface ViewportState {
  zoom: number;                // Scale percentage (25% to 800% interactive, or calculated fit zoom)
  panX: number;                // Horizontal translation in CSS pixels
  panY: number;                // Vertical translation in CSS pixels
  fitMode: "contain" | "1:1" | "custom";
  showGrid: boolean;           // Fixed viewport grid lines overlay
  showCheckerboard: boolean;   // Fixed viewport transparency preview grid
  splitView: boolean;          // Split comparison mode toggle
  splitPosition: number;       // Normalized split divider position (0.0 to 1.0, default 0.5)
}
```

---

## 4. Image Ingestion & Lifecycle Pipeline

```text
User File Import (Picker / Drag & Drop)
                 │
                 ▼
    Validate File (PNG, JPG, WebP)
                 │
                 ▼
    Create Runtime Object URL (URL.createObjectURL)
                 │
                 ▼
    Decode Natural Dimensions (ImageBitmap / HTMLImageElement)
                 │
                 ▼
    Generate Downscaled Thumbnail (Canvas Data URL)
                 │
                 ▼
    Persist Raw Blob to IndexedDB (`assets` store)
                 │
                 ▼
    Append Asset to StudioContext & Set activeImageId
```

### Memory Lifecycle & Cleanup Policy:
- When an asset is removed via `removeAsset(id)`, `revokeAssetUrls(asset)` immediately revokes its `objectUrl` and `thumbnailUrl`.
- When `StudioProvider` unmounts, all active Object URLs are revoked.
- Temporary download Object URLs created during single or batch export are revoked immediately after the anchor click.

---

## 5. Phase 3 Viewport Architecture (Pan/Zoom Matrix & Split View)

- **Coordinate System & Math**: `src/utils/viewport-math.ts` provides pure transformation functions:
  - `screenToImage()` and `imageToScreen()` for coordinate conversion.
  - `calculateFitZoom()` computes uniform contain scale without lower-bound clamping so massive assets fit cleanly.
  - `calculateFocalZoom()` preserves the focal point under the cursor during wheel zoom.
- **Buffer Sizing Isolation**: Canvas backing-store dimensions (`canvas.width`, `canvas.height`) are adjusted **strictly by container `ResizeObserver` and window DPR**. Pan, zoom, and Split View drag operations only clear and redraw, never reallocating the canvas buffer.
- **RAF-Coalesced Interaction**: Pointer movements during pan and Split View dragging are coalesced into a single `requestAnimationFrame` render pass. Transient drag coordinates are maintained in local component refs (`transientPanRef`) and committed to context only on `pointerup`.
- **Presentation Overlays**: The 8px checkerboard pattern (`showCheckerboard`) and grid lines (`showGrid`) are fixed in CSS pixel space and do not scale or pan with the image.
- **Split View Comparison**: Operates in **100% CSS Viewport space** (`splitX = width * splitPos`). Renders original source asset on the left (`0..splitX`) and processed effect output on the right (`splitX..width`) with a synchronized draggable DOM handle overlay (`◀  ⋮  ▶`).

---

## 6. Phase 4 & 4.5 Effect Stack Architecture

- **Composable Multi-Effect Stack**: Each asset maintains an independent, ordered `EffectStack` in `StudioContext.effectStacks[asset.id]`.
- **Sequential Execution Pipeline**: `executeEffectStack(sourceImageData, stack)` in `src/effects/engine.ts`:
  1. Clones the source `ImageData` once (`cloneImageData`).
  2. Iterates sequentially over the stack in ascending array order.
  3. Skips disabled instances (`enabled: false`).
  4. Executes pure module transformation functions in `src/effects/modules/*.ts`.
  5. Returns the final processed `ImageData`.
- **Stack Layer Operations**:
  - Reorder layers up and down (`reorderEffectStack`).
  - Duplicate layer with deep-copied parameters (`duplicateInstance`).
  - Toggle visibility (`toggleInstanceEnabled`).
  - Remove single layer or clear all layers (`removeInstanceFromStack`, `removeAllInstancesFromStack`).
  - Parameter editing bound to selected instance.
- **Effect Discovery**: `EffectBrowserModal` dialog provides visual category filtering (`All`, `Artistic`, `Graphic`, `Retro`, `Experimental`) and search.

---

## 7. Phase 5 Export Engine Architecture

- **Viewport Independence**: The export pipeline does **NOT** read pixels from the canvas viewport or DOM overlays. An image zoomed to 800% with off-center pan and active Split View exports the full, uncropped natural-resolution composition without split lines or grid artifacts.
- **Natural Resolution Invariant**: Export dimensions match native asset dimensions (`asset.width` $\times$ `asset.height`) plus any creative background padding. `window.devicePixelRatio` is never applied.
- **Formats & Encoders**:
  - **PNG** (`image/png`): Lossless, preserves full RGBA alpha.
  - **JPEG** (`image/jpeg`): Configurable quality (10%–100%, default 92%), alpha composited onto white `#FFFFFF` or creative background.
  - **WebP** (`image/webp`): Configurable quality (10%–100%, default 92%), preserves alpha.
- **Batch Export & ZIP Packaging**: `exportBatchAssets` sequentially processes assets one-by-one (memory-safe), passes binary buffers to `"fflate": "0.8.3"` (`zipSync`), and downloads `effectsio-export.zip`.
- **Filename Sanitization & Disambiguation**: Strips unsafe filesystem characters and deterministically resolves batch collisions (`photo-effectsio.png`, `photo-effectsio-2.png`).

---

## 8. Phase 6 Looks, Presets, Backgrounds & Persistence

### 8.1 Looks / Presets System
- **Curated Built-in Looks**: 6 factory presets (*Editorial Print*, *Analog Scanner*, *Brutalist Poster*, *Cyberpunk Neon*, *Risograph Duo*, *ASCII Terminal*).
- **Custom User Looks**: Users can save active effect stacks with custom names and categories.
- **Template Immutability (Deep-Clone Invariant)**: Applying a Look (`cloneLookToEffectStack`) creates fresh `EffectInstance` objects with brand-new `crypto.randomUUID()` values. Editing active sliders never mutates the original saved template.

### 8.2 Creative Background System
- **Composition Layer**: Supports `transparent`, `solid`, `linear-gradient` (0°–360°), `radial-gradient`, `dots`, and `grid` patterns.
- **Canvas Framing**: Configurable padding (0–120px), corner border radius (0–48px), and drop shadow blur/opacity.
- **Export Integration**: Creative backgrounds and framing render behind the image in both the live viewport and natural-resolution exports.

### 8.3 Local-First Persistence (IndexedDB)
- **Database Schema (`effectsio_db`, v1)**:
  - `assets`: Stores raw binary `Blob`s and metadata (no fragile object URLs).
  - `effect_stacks`: Stores per-asset `EffectStack` arrays.
  - `backgrounds`: Stores per-asset `BackgroundState` records.
  - `user_looks`: Stores custom user Look presets.
  - `app_state`: Stores session state (`activeImageId`).
- **Controlled Hydration Lifecycle**:
  - Application starts with `isHydrated: false` and renders a clean loading overlay ("Restoring workspace...").
  - `loadHydratedProject()` reads stored records, creates fresh runtime Object URLs (`URL.createObjectURL(rawBlob)`), restores active asset and stacks, and sets `isHydrated: true`.
  - Corrupted records are skipped defensively without crashing.
- **Debounced Autosave**: Parameter slider adjustments debounce disk writes by 500ms to eliminate I/O congestion during 60 FPS interactions.

---

## 9. Current Rendering Pipeline Trace (Canvas 2D)

```text
  [ Ingested Asset ]
         │
         ▼
  [ HTMLImageElement ] (Natural Dimensions: W x H)
         │
         ▼
  [ Offscreen Canvas 2D ] (createImageBitmap / drawImage)
         │
         ▼
  [ sourceImageData ] (Uint8ClampedArray RGBA)
         │
         ▼
  ┌────────────────────────────────────────────────────────┐
  │ executeEffectStack(sourceImageData, activeEffectStack) │
  │                                                        │
  │   Pass 1: Black & White ──► currentBuffer              │
  │   Pass 2: Halftone      ──► currentBuffer              │
  │   Pass 3: Grain         ──► currentBuffer              │
  └────────────────────────┬───────────────────────────────┘
                           │
                           ▼
  [ processedCanvas ] (HTMLCanvasElement storing final output)
                           │
                           ▼
  ┌────────────────────────────────────────────────────────┐
  │ CanvasViewport.drawFrame() (RAF-Coalesced Pass)        │
  │                                                        │
  │   1. Clear Canvas 2D Context                           │
  │   2. Draw Fixed Presentation Checkerboard & Grid       │
  │   3. Apply Viewport Matrix (translate + zoom scale)    │
  │   4. Draw Creative Background (Solid / Gradient / Dots)│
  │   5. Draw Framed Drop Shadow & Corner Clip             │
  │   6. Draw Processed Bitmap (or Split View Clip)        │
  └────────────────────────────────────────────────────────┘
```

---

## 10. Phase 7 — GPU/WebGL Rendering Architecture Proposal

### 10.1 Registered Effect Engine Profile & GPU Classification

All 12 current effect modules in `src/effects/modules/*.ts` have been audited for GPU fragment shader translation:

| Effect ID | Algorithmic Structure | Memory Access | GPU Suitability | Shader Complexity | Translation Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`original`** | Identity pass-through | Pixel-local | 100% Ideal | O(1) Trivial | `texture(u_texture, v_uv)` |
| **`black-and-white`** | Luminance dot + contrast/tint | Pixel-local | 100% Ideal | Low | `dot(c.rgb, vec3(0.299,0.587,0.114))` + linear remap |
| **`duotone`** | Grayscale remap to 2-stop palette | Pixel-local | 100% Ideal | Low | `mix(u_shadow, u_highlight, luminance)` |
| **`posterize`** | Color quantization + Bayer dither | Pixel-local | 100% Ideal | Low–Medium | Matrix dither via `mod(gl_FragCoord.xy, 4.0)` |
| **`grain`** | Uniform / Colored noise overlay | Pixel-local | 100% Ideal | Low–Medium | PRNG hash function or animated `u_time` seed |
| **`halftone`** | Rotated frequency grid + dot SDF | Coordinate-based | 100% Ideal | Medium | Analytic 2D rotation matrix + SDF circle/diamond |
| **`screen-print`** | Multi-channel separation + offset | Multi-sample UV | 100% Ideal | Medium–High | Sample shifted UV coordinates per ink channel |
| **`vintage-film`** | Sepia + vignette + fade + light leak | Coordinate + color | 100% Ideal | Medium | Radial distance from center + gradient overlay |
| **`glitch`** | RGB split + block slice + scanlines | Coordinate warping | 100% Ideal | Medium–High | Quantized UV offset + chromatic aberration |
| **`pixelate`** | Grid cell quantization + shape mask | Block-local | 100% Ideal | Low–Medium | `floor(uv * grid) / grid` + shape threshold |
| **`line-art`** | 3x3 Sobel edge detection kernel | 9-tap Neighborhood | 100% Ideal | Medium | Sample 8 neighboring texels `vec2(1.0/w, 1.0/h)` |
| **`ascii`** | Luminance to monospace glyph | Grid-local | 90% (Atlas) | High | 256x256 font glyph atlas texture indexed by luminance |

---

### 10.2 Architectural Evaluation: Option A vs. Option B

#### Option A: One Canvas with Sequential 2D + WebGL/GPU Render Passes (Unified Surface)
- **Mechanism**: A unified `WebGL2RenderingContext` backing the viewport and offscreen export renderers.
- **Multi-Pass Execution**: Uses **Ping-Pong Framebuffer Objects (FBOs)**.
  - `Texture A` $\rightarrow$ `Shader Pass 1` $\rightarrow$ `FBO B`
  - `Texture B` $\rightarrow$ `Shader Pass 2` $\rightarrow$ `FBO A`
- **Advantages**:
  1. **Strict Ordering Correctness**: Arbitrary layer ordering (e.g. Background $\rightarrow$ Image $\rightarrow$ Filter $\rightarrow$ Vignette $\rightarrow$ Global CRT Glitch) is mathematically exact.
  2. **Peak Performance**: 60–120 FPS real-time rendering on 4K/8K assets because all pixel processing happens in GPU VRAM without CPU-memory readback during interactions.
  3. **Deterministic Export**: Renders offscreen at natural asset dimensions directly into an FBO, followed by a single asynchronous `readPixels()` for Blob encoding.
  4. **Future-Proof**: Unlocks procedural animated backgrounds, caustic lighting, particle fields, and video export.
- **Tradeoffs**: Requires managing WebGL2 texture and FBO lifecycles; CPU-only fallback modules require a `gl.readPixels()` $\leftrightarrow$ `gl.texSubImage2D()` bridge.

#### Option B: Two Stacked Canvas Elements Composited Together (Layered Surfaces)
- **Mechanism**: Keep existing Canvas 2D for image processing and place a second `<canvas>` (with WebGL) behind or on top via CSS absolute positioning.
- **Advantages**: Preserves the existing Canvas 2D codebase without initial shader translations.
- **Disadvantages**:
  1. **Layer Inversion Invariant Broken**: Cannot apply a post-processing shader (e.g. film grain, global distortion, or scanlines) across both the image and the procedural background simultaneously without transferring pixels between contexts.
  2. **Double Compositor Memory**: Browser must allocate two full-screen backing surfaces, increasing mobile/integrated GPU memory pressure.
  3. **Export Complexity**: Merging two separate canvas contexts at natural resolution requires an extra offscreen compositing pass.
  4. **Split View Fragility**: Synchronizing Split View divider clipping across two DOM canvases risks visual tearing/jitter.

---

### 10.3 Clarification: "One Canvas" vs. "One Context"

1. An HTML `<canvas>` element can instantiate **only one rendering context** during its lifecycle (`getContext('2d')` OR `getContext('webgl2')`).
2. Therefore, a "Unified Architecture" does not mean switching contexts on one canvas element.
3. Instead, the unified architecture employs a **WebGL2 Context** as the primary hardware-accelerated rendering engine, with the existing **Canvas 2D pure functions retained as a robust, zero-dependency CPU fallback**.

---

### 10.4 Conceptual Rendering Abstraction

```text
                            ┌───────────────────────────┐
                            │       RenderRequest       │
                            │  - source: Asset / Blob   │
                            │  - stack: EffectStack     │
                            │  - bg: BackgroundState    │
                            │  - time: number           │
                            │  - resolution: Size       │
                            └─────────────┬─────────────┘
                                          │
                                          ▼
                            ┌───────────────────────────┐
                            │      RenderingEngine      │
                            │  (Orchestrator & Strategy)│
                            └───────┬───────────┬───────┘
                                    │           │
                    WebGL Available │           │ Fallback / Headless
                                    ▼           ▼
                   ┌──────────────────┐       ┌──────────────────┐
                   │  WebGL2Backend   │       │ Canvas2DBackend  │
                   │  - GL Program Pool│      │  (Existing CPU   │
                   │  - Ping-Pong FBOs│       │   Pure Modules)  │
                   │  - Shader Passes │       │                  │
                   └──────────────────┘       └──────────────────┘
```

#### Architectural Invariants Preserved:
- `EffectStack`, `EffectInstance`, `Look`, and `BackgroundState` schemas remain 100% unchanged.
- All 12 existing pure modules in `src/effects/modules/*.ts` remain untouched as the permanent CPU reference and fallback engine.
- WebGL shaders will reside in `src/effects/shaders/*.glsl.ts` exporting GLSL ES 3.00 shader strings matching the exact uniform and parameter schemas.

---

### 10.5 CPU Fallback Strategy

1. **Device/Session Fallback**: If `canvas.getContext('webgl2')` fails or GPU is unsupported, the system transparently defaults to `Canvas2DBackend`.
2. **Context Loss Recovery**: Listens to `webglcontextlost` (cancels active renders) and `webglcontextrestored` (re-uploads textures, re-compiles programs, and redraws).
3. **Per-Effect Hybrid Fallback**: If a custom effect has only a CPU implementation, the engine reads the active FBO into `ImageData`, executes the CPU module, and re-uploads to the ping-pong texture.

---

### 10.6 Animation & Clock Architecture

- **Unified RAF Coordination**: Generative visuals (e.g. animated noise, shimmering grain, caustic gradients) receive an animated `u_time` uniform driven by a centralized studio clock (`requestAnimationFrame`).
- **Zero React Re-Renders**: Animation timestamps do **not** trigger React state updates. The animation clock lives in a local ref inside `CanvasViewport`, updating GL uniforms directly at 60 FPS without re-rendering React component trees.
- **Power Optimization**: When animation is paused, or the browser tab is hidden (`document.visibilityState === 'hidden'`), or parameters are static, the RAF loop goes idle.

---

### 10.7 Viewport-Independent GPU Export Architecture

- **Natural Resolution FBO**: GPU export runs offscreen using a headless `WebGL2` render buffer configured to the source asset's exact natural dimensions (`asset.width + 2*padding` $\times$ `asset.height + 2*padding`).
- **Zero Viewport Coupling**: Viewport pan, zoom, fit mode, and Split View are bypassed completely.
- **Single Readback**: All shader passes and background layers execute in VRAM. Only the final result is read via `gl.readPixels()` into a single `Uint8ClampedArray` for PNG/JPEG/WebP encoding.

---

### 10.8 Dependency Decision: Native WebGL2 (Zero Runtime Dependencies)

- **Evaluation**:
  - `Three.js` (currently present in `package.json` from initial template) is **0% used** in `src/`. Three.js is built for 3D scene graphs, meshes, cameras, and PBR lighting ($\sim 600\text{KB}$ minified).
  - EffectsIO is a **2D image processing, procedural background, and generative shader studio**.
  - EffectsIO only requires a single full-screen quad (2 triangles / 4 vertices), fragment shaders, ping-pong FBOs, and uniform bindings.
- **Recommendation**:
  - Build a lightweight native **WebGL2 Quad & FBO Pipeline** ($\sim 250$ lines of TypeScript).
  - Introduce **zero new runtime npm packages**.
  - Prune unused `three` from `package.json` in a subsequent cleanup.

---

### 10.9 Staged Phase 7 Implementation Roadmap

1. **Phase 7.0 — Architectural Alignment & Owner Decision Gate**: (Current step)
2. **Phase 7.1 — WebGL2 Context & Resource Manager**: `WebGLContextManager`, Fullscreen Quad, Shader Program Cache, Ping-Pong FBO Pool.
3. **Phase 7.2 — Texture Upload & Pass-Through Pipeline**: Source image bitmap upload $\rightarrow$ GPU texture $\rightarrow$ display.
4. **Phase 7.3 — Core Color & Tone Shaders**: `black-and-white`, `duotone`, `posterize`, `grain`.
5. **Phase 7.4 — Geometric & Multi-Sample Shaders**: `halftone`, `screen-print`, `vintage-film`, `glitch`, `pixelate`, `line-art`, `ascii`.
6. **Phase 7.5 — Procedural GPU Backgrounds**: Multi-stop gradients, dynamic dot matrix, grid, caustic light, animated simplex noise.
7. **Phase 7.6 — Animation Clock & Dynamic Uniforms**: `u_time` clock, play/pause controls, RAF loop integration.
8. **Phase 7.7 — Viewport-Independent GPU Export Engine**: Offscreen natural-resolution FBO rendering $\rightarrow$ async `readPixels` $\rightarrow$ Blob encoders.
9. **Phase 7.8 — Fallback Hardening & Context Loss Resilience**: Automated fallback tests and performance benchmarks.

---

## 11. Approved Decision — Rendering Architecture for Phase 7

```text
================================================================================
STATUS: APPROVED (2026-08-28) — OPTION A SELECTED
================================================================================
```

### Governance Incident & Approval Record:
- **Approval Record**: Formal project-owner approval was granted on **2026-08-28** via signed packet in `docs/approvals/phase-7-rendering-review.md` satisfying `pnpm verify:approvals` per `AGENTS.md` Rule 12.
- **Decision**: **Option A — Unified Native WebGL2 Ping-Pong Pipeline** is the authorized foundation for Phase 7.5 (Procedural GPU Backgrounds & Compositing).
- **Core Governance Invariants**:
  1. Zero new runtime npm dependencies.
  2. All 12 CPU pure functions in `src/effects/modules/*.ts` and Canvas 2D engine remain permanently intact as authoritative reference and fallback.
  3. `EffectStack`, `EffectInstance`, `Look`, and `BackgroundState` state schemas remain immutable.
  4. Viewport camera transforms remain 100% decoupled from exported pixels.

### Options Summary:
- **Option A (Approved)**: **Unified Native WebGL2 Ping-Pong Pipeline**
  - *Mechanism*: A single WebGL2 rendering surface executing multi-pass ping-pong FBOs for effects and generative backgrounds, with the existing Canvas 2D engine preserved as CPU reference/fallback.
  - *Why Selected*: Peak real-time performance on high-resolution assets, mathematical layer ordering across effects and backgrounds, zero new npm dependencies.
- **Option B (Rejected)**: **Layered Stacked Canvases (DOM Composited)**
  - *Tradeoffs*: Simpler initial background separation, but breaks arbitrary layer ordering (e.g. applying a global CRT distortion or grain across both image and background), doubles compositor memory, complicates natural-resolution export, and risks visual tearing during Split View interactions.

> [!NOTE]
> **GATE SATISFIED**: Project owner approval is recorded in `docs/approvals/phase-7-rendering-review.md`. Development may proceed to Phase 7.5 specification and implementation.
