# Graphify Repository Intelligence for EffectsIO

## Overview & Purpose

**Graphify** serves as a structural repository intelligence layer for EffectsIO. It builds an AST-based dependency and relationship graph of the codebase, enabling AI coding agents to navigate architecture, locate relevant components, trace call chains, and answer structural questions before modifying source files.

### The Complementary AI Workflow:

```
[ AI Request / Task ]
         │
         ▼
 1. [ Graphify ] ──────────────► Finds smallest relevant file set & call graphs
         │                       (Reduces raw context volume)
         ▼
 2. [ Targeted File Reads ] ───► Agent inspects only identified source files
         │
         ▼
 3. [ Headroom Proxy ] ────────► Compresses tool outputs & terminal logs
         │                       (Reduces token cost & preserves cache)
         ▼
   [ Upstream LLM ]
```

---

## Installation & Setup

Graphify is installed locally via Python tool execution:

```bash
# Official installation
pip install graphifyy

# Install project-level skill and agent guidance hooks
graphify install --project --strict
```

---

## Developer & Agent Commands

| Command | Action |
| :--- | :--- |
| `pnpm graphify:build` / `graphify extract . --code-only` | Builds full AST graph into `graphify-out/graph.json` |
| `pnpm graphify:update` / `graphify . --update` | Incrementally updates graph after source edits |
| `graphify query "<question>"` | Search the knowledge graph for symbols, concepts, or subsystems |
| `graphify explain "<node>"` | Inspect connections, imports, and callers for a specific node |
| `graphify path "<nodeA>" "<nodeB>"` | Find the shortest dependency path between two components |
| `graphify god-nodes` | List top architectural hub nodes (most connected functions/types) |

---

## Standard AI Agent Workflow for Code Changes

Before modifying unfamiliar code in EffectsIO, agents follow this 8-step protocol:

1. **Query**: Run `graphify query "<feature or question>"` to locate candidate nodes.
2. **Hub Analysis**: Run `graphify god-nodes` or `graphify explain "<symbol>"` to inspect dependencies.
3. **Trace Path**: Run `graphify path "<SourceComponent>" "<TargetComponent>"` to trace execution flow.
4. **Targeted Read**: Read **only** the identified source files (avoiding bulk directory sweeps).
5. **Modify Code**: Implement the requested change cleanly.
6. **Verify**: Run `pnpm typecheck && pnpm test && pnpm build`.
7. **Update Graph**: Run `graphify . --update` if relationships or exports changed significantly.
8. **Verify Compression**: Headroom proxy handles context compression transparently.

---

## Common EffectsIO Architectural Queries

### 1. Effect Engine & Registry Navigation

```bash
# Find how effects are registered and dispatched
graphify query "effect registry"

# Explain the main entry point for pixel algorithms
graphify explain "applyEffect"

# Trace path from registry definition to engine dispatch
graphify path "EFFECT_REGISTRY" "applyEffect"
```

### 2. Canvas & Image State Navigation

```bash
# Find image state and canvas rendering definitions
graphify query "canvas ImageData"

# Inspect image transformation utility functions
graphify explain "cloneImageData"

# Trace path between canvas utilities and pixel modules
graphify path "canvas-utils.ts" "halftoneEffect"
```

---

## Committed Graph Artifacts

The repository commits pre-built graph outputs under `graphify-out/`:
- `graphify-out/graph.json`: Structural graph data (193 nodes, 321 edges).
- `graphify-out/manifest.json`: Manifest hash tracker for incremental updates.
- `.graphifyignore`: Excludes `node_modules/`, `dist/`, build artifacts, and logs from indexing.

> Local cost files and transient caches are excluded from version control via `.gitignore`.
