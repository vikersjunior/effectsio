#!/usr/bin/env node

/**
 * EffectsIO Public Repository Provenance Checker
 *
 * Enforces Rule 15: The public repository must describe EffectsIO strictly as its own
 * product, architecture, and design system. Historical development environments,
 * obsolete runtime identifiers, and external product provenance must not be introduced
 * into tracked public files.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BANNED_PATTERNS = [
  { name: "Obsolete external runtime name (unhyphenated)", regex: new RegExp(["t", "o", "o", "l", "c", "r", "a", "f", "t"].join(""), "i") },
  { name: "Obsolete external runtime name (hyphenated)", regex: new RegExp(["t", "o", "o", "l", "-", "c", "r", "a", "f", "t"].join(""), "i") },
  { name: "Obsolete external runtime name (spaced)", regex: new RegExp(["t", "o", "o", "l", " ", "c", "r", "a", "f", "t"].join(""), "i") },
];

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".svgz",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".zip", ".tar", ".gz", ".bundle", ".mp4", ".webm"
]);

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output.split("\n").map(f => f.trim()).filter(Boolean);
}

function checkFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return [];
  }

  // Allow check-public-provenance.mjs to reference check patterns
  const normalizedPath = filePath.replace(/\\/g, "/");
  if (normalizedPath === "scripts/check-public-provenance.mjs") {
    return [];
  }

  if (!fs.existsSync(filePath)) {
    return [];
  }

  let content;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch {
    // If not utf8 readable, skip binary
    return [];
  }

  const lines = content.split("\n");
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.regex.test(line)) {
        violations.push({
          file: filePath,
          line: i + 1,
          pattern: pattern.name,
          content: line.trim()
        });
      }
    }
  }

  return violations;
}

function main() {
  console.log("Running EffectsIO Public Repository Provenance Check...");
  const trackedFiles = getTrackedFiles();
  let totalViolations = 0;

  for (const file of trackedFiles) {
    const violations = checkFile(file);
    if (violations.length > 0) {
      for (const v of violations) {
        console.error(`[PROVENANCE VIOLATION] ${v.file}:${v.line} (${v.pattern})`);
        console.error(`  > ${v.content}`);
      }
      totalViolations += violations.length;
    }
  }

  if (totalViolations > 0) {
    console.error(`\nFAILED: Found ${totalViolations} public provenance violation(s).`);
    console.error("Public EffectsIO tracked files must describe EffectsIO as its own product and architecture.");
    process.exit(1);
  }

  console.log("PASSED: Zero external runtime/provenance references found in tracked files.");
  process.exit(0);
}

main();
