#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT_DIR = process.cwd();
const BUILDKIT_DIR = path.join(ROOT_DIR, 'docs', 'buildkit');
const APPROVALS_DIR = path.join(ROOT_DIR, 'docs', 'approvals');

export function getSlugFromFilename(filename) {
  return filename.replace(/[-.]review\.md$/i, '').replace(/\.md$/i, '');
}

export function isReviewPacket(filename) {
  return /[-.]review\.md$/i.test(filename);
}

export function gateMatchesApproval(gate, appFile, fileContent) {
  const slug = getSlugFromFilename(appFile);
  const normalizedSection = gate.section.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, ' ');

  // 1. Direct mention in gate file content
  if (fileContent && (fileContent.includes(appFile) || fileContent.includes(slug))) {
    return true;
  }

  // 2. Exact slug match in normalized section
  if (normalizedSection.includes(normalizedSlug)) {
    return true;
  }

  // 3. Phase/stage number match (e.g., "stage 1", "phase 7")
  const slugTokens = normalizedSlug.split(' ').filter(Boolean);
  const phaseOrStageIdx = slugTokens.findIndex((t) => t === 'phase' || t === 'stage');
  if (phaseOrStageIdx !== -1 && slugTokens[phaseOrStageIdx + 1]) {
    const key = `${slugTokens[phaseOrStageIdx]} ${slugTokens[phaseOrStageIdx + 1]}`;
    if (normalizedSection.includes(key)) {
      return true;
    }
  }

  // 4. Token overlap threshold (>= 75% of slug tokens)
  const matchingTokens = slugTokens.filter((t) => normalizedSection.includes(t));
  if (slugTokens.length > 0 && matchingTokens.length >= Math.ceil(slugTokens.length * 0.75)) {
    return true;
  }

  return false;
}

