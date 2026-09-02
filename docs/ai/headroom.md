# Headroom Integration for EffectsIO AI Development Workflow

## Overview & Purpose

EffectsIO uses **Headroom** as a local context-optimization layer between AI coding agents (Claude Code, Cursor, OpenCode, Antigravity, Aider) and LLM providers (Anthropic, OpenAI, OpenRouter).

### Key Goals:
- **Maximize Effective Context Utilization**: Reclaim token space consumed by long tool outputs, terminal logs, and repetitive file readings.
- **Provider Prompt Cache Stability**: Preserve static prompt prefixes (`mode: cache`) so Anthropic and OpenAI prompt-cache hits remain high.
- **Protect Critical Source Code**: Prevent AST degradation, symbol erasure, or instruction stripping for code, types, stack traces, and active user instructions.
- **Pure Infrastructure Separation**: Headroom operates strictly on AI coding agent traffic and is **never** bundled into the web application or image rendering engine.

---

## Architecture

```
[ AI Coding Agent ]
        │
        ▼  (HTTP / OPENAI_BASE_URL / ANTHROPIC_BASE_URL)
[ Headroom Proxy (127.0.0.1:8787) ]
  ├── Mode: Cache (Prefix cache stabilization)
  ├── Profile: Coding (AST-aware structural protection)
  ├── Tool Result Interceptor (Compress oversized grep/read output)
  └── Workspace Memory (Project-scoped persistent learning)
        │
        ▼  (Upstream LLM Provider)
[ Anthropic / OpenAI / OpenRouter ]
```

---

## Installation & Setup

Headroom is installed as a Python development package (`headroom-ai[proxy]`):

```bash
# Install Headroom proxy dependencies globally or in local virtual environment
pip install "headroom-ai[proxy]"
```

---

## Development Commands

| Command | Purpose |
| :--- | :--- |
| `pnpm agent:proxy` | Starts the Headroom optimization proxy server on `http://127.0.0.1:8787` |
| `pnpm agent:stats` | Displays live token savings, compression ratio, cache reads, and request stats |
| `pnpm agent:ab-test` | Runs a structural preservation benchmark on EffectsIO registry & unit test context |
| `pnpm dev:agent` | Launches Vite dev server with `HEADROOM_BASE_URL` pre-configured |

---

## Environment Configuration

Copy `.env.example` to `.env` for local setup:

```ini
HEADROOM_HOST=127.0.0.1
HEADROOM_PORT=8787
HEADROOM_MODE=cache
HEADROOM_PROFILE=coding

HEADROOM_BASE_URL=http://127.0.0.1:8787
ANTHROPIC_BASE_URL=http://127.0.0.1:8787
OPENAI_BASE_URL=http://127.0.0.1:8787/v1
```

> **Security Note**: Never commit API keys or `.env` files to Git.

---

## Compression Profile & Protection Rules

EffectsIO uses the **`coding`** profile in **`cache`** mode:
- **`mode: cache`**: Prioritizes provider prompt caching. Preserves static message prefixes to maximize cache hit discount on long sessions.
- **`code-aware`**: Protects high-entropy symbols: function signatures, type definitions, interface names, line numbers, file paths, error messages, and Git commit hashes.
- **`protect_recent`**: Preserves the 4 most recent turns verbatim.

---

## Monitoring & Metrics

Inspect token savings at any time:

```bash
pnpm agent:stats
```

Sample Output:
```
==================================================
  Headroom Context Optimization Metrics (EffectsIO)
==================================================
Status            : Active
Proxy Endpoint    : http://127.0.0.1:8787
Optimization Mode : cache
Total Requests    : 14
Input Tokens      : 42,150
Output Tokens     : 1,840
Tokens Saved      : 18,320
Saved Percentage  : 43.46%
Cache Reads       : 31,500
Average Latency   : 18 ms
==================================================
```

---

## Disabling Headroom

If you wish to bypass Headroom and connect your agent directly to upstream providers:

1. Stop the proxy process (`pnpm agent:proxy`).
2. Unset proxy environment variables or launch your agent without `HEADROOM_BASE_URL`:
   ```bash
   unset ANTHROPIC_BASE_URL OPENAI_BASE_URL HEADROOM_BASE_URL
   ```
3. Normal development remains 100% functional without Headroom running.
