# EffectsIO Development Guide & Rulebook

## Primary Rules & Operating Principles

1. **Rule 1 — Literal Empirical Evidence Required**: Never claim a feature, control, renderer, component, or build step works without literal evidence (e.g. build logs, typecheck output, test executions).
2. **Rule 2 — Design System Tokens**: All UI components and styling must consume variables and design tokens declared in `src/styles.css` (e.g., `var(--background)`, `var(--foreground)`, `var(--primary)`, `var(--radius)`). Never hardcode ad-hoc hex colors or arbitrary pixel sizes in app code.
3. **Rule 3 — Canvas Output Separation**: Product canvas output belongs inside canvas rendering logic. Never render app UI elements directly inside the canvas buffer.
4. **Rule 4 — Modular Pixel Effect Architecture**: Pure pixel-transformation algorithms reside in `src/effects/modules/` as pure, side-effect-free functions operating on `ImageData` parameters.
5. **Rule 5 — Icons & Sizing Consistency**: Use `@phosphor-icons/react` exclusively for UI icons throughout the application shell (regular weight default, contextual fill/light variants where designated). Follow canonical EffectsIO icon-sizing conventions: equivalent icons performing the same semantic role at the same UI scale must use the same canonical size (consume `ICON_SIZES` from `src/components/ui`). Never introduce arbitrary ad-hoc icon dimensions for individual components. Figma remains authoritative when it intentionally specifies a different size. Hit areas (button bounds) must remain decoupled from icon glyph dimensions.
6. **Rule 6 — Code Health & Type Safety**: All TypeScript code must pass strict type checking (`pnpm typecheck`) with zero errors.
7. **Rule 7 — Runnable State Invariant**: The repository must remain in a runnable, buildable state (`pnpm dev`, `pnpm build`) after every change.
8. **Rule 8 — Non-Destructive Editing & Source of Truth State**: Original asset bitmaps remain intact and immutable. `activeImageId` is the single source of truth for the active canvas asset. Never introduce duplicate active-image selection state in toolbars, panels, or other UI surfaces.
9. **Rule 9 — Native Component System Ownership**: EffectsIO owns 100% of its native application primitives and design system declared in `docs/design-system/effectsio-component-system.md` and `docs/design-system/component-rules.md`. All UI surfaces must consume EffectsIO canonical components directly.
10. **Rule 10 — Graphify Mandatory Architectural Intelligence**: Graphify is a permanent architectural development requirement. AI coding agents MUST use Graphify (`graphify query`, `graphify explain`, `graphify path`) before performing:
    - architectural changes
    - cross-cutting changes
    - unfamiliar codebase changes
    - dependency-sensitive changes
    - effect engine changes
    - state architecture changes
    - rendering pipeline changes
    - major refactoring
    *(Trivial isolated documentation or formatting changes do not require Graphify.)*
    - **Pre-Implementation Requirement**: Before writing source code, run targeted Graphify queries to investigate relevant architecture, symbols, dependencies, and trace existing execution paths. Record the meaningful queries and architectural facts established.
    - **Post-Implementation Requirement**: Run `pnpm graphify:update` and verify that the updated/new architecture is correctly reflected in the knowledge graph.
    - Graphify is development infrastructure only and must never become part of the EffectsIO browser runtime.
11. **Rule 11 — Headroom Context and Token Optimization**: Headroom is the established context-optimization layer for AI coding-agent workflows. It operates alongside Graphify rather than replacing it:
    - **Pre-Flight Check & Attempted Activation**: Before beginning an implementation session, determine whether the Headroom agent proxy is available. Where practical, conduct development through the project's Headroom proxy (`pnpm dev:agent` / `pnpm agent:proxy`) to compress context, reduce tool output overhead, and eliminate token waste.
    - **Graceful Diagnostic & Honest Reporting**: If Headroom is unavailable, diagnose the reason and make a reasonable attempt to activate or connect to the proxy before proceeding. If it cannot be activated in the current environment, proceed without it rather than blocking unrelated implementation work, but explicitly document: (1) that Headroom was unavailable, (2) why it was unavailable, (3) what activation attempt was made, and (4) that no Headroom usage or statistics are being claimed.
    - **Zero Fabrication Invariant**: Never fabricate Headroom usage, proxy statistics, compression ratios, token savings, or other metrics.
12. **Rule 12 — Mechanical approval gates, not prose gates**: If a plan document states that a decision requires project-owner approval before implementation, that gate is satisfied ONLY by the existence of a matching `docs/approvals/<phase-slug>.md` file containing the literal line `"APPROVED: <date>"` — checked by `pnpm verify:approvals`. Do not proceed past a documented owner-decision gate based on your own confidence in the direction, the absence of an objection, or a partial/ambiguous response. Run `pnpm verify:approvals` before starting implementation on any phase that has an associated gate, and paste its output as part of your verification evidence for that phase, per Rule 1.
13. **Rule 13 — Pre-Implementation Environment & Pre-Flight Gate**: **STOP BEFORE IMPLEMENTATION:** Always establish the Graphify + Headroom development environment first. Do not begin source-code implementation on any feature or phase until:
    - The pre-implementation Graphify investigation has been performed and documented; and
    - Headroom proxy availability has been explicitly checked and activation attempted.
