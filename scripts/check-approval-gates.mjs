#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const BUILDKIT_DIR = path.join(ROOT_DIR, 'docs', 'buildkit');
const APPROVALS_DIR = path.join(ROOT_DIR, 'docs', 'approvals');

function checkApprovalGates() {
  console.log('=== Mechanical Approval Gate Verification ===\n');

  if (!fs.existsSync(BUILDKIT_DIR)) {
    console.log('No docs/buildkit directory found. Skipping check.');
    process.exit(0);
  }

  const planningFiles = fs.readdirSync(BUILDKIT_DIR)
    .filter((file) => file.endsWith('.md') && !file.startsWith('._'));

  const pendingGates = [];
  const decisionRegex = /(?:PROJECT\s+)?OWNER\s+DECISION\s+REQUIRED/i;
  const approvedRegex = /^APPROVED:\s+.+$/m;

  for (const file of planningFiles) {
    const filePath = path.join(BUILDKIT_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    if (decisionRegex.test(content)) {
      // Find all sections or occurrences of owner decision required
      const lines = content.split('\n');
      let currentSection = file;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#')) {
          currentSection = line.replace(/^#+\s*/, '').trim();
        }
        if (decisionRegex.test(line)) {
          pendingGates.push({
            file,
            section: currentSection,
            line: i + 1,
          });
        }
      }
    }
  }

  // Also check all files in docs/approvals/
  let approvalFiles = [];
  if (fs.existsSync(APPROVALS_DIR)) {
    approvalFiles = fs.readdirSync(APPROVALS_DIR).filter((file) => file.endsWith('.md'));
  }

  console.log(`Found ${pendingGates.length} active decision gate(s) in docs/buildkit/.`);
  console.log(`Found ${approvalFiles.length} approval file(s) in docs/approvals/.\n`);

  const unapproved = [];

  // Check each gate
  if (pendingGates.length > 0) {
    for (const gate of pendingGates) {
      console.log(`[GATE] Document: docs/buildkit/${gate.file} (Section: "${gate.section}", Line: ${gate.line})`);
      
      // Look for candidate approval files in docs/approvals/
      let satisfied = false;
      let matchedFile = null;

      for (const appFile of approvalFiles) {
        const appFilePath = path.join(APPROVALS_DIR, appFile);
        const appContent = fs.readFileSync(appFilePath, 'utf-8');

        if (approvedRegex.test(appContent)) {
          // Check if this approval corresponds to the phase/gate
          const match = appContent.match(approvedRegex);
          console.log(`  -> Found valid approval signature in docs/approvals/${appFile}: "${match[0]}"`);
          satisfied = true;
          matchedFile = appFile;
          break;
        } else {
          console.log(`  -> docs/approvals/${appFile} exists but lacks literal "APPROVED: <date>" signature (Pending Owner Review)`);
        }
      }

      if (!satisfied) {
        unapproved.push({
          gate,
          reason: matchedFile
            ? `Approval file docs/approvals/${matchedFile} lacks literal "APPROVED: <date>"`
            : `No approval file in docs/approvals/ contains literal "APPROVED: <date>"`,
        });
      }
    }
  }

  // Also check if any file in docs/approvals/ exists without an APPROVED line
  for (const appFile of approvalFiles) {
    const appFilePath = path.join(APPROVALS_DIR, appFile);
    const appContent = fs.readFileSync(appFilePath, 'utf-8');
    if (!approvedRegex.test(appContent)) {
      const alreadyListed = unapproved.some((u) => u.reason.includes(appFile));
      if (!alreadyListed) {
        unapproved.push({
          gate: { file: `docs/approvals/${appFile}`, section: 'Approval Packet', line: 1 },
          reason: `Review packet docs/approvals/${appFile} is PENDING and has not been signed with "APPROVED: <date>"`,
        });
      }
    }
  }

  if (unapproved.length > 0) {
    console.error('\n❌ APPROVAL GATE VERIFICATION FAILED');
    console.error(`The following ${unapproved.length} gate(s) require explicit project-owner approval before implementation can proceed:\n`);
    for (const item of unapproved) {
      console.error(`- ${item.gate.file} [${item.gate.section}]: ${item.reason}`);
    }
    console.error('\nPer AGENTS.md Rule 12, implementation CANNOT proceed past an owner decision gate without a matching docs/approvals/<phase-slug>.md containing "APPROVED: <date>".');
    process.exit(1);
  }

  console.log('✅ All mechanical approval gates verified.');
  process.exit(0);
}

checkApprovalGates();
