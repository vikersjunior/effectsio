#!/usr/bin/env node

/**
 * ==============================================================================
 * EffectsIO Competitor Reference Gatekeeper
 * ==============================================================================
 * Rule 14 (AGENTS.md): No competitor references in tracked files.
 *
 * INSTRUCTIONS FOR FUTURE CODING AGENTS / SESSIONS:
 * Whenever you conduct a new reference study or research an external product,
 * you MUST append the newly-studied product's name, domain, and aliases to the
 * DENY_LIST array below as part of that study — NOT as an afterthought.
 *
 * Full attributed findings must go in `docs/research/` (git-ignored) or the
 * project owner's private records. Scraping/analysis tooling must go in
 * `.research-scratch/` (git-ignored).
 * ==============================================================================
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Deny-list of competitor product names, domains, and author handles.
// Add any newly researched products/domains here.
const DENY_LIST = [
  "Pryzm",
  "GradLab",
  "HeroKit",
  "Ditther",
  "fx/studio",
  "fxstudio",
  "zoxilsi",
  "pattern-craft",
  "Ladybug",
  "theladybug",
  "designminis",
  "basement.studio",
  "willnewton",
  "kacemmathlouthi",
];

// Files exempt from this check (the validator itself and historical governance/cleanup records)
const EXEMPT_FILES = new Set([
  "scripts/check-no-competitor-refs.mjs",
  "AGENTS.md",
  "docs/worklog.md",
]);

// Binary file extensions to skip
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".mp4",
  ".webm",
  ".zip",
  ".pdf",
]);

function runCheck() {
  console.log("Checking git-tracked files for competitor references...");

  let trackedFiles = [];
  try {
    const stdout = execSync("git ls-files", { encoding: "utf-8" });
    trackedFiles = stdout
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch (err) {
    console.error("Failed to execute git ls-files:", err.message);
    process.exit(1);
  }

  const violations = [];

  // Compile regex patterns for case-insensitive matching
  const patterns = DENY_LIST.map((term) => ({
    term,
    regex: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  }));

  for (const relPath of trackedFiles) {
    if (EXEMPT_FILES.has(relPath)) {
      continue;
    }

    // Also check the filename itself
    for (const { term, regex } of patterns) {
      if (regex.test(relPath)) {
        violations.push({
          file: relPath,
          line: 0,
          matchedTerm: term,
          snippet: `[Filename Match] ${relPath}`,
        });
      }
    }

    const ext = path.extname(relPath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      continue;
    }

    const absPath = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(absPath)) {
      continue;
    }

    let content = "";
    try {
      content = fs.readFileSync(absPath, "utf-8");
    } catch {
      // If file cannot be read as utf-8, skip
      continue;
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { term, regex } of patterns) {
        if (regex.test(line)) {
          violations.push({
            file: relPath,
            line: i + 1,
            matchedTerm: term,
            snippet: line.trim(),
          });
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(
      `\n❌ VIOLATION: Found ${violations.length} competitor reference(s) in git-tracked files!\n`
    );
    for (const v of violations) {
      if (v.line === 0) {
        console.error(`  - ${v.file}: matched '${v.matchedTerm}' in filename`);
      } else {
        console.error(
          `  - ${v.file}:${v.line}: matched '${v.matchedTerm}' -> "${v.snippet}"`
        );
      }
    }
    console.error(
      "\nPer Rule 14 (AGENTS.md): Full attributed research belongs in docs/research/ (git-ignored) or .research-scratch/ (git-ignored), never in tracked files.\n"
    );
    process.exit(1);
  }

  console.log(
    `✓ Pass: Scanned ${trackedFiles.length} tracked files against ${DENY_LIST.length} deny-list terms. Zero competitor references found.`
  );
}

runCheck();
