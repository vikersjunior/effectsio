# EffectsIO Technology Stack Specification

**Document:** `Tech_stack.md`  
**Product:** EffectsIO  
**Status:** Refined Specification (Technology Pass)  
**Last updated:** August 2026

---

## 1. Executive Summary

This document categorizes all technologies in the EffectsIO repository into four clear operational tiers:
1. **Currently Installed / Used**
2. **Installed but Not Yet Actively Used**
3. **Target / Future Architecture**
4. **Development / AI Infrastructure**

Dependencies are explicitly distinguished so that package presence in `package.json` is not confused with active runtime rendering code.

---

## 2. Technology Categorization Matrix

### 2.1 Category 1: Currently Installed / Used
Technologies actively executing in the current EffectsIO keep-alive codebase:

| Technology | Package / Version | Current Purpose in Codebase |
| :--- | :--- | :--- |
| **React 19** | `react` (`^19.2.0`), `react-dom` (`^19.2.0`) | App mounting in `src/main.tsx` and keep-alive shell root in `src/App.tsx`. |
| **TypeScript** | `typescript` (`^6.0.3`) | Language runtime and strict type checker (`tsc -p tsconfig.json --noEmit`). |
| **Vite** | `vite` (`^8.0.0`), `@vitejs/plugin-react` (`^6.0.1`) | Development server, HMR, and production bundler. |
| **Tailwind CSS v4** | `tailwindcss` (`^4.1.18`), `@tailwindcss/vite` (`^4.1.18`) | Styling engine (`@import "tailwindcss";`, `@theme` directives in `src/styles.css`). |
| **Inter Variable Font** | `@fontsource-variable/inter` (`^5.2.8`) | Primary application typography font (`var(--font-sans)`). |
| **Lucide Icons** | `lucide-react` (`^0.511.0`) | Icon standard for application shell UI (Rule 5). |
| **Vitest** | `vitest` (`^3.0.5`) | Unit test runner executing pixel module tests in `src/effects/*.test.ts`. |
| **Canvas 2D Context** | HTML5 `CanvasRenderingContext2D` | Active rendering engine for full-viewport canvas clear and 12 pure `ImageData` effect modules. |

---

### 2.2 Category 2: Installed but Not Yet Actively Used
Packages installed in `package.json` for upcoming MVP UI/Layout phases, but **not yet imported or active in application code**:

| Technology | Package / Version | Intended Target Purpose |
| :--- | :--- | :--- |
| **react-resizable-panels** | `react-resizable-panels` (`^4.10.0`) | Multi-column resizable layout panels (Left Asset Sidebar, Center Viewport, Right Inspector) for Phase 1. |
| **Motion** | `motion` (`^11.16.3`) | Micro-animations and panel transitions for Phase 1 UI. |
| **@dnd-kit** | `@dnd-kit/core` (`^6.3.1`), `@dnd-kit/sortable` (`^10.0.0`), `@dnd-kit/utilities` (`^3.2.2`) | Drag-and-drop mechanics for Image Library sorting (Phase 2) and Effect Stack reordering (Phase 4). |
| **Three.js** | `three` (`0.185.1`) | WebGL 3D/shader rendering engine reserved for V2 procedural backgrounds and GPU shaders. |
| **fflate** | `fflate` (`0.8.3`) | High-performance ZIP archiving reserved for Phase 5 batch export download. |
| **mediabunny** | `mediabunny` (`1.52.2`) | Video/audio encoding reserved for V2 animated canvas export (GIF/MP4). |
| **sonner** | `sonner` (`^2.0.7`) | Toast notifications for Phase 2 asset upload errors & export feedback. |
| **clsx / tailwind-merge / cva** | `clsx`, `tailwind-merge`, `class-variance-authority` | Dynamic class merging utilities for Phase 1 primitive components. |

---

### 2.3 Category 3: Target / Future Architecture
APIs and Web standards required by `PRD.md` that are target architectural patterns:

| Technology / API | Architecture Tier | Target Purpose |
| :--- | :--- | :--- |
| **OffscreenCanvas API** | Browser Web API | Background worker thread pixel rendering for Phase 5 non-blocking batch export. |
| **HTML5 File / Drag & Drop API** | Browser Web API | Image asset import, Blob creation, and drag-and-drop upload in Phase 2. |
| **WebGL 2.0 / Custom Shaders** | Browser Web API / Three.js | V2 procedural backgrounds, particle fields, fluid noise, and GPU post-processing. |
| **File System Access API** | Browser Web API | Direct local file saving for Phase 5 export & project state save/load. |

---

### 2.4 Category 4: Development & AI Infrastructure
Developer tooling and agent context optimization utilities operating outside the browser app:

| Tool | Distribution | Operational Purpose |
| :--- | :--- | :--- |
| **Graphify** | `graphifyy` (`0.9.50`) | Local AST repository knowledge graph (`graphify-out/graph.json`) used by AI agents for code navigation. |
| **Headroom Proxy** | `headroom-ai` (`0.35.0 / 0.36.5`) | Local HTTP context optimization proxy (`127.0.0.1:8787`) compressing tool outputs & preserving provider prompt cache. |

> **Critical Note**: Neither Graphify nor Headroom is bundled into or executed inside the EffectsIO browser client. They are strictly local developer infrastructure.