export function checkApprovalGates(customApprovalsDir = APPROVALS_DIR, customBuildkitDir = BUILDKIT_DIR) {
  console.log('=== Mechanical Approval Gate Verification ===\n');

  if (!fs.existsSync(customBuildkitDir)) {
    console.log('No docs/buildkit directory found. Skipping check.');
    return true;
  }

  const planningFiles = fs.readdirSync(customBuildkitDir)
    .filter((file) => file.endsWith('.md') && !file.startsWith('._'));

  const pendingGates = [];
  const decisionRegex = /(?:PROJECT\s+)?OWNER\s+DECISION\s+REQUIRED/i;
  const approvedRegex = /^APPROVED:\s+(?!\s*<date>).+$/m;

  for (const file of planningFiles) {
    const filePath = path.join(customBuildkitDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    if (decisionRegex.test(content)) {
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

  let approvalFiles = [];
  if (fs.existsSync(customApprovalsDir)) {
    approvalFiles = fs.readdirSync(customApprovalsDir)
      .filter((file) => file.endsWith('.md') && !file.startsWith('._'));
  }

  console.log(`Found ${pendingGates.length} active decision gate(s) in docs/buildkit/.`);
  console.log(`Found ${approvalFiles.length} file(s) in docs/approvals/.\n`);

  const unapproved = [];

  // 1. Verify gates defined in docs/buildkit/
  if (pendingGates.length > 0) {
    for (const gate of pendingGates) {
      console.log(`[GATE] Document: docs/buildkit/${gate.file} (Section: "${gate.section}", Line: ${gate.line})`);

      const gateFilePath = path.join(customBuildkitDir, gate.file);
      const gateFileContent = fs.readFileSync(gateFilePath, 'utf-8');

      let satisfied = false;
      let matchedFile = null;

      for (const appFile of approvalFiles) {
        if (appFile.toLowerCase() === 'readme.md' || appFile.toLowerCase() === 'index.md') {
          continue;
        }

        if (gateMatchesApproval(gate, appFile, gateFileContent)) {
          const appFilePath = path.join(customApprovalsDir, appFile);
          const appContent = fs.readFileSync(appFilePath, 'utf-8');

          if (approvedRegex.test(appContent)) {
            const match = appContent.match(approvedRegex);
            console.log(`  -> Found valid approval signature in docs/approvals/${appFile}: "${match[0]}"`);
            satisfied = true;
            matchedFile = appFile;
            break;
          } else {
            // Check if there is an associated approval file
            const slug = getSlugFromFilename(appFile);
            const companionFile = `${slug}.md`;
            const companionPath = path.join(customApprovalsDir, companionFile);
            if (fs.existsSync(companionPath)) {
              const companionContent = fs.readFileSync(companionPath, 'utf-8');
              if (approvedRegex.test(companionContent)) {
                const match = companionContent.match(approvedRegex);
                console.log(`  -> Found valid companion approval signature in docs/approvals/${companionFile}: "${match[0]}"`);
                satisfied = true;
                matchedFile = companionFile;
                break;
              }
            }
            console.log(`  -> docs/approvals/${appFile} matches gate but lacks literal "APPROVED: <date>" signature`);
            matchedFile = appFile;
          }
        }
      }

      if (!satisfied) {
        unapproved.push({
          gate,
          reason: matchedFile
            ? `Matched approval file docs/approvals/${matchedFile} lacks literal "APPROVED: <date>"`
            : `No matching approval file in docs/approvals/ contains literal "APPROVED: <date>" for gate "${gate.section}"`,
        });
      }
    }
  }

  // 2. Verify files in docs/approvals/
  // Distinguish review packets (*-review.md) from actual owner approval records (*.md)
  const reviewPackets = [];
  const approvalRecords = [];

  for (const appFile of approvalFiles) {
    if (appFile.toLowerCase() === 'readme.md' || appFile.toLowerCase() === 'index.md') {
      continue;
    }
    if (isReviewPacket(appFile)) {
      reviewPackets.push(appFile);
    } else {
      approvalRecords.push(appFile);
    }
  }

  // Verify each owner approval record (must contain literal APPROVED: <date>)
  for (const appFile of approvalRecords) {
    const appFilePath = path.join(customApprovalsDir, appFile);
    const appContent = fs.readFileSync(appFilePath, 'utf-8');

    if (approvedRegex.test(appContent)) {
      const match = appContent.match(approvedRegex);
      console.log(`[APPROVAL RECORD] docs/approvals/${appFile}: Valid signature "${match[0]}"`);
    } else {
      console.error(`[UNAPPROVED RECORD] docs/approvals/${appFile}: Lacks literal "APPROVED: <date>" signature`);
      unapproved.push({
        gate: { file: `docs/approvals/${appFile}`, section: 'Owner Approval Record', line: 1 },
        reason: `Approval record docs/approvals/${appFile} lacks literal "APPROVED: <date>"`,
      });
    }
  }

  // Verify each review packet
  for (const reviewFile of reviewPackets) {
    const slug = getSlugFromFilename(reviewFile);
    const companionFile = `${slug}.md`;
    const companionPath = path.join(customApprovalsDir, companionFile);

    const reviewFilePath = path.join(customApprovalsDir, reviewFile);
    const reviewContent = fs.readFileSync(reviewFilePath, 'utf-8');

    // Case 1: Companion owner approval file exists
    if (fs.existsSync(companionPath)) {
      const companionContent = fs.readFileSync(companionPath, 'utf-8');
      if (approvedRegex.test(companionContent)) {
        const match = companionContent.match(approvedRegex);
        console.log(`[REVIEW PACKET] docs/approvals/${reviewFile}: Satisfied by owner approval in docs/approvals/${companionFile} ("${match[0]}")`);
      } else {
        const alreadyReported = unapproved.some((u) => u.gate.file.includes(companionFile));
        if (!alreadyReported) {
          unapproved.push({
            gate: { file: `docs/approvals/${reviewFile}`, section: 'Approval Packet', line: 1 },
            reason: `Review packet docs/approvals/${reviewFile} has associated approval file docs/approvals/${companionFile} which lacks literal "APPROVED: <date>"`,
          });
        }
      }
    }
    // Case 2: Self-contained approval signature within the review document
    else if (approvedRegex.test(reviewContent)) {
      const match = reviewContent.match(approvedRegex);
      console.log(`[REVIEW PACKET] docs/approvals/${reviewFile}: Self-contained approval signature ("${match[0]}")`);
    }
    // Case 3: Review packet is pending and has no companion approval file
    else {
      console.log(`[PENDING PACKET] docs/approvals/${reviewFile}: Awaiting owner approval (docs/approvals/${companionFile} does not exist)`);
      unapproved.push({
        gate: { file: `docs/approvals/${reviewFile}`, section: 'Approval Packet', line: 1 },
        reason: `Review packet docs/approvals/${reviewFile} is PENDING and matching approval file docs/approvals/${companionFile} does not exist`,
      });
    }
  }

  if (unapproved.length > 0) {
    console.error('\n❌ APPROVAL GATE VERIFICATION FAILED');
    console.error(`The following ${unapproved.length} gate(s) require explicit project-owner approval before implementation can proceed:\n`);
    for (const item of unapproved) {
      console.error(`- ${item.gate.file} [${item.gate.section}]: ${item.reason}`);
    }
    console.error('\nPer AGENTS.md Rule 12, implementation CANNOT proceed past an owner decision gate without a matching docs/approvals/<phase-slug>.md containing "APPROVED: <date>".');
    return false;
  }

  console.log('✅ All mechanical approval gates verified.');
  return true;
}

if (process.argv[1] && (process.argv[1].endsWith('check-approval-gates.mjs') || import.meta.url.endsWith(path.basename(process.argv[1])))) {
  const success = checkApprovalGates();
  process.exit(success ? 0 : 1);
}