14. **Rule 14 — No competitor references in tracked files**: Reference-study and competitive-research work must never result in a studied product's name appearing in any git-tracked file — not in a script filename, not in a code comment, not in `PRD.md` or any other tracked document.
    - Full attributed findings go in `docs/research/` (git-ignored) or the project owner's private records — never in a tracked file.
    - Scraping/analysis tooling for a specific named product goes in `.research-scratch/` (git-ignored) — never committed, regardless of how generic its filename is.
    - Tracked documents (`PRD.md`, design-system docs, any doc without an explicit private/gitignored path) state findings by their conclusion and rationale only — "client-side MediaRecorder-based video export is a proven, zero-server pattern" is fine; naming which product proved it is not.
    - Before committing any reference-study output, run `pnpm check:no-competitor-refs` and confirm it passes.
15. **Rule 15 — Public Repository Provenance & Identity**: The public EffectsIO repository must describe EffectsIO strictly as its own product, architecture, and design system. Historical development environments, obsolete runtime identifiers, and external product provenance must not be introduced into tracked public files. Private research may exist outside the public repository in git-ignored directories (`docs/research/`, `.research-scratch/`). Run `pnpm check:public-provenance` before completing repository changes.

---

## Combined Governance Principle: Graphify & Headroom

Graphify and Headroom serve distinct, complementary purposes:
- **Graphify answers**: *"How is this repository structured, and what is connected to what?"*
- **Headroom answers**: *"How can the agent reason over that information with less unnecessary context and token waste?"*

Neither tool replaces the other. Graphify provides structural/codebase intelligence; Headroom optimizes the context delivered to the coding agent. Both must be deliberately incorporated into the development workflow.

### Implementation & Audit Report Requirement
Every implementation report and phase governance audit must contain a dedicated **Graphify & Headroom Actual-Use** section distinguishing:
1. What Graphify was actually used for (pre-implementation queries, dependency mapping, post-implementation update).
2. What Headroom was actually used for (proxy active/inactive, context optimization).
3. Any failed activation attempts and diagnostics.
4. What, if anything, could not be verified.

*Note: Neither tool may be marked as "used" solely because its CLI exists, its package is installed, or a post-hoc synchronization command was run. Usage must refer to an actual contribution to the development workflow.*

---

## Graphify Usage Guidelines

This project has a knowledge graph at `graphify-out/` with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when `graphify-out/graph.json` exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- Dirty `graphify-out/` files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If `graphify-out/wiki/index.md` exists, use it for broad navigation instead of raw source browsing.
- Read `graphify-out/GRAPH_REPORT.md` only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` (or `pnpm graphify:update`) to keep the graph current (AST-only, no API cost).

---

---

## Canonical Documentation Hierarchy & Required Reading Rules

```text
AGENTS.md
  ↓
Engineering + governance rules

docs/buildkit/PRD.md
  ↓
Product requirements, architecture direction, roadmap, phase scope

docs/design-system/effectsio-ui-system.md
  ↓
EffectsIO visual + interaction system

docs/design-system/effectsio-component-system.md
  ↓
EffectsIO component ownership + semantic usage

docs/design-system/component-rules.md
  ↓
Operational UI/design-system enforcement

docs/reference-study.md
  ↓
Verified external-reference findings

src/
  ↓
Actual implementation

docs/worklog.md
  ↓
