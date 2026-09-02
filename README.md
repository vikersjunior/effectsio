# EffectsIO

EffectsIO is a standalone workstation for custom, non-destructive 2D pixel transformations built with React 19, TypeScript, Vite, and Tailwind CSS v4.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm dev

# Run type check
pnpm typecheck

# Run unit tests
pnpm test

# Build production bundle
pnpm build
```

---

## AI Development / Headroom Context Optimization

EffectsIO integrates [Headroom](docs/ai/headroom.md) as a local context optimization proxy for AI coding agents (Claude Code, Cursor, OpenCode, Antigravity, Aider).

Headroom compresses repetitive tool outputs, terminal logs, and search results while preserving prompt-cache stability and source code AST integrity.

### Starting the Headroom Proxy Environment:

```bash
# Start Headroom proxy server
pnpm agent:proxy

# Check token savings metrics
pnpm agent:stats

# Run A/B structural integrity test
pnpm agent:ab-test

# Start Vite dev server pre-configured for Headroom proxy
pnpm dev:agent
```

For detailed documentation, configuration options, and troubleshooting, see [`docs/ai/headroom.md`](docs/ai/headroom.md).

---

## AI Development / Graphify Repository Intelligence

EffectsIO integrates [Graphify](docs/ai/graphify.md) to provide AST-based repository intelligence and graph navigation for AI coding agents.

```bash
# Build knowledge graph
pnpm graphify:build

# Incrementally update graph
pnpm graphify:update

# Query knowledge graph
graphify query "effect registry"
```

For detailed workflows, node explanations, and path tracing, see [`docs/ai/graphify.md`](docs/ai/graphify.md).
