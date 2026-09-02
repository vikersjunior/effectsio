#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9791;
const APP_URL = "http://127.0.0.1:5173/";
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/9cd1ab7b-7904-465d-a2a7-dfe12073a0a0/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "ui-polish");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(chromeExecutable)) {
  console.error("Chrome not found at", chromeExecutable);
  process.exit(1);
}

console.log(`Starting headless Chrome for UI Visual Polish verification on port ${PORT}...`);

const chromeProcess = spawn(
  chromeExecutable,
  [
    `--headless=new`,
    `--remote-debugging-port=${PORT}`,
    `--remote-allow-origins=*`,
    `--window-size=1440,900`,
    `--hide-scrollbars`,
    `--enable-webgl`,
    `--enable-webgl2-compute-context`,
    `--no-first-run`,
    `--no-default-browser-check`,
    `--user-data-dir=/tmp/effectsio-ui-polish-${Date.now()}`,
    APP_URL,
  ],
  { stdio: "inherit" }
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForChrome() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) return list;
      }
    } catch {
      // Chrome starting...
    }
    await sleep(300);
  }
  throw new Error(`Chrome failed to respond on port ${PORT}`);
}

async function run() {
  const list = await waitForChrome();
  const page = list.find((p) => p.url.includes("127.0.0.1") || p.url.includes("localhost")) || list[0];

  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error("No debugger WebSocket URL found for target page");
  }

  console.log("Connecting to WebSocket:", page.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let msgId = 1;
  const pending = new Map();

  ws.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(JSON.stringify(data.error)));
        else resolve(data.result);
      }
    } catch (e) {
      console.error("WS Parse error:", e);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const send = (method, params = {}) => {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout on ${method}`));
      }, 45000);
      pending.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");

  const saveScreenshot = async (name) => {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(res.data, "base64");
    fs.writeFileSync(path.join(ART_DIR, `${name}.png`), buf);
    fs.writeFileSync(path.join(WS_DIR, `${name}.png`), buf);
    console.log(`Saved screenshot: ${name}.png`);
  };

  const evalAsync = async (expression) => {
    const res = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  };

  console.log("Waiting for application to mount...");
  await sleep(2500);

  console.log("==================================================");
  console.log("RUNNING UI VISUAL POLISH BROWSER VERIFICATION");
  console.log("==================================================");

  // 1. Initial State Screenshot
  console.log("\n--- Check 1: Initial Empty / Clean State ---");
  await saveScreenshot("01-ui-polish-initial-state");

  // Helper to ingest test image assets
  const ingestImages = async (count, prefix = "img") => {
    await evalAsync(`
      (async () => {
        const files = [];
        const colors = ["#3b82f6", "#10b981", "#ec4899", "#f59e0b", "#8b5cf6", "#06b6d4"];
        for (let i = 0; i < ${count}; i++) {
          const c = document.createElement("canvas");
          c.width = 400;
          c.height = 400;
          const ctx = c.getContext("2d");
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(0, 0, 400, 400);
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 32px sans-serif";
          ctx.fillText("${prefix}-" + (i + 1), 50, 200);
          const blob = await new Promise(r => c.toBlob(r, "image/png"));
          files.push(new File([blob], "${prefix}-" + (i + 1) + ".png", { type: "image/png" }));
        }

        const input = document.querySelector('input[type="file"]');
        if (input) {
          const dt = new DataTransfer();
          files.forEach(f => dt.items.add(f));
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      })()
    `);
    await sleep(1500);
  };

  // Test 1 Image
  console.log("\n--- Check 2: 1 Image Ingested ---");
  await ingestImages(1, "asset-1");
  const test1Img = await evalAsync(`
    (() => {
      const grid = document.querySelector('.grid.grid-cols-4');
      if (!grid) return { error: "Grid .grid-cols-4 not found" };
      const items = grid.children;
      return {
        gridCols4: grid.classList.contains('grid-cols-4'),
        itemCount: items.length, // 1 image + 1 plus tile = 2
        firstItemSquare: items[0].classList.contains('aspect-square'),
        plusTileSquare: items[1].classList.contains('aspect-square')
      };
    })()
  `);
  console.log("1 Image Grid Inspection:", test1Img);
  await saveScreenshot("02-ui-polish-1-image");

  // Test 2 Images
  console.log("\n--- Check 3: 2 Images Total ---");
  await ingestImages(1, "asset-2");
  await saveScreenshot("03-ui-polish-2-images");

  // Test 4 Images Total
  console.log("\n--- Check 4: 4 Images Total (Row 1 Full + '+' Tile in Row 2) ---");
  await ingestImages(2, "asset-batch1");
  const test4Img = await evalAsync(`
    (() => {
      const grid = document.querySelector('.grid.grid-cols-4');
      const items = grid ? Array.from(grid.children) : [];
      return {
        totalCells: items.length,
        hasCaptions: document.querySelector('.grid.grid-cols-4 span.truncate') !== null,
        plusIsLast: items[items.length - 1].querySelector('svg') !== null
      };
    })()
  `);
  console.log("4 Images Grid Inspection:", test4Img);
  if (test4Img.hasCaptions) {
    throw new Error("Failed: Captions found under thumbnails!");
  }
  await saveScreenshot("04-ui-polish-4-images");

  // Test >4 Images (6 Images Total)
  console.log("\n--- Check 5: 6 Images Total (Multi-row Grid Flow) ---");
  await ingestImages(2, "asset-batch2");
  const test6Img = await evalAsync(`
    (() => {
      const grid = document.querySelector('.grid.grid-cols-4');
      const items = grid ? Array.from(grid.children) : [];
      return {
        totalItems: items.length, // 6 images + 1 plus tile = 7
        allSquare: items.every(el => el.classList.contains('aspect-square')),
        allRounded: items.every(el => el.className.includes('rounded-[calc(var(--radius-lg)-4px)]')),
        hasCaptions: document.querySelector('.grid.grid-cols-4 span.truncate') !== null
      };
    })()
  `);
  console.log("6 Images Grid Inspection:", test6Img);
  if (!test6Img.allSquare || !test6Img.allRounded || test6Img.hasCaptions) {
    throw new Error(`Failed: Grid styling invariant violated! ${JSON.stringify(test6Img)}`);
  }
  await saveScreenshot("05-ui-polish-6-images-multi-row");

  // Verify Selection State
  console.log("\n--- Check 6: Selection Ring Verification ---");
  await evalAsync(`
    (() => {
      const grid = document.querySelector('.grid.grid-cols-4');
      const items = grid ? Array.from(grid.children) : [];
      if (items.length > 2) items[2].click();
    })()
  `);
  await sleep(600);
  const selectionCheck = await evalAsync(`
    (() => {
      const grid = document.querySelector('.grid.grid-cols-4');
      const items = grid ? Array.from(grid.children) : [];
      return {
        clickedItemHasRing: items[2] ? items[2].className.includes('ring-2') : false,
        ringOffsetCorrect: items[2] ? items[2].className.includes('ring-offset-2') : false
      };
    })()
  `);
  console.log("Selection State Inspection:", selectionCheck);
  if (!selectionCheck.clickedItemHasRing || !selectionCheck.ringOffsetCorrect) {
    throw new Error("Failed: Selection ring not applied on active asset!");
  }
  await saveScreenshot("06-ui-polish-selected-ring");

  // Verify Delete Action
  console.log("\n--- Check 7: Delete Button Action ---");
  const beforeDeleteCount = await evalAsync(`document.querySelectorAll('.grid.grid-cols-4 > div').length`);
  await evalAsync(`
    (() => {
      const firstDeleteBtn = document.querySelector('.grid.grid-cols-4 button[title="Remove asset"]');
      if (firstDeleteBtn) firstDeleteBtn.click();
    })()
  `);
  await sleep(800);
  const afterDeleteCount = await evalAsync(`document.querySelectorAll('.grid.grid-cols-4 > div').length`);
  console.log(`Delete Action: Before=${beforeDeleteCount}, After=${afterDeleteCount}`);
  if (afterDeleteCount !== beforeDeleteCount - 1) {
    throw new Error("Failed: Delete button did not decrement asset count!");
  }
  await saveScreenshot("07-ui-polish-after-delete");

  // Verify Inspector Tabs & TopNav ToggleGroup
  console.log("\n--- Check 8: Semantic Integrity (Tabs remain Tabs, Workspace remains ToggleGroup) ---");
  const semanticCheck = await evalAsync(`
    (() => {
      const tabs = document.querySelector('[role="tablist"]');
      const tabTriggers = document.querySelectorAll('[role="tab"]');
      const toggleGroup = document.querySelector('[role="group"]');
      const toggleItems = document.querySelectorAll('[role="group"] button');
      return {
        tabCount: tabTriggers.length,
        hasEffectsTab: Array.from(tabTriggers).some(t => t.textContent.includes('Effects')),
        hasLooksTab: Array.from(tabTriggers).some(t => t.textContent.includes('Looks')),
        hasBackdropTab: Array.from(tabTriggers).some(t => t.textContent.includes('Backdrop')),
        hasDetailsTab: Array.from(tabTriggers).some(t => t.textContent.includes('Info') || t.textContent.includes('Details')),
        workspaceToggleCount: toggleItems.length,
        hasStudioToggle: Array.from(toggleItems).some(t => t.textContent.includes('Effects Studio'))
      };
    })()
  `);
  console.log("Semantic Structure Inspection:", semanticCheck);
  if (semanticCheck.tabCount < 4 || !semanticCheck.hasEffectsTab || !semanticCheck.hasStudioToggle) {
    throw new Error("Failed: Semantic component role integrity failed!");
  }

  console.log("\n==================================================");
  console.log("ALL UI VISUAL POLISH BROWSER CHECKS PASSED!");
  console.log("==================================================");

  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error("Test execution error:", err);
  chromeProcess.kill();
  process.exit(1);
});
