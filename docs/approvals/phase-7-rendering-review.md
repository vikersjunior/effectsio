# EffectsIO — Phase 7 Rendering Architecture Review Packet

**Document:** `phase-7-rendering-review.md`  
**Purpose:** Project Owner Review & Architectural Decision Packet  
**Status:** **APPROVED: 2026-08-28** (Gated per `AGENTS.md` Rule 12)  
**Target Milestone:** Phase 7 Continuation (Phases 7.5–7.8)  
**Date:** August 28, 2026

---

## Executive Context & Governance Notice

This packet provides the project owner with an objective, evidence-based architectural assessment of the rendering engine before deciding whether to proceed with Phases 7.5–7.8.

> [!WARNING]
> **Governance Notice**: Phases 7.1–7.4 (WebGL2 infrastructure, GPU texture upload, and 12 GLSL effect shaders) were implemented prior to formal project-owner signature of the Phase 7 decision gate in `docs/buildkit/architecture.md`. That premature implementation was a process violation. The existence of code in `src/rendering/webgl/` does **not** constitute approval of Option A. All further GPU development (Phases 7.5–7.8) is strictly blocked pending the project owner's explicit decision below.

---

## Section A — What Option A Actually Is

**Option A (Unified Native WebGL2 Ping-Pong Pipeline)** unifies all image processing and visual composition onto a hardware-accelerated WebGL2 rendering surface:

```text
Source Image (HTMLImageElement / Blob)
  │
  ▼
GPU Texture Upload (`WebGLTexture` RGBA8)
  │
  ▼
Sequential Multi-Pass Ping-Pong Shaders (GLSL ES 3.00)
  ├── Pass 1: Effect A -> Target FBO 1
  ├── Pass 2: Effect B (reads FBO 1) -> Target FBO 2
  └── Pass N: Effect N (reads FBO N-1) -> Target FBO N
  │
  ▼
Processed Texture Attachment
  │
  ▼
Viewport Presentation Canvas (WebGL2 / RAF drawFrame)
```

### Key Technical Characteristics:
1. **Zero New Runtime Dependencies**: Built entirely with native WebGL2 primitives (`gl.createProgram`, `gl.createFramebuffer`, 4-vertex fullscreen quad). Three.js, PixiJS, and third-party shader runtimes are not used.
2. **Ping-Pong Framebuffer Objects (FBOs)**: Sequential effect layers are processed entirely in GPU VRAM without reading pixels back to JavaScript or CPU memory between passes.
3. **Reactive Declarative Uniforms**: UI controls in the Inspector update state in React Context (`activeEffectStack`), which passes resolved parameter numbers, colors, and booleans to GLSL uniforms on each frame.
4. **Permanent CPU Reference/Fallback**: All 12 pure CPU pixel manipulation functions in `src/effects/modules/*.ts` and the Canvas 2D engine remain 100% intact as the authoritative reference implementation and automatic fallback whenever WebGL2 is unsupported or context fails.

---

## Section B — What Option B Would Have Been

**Option B (Layered Stacked Canvases — DOM Composited)** proposed keeping the existing Canvas 2D pipeline for all pixel effects and introducing a secondary WebGL `<canvas>` element stacked underneath (or above) via CSS absolute positioning for procedural backgrounds.

### Architectural Tradeoffs of Option B:
- **Implementation Complexity**: 
  - *Known*: Initial implementation is superficially simpler because effect modules do not need to be rewritten in GLSL shaders.
  - *Hidden*: Compositing two separate canvas surfaces creates synchronization challenges. Split View comparisons require synchronized geometric clipping across two independent DOM canvases, which risks visual jitter and tearing during dragging.
- **Layer Inversion Invariant Broken**:
  - In Option B, pixel effects only execute on the image bitmap. It is mathematically impossible to apply a post-processing filter (e.g. global film grain, CRT scanline glitch, or vintage vignette) across *both* the image and the background without costly `drawImage()` readbacks between 2D and WebGL contexts.
