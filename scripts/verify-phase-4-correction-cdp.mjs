#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9842;
const APP_PORT = 5173;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const ART_DIR = "/Users/clement/.gemini/antigravity/brain/598f0cf2-377a-4792-a038-4089a7881ddd/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "phase-4-correction");

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
let viteProcess = null;

async function ensureViteServer() {
  console.log(`Checking Vite server at ${APP_URL}...`);
  try {
    const res = await fetch(APP_URL);
    if (res.ok) {
      console.log("Vite dev server is already running.");
      return;
    }
  } catch {}

  console.log(`Starting Vite dev server on port ${APP_PORT}...`);
  const viteBin = path.join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
  viteProcess = spawn(process.execPath, [viteBin, "--port", String(APP_PORT), "--host", "127.0.0.1"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  viteProcess.stderr?.on("data", (d) => console.error("[Vite stderr]", d.toString().trim()));
  viteProcess.stdout?.on("data", (d) => console.log("[Vite stdout]", d.toString().trim()));

  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      const res = await fetch(APP_URL);
      if (res.ok) {
        console.log("Vite dev server is ready.");
        return;
      }
    } catch {}
  }
  throw new Error("Failed to start Vite dev server");
}

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
      `--user-data-dir=/tmp/effectsio-phase4-cdp-${Date.now()}`,
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
  console.log("EFFECTSIO PHASE 4 UI REAL BROWSER CDP VERIFICATION SUITE");
  console.log("============================================================\n");

  const results = [];
  function recordStep(name, passed, detail) {
    results.push({ name, passed, detail });
    console.log(`${passed ? "✅ PASS" : "❌ FAIL"}: ${name} — ${detail}`);
  }

  try {
    await ensureViteServer();
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
        appLoaded = await cdp.evaluate(`document.body !== null && window.__studioStore !== undefined`);
        if (appLoaded) break;
      } catch {}
    }
    if (!appLoaded) throw new Error("Application failed to load or studioStore not found");
    console.log("App and studio store loaded successfully.\n");

    // =========================================================================
    // SCENARIO 1: Empty canvas / default project with single procedural backdrop
    // =========================================================================
    console.log("\n[Scenario 1] Verifying Empty canvas / default procedural backdrop...");
    // Switch to Layers tab in sidebar
    await cdp.evaluate(`(() => {
      const layersTab = Array.from(document.querySelectorAll('button[role="tab"]')).find(b => b.textContent.includes('Layers'));
      if (layersTab) layersTab.click();
    })()`);
    await sleep(600);

    const s1Check = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const frame = store.activeFrame;
      const layers = frame?.layers || [];
      const backdrop = layers[0];
      return {
        layerCount: layers.length,
        backdropId: backdrop?.id,
        isLocked: backdrop?.locked === true,
        sourceType: backdrop?.source?.type,
        sourceKind: backdrop?.source?.kind,
      };
    })()`);

    await cdp.captureScreenshot("01-empty-canvas-procedural-backdrop.png");
    recordStep(
      "1. Empty Canvas with Procedural Backdrop",
      s1Check.layerCount === 1 && s1Check.sourceType === "procedural" && s1Check.isLocked,
      `Layers: ${s1Check.layerCount}, Source: ${s1Check.sourceType} (${s1Check.sourceKind}), Locked: ${s1Check.isLocked}`
    );

    // =========================================================================
    // SCENARIO 2: Populated canvas with ImageLayer selected
    // =========================================================================
    console.log("\n[Scenario 2] Ingesting test image asset and selecting ImageLayer...");
    await cdp.evaluate(`(async () => {
      const store = window.__studioStore;
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1e1b4b";
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("HERO IMAGE ASSET", 300, 200);

      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const file = new File([blob], "hero-card.png", { type: "image/png" });

      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(1200);

    const s2Check = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const asset = store.assets[0];
      if (asset) {
        const imgLayer = store.addLayerFromAsset(asset.id);
        if (imgLayer) {
          store.setActiveLayerId(imgLayer.id);
        }
      }
      const activeLayer = store.activeLayer;
      const inspectorText = document.querySelector('[data-testid="inspector-panel"]')?.textContent || "";
      return {
        activeLayerType: activeLayer?.source?.type,
        activeLayerId: activeLayer?.id,
        hasSourceHeader: inspectorText.includes("Source"),
        hasFitControl: inspectorText.includes("Fit"),
        hasLayerProperties: inspectorText.includes("Layer Properties"),
        hasEffects: inspectorText.includes("Effects"),
        hasLooks: inspectorText.includes("Looks"),
        hasNoBackgroundSection: !inspectorText.includes("Background (") && !inspectorText.includes("No backgrounds"),
      };
    })()`);
    await sleep(800);

    await cdp.captureScreenshot("02-image-layer-inspector.png");
    recordStep(
      "2. ImageLayer Inspector Alignment",
      s2Check.activeLayerType === "image" && s2Check.hasFitControl && s2Check.hasNoBackgroundSection,
      `Layer source: ${s2Check.activeLayerType}, Fit control: ${s2Check.hasFitControl}, Background section hidden: ${s2Check.hasNoBackgroundSection}`
    );

    // =========================================================================
    // SCENARIO 3: Procedural backdrop layer selected
    // =========================================================================
    console.log("\n[Scenario 3] Selecting procedural backdrop layer...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const backdrop = store.activeFrame?.layers[0];
      if (backdrop) {
        store.setActiveLayerId(backdrop.id);
      }
    })()`);
    await sleep(800);

    const s3Check = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const inspectorText = document.querySelector('[data-testid="inspector-panel"]')?.textContent || "";
      const activeLayer = store.activeLayer;
      return {
        activeLayerType: activeLayer?.source?.type,
        activeLayerId: activeLayer?.id,
        hasBackgroundHeader: Boolean(document.querySelector('[data-slot="background-section-header"]')),
        hasPermanentPlus: Boolean(document.querySelector('[data-testid="add-background-button"]')),
        hasEffects: inspectorText.includes("Effects"),
        hasLooks: inspectorText.includes("Looks"),
      };
    })()`);

    await cdp.captureScreenshot("03-procedural-backdrop-inspector.png");
    recordStep(
      "3. Procedural Backdrop Inspector Alignment",
      s3Check.activeLayerType === "procedural" && s3Check.hasBackgroundHeader && s3Check.hasPermanentPlus,
      `Source: ${s3Check.activeLayerType}, Background header: ${s3Check.hasBackgroundHeader}, Permanent +: ${s3Check.hasPermanentPlus}, Universal Effects/Looks: ${s3Check.hasEffects && s3Check.hasLooks}`
    );

    // =========================================================================
    // SCENARIO 4: Floating Effect Panel open
    // =========================================================================
    console.log("\n[Scenario 4] Adding effect and opening Floating Effect Panel...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const layerId = store.activeLayerId;
      if (!layerId) return;
      store.addEffectToStack(layerId, "duotone");
    })()`);
    await sleep(800);

    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const layerId = store.activeLayerId;
      const updatedLayer = store.activeFrame?.layers.find(l => l.id === layerId);
      const instance = updatedLayer?.effectStack?.[0];
      if (instance) {
        store.selectInstance(layerId, instance.instanceId);
      }
    })()`);
    await sleep(800);

    const s4Check = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const layerId = store.activeLayerId;
      const updatedLayer = store.activeFrame?.layers.find(l => l.id === layerId);
      const instance = updatedLayer?.effectStack?.[0];
      return {
        success: Boolean(instance),
        instanceId: instance?.instanceId,
        hasFloatingPanel: Boolean(document.querySelector('[aria-label="Duotone Parameters"]')),
      };
    })()`);

    await cdp.captureScreenshot("04-floating-effect-panel.png");
    recordStep(
      "4. Floating Effect Panel Operation",
      s4Check.success && s4Check.hasFloatingPanel,
      `Effect added, instance selected (${s4Check.instanceId}), Floating Panel rendered: ${s4Check.hasFloatingPanel}`
    );

    // =========================================================================
    // SCENARIO 5: Floating Background Panel open
    // =========================================================================
    console.log("\n[Scenario 5] Opening Floating Background Panel...");
    await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      // Close effect panel selection
      store.selectInstance(store.activeLayerId, null);
      // Select backdrop
      store.setActiveLayerId(store.activeFrame.layers[0].id);
      // Open background panel
      store.setIsBackgroundPanelOpen(true);
    })()`);
    await sleep(800);

    const s5Check = await cdp.evaluate(`(() => {
      const store = window.__studioStore;
      const panelEl = document.querySelector('[aria-label="Background Parameters"]');
      const hasToolbar = Boolean(document.querySelector('[data-testid="add-background-primitives-toolbar"]'));
      return {
        isOpen: store.isBackgroundPanelOpen,
        hasPanelEl: Boolean(panelEl),
        hasToolbar,
        activeLayerSource: store.activeLayer?.source?.type,
      };
    })()`);

    await cdp.captureScreenshot("05-floating-background-panel.png");
    recordStep(
      "5. Floating Background Panel Operation",
      s5Check.isOpen && s5Check.hasPanelEl && s5Check.activeLayerSource === "procedural",
      `Open: ${s5Check.isOpen}, Panel DOM: ${s5Check.hasPanelEl}, Toolbar: ${s5Check.hasToolbar}, Pure procedural layer: ${s5Check.activeLayerSource}`
    );

    console.log("\n============================================================");
    console.log("PHASE 4 UI BROWSER VERIFICATION SUMMARY");
    console.log("============================================================");
    const allPassed = results.every((r) => r.passed);
    console.log(`Total Scenarios: ${results.length} | Passed: ${results.filter(r => r.passed).length} | Failed: ${results.filter(r => !r.passed).length}`);
    if (!allPassed) {
      console.error("Some browser verification scenarios failed!");
      process.exitCode = 1;
    } else {
      console.log("ALL 5 REAL BROWSER SCENARIOS VERIFIED AND SCREENSHOT EVIDENCE SAVED!");
    }

    await cdp.close();
  } catch (err) {
    console.error("CDP Verification Error:", err);
    process.exitCode = 1;
  } finally {
    if (chromeProcess) {
      chromeProcess.kill();
    }
    if (viteProcess) {
      viteProcess.kill();
    }
  }
}

run();
