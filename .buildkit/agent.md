# BuildKit Agent Configuration

Selected agents: claude codex antigravity

Canonical BuildKit workflow skills: .buildkit/workflow-skills/
Canonical BuildKit capability library: .buildkit/skills-library/

Native active skills directories:
- claude: .claude/skills/
- codex: .agents/skills/
- antigravity: .agents/skills/

## BUILDKIT PROJECT DOCUMENTATION ROOT

BuildKit execution state lives at:
.buildkit/

BuildKit project documentation location is defined in:
.buildkit/config.json

The configuration field `docs.root` defines the project documentation root relative to the project root (currently: "docs/buildkit").
If .buildkit/config.json does not exist, the project documentation root is the project root (.).

Before accessing a BuildKit-managed project document:
1. Read .buildkit/config.json if it exists.
2. Resolve docs.root relative to the project root.
3. If no configuration exists, use the project root (.).
4. Resolve the requested document relative to that directory.
5. Never assume PRD.md or other BuildKit documents are located at the project root.

Documents:
- PRD: <docs.root>/PRD.md
- Architecture: <docs.root>/architecture.md
- Tech Stack: <docs.root>/Tech_stack.md
- Implementation Plan: <docs.root>/Implementation_plan.md
- Rules: <docs.root>/rules.md
- Progress: <docs.root>/Progress.md

## Portability rule

BuildKit workflow skills must not assume a vendor-specific path. Resolve the native active skills directory from this file when a workflow needs to inspect or promote skills.