- **Compositor Memory & Performance**:
  - Requires the browser compositor to maintain two separate full-viewport backing stores, doubling memory consumption on mobile and integrated GPUs.
- **Export Divergence**:
  - Natural-resolution export would require an offscreen composite step merging the 2D image canvas with an offscreen WebGL background canvas, introducing potential alignment or color-space discrepancies.

---

## Section C — What Is Actually Shipped (Phases 7.1–7.4 Audit)

An empirical audit of the current repository reflects the following concrete state:

### Implemented & Verified in Code and Automated Tests:
- **WebGL2 Foundation Infrastructure (`src/rendering/webgl/`)**: Context initialization, capabilities query, shader compiler with source-mapped error reporting, 2D fullscreen quad geometry, and ping-pong FBO manager (`webgl.test.ts`: 5/5 passing).
- **GPU Texture Management (`webgl-texture.ts`)**: Texture allocation, dimension caching, texture reuse, and DOM source upload overloads.
- **All 12 Canonical Visual Effects Translated to GLSL ES 3.00 (`src/rendering/webgl/shaders/`)**:
  1. `original.ts` (Pass-through)
  2. `black-and-white.ts` (Luminance dot, contrast scaling, warmth tint)
  3. `duotone.ts` (2-stop palette mapping, contrast curve)
  4. `posterize.ts` (Color step quantization, Bayer dither)
  5. `grain.ts` (PRNG hash noise synthesis, intensity scaling)
  6. `halftone.ts` (Rotated 2D frequency grid, circle SDF thresholding)
  7. `screen-print.ts` (Dual-plate 15°/75° separation, registration offset, ink subtractive blend)
  8. `vintage-film.ts` (Lifted matte blacks, contrast, lens vignette, film grain)
  9. `glitch.ts` (Row displacement, chromatic aberration channel shift, scanlines)
  10. `pixelate.ts` (Mosaic block quantization, center UV sampling)
  11. `line-art.ts` (3x3 Sobel edge convolution, gradient normalization, polarity invert)
  12. `ascii.ts` (5x7 procedural bitmap glyph decoder, character density ramps, CRT color modes)
- **Reactive UI Parameter Binding**: Fixed parameter key binding in `inspector-panel.tsx` to ensure `schema.name` (`contrast`, `warmth`, `blockSize`, etc.) propagates to GL uniform setters.
- **Automated Regression Suite (`parameter-propagation-e2e.test.ts`)**: 22 dedicated end-to-end unit tests proving schema integrity, parameter mutation propagation, layer isolation, disabled layer omission, and CPU fallback.
- **Overall Code Health**: 78/78 tests passing across 11 test suites; 0 TypeScript errors (`pnpm typecheck`); clean build (`pnpm build`).

### Not Proven / Mocked / Deferred:
- **Hardware Context-Loss Recovery**: Unit tests verify fallback logic when `getContext('webgl2')` returns null or throws, but real OS/driver GPU hardware context resets (e.g. GPU hang/recovery events) have not been tested on physical hardware.
- **Export Engine**: Export in `src/export/export-engine.ts` currently runs on the CPU Canvas 2D engine; GPU export is deferred to Phase 7.7.

---

## Section D — What Phases 7.5–7.8 Would Commit Us To

Proceeding with Option A commits the project to four substantial architectural milestones:

### 1. Phase 7.5 — Procedural GPU Backgrounds & Compositing
- **Architectural Shift**: Transitions the Creative Background layer from 2D canvas draws to dedicated procedural fragment shaders (multi-stop animated gradients, caustic light patterns, dynamic dot grids, animated simplex noise).
- **Consequence**: The WebGL2 pipeline becomes responsible for the entire visual surface, not just the image filter stack.

### 2. Phase 7.6 — Animation Engine, `u_time`, & Timeline Controls
- **Architectural Shift**: Introduces a continuous studio animation clock driving time-dependent uniforms (`u_time`, `u_frameRate`) into shaders.
- **Consequence**: Rendering transitions from on-demand/event-driven (render on parameter change) to continuous 60 FPS RAF rendering when animated effects are active. Requires deterministic frame scheduling, play/pause state management, power/tab visibility throttling, and handling CPU fallback for animated states.