Evidence and implementation history
```

### 1. UI Work
Before changing any UI component, screen, layout, interaction, styling, design token, or visual behavior, agents MUST read:
- `docs/buildkit/PRD.md`
- `docs/design-system/effectsio-ui-system.md`
- `docs/design-system/effectsio-component-system.md`
- `docs/design-system/component-rules.md`

Agents must inspect the repository for existing canonical components before creating a new UI component.

### 2. Product / Architecture Work
Before changing product behavior, state architecture, persistence, rendering architecture, export architecture, or phase scope, agents MUST read:
- `docs/buildkit/PRD.md`
- The relevant architecture/governance documentation (`docs/buildkit/architecture.md`, `AGENTS.md`)
- `AGENTS.md`

### 3. Reference-Driven Work
When a task involves studying, reproducing, comparing against, or making architectural decisions based on an external product or repository, agents MUST read:
- `docs/reference-study.md`
- `docs/reference-study-prompts.md` when conducting or extending a reference study

Reference findings MUST distinguish:
- **Observed**
- **Source-inspected**
- **Inferred**
- **Unknown**

Agents MUST NOT present inferred or expected behavior as observed behavior.

### 4. Component Creation Rule
Before creating a reusable UI component, agents MUST:
1. Read `docs/design-system/effectsio-component-system.md`.
2. Search `src/components/`.
3. Identify the semantic role.
4. Reuse the canonical component when one exists.
5. Extend the existing component when a reusable variant is appropriate.
6. Create a new component only when the semantic role is genuinely new.
7. Document meaningful new component-system decisions.

Do not create duplicate components merely because a page needs slightly different styling.

### 5. Conflict Resolution
Use this hierarchy:
- **Product intent** → `docs/buildkit/PRD.md`
- **Visual / interaction intent** → `docs/design-system/effectsio-ui-system.md`
- **Component semantic choice** → `docs/design-system/effectsio-component-system.md`
- **Operational design-system enforcement** → `docs/design-system/component-rules.md`
- **Reference evidence** → `docs/reference-study.md`
- **Engineering / governance rules** → `AGENTS.md`

When a conflict cannot be resolved from the documentation, **STOP** and request a human decision rather than silently choosing an interpretation.

### 6. Graphify and Headroom
Preserve the existing permanent Graphify and Headroom governance already defined by this project:
- For architectural/codebase changes: use Graphify before implementation when dependency/architecture mapping is useful or required, and synchronize Graphify (`pnpm graphify:update`) after meaningful implementation changes.
- For development sessions: use Headroom where practical for context/tool-output optimization, report actual Headroom status honestly, and never fabricate usage or metrics.

### 7. Documentation Duplication Constraint
Do not copy the full contents of the PRD, UI system, component system, component rules, or reference study into `AGENTS.md`. `AGENTS.md` should contain the required-reading rules and governance, while the dedicated documents remain the detailed sources of truth.

---

## Governance Worklog

- **Entry 2026-09-02 (Clean Public Git History Migration & Provenance Governance)**:
  - Added Rule 15 (Public Repository Provenance & Identity) mandating that the public repository describe EffectsIO as its own product and architecture.
  - Implemented mechanical provenance checker `scripts/check-public-provenance.mjs` (`pnpm check:public-provenance`).
  - Rewrote git history on `main` to create a clean EffectsIO initial baseline.
- **Entry 2026-09-02 (Permanent Competitor Reference Rule & Mechanical Gate Pass)**:
  - Added Rule 14 (No competitor references in tracked files).
  - Codified private research storage in `docs/research/` and `.research-scratch/` (both git-ignored).
  - Established mechanical enforcement via `pnpm check:no-competitor-refs` (`scripts/check-no-competitor-refs.mjs`).
- **Entry 2026-08-31 (Canonical Documentation Reading Rules & Hierarchy Pass)**:
  - Added Canonical Documentation Hierarchy and mandatory reading rules for UI work, Product/Architecture work, and Reference-driven work.
  - Added Component Creation algorithm and explicit multi-tier Conflict Resolution hierarchy.
  - Codified Reference study epistemic standards (Observed, Source-inspected, Inferred, Unknown).
  - Enforced Documentation Duplication Constraint preserving single sources of truth.
- **Entry 2026-08-28 (Graphify & Headroom Governance Integration & Pre-Flight Gate Pass)**:
  - Updated Rule 10 (Graphify Mandatory Architectural Intelligence) to enforce pre-implementation dependency/symbol queries and post-implementation graph verification.
  - Updated Rule 11 (Headroom Context and Token Optimization) to require pre-flight proxy checks, honest diagnostic reporting when inactive, and zero fabrication.
  - Added Rule 13 (Pre-Implementation Environment & Pre-Flight Gate) establishing the mandatory pre-flight stop gate before source-code changes.
  - Established the Combined Governance Principle and mandatory dedicated report sections.
- **Entry 2026-08-28 (Mechanical Approval Gates & Governance Alignment Pass)**:
  - Added Rule 12 establishing mechanical verification (`pnpm verify:approvals` via `scripts/check-approval-gates.mjs`) requiring signed `docs/approvals/<phase-slug>.md` files with literal `APPROVED: <date>`.
  - Documented that prose confidence or implicit agreement is invalid for gating decisions.
- **Entry 2026-08-27 (Consolidation & Architecture Refresh Pass)**:
  - Consolidated `/AGENTS.md` and `/docs/buildkit/rules.md` into the single canonical root `/AGENTS.md`.
  - Retained Rules 1–7 and incorporated permanent Rule 8 (Non-Destructive Editing & Source of Truth State) and Rule 9 (Native Component System Ownership).
  - Split former Rule 10 into Rule 10 (Graphify) and Rule 11 (Headroom).
  - Deleted redundant `/docs/buildkit/rules.md`.

