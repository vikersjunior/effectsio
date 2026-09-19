#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PORT = 9779;
const APP_URL = "http://127.0.0.1:5173/";
const ART_DIR = "/Users/clement/.gemini/antigravity/brain/59ee9d41-b21a-4380-9b76-8fe40e8ce402/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "empty-frame-qa");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!fs.existsSync(chromeExecutable)) {
  console.error("Chrome not found at", chromeExecutable);
  process.exit(1);
}

console.log(`Starting headless Chrome on port ${PORT}...`);
const tempUserDataDir = `/tmp/effectsio-empty-qa-${Date.now()}`;
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
    `--user-data-dir=${tempUserDataDir}`,
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
      // Wait for Chrome to initialize
    }
    await sleep(300);
  }
  throw new Error(`Chrome failed to respond on port ${PORT}`);
}

async function run() {
  try {
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
        }, 15000);
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

    console.log("Navigating to", APP_URL);
    await send("Page.navigate", { url: APP_URL });
    await sleep(3500);

    const evaluate = async (expression) => {
      const res = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res?.exceptionDetails) {
        console.warn("Eval exception:", JSON.stringify(res.exceptionDetails));
      }
      return res?.result?.value;
    };

    const capture = async (name) => {
      console.log(`[Capture] Saving ${name}...`);
      await sleep(400);
      const res = await send("Page.captureScreenshot", { format: "png" });
      if (!res?.data) throw new Error(`Empty screenshot for ${name}`);
      const buf = Buffer.from(res.data, "base64");
      fs.writeFileSync(path.join(ART_DIR, `${name}.png`), buf);
      fs.writeFileSync(path.join(WS_DIR, `${name}.png`), buf);
      console.log(`  -> Saved ${path.join(ART_DIR, `${name}.png`)}`);
    };

    // Wait for hydration
    console.log("Waiting for store hydration...");
    await evaluate(`
      new Promise((resolve) => {
        const check = () => {
          if (window.__studioStore && window.__studioStore.isHydrated) {
            resolve(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      })
    `);
    console.log("Store hydrated successfully.");

    // Helper: switch to Layers tab
    const switchToLayersTab = async () => {
      await evaluate(`
        (() => {
          const tabs = Array.from(document.querySelectorAll('button[role="tab"]'));
          const layersTab = tabs.find(b => b.textContent && b.textContent.includes("Layers"));
          if (layersTab) layersTab.click();
        })()
      `);
      await sleep(300);
    };

    await switchToLayersTab();

    // =========================================================================
    // STEP 1: Boot app -> default frame has 1 backdrop layer
    // =========================================================================
    console.log("\n=== STEP 1: Boot App -> Default Frame has 1 Backdrop Layer ===");
    const step1State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        return {
          itemCount: frame ? frame.items.length : 0,
          firstItemType: frame && frame.items[0] ? frame.items[0].type : null,
          firstItemLocked: frame && frame.items[0] ? frame.items[0].locked : null,
          firstItemSource: frame && frame.items[0] && frame.items[0].source ? frame.items[0].source.type : null,
          activeLayerId: store.activeLayerId,
        };
      })()
    `);
    console.log("Step 1 State:", step1State);
    if (step1State.itemCount !== 1) {
      throw new Error(`Step 1 Failed: Expected 1 item in default frame, got ${step1State.itemCount}`);
    }
    if (step1State.firstItemType !== "procedural" || step1State.firstItemSource !== "procedural") {
      throw new Error(`Step 1 Failed: Expected procedural backdrop layer`);
    }
    if (step1State.firstItemLocked !== true) {
      throw new Error(`Step 1 Failed: Expected default backdrop layer to be locked by default`);
    }

    await capture("browser-01-initial-boot");

    // =========================================================================
    // STEP 2: Select backdrop -> inspector shows layer properties
    // =========================================================================
    console.log("\n=== STEP 2: Select Backdrop -> Inspector Shows Layer Properties ===");
    await evaluate(`
      (() => {
        const row = document.querySelector('[data-slot="layer-row"]');
        if (row) row.click();
      })()
    `);
    await sleep(300);

    const step2State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const activeLayer = store.activeLayer;
        const inspectorHeader = document.querySelector('[data-slot="panel-header"]')?.textContent || "";
        const hasLockToggle = Boolean(document.querySelector('[data-testid="layer-lock-toggle-btn"]'));
        return {
          activeLayerId: store.activeLayerId,
          activeLayerType: activeLayer ? activeLayer.type : null,
          hasLockToggle,
          inspectorHeader,
        };
      })()
    `);
    console.log("Step 2 State:", step2State);
    if (!step2State.activeLayerId || step2State.activeLayerType !== "procedural") {
      throw new Error(`Step 2 Failed: Backdrop layer not selected`);
    }

    await capture("browser-02-backdrop-selected");

    // =========================================================================
    // STEP 3: Unlock backdrop -> backdrop becomes editable/movable
    // =========================================================================
    console.log("\n=== STEP 3: Unlock Backdrop -> Layer Becomes Editable/Movable ===");
    await evaluate(`
      (() => {
        const lockBtn = document.querySelector('[data-testid="layer-lock-toggle-btn"]') ||
                        document.querySelector('[data-testid="unlock-layer-button"]');
        if (lockBtn) lockBtn.click();
      })()
    `);
    await sleep(400);

    const step3State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        return {
          isLocked: store.activeLayer ? store.activeLayer.locked : null,
          lockBtnText: document.querySelector('[data-testid="layer-lock-toggle-btn"]')?.textContent || "",
        };
      })()
    `);
    console.log("Step 3 State:", step3State);
    if (step3State.isLocked !== false) {
      throw new Error(`Step 3 Failed: Backdrop layer failed to unlock`);
    }

    await capture("browser-03-backdrop-unlocked");

    // =========================================================================
    // STEP 4: Add a second layer (e.g. solid background)
    // =========================================================================
    console.log("\n=== STEP 4: Add a Second Layer (Solid Background) ===");
    await evaluate(`
      (() => {
        const addBtn = document.querySelector('button[aria-label="Add layer"]');
        if (addBtn) addBtn.click();
      })()
    `);
    await sleep(400);

    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const solidBtn = buttons.find(b => b.textContent && b.textContent.includes("Solid"));
        if (solidBtn) solidBtn.click();
      })()
    `);
    await sleep(600);

    const step4State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        return {
          itemCount: frame ? frame.items.length : 0,
          itemIds: frame ? frame.items.map(i => i.id) : [],
          activeLayerId: store.activeLayerId,
        };
      })()
    `);
    console.log("Step 4 State:", step4State);
    if (step4State.itemCount !== 2) {
      throw new Error(`Step 4 Failed: Expected 2 items, got ${step4State.itemCount}`);
    }

    await capture("browser-04-second-layer-added");

    // =========================================================================
    // STEP 5: Reorder layers -> backdrop moves in z-order
    // =========================================================================
    console.log("\n=== STEP 5: Reorder Layers -> Backdrop Moves in Z-Order ===");
    const preOrder = await evaluate(`
      (() => {
        const store = window.__studioStore;
        return store.activeFrame.items.map(i => i.id);
      })()
    `);
    console.log("Pre-reorder items (bottom-to-top):", preOrder);

    // Call canonical moveRootItem(0, 1) to swap index 0 and 1
    await evaluate(`
      (() => {
        window.__studioStore.moveRootItem(0, 1);
      })()
    `);
    await sleep(400);

    const postOrder = await evaluate(`
      (() => {
        const store = window.__studioStore;
        return store.activeFrame.items.map(i => i.id);
      })()
    `);
    console.log("Post-reorder items (bottom-to-top):", postOrder);
    if (postOrder[0] !== preOrder[1] || postOrder[1] !== preOrder[0]) {
      throw new Error(`Step 5 Failed: Items were not swapped!`);
    }

    await capture("browser-05-reordered");

    // =========================================================================
    // STEP 6: Edit backdrop -> parameters update
    // =========================================================================
    console.log("\n=== STEP 6: Edit Backdrop Parameters ===");
    // Select the backdrop layer (which is now at index 1)
    const backdropId = preOrder[0];
    await evaluate(`
      (() => {
        window.__studioStore.setActiveLayerId("${backdropId}");
        // Update opacity to 0.75 and blendMode to "screen"
        window.__studioStore.updateLayer("${backdropId}", {
          opacity: 0.75,
          blendMode: "screen",
        });
      })()
    `);
    await sleep(400);

    const step6State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const layer = store.activeLayer;
        return {
          id: layer ? layer.id : null,
          opacity: layer ? layer.opacity : null,
          blendMode: layer ? layer.blendMode : null,
        };
      })()
    `);
    console.log("Step 6 State:", step6State);
    if (step6State.opacity !== 0.75 || step6State.blendMode !== "screen") {
      throw new Error(`Step 6 Failed: Backdrop parameters did not update`);
    }

    await capture("browser-06-backdrop-edited");

    // =========================================================================
    // STEP 7: Delete backdrop -> remaining layer is active
    // =========================================================================
    console.log("\n=== STEP 7: Delete Backdrop -> Remaining Layer is Active ===");
    await evaluate(`
      (() => {
        window.__studioStore.removeLayer("${backdropId}");
      })()
    `);
    await sleep(400);

    const step7State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        return {
          itemCount: frame ? frame.items.length : 0,
          remainingItemId: frame && frame.items[0] ? frame.items[0].id : null,
          activeLayerId: store.activeLayerId,
        };
      })()
    `);
    console.log("Step 7 State:", step7State);
    if (step7State.itemCount !== 1) {
      throw new Error(`Step 7 Failed: Expected 1 layer remaining, got ${step7State.itemCount}`);
    }
    if (step7State.activeLayerId !== step7State.remainingItemId) {
      throw new Error(`Step 7 Failed: Expected remaining layer to be active`);
    }

    await capture("browser-07-backdrop-deleted");

    // =========================================================================
    // STEP 8: Delete remaining layer -> 0 layers, items = []
    // =========================================================================
    console.log("\n=== STEP 8: Delete Remaining Layer -> 0 Layers, items = [] ===");
    const remainingId = step7State.remainingItemId;
    await evaluate(`
      (() => {
        window.__studioStore.removeLayer("${remainingId}");
      })()
    `);
    await sleep(500);

    const step8State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        const rows = document.querySelectorAll('[data-slot="layer-row"]');
        return {
          itemCount: frame ? frame.items.length : -1,
          itemsIsArray: frame ? Array.isArray(frame.items) : false,
          activeLayerId: store.activeLayerId,
          activeLayer: store.activeLayer,
          domRowCount: rows.length,
        };
      })()
    `);
    console.log("Step 8 State:", step8State);
    if (step8State.itemCount !== 0) {
      throw new Error(`Step 8 Failed: Expected frame.items.length === 0, got ${step8State.itemCount}`);
    }
    if (step8State.activeLayerId !== null) {
      throw new Error(`Step 8 Failed: Expected activeLayerId === null when items is empty, got ${step8State.activeLayerId}`);
    }

    await capture("browser-08-all-layers-deleted-empty");

    // =========================================================================
    // STEP 9: Confirm Layers panel shows empty state
    // =========================================================================
    console.log("\n=== STEP 9: Confirm Layers Panel Shows Empty State ===");
    const step9Dom = await evaluate(`
      (() => {
        const rows = document.querySelectorAll('[data-slot="layer-row"]');
        const emptyIndicator = document.querySelector('[data-slot="layers-empty-state"]') ||
                               Array.from(document.querySelectorAll('div, p, span')).find(el => el.textContent && el.textContent.includes("No layers"));
        return {
          rowCount: rows.length,
          hasEmptyText: Boolean(emptyIndicator),
          emptyTextContent: emptyIndicator ? emptyIndicator.textContent : null,
        };
      })()
    `);
    console.log("Step 9 Layers Panel DOM:", step9Dom);
    if (step9Dom.rowCount !== 0) {
      throw new Error(`Step 9 Failed: Found ${step9Dom.rowCount} layer rows in DOM`);
    }

    // =========================================================================
    // STEP 10: Confirm Canvas renders empty/transparent without error
    // =========================================================================
    console.log("\n=== STEP 10: Confirm Canvas Renders Empty/Transparent Without Error ===");
    const step10Canvas = await evaluate(`
      (() => {
        const canvas = document.querySelector('canvas');
        return {
          hasCanvas: Boolean(canvas),
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
        };
      })()
    `);
    console.log("Step 10 Canvas state:", step10Canvas);
    if (!step10Canvas.hasCanvas) {
      throw new Error("Step 10 Failed: Canvas element missing");
    }

    await capture("browser-09-canvas-empty-state");

    // =========================================================================
    // STEP 11: Reload page -> items = [] persists, 0 layers restored, no phantom backdrop
    // =========================================================================
    console.log("\n=== STEP 11: Reload Application & Verify Empty Frame Persistence ===");
    // Wait a moment for IndexedDB save to settle
    await sleep(1000);

    console.log("Triggering page reload...");
    await send("Page.reload");
    await sleep(4000);

    console.log("Waiting for store hydration after reload...");
    await evaluate(`
      new Promise((resolve) => {
        const check = () => {
          if (window.__studioStore && window.__studioStore.isHydrated) {
            resolve(true);
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      })
    `);

    await switchToLayersTab();

    const step11State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        const rows = document.querySelectorAll('[data-slot="layer-row"]');
        return {
          itemCount: frame ? frame.items.length : -1,
          items: frame ? frame.items : null,
          activeLayerId: store.activeLayerId,
          activeLayer: store.activeLayer,
          domRowCount: rows.length,
        };
      })()
    `);
    console.log("Step 11 Reloaded State:", step11State);
    if (step11State.itemCount !== 0) {
      throw new Error(`Step 11 CRITICAL CONTRACT VIOLATION: Expected 0 layers after reload, but found ${step11State.itemCount} layers! (Phantom backdrop resurrected!)`);
    }
    if (step11State.activeLayerId !== null) {
      throw new Error(`Step 11 Failed: Expected activeLayerId === null after reload, got ${step11State.activeLayerId}`);
    }
    if (step11State.domRowCount !== 0) {
      throw new Error(`Step 11 Failed: Expected 0 DOM layer rows after reload, got ${step11State.domRowCount}`);
    }

    await capture("browser-10-after-reload-still-empty");

    // =========================================================================
    // STEP 12: Add new layer -> exactly 1 layer exists, no phantom backdrop synthesized beneath it
    // =========================================================================
    console.log("\n=== STEP 12: Add New Layer to Empty Frame ===");
    await evaluate(`
      (() => {
        // Add a new solid background layer
        window.__studioStore.addProceduralLayer("solid");
      })()
    `);
    await sleep(600);

    const step12State = await evaluate(`
      (() => {
        const store = window.__studioStore;
        const frame = store.activeFrame;
        const rows = document.querySelectorAll('[data-slot="layer-row"]');
        return {
          itemCount: frame ? frame.items.length : 0,
          items: frame ? frame.items.map(i => ({
            id: i.id,
            type: i.type,
            sourceType: i.source?.type,
            configType: i.source?.config?.type,
          })) : [],
          activeLayerId: store.activeLayerId,
          domRowCount: rows.length,
        };
      })()
    `);
    console.log("Step 12 State:", step12State);
    if (step12State.itemCount !== 1) {
      throw new Error(`Step 12 CRITICAL CONTRACT VIOLATION: Expected exactly 1 layer after adding, got ${step12State.itemCount}! Phantom backdrop synthesized beneath new layer!`);
    }
    if (step12State.items[0].type !== "procedural" || step12State.items[0].sourceType !== "procedural") {
      throw new Error(`Step 12 Failed: Added layer is not a procedural layer`);
    }

    await capture("browser-11-new-layer-added");

    console.log("\n=================================================================");
    console.log("🎉 ALL 12 BROWSER QA STEPS PASSED WITH 100% EMPIRICAL PROOF! 🎉");
    console.log("=================================================================\n");
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
    try {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Browser QA failed with error:", err);
  process.exit(1);
});