### 3. Phase 7.7 — Viewport-Independent GPU Export Engine
- **Architectural Shift**: Moves natural-resolution single and batch export from Canvas 2D to an offscreen headless WebGL2 FBO pipeline.
- **Consequence**: Requires managing high-resolution FBO memory limits (e.g. `MAX_TEXTURE_SIZE` on low-end devices: 4096px vs 16384px), deterministic `gl.readPixels()` buffer synchronization, batch queue memory management, and guaranteed CPU/GPU pixel parity on exported files.

### 4. Phase 7.8 — Fallback Hardening & Resilience
- **Architectural Shift**: Comprehensive stress testing, automated fallback benchmarks, and memory leak verification across extreme asset sizes and complex multi-layer stacks.

---

## Section E — What Reversing Course Would Cost

If the project owner decides **NOT** to proceed with Option A and chooses to remain on the CPU Canvas 2D engine:

1. **CPU Rendering Path is 100% Viable**:
   - The CPU Canvas 2D engine and all 12 pure effect modules in `src/effects/modules/*.ts` have remained untouched and fully functional throughout Phases 1–6 and Phase 7.
   - All existing user-facing features (Image Library, 3-column studio layout, Pan/Zoom, Split View, Effect Stacks, Looks, Backgrounds, Local-First IndexedDB, Single/Batch Export) work completely on the CPU pipeline without WebGL.
2. **Reversal / Dormancy Cost**:
   - The code in `src/rendering/webgl/` is fully modularized. If Option A is shelved, `CanvasViewport.tsx` simply removes the `gpuPipelineRef` branch (approx. 20 lines of routing code) and routes 100% of render passes through `executeEffectStack`.
   - The GPU code in `src/rendering/webgl/` could either be removed or retained dormant as an experimental branch.
3. **What Would Be Lost by Reversing**:
   - Real-time 60 FPS performance on large images (4K/8K images would continue to have a slight 50–150ms processing latency on CPU during rapid slider adjustments).
   - Real-time animated procedural background shaders (e.g. animated caustics, dynamic noise) and high-framerate timeline playback would be impractical on CPU without frame drops.

---

## Section F — Current Recommendation

From a pure technical and code health perspective:
- The WebGL2 foundation built in Phases 7.1–7.4 is lean, zero-dependency, and fully decoupled from the core application state.
- It preserves the CPU Canvas 2D engine as a permanent safety net.
- However, continuing into Phases 7.5–7.8 commits the project to maintaining shaders for all future features and supporting high-resolution GPU export.

The technical foundation is sound, but the decision rests on whether the product vision requires real-time generative GPU capabilities (Option A) or prefers the absolute simplicity of the CPU-only architecture.

---

## Section G — Project Owner Decision Record

APPROVED: 2026-08-28

### Decision Details:
- **Decision**: **APPROVED — Option A (Unified Native WebGL2 Ping-Pong Pipeline)**
- **Scope Authorized**: Authorized to proceed with **Phase 7.5 (Procedural GPU Backgrounds & Compositing)**.
- **Architectural Constraints & Invariants Preserved**:
  1. **Zero New Runtime Dependencies**: Native WebGL2 only (no Three.js, PixiJS, or runtime shader frameworks).
  2. **Authoritative CPU Fallback**: All 12 pure functions in `src/effects/modules/*.ts` and Canvas 2D engine remain 100% intact as reference and fallback.
  3. **State Schema Immutability**: `EffectStack`, `EffectInstance`, `Look`, and `BackgroundState` schemas remain untouched.
  4. **Strict Viewport Independence in Export**: Viewport camera transforms have zero effect on exported pixels.
  5. **Mechanical Governance Enforcement**: Every subsequent phase containing a decision gate continues to be mechanically enforced via `pnpm verify:approvals` per `AGENTS.md` Rule 12.

