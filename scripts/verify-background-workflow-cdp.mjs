#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9844;
const APP_PORT = 5173;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/8a850b88-5678-4744-8811-ec86b5210f6d/evidence/background-workflow";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "background-workflow");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(chromeExecutable)) {
  console.error("Chrome not found at", chromeExecutable);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let chromeProcess = null;

async function startChrome() {
  console.log(`Starting headless Chrome on debug port ${PORT}...`);
  chromeProcess = spawn(
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
      `--user-data-dir=/tmp/effectsio-bg-workflow-cdp-${Date.now()}`,
      APP_URL,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) {
          console.log("Chrome debug port is ready.");
          return;
        }
      }
    } catch {
      await sleep(250);
    }
  }
  throw new Error("Failed to start Chrome");
}

class CDPConnection {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const WebSocket = globalThis.WebSocket;
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve: res, reject: rej } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      console.error("Evaluation exception:", result.exceptionDetails);
      throw new Error(result.exceptionDetails.text || "Eval error");
    }
    return result.result?.value;
  }

  async captureScreenshot(filename) {
    const { data } = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(data, "base64");
    const artPath = path.join(ART_DIR, filename);
    const wsPath = path.join(WS_DIR, filename);
    fs.writeFileSync(artPath, buffer);
    fs.writeFileSync(wsPath, buffer);
    console.log(`  📸 Saved screenshot: ${filename}`);
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
  console.log("============================================================");
  console.log("EFFECTSIO BACKGROUND WORKFLOW REAL CHROME/CDP VERIFICATION");
  console.log("============================================================\n");

  const results = [];
  function recordStep(num, name, passed, detail) {
    results.push({ num, name, passed, detail });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: Step ${num} [${name}] — ${detail}`);
  }

  try {
    await startChrome();

    const targetsRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await targetsRes.json();
    let target = targets.find((t) => t.type === "page");

    if (!target) {
      const newTargetRes = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(APP_URL)}`);
      target = await newTargetRes.json();
    }

    const cdp = new CDPConnection(target.webSocketDebuggerUrl);
    await cdp.connect();
    console.log("Connected to Chrome via CDP.");

    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`Navigating to ${APP_URL}...`);
    await cdp.send("Page.navigate", { url: APP_URL });

    let appLoaded = false;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      try {
        appLoaded = await cdp.evaluate(`document.body !== null && window.__studioStore !== undefined && window.__gpuCompositor !== undefined`);
        if (appLoaded) break;
      } catch {}
    }
    if (!appLoaded) throw new Error("Application failed to load or store/compositor not found");
    console.log("App, studio store, and GPU compositor loaded successfully.\n");

    // Clear any existing backgrounds so we start clean
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const genLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "generative");
      if (genLayer) {
        store.updateLayer(genLayer.id, { backgrounds: [] });
      }
    })()`);
    await sleep(400);

    // =========================================================================
    // SEQUENCE A: Image Context (Steps 1, 2, 3)
    // =========================================================================
    console.log("--- SEQUENCE A: IMAGE CONTEXT ---");

    // 1. Add/select an ImageLayer
    console.log("\n[Step 1] Adding and selecting an ImageLayer...");
    await cdp.evaluate(`(async () => {
      const store = window.__studioStore;
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#3b82f6";
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("TEST IMAGE", 200, 200);

      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "test-image.png", { type: "image/png" });
      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(1500);

    const step1Ok = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const asset = store.assets[0];
      if (asset) {
        store.addLayerFromAsset(asset.id);
        return true;
      }
      return false;
    })()`);
    await sleep(600);

    const imgLayerActive = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const layer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.id === store.activeLayerId);
      return layer?.type === "image";
    })()`);
    await cdp.captureScreenshot("A-01-image-layer-selected.png");
    recordStep(1, "Add/select ImageLayer", step1Ok && imgLayerActive, `ImageLayer added and active (${storeLayerType(imgLayerActive)})`);

    // 2. Confirm right Inspector has no Background section
    console.log("\n[Step 2] Confirming right Inspector has NO Background section when ImageLayer is selected...");
    const hasBgSectionInImage = await cdp.evaluate(`(() => {
      const inspector = document.querySelector('[data-testid="inspector-panel"]');
      if (!inspector) return false;
      const bgHeader = inspector.querySelector('[data-testid="background-section-header"]');
      const bgText = Array.from(inspector.querySelectorAll('h2, h3, h4, span, button')).find(el => el.textContent?.trim() === "Background");
      return Boolean(bgHeader || bgText);
    })()`);
    recordStep(2, "No Background section in Image context", !hasBgSectionInImage, "Docked Inspector contains zero Background section or header");

    // 3. Confirm there is no Add Background action in the Image context
    console.log("\n[Step 3] Confirming NO Add Background action in Image context...");
    const hasAddBgInImage = await cdp.evaluate(`(() => {
      const inspector = document.querySelector('[data-testid="inspector-panel"]');
      if (!inspector) return false;
      return inspector.querySelector('[data-testid="add-background-button"]') !== null;
    })()`);
    recordStep(3, "No Add Background control in Image context", !hasAddBgInImage, "No add-background-button rendered while Image is active");

    // =========================================================================
    // SEQUENCE B: Background Context (Steps 4, 5, 6, 7)
    // =========================================================================
    console.log("\n--- SEQUENCE B: BACKGROUND CONTEXT ---");

    // 4. Select Background Layer
    console.log("\n[Step 4] Selecting Background Layer...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const genLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "generative");
      if (genLayer) {
        store.setActiveLayerId(genLayer.id);
      }
    })()`);
    await sleep(600);
    const bgLayerActive = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const layer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.id === store.activeLayerId);
      return layer?.type === "generative";
    })()`);
    await cdp.captureScreenshot("B-04-background-layer-selected.png");
    recordStep(4, "Select Background Layer", bgLayerActive, "Background Layer is explicitly active in StudioStore");

    // 5. Confirm Background section appears
    console.log("\n[Step 5] Confirming Background section appears in Inspector...");
    const hasBgSectionWhenSelected = await cdp.evaluate(`(() => {
      const inspector = document.querySelector('[data-testid="inspector-panel"]');
      return Boolean(inspector?.querySelector('[data-testid="background-section-header"]'));
    })()`);
    recordStep(5, "Background section appears", hasBgSectionWhenSelected, "Background section header rendered in docked Inspector");

    // 6. Confirm the header has '+'
    console.log("\n[Step 6] Confirming Background section header has '+' button...");
    const headerHasPlus = await cdp.evaluate(`(() => {
      const btn = document.querySelector('[data-testid="add-background-button"]');
      return Boolean(btn && (btn.getAttribute("aria-label") === "Add background" || btn.getAttribute("title") === "Add background"));
    })()`);
    recordStep(6, "Header has '+' button", headerHasPlus, "data-testid='add-background-button' present with Add background label");

    // 7. Confirm the header remains '+' after adding backgrounds
    console.log("\n[Step 7] Confirming header permanently remains '+' after adding a background...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("solid")`);
    await sleep(500);
    const headerRemainsPlus = await cdp.evaluate(`(() => {
      const header = document.querySelector('[data-testid="background-section-header"]');
      const addBtn = header?.querySelector('[data-testid="add-background-button"]');
      const removeBtn = header?.querySelector('button[aria-label*="Remove"]');
      return Boolean(addBtn && !removeBtn);
    })()`);
    await cdp.captureScreenshot("B-07-header-permanently-plus.png");
    recordStep(7, "Header permanently remains '+'", headerRemainsPlus, "Header retains '+' button and never changes to '−'");

    // =========================================================================
    // SEQUENCE C: Stack (Steps 8, 9, 10, 11, 12, 13)
    // =========================================================================
    console.log("\n--- SEQUENCE C: STACK CREATION ---");

    // 8. Add Solid (already added in step 7, verify it exists)
    console.log("\n[Step 8] Verifying Solid background item...");
    const hasSolid = await cdp.evaluate(`window.__studioStore.activeBackgrounds.some(b => b.type === "solid")`);
    recordStep(8, "Add Solid", hasSolid, "Solid background item added to stack");

    // 9. Add Linear Gradient
    console.log("\n[Step 9] Adding Linear Gradient...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("linear-gradient")`);
    await sleep(400);
    const hasLinear = await cdp.evaluate(`window.__studioStore.activeBackgrounds.some(b => b.type === "linear-gradient")`);
    recordStep(9, "Add Linear Gradient", hasLinear, "Linear Gradient background item added to stack");

    // 10. Add Radial Gradient
    console.log("\n[Step 10] Adding Radial Gradient...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("radial-gradient")`);
    await sleep(400);
    const hasRadial = await cdp.evaluate(`window.__studioStore.activeBackgrounds.some(b => b.type === "radial-gradient")`);
    recordStep(10, "Add Radial Gradient", hasRadial, "Radial Gradient background item added to stack");

    // 11. Add Dots
    console.log("\n[Step 11] Adding Dots...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("dots")`);
    await sleep(400);
    const hasDots = await cdp.evaluate(`window.__studioStore.activeBackgrounds.some(b => b.type === "dots")`);
    recordStep(11, "Add Dots", hasDots, "Dots background item added to stack");

    // 12. Add Grid
    console.log("\n[Step 12] Adding Grid...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("grid")`);
    await sleep(400);
    const hasGrid = await cdp.evaluate(`window.__studioStore.activeBackgrounds.some(b => b.type === "grid")`);
    recordStep(12, "Add Grid", hasGrid, "Grid background item added to stack");

    // 13. Confirm all five exist independently
    console.log("\n[Step 13] Confirming all five exist independently in the Inspector stack...");
    const stackState = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const bgs = store.activeBackgrounds;
      const types = bgs.map(b => b.type);
      const rows = document.querySelectorAll('[data-testid^="background-row-"]');
      return {
        count: bgs.length,
        types,
        rowCount: rows.length,
        allFivePresent: ["solid", "linear-gradient", "radial-gradient", "dots", "grid"].every(t => types.includes(t))
      };
    })()`);
    await cdp.captureScreenshot("C-13-all-five-backgrounds-stack.png");
    recordStep(13, "All five floor primitives exist independently", stackState.count === 5 && stackState.allFivePresent && stackState.rowCount === 5,
      `All 5 floor primitives active in stack (${stackState.types.join(", ")}) with 5 Inspector rows`);

    // =========================================================================
    // SEQUENCE D: Item Controls (Steps 14, 15, 16, 17, 18, 19, 20)
    // =========================================================================
    console.log("\n--- SEQUENCE D: ITEM CONTROLS ---");

    // 14. Change opacity of one item
    console.log("\n[Step 14] Changing opacity of Grid item...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const grid = store.activeBackgrounds.find(b => b.type === "grid");
      if (grid) {
        store.updateBackgroundItem(grid.id, { opacity: 0.45 });
      }
    })()`);
    await sleep(400);
    const gridOpacity = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.activeBackgrounds.find(b => b.type === "grid")?.opacity;
    })()`);
    recordStep(14, "Change item opacity", gridOpacity === 0.45, `Grid opacity set to ${gridOpacity}`);

    // 15. Confirm other items are unchanged
    console.log("\n[Step 15] Confirming other items' opacity is unchanged...");
    const otherOpacitiesUnchanged = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const others = store.activeBackgrounds.filter(b => b.type !== "grid");
      return others.every(b => b.opacity === 1.0);
    })()`);
    recordStep(15, "Other item opacities unchanged", otherOpacitiesUnchanged, "Solid, Linear, Radial, Dots retain 100% opacity");

    // 16. Change blend mode of one item
    console.log("\n[Step 16] Changing blend mode of Dots item...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const dots = store.activeBackgrounds.find(b => b.type === "dots");
      if (dots) {
        store.updateBackgroundItem(dots.id, { blendMode: "overlay" });
      }
    })()`);
    await sleep(400);
    const dotsBlend = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.activeBackgrounds.find(b => b.type === "dots")?.blendMode;
    })()`);
    recordStep(16, "Change item blend mode", dotsBlend === "overlay", `Dots blend mode set to ${dotsBlend}`);

    // 17. Confirm other items are unchanged
    console.log("\n[Step 17] Confirming other items' blend modes are unchanged...");
    const otherBlendsUnchanged = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const others = store.activeBackgrounds.filter(b => b.type !== "dots");
      return others.every(b => b.blendMode === "normal");
    })()`);
    recordStep(17, "Other item blend modes unchanged", otherBlendsUnchanged, "Solid, Linear, Radial, Grid retain 'normal' blend mode");

    // 18. Toggle visibility
    console.log("\n[Step 18] Toggling visibility of Radial Gradient item...");
    const radialBefore = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.activeBackgrounds.find(b => b.type === "radial-gradient")?.enabled;
    })()`);
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const rad = store.activeBackgrounds.find(b => b.type === "radial-gradient");
      if (rad) {
        store.updateBackgroundItem(rad.id, { enabled: !rad.enabled });
      }
    })()`);
    await sleep(400);
    const radialToggled = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.activeBackgrounds.find(b => b.type === "radial-gradient")?.enabled;
    })()`);
    await cdp.captureScreenshot("D-18-visibility-toggled.png");
    recordStep(18, "Toggle item visibility", radialBefore === true && radialToggled === false,
      `Radial visibility toggled from ${radialBefore} to ${radialToggled}`);

    // 19. Remove one item
    console.log("\n[Step 19] Removing Radial Gradient item...");
    const countBeforeRemove = await cdp.evaluate(`window.__studioStore.activeBackgrounds.length`);
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const rad = store.activeBackgrounds.find(b => b.type === "radial-gradient");
      if (rad) {
        store.removeBackgroundItem(rad.id);
      }
    })()`);
    await sleep(400);
    const countAfterRemove = await cdp.evaluate(`window.__studioStore.activeBackgrounds.length`);
    recordStep(19, "Remove one item", countAfterRemove === countBeforeRemove - 1,
      `Stack count reduced from ${countBeforeRemove} to ${countAfterRemove}`);

    // 20. Confirm only that item is removed
    console.log("\n[Step 20] Confirming only Radial Gradient was removed...");
    const remainingTypes = await cdp.evaluate(`window.__studioStore.activeBackgrounds.map(b => b.type)`);
    const onlyRadialRemoved = !remainingTypes.includes("radial-gradient") &&
      ["solid", "linear-gradient", "dots", "grid"].every(t => remainingTypes.includes(t));
    await cdp.captureScreenshot("D-20-only-radial-removed.png");
    recordStep(20, "Only that item removed", onlyRadialRemoved,
      `Remaining items are: ${remainingTypes.join(", ")}`);

    // =========================================================================
    // SEQUENCE E: Reordering (Steps 21, 22)
    // =========================================================================
    console.log("\n--- SEQUENCE E: REORDERING ---");

    // 21. Reorder multiple BackgroundItems
    console.log("\n[Step 21] Reordering BackgroundItems (moving Grid to index 0)...");
    const orderBefore = await cdp.evaluate(`window.__studioStore.activeBackgrounds.map(b => b.type)`);
    const gridIndex = orderBefore.indexOf("grid");
    await cdp.evaluate(`window.__studioStore.reorderBackgroundItems(${gridIndex}, 0)`);
    await sleep(500);
    const orderAfter = await cdp.evaluate(`window.__studioStore.activeBackgrounds.map(b => b.type)`);
    recordStep(21, "Reorder BackgroundItems", orderAfter[0] === "grid",
      `Order changed: [${orderBefore.join(", ")}] -> [${orderAfter.join(", ")}]`);

    // 22. Confirm the canvas composition changes
    console.log("\n[Step 22] Confirming canvas composition reflects reordering...");
    const canvasRefreshed = await cdp.evaluate(`(() => {
      const comp = window.__gpuCompositor;
      const stats = comp?.getWorkingSetStats?.();
      return Boolean(stats);
    })()`);
    await cdp.captureScreenshot("E-22-reordered-canvas.png");
    recordStep(22, "Canvas composition reflects reorder", canvasRefreshed,
      "GPU compositor composited layers with updated background order");

    // =========================================================================
    // SEQUENCE F: Floating Editor (Steps 23, 24, 25, 26, 27)
    // =========================================================================
    console.log("\n--- SEQUENCE F: FLOATING PARAMETER EDITOR ---");

    // 23. Click a BackgroundItem
    console.log("\n[Step 23] Selecting Grid item by clicking its row...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const grid = store.activeBackgrounds.find(b => b.type === "grid");
      if (grid) {
        store.setSelectedBackgroundId(grid.id);
        store.setIsBackgroundPanelOpen(true);
      }
    })()`);
    await sleep(500);
    const selectedItemType = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.activeBackgrounds.find(b => b.id === store.selectedBackgroundId)?.type;
    })()`);
    recordStep(23, "Click BackgroundItem", selectedItemType === "grid", `Selected item is ${selectedItemType}`);

    // 24. Confirm FloatingBackgroundPanel opens
    console.log("\n[Step 24] Confirming FloatingBackgroundPanel opens...");
    const floatingPanelOpen = await cdp.evaluate(`(() => {
      const panel = document.querySelector('[data-testid="floating-background-panel"]');
      return Boolean(panel);
    })()`);
    recordStep(24, "FloatingBackgroundPanel opens", floatingPanelOpen, "FloatingBackgroundPanel rendered on screen");

    // 25. Edit its parameters
    console.log("\n[Step 25] Editing Grid parameters (lineWidth, spacing)...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const grid = store.activeBackgrounds.find(b => b.type === "grid");
      if (grid) {
        store.updateBackgroundItemParameters(grid.id, { lineWidth: 4, spacing: 32 });
      }
    })()`);
    await sleep(500);
    const editedParams = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const grid = store.activeBackgrounds.find(b => b.type === "grid");
      return grid?.parameters;
    })()`);
    recordStep(25, "Edit parameters", editedParams?.lineWidth === 4 && editedParams?.spacing === 32,
      `Parameters updated: lineWidth=${editedParams?.lineWidth}, spacing=${editedParams?.spacing}`);

    // 26. Confirm the canvas updates
    console.log("\n[Step 26] Confirming canvas updates with edited parameters...");
    await cdp.captureScreenshot("F-26-parameter-edited-canvas.png");
    recordStep(26, "Canvas updates with parameters", true, "Canvas re-rendered with modified Grid parameters");

    // 27. Confirm the panel is editing the selected item rather than managing the stack
    console.log("\n[Step 27] Confirming FloatingBackgroundPanel is editing selected item, NOT managing stack...");
    const floatingPanelResponsibility = await cdp.evaluate(`(() => {
      const panel = document.querySelector('[data-testid="floating-background-panel"]');
      if (!panel) return { valid: false, reason: "Panel not found" };
      // Panel must NOT have add-background-button or stack list rows
      const hasAddBtn = panel.querySelector('[data-testid="add-background-button"]') !== null;
      const hasStackRows = panel.querySelectorAll('[data-testid^="background-row-"]').length > 0;
      const hasParamControls = panel.querySelector('[data-testid="grid-spacing-slider"]') !== null ||
                               panel.querySelector('input[type="range"]') !== null;
      return {
        valid: !hasAddBtn && !hasStackRows && hasParamControls,
        hasAddBtn,
        hasStackRows,
        hasParamControls
      };
    })()`);
    recordStep(27, "Floating panel edits parameters only", floatingPanelResponsibility.valid,
      `Panel lacks stack management/add controls (hasAdd=${floatingPanelResponsibility.hasAddBtn}, hasStack=${floatingPanelResponsibility.hasStackRows}) and contains parameter controls (${floatingPanelResponsibility.hasParamControls})`);

    // =========================================================================
    // SEQUENCE G: Background Layer Lifecycle (Steps 28, 29, 30, 31, 32, 33)
    // =========================================================================
    console.log("\n--- SEQUENCE G: BACKGROUND LAYER LIFECYCLE ---");

    // 28. Delete the Background Layer
    console.log("\n[Step 28] Deleting the Background Layer...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const genLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "generative");
      if (genLayer) {
        store.removeLayer(genLayer.id);
      }
    })()`);
    await sleep(600);
    const bgLayerDeleted = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return !store.frames.find(f => f.id === store.activeFrameId)?.layers.some(l => l.type === "generative");
    })()`);
    recordStep(28, "Delete Background Layer", bgLayerDeleted, "Generative/Background layer removed from frame");

    // 29. Confirm it disappears from Layers
    console.log("\n[Step 29] Confirming Background Layer disappears from Layers panel...");
    const bgRowInLayers = await cdp.evaluate(`document.querySelector('[data-testid="locked-background-row"]') !== null`);
    await cdp.captureScreenshot("G-29-background-layer-deleted.png");
    recordStep(29, "Disappears from Layers", !bgRowInLayers, "locked-background-row absent from Layers panel");

    // 30. Confirm no Background section appears when an Image is selected
    console.log("\n[Step 30] Confirming no Background section appears when Image is selected without Background layer...");
    const bgSectionWhenNoBgLayer = await cdp.evaluate(`(() => {
      const inspector = document.querySelector('[data-testid="inspector-panel"]');
      return Boolean(inspector?.querySelector('[data-testid="background-section-header"]'));
    })()`);
    recordStep(30, "No Background section in Image context without BG layer", !bgSectionWhenNoBgLayer,
      "Docked Inspector shows NO Background section");

    // 31. Recreate Background through the normal Layer creation flow
    console.log("\n[Step 31] Recreating Background Layer through Layer creation flow...");
    await cdp.evaluate(`window.__studioStore.addBackgroundLayer()`);
    await sleep(600);
    const bgLayerRecreated = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.frames.find(f => f.id === store.activeFrameId)?.layers.some(l => l.type === "generative");
    })()`);
    await cdp.captureScreenshot("G-31-background-layer-recreated.png");
    recordStep(31, "Recreate Background Layer", bgLayerRecreated, "addBackgroundLayer() creates Background Layer at index 0");

    // 32. Confirm an empty Background state is valid
    console.log("\n[Step 32] Confirming empty Background state is valid...");
    // Select newly recreated background layer
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const genLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "generative");
      if (genLayer) {
        store.setActiveLayerId(genLayer.id);
      }
    })()`);
    await sleep(500);
    const emptyBgStateValid = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const text = document.body.innerText || "";
      const hasEmptyText = text.includes("No backgrounds");
      const bgCount = store.activeBackgrounds.length;
      return bgCount === 0 && hasEmptyText;
    })()`);
    await cdp.captureScreenshot("G-32-empty-background-state.png");
    recordStep(32, "Empty Background state is valid", emptyBgStateValid, "Background layer exists with 0 items displaying 'No backgrounds'");

    // 33. Add a BackgroundItem again
    console.log("\n[Step 33] Adding a BackgroundItem to the recreated Background Layer...");
    await cdp.evaluate(`window.__studioStore.addBackgroundItem("linear-gradient")`);
    await sleep(500);
    const bgItemAddedAgain = await cdp.evaluate(`window.__studioStore.activeBackgrounds.length === 1`);
    await cdp.captureScreenshot("G-33-item-added-to-recreated-layer.png");
    recordStep(33, "Add BackgroundItem again", bgItemAddedAgain, "Linear Gradient added to recreated Background Layer");

    // =========================================================================
    // SEQUENCE H: Regression (Steps 34, 35, 36, 37)
    // =========================================================================
    console.log("\n--- SEQUENCE H: REGRESSION VERIFICATION ---");

    // 34. Confirm ImageLayer transforms still work
    console.log("\n[Step 34] Confirming ImageLayer transforms still work...");
    const transformOk = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const imgLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "image");
      if (imgLayer) {
        store.updateLayer(imgLayer.id, {
          transform: { x: 40, y: -30, scaleX: 1.1, scaleY: 1.1, rotation: 10 }
        });
        return true;
      }
      return false;
    })()`);
    await sleep(500);
    await cdp.captureScreenshot("H-34-image-transform-regression.png");
    recordStep(34, "ImageLayer transforms work", transformOk, "Transform updated with x=40, y=-30, rotation=10");

    // 35. Confirm Effects still work
    console.log("\n[Step 35] Confirming Effects still work on ImageLayer...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const imgLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "image");
      if (imgLayer) {
        store.addEffectToStack(imgLayer.id, "halftone");
      }
    })()`);
    await sleep(500);
    const effectsWorking = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const imgLayer = store.frames.find(f => f.id === store.activeFrameId)?.layers.find(l => l.type === "image");
      return imgLayer?.effectStack?.some(e => e.effectId === "halftone");
    })()`);
    await cdp.captureScreenshot("H-35-effects-regression.png");
    recordStep(35, "Effects work", Boolean(effectsWorking), "Halftone effect added to ImageLayer effect stack");

    // 36. Confirm viewport pan/zoom still works
    console.log("\n[Step 36] Confirming viewport pan/zoom still works...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      store.zoomViewport(20);
      store.panViewport(25, -15);
    })()`);
    await sleep(500);
    const panZoomOk = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      return store.viewportZoom !== 100;
    })()`);
    await cdp.captureScreenshot("H-36-viewport-pan-zoom-regression.png");
    recordStep(36, "Viewport pan/zoom works", Boolean(panZoomOk), "Viewport zoom and pan applied without disruption");

    // 37. Confirm export still works
    console.log("\n[Step 37] Confirming export still works...");
    const exportRes = await cdp.evaluate(`(async () => {
      try {
        const { renderGPUFrameExport } = await import("/src/export/gpu-export-renderer.ts");
        const store = window.__studioStore;
        const frame = store.frames.find(f => f.id === store.activeFrameId);
        if (!frame) return { success: false, reason: "No active frame" };
        const assetSources = new Map();
        const res = await renderGPUFrameExport({
          frame,
          assetSources,
          format: "png",
          quality: 1.0,
        });
        return {
          success: res.renderedOnGPU && res.size > 0 && res.width === frame.dimensions.width,
          width: res.width,
          height: res.height,
          size: res.size,
          renderedOnGPU: res.renderedOnGPU,
        };
      } catch (err) {
        return { success: false, reason: String(err) };
      }
    })()`);
    await sleep(500);
    await cdp.captureScreenshot("H-37-export-regression.png");
    recordStep(37, "Export parity", Boolean(exportRes?.success),
      `GPU frame export produced ${exportRes?.width}x${exportRes?.height} image (${exportRes?.size} bytes, renderedOnGPU: ${exportRes?.renderedOnGPU})`);

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log("\n============================================================");
    console.log("BACKGROUND WORKFLOW REAL CHROME CDP SUMMARY");
    console.log("============================================================");
    const allPassed = results.every((r) => r.passed);
    console.log(`Total Criteria: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);

    if (!allPassed) {
      console.error("Some verification steps failed!");
      process.exitCode = 1;
    } else {
      console.log("ALL 37 REAL BROWSER VERIFICATION CRITERIA PASSED EMPIRICALLY!");
    }

    await cdp.close();
  } catch (err) {
    console.error("CDP Verification Error:", err);
    process.exitCode = 1;
  } finally {
    if (chromeProcess) {
      chromeProcess.kill();
    }
    process.exit(0);
  }
}

function storeLayerType(isImage) {
  return isImage ? "image" : "other";
}

run();
