# EffectsIO Staged Implementation Plan

**Document:** `Implementation_plan.md`  
**Product:** EffectsIO  
**Status:** Phase 3 Implementation Plan Approved (Ready for Execution)  
**Last updated:** August 2026

---

## 1. Phased Roadmap Overview

Work is sequenced in strict dependency order to ensure the repository remains in a **runnable, buildable state at every step (Rule 7)**.

```text
Phase 1: MVP Core Foundations — Studio Shell & Native Primitives (Completed & Verified)
    │
    ▼
Phase 1.5: Design Quality & UX Pass (Completed & Verified)
    │
    ▼
Phase 2: Image Library & Active Image State Management (Completed & Verified)
    │
    ▼
Phase 3: Interactive Canvas Viewport (Pan/Zoom Matrix) (Ready for Implementation)
    │
    ▼
Phase 4: Visual Effect Browser & Composable Stack Pipeline
    │
    ▼
Phase 5: Single Asset & Batch Export System
    │
    ▼
Phase 6: Looks, Presets & Background System
    │
    ▼
Phase 7: WebGL, Procedural Visuals & Animation (V2 Roadmap)
```

---

## 2. Phase 3 Detailed Breakdown — Interactive Canvas Viewport (Pan/Zoom Matrix)

**Goal:** Transform the static image canvas renderer into an **interactive viewport workspace** with focal zoom, pan matrix math, ResizeObserver handling, fixed viewport checkerboard preview, and tactile gestures, strictly obeying all architectural refinement guidelines.

### Key Phase 3 Architectural Specifications & Refinements:

1. **Global Viewport State vs. Transient Interaction State**:
   - `ViewportState` in `src/types/asset.ts` stores ONLY composition state:
     - `zoom: number` (Percentage scale, e.g. 100 = 1.0 multiplier)
     - `panX: number` (Horizontal offset in CSS pixels)
     - `panY: number` (Vertical offset in CSS pixels)
     - `fitMode: "contain" | "1:1" | "custom"`
     - `showGrid: boolean`
     - `showCheckerboard: boolean` (Fixed viewport transparency preview layer)
     - `splitView: boolean`
   - `isPanning`, pointer drag start coordinates, active pointer ID, and Spacebar key state remain strictly **local transient state** inside `CanvasViewport`.

2. **Explicit Coordinate System & Pure Math Conversions**:
   - `zoom`: Scale multiplier percentage (where 100% = 1.0 multiplier).
   - `panX` / `panY`: Viewport translation offset in CSS pixels.
   - `src/utils/viewport-math.ts` provides pure helper functions:
     - `screenToImage(screenX, screenY, viewportW, viewportH, assetW, assetH, zoom, panX, panY)` -> `{ x, y }`
     - `imageToScreen(imageX, imageY, viewportW, viewportH, assetW, assetH, zoom, panX, panY)` -> `{ x, y }`
     - `calculateFitZoom(viewportW, viewportH, assetW, assetH)` -> `{ zoom, panX: 0, panY: 0 }` (Allowed to go below 25% so large images always fit!)
     - `calculateFocalZoom(newZoom, mouseX, mouseY, viewportW, viewportH, assetW, assetH, currentZoom, currentPanX, currentPanY)` -> `{ newPanX, newPanY }`

3. **Fit vs. 1:1 Semantics**:
   - **Fit (`contain`)**: Computes `scale = Math.min(viewportW / assetW, viewportH / assetH)`, sets `panX = 0, panY = 0`, sets `fitMode = "contain"`. Fit scale is calculated independently without lower bound clamping so large assets always fit.
   - **1:1 (`1:1`)**: Sets `zoom = 100`, sets `panX = 0, panY = 0`, sets `fitMode = "1:1"`, rendering natural bitmap pixels.
   - **Manual pan/zoom (`custom`)**: Interactive manual zoom button steps clamp between 25% and 800% and set `fitMode = "custom"`.

4. **ResizeObserver & Panel Sizing**:
   - Canvas viewport observes container dimensions using `ResizeObserver`.
   - When viewport dimensions change:
     - If `fitMode === "contain"`, recomputes fit scale and centers the asset automatically.
     - If user is in `custom` or `1:1` mode, preserves user's custom `zoom`, `panX`, and `panY`.

5. **Fixed Viewport Layer Hierarchy (Canvas 2D)**:
   ```text
   Viewport Container (CSS pixel space 0..width, 0..height)
    ├── 1. Fixed Background Color (var(--background))
    ├── 2. Fixed Transparency Checkerboard Pattern (Fixed 8px pattern in CSS pixel space; does NOT scale/pan with image)
    ├── 3. Fixed Viewport Grid Lines (if showGrid enabled)
    └── 4. Transformed Image Layer
         ├── ctx.translate(width / 2 + panX, height / 2 + panY)
         ├── ctx.scale(zoom / 100, zoom / 100)
         └── ctx.drawImage(img, -asset.width / 2, -asset.height / 2, asset.width, asset.height)
   ```

6. **Trackpad / Pinch Wheel Zoom Handling**:
   - Wheel event handler registered with `{ passive: false }` on viewport container.
   - Distinguishes standard wheel scroll (`deltaY`) and trackpad pinch gestures (`e.ctrlKey` / `e.metaKey`).
   - Invokes `e.preventDefault()` while pointer is over viewport, preventing browser page zoom or page scrolling.
   - Performs focal point zoom centered at cursor `(e.clientX, e.clientY)`.

7. **Pointer Interaction & Gestures**:
   - Middle mouse drag or Spacebar + left drag initiates pan gesture.
   - Pointer capture (`setPointerCapture(e.pointerId)`) handles smooth dragging beyond panel edges.
   - Dynamic cursor states: `grab` on hover, `grabbing` during active drag.

8. **Testing Strategy & Verification**:
   - Unit tests in `src/utils/viewport-math.test.ts` verifying fit calculation (allowing <25%), 1:1 calculation, manual 25%–800% zoom clamping, focal point invariance, and resize behavior.
   - Mandatory verification suite: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm graphify:update`.

---

## 3. Explicit Phase 3 Scope Boundaries & Deferred Features

The following capabilities are **EXPLICITLY PROHIBITED** from implementation during Phase 3:
- **NO** Visual Effect Browser or preview card list (Phase 4)
- **NO** Multi-effect stack execution or parameter binding (Phase 4)
- **NO** Single image Blob export or batch zip export (Phase 5)
- **NO** Looks or preset saving (Phase 6)
- **NO** Procedural background engine (Phase 6)
- **NO** IndexedDB or persistent database (Phase 6)
- **NO** WebGL fragment shaders or Three.js pipeline (Phase 7)
- **NO** Animation timeline (Phase 7)
