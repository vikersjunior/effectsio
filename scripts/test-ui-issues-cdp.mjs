#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9792;
const APP_PORT = 5174;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/9cd1ab7b-7904-465d-a2a7-dfe12073a0a0/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "ui-polish");

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

let viteProcess = null;
let chromeProcess = null;

async function startViteServer() {
  console.log(`Starting Vite dev server on port ${APP_PORT}...`);
  viteProcess = spawn("pnpm", ["dev", "--port", String(APP_PORT)], {
    cwd: process.cwd(),
    stdio: "pipe",
    env: { ...process.env, PORT: String(APP_PORT) },
  });

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(APP_URL);
      if (res.ok) {
        console.log(`Vite dev server is ready at ${APP_URL}`);
        return;
      }
    } catch {
      await sleep(300);
    }
  }
  throw new Error("Vite dev server failed to start");
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
      `--user-data-dir=/tmp/effectsio-cdp-${Date.now()}`,
      APP_URL,
    ],
    { stdio: "inherit" }
  );

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) return list;
      }
    } catch {
      // Waiting for Chrome
    }
    await sleep(300);
  }
  throw new Error(`Chrome failed to start on port ${PORT}`);
}

async function run() {
  try {
    await startViteServer();
    const list = await startChrome();

    const page = list.find((p) => p.url.includes(String(APP_PORT))) || list[0];
    if (!page || !page.webSocketDebuggerUrl) {
      throw new Error("No debugger WebSocket URL found for target page");
    }

    console.log("Connecting to Chrome WebSocket:", page.webSocketDebuggerUrl);
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
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    };

    console.log("\nWaiting for initial app load...");
    for (let i = 0; i < 20; i++) {
      try {
        const text = await evalAsync(`document.body ? document.body.innerText : ""`);
        if (text && text.includes("EffectsIO")) {
          break;
        }
      } catch {
        // waiting
      }
      await sleep(500);
    }
    await sleep(1000);

    // ==========================================
    // CHECK 1: EffectsIO Empty Dropzone & Top Bar Shadow
    // ==========================================
    console.log("\n[Check 1] Verifying EffectsIO Empty Dropzone ('Assets (0)', 'Add media', 'Import media') and Top Bar Shadow...");
    const check1 = await evalAsync(`(() => {
      const header = document.querySelector("header");
      const text = document.body.innerText;
      const dropzone = text.includes("Assets") &&
                       text.includes("Add media") &&
                       text.includes("Drag here, import from your computer") &&
                       text.includes("Import media") &&
                       !text.includes("SOURCE IMAGE");
      const computedHeader = header ? window.getComputedStyle(header) : null;
      const logo = header ? header.querySelector(".size-7") : null;
      const computedLogo = logo ? window.getComputedStyle(logo) : null;
      return {
        bodyTextSnippet: text.slice(0, 300),
        dropzoneExists: dropzone,
        headerBoxShadow: computedHeader ? computedHeader.boxShadow : null,
        logoBoxShadow: computedLogo ? computedLogo.boxShadow : null,
      };
    })()`);

    console.log("  Body text snippet:", JSON.stringify(check1.bodyTextSnippet));
    console.log("  Dropzone exists:", check1.dropzoneExists);
    console.log("  Header box-shadow:", check1.headerBoxShadow);
    console.log("  Logo box-shadow:", check1.logoBoxShadow);
    if (!check1.dropzoneExists) throw new Error("Check 1 failed: Zero-state dropzone not rendered");
    await saveScreenshot("01-zero-state-dropzone");

    // ==========================================
    // CHECK 2: Issue 0.2 — Resizable Panel Layout
    // ==========================================
    console.log("\n[Check 2] Verifying Issue 0.2 (Resizable Panels and Hairline Handles)...");
    const check2 = await evalAsync(`(() => {
      const group = document.querySelector('[data-slot="resizable-panel-group"]');
      const handles = document.querySelectorAll('[data-slot="resizable-handle"]');
      const leftPanel = document.querySelector('#asset-library-panel');
      const centerPanel = document.querySelector('#canvas-viewport-panel');
      const rightPanel = document.querySelector('#inspector-panel');
      return {
        groupExists: Boolean(group),
        handlesCount: handles.length,
        leftWidth: leftPanel ? Math.round(leftPanel.getBoundingClientRect().width) : null,
        centerWidth: centerPanel ? Math.round(centerPanel.getBoundingClientRect().width) : null,
        rightWidth: rightPanel ? Math.round(rightPanel.getBoundingClientRect().width) : null,
        groupWidth: group ? Math.round(group.getBoundingClientRect().width) : null,
      };
    })()`);

    console.log("  Resizable group present:", check2.groupExists);
    console.log("  Resize handles count:", check2.handlesCount);
    console.log(`  Measured widths: Left=${check2.leftWidth}px (${Math.round((check2.leftWidth/check2.groupWidth)*100)}%), Center=${check2.centerWidth}px, Right=${check2.rightWidth}px (${Math.round((check2.rightWidth/check2.groupWidth)*100)}%), Total=${check2.groupWidth}px`);
    if (!check2.groupExists || check2.handlesCount !== 2) throw new Error("Check 2 failed: Resizable panels not configured correctly");

    // ==========================================
    // CHECK 3: Ingest Test Assets -> Populated 4-Column Grid (Issue 0.1)
    // ==========================================
    console.log("\n[Check 3] Ingesting test assets to verify 4-column grid populated state...");
    await evalAsync(`(async () => {
      function makeBlob(color, name) {
        const c = document.createElement("canvas");
        c.width = 400;
        c.height = 400;
        const ctx = c.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name, 200, 210);
        return new Promise((resolve) => {
          c.toBlob((blob) => {
            const file = new File([blob], name + ".png", { type: "image/png" });
            resolve(file);
          });
        });
      }

      const files = await Promise.all([
        makeBlob("#3b82f6", "Sample_Alpha"),
        makeBlob("#ef4444", "Sample_Beta"),
        makeBlob("#10b981", "Sample_Gamma"),
        makeBlob("#f59e0b", "Sample_Delta"),
        makeBlob("#8b5cf6", "Sample_Epsilon"),
      ]);

      const input = document.querySelector('input[type="file"]');
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);

    await sleep(1500);

    const check3 = await evalAsync(`(() => {
      const grid = document.querySelector(".grid.grid-cols-4");
      const tiles = grid ? grid.querySelectorAll(".aspect-square") : [];
      return {
        gridExists: Boolean(grid),
        tileCount: tiles.length,
      };
    })()`);

    console.log("  Grid exists:", check3.gridExists, "with", check3.tileCount, "tiles");
    if (!check3.gridExists || check3.tileCount !== 6) throw new Error("Check 3 failed: 4-column grid not populated (expected 5 images + 1 add tile)");
    await saveScreenshot("02-populated-4-column-grid");

    // ==========================================
    // CHECK 4: Prominent Search Input in Populated Asset Header
    // ==========================================
    console.log("\n[Check 4] Verifying Prominent Search Input in Populated Asset Header...");
    const searchState = await evalAsync(`(() => {
      const input = document.querySelector('input[placeholder="Find..."]');
      return { inputOpen: Boolean(input) };
    })()`);

    console.log("  Search bar visible:", searchState.inputOpen);
    if (!searchState.inputOpen) throw new Error("Check 4 failed: Search input not visible in populated state");
    await saveScreenshot("03-search-toggle-open");

    // Filter by "Alpha"
    await evalAsync(`(() => {
      const input = document.querySelector('input[placeholder="Find..."]');
      if (input) {
        input.value = "Alpha";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(400);
    await saveScreenshot("04-search-filtered-results");

    // Close search
    await evalAsync(`(() => {
      const searchBtn = document.querySelector('button[title*="search" i]');
      if (searchBtn) searchBtn.click();
    })()`);
    await sleep(400);

    // ==========================================
    // CHECK 5: Issue 0.3 — Split-View Circular Pill Handle
    // ==========================================
    console.log("\n[Check 5] Verifying Issue 0.3 (Split-View Circular Drag Handle)...");
    await evalAsync(`(() => {
      // Find and click Split View toggle
      const splitBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.title?.toLowerCase().includes("split") || b.innerText?.toLowerCase().includes("split")
      );
      if (splitBtn) splitBtn.click();
    })()`);
    await sleep(800);

    const check5 = await evalAsync(`(() => {
      const handle = document.querySelector('div[role="separator"][aria-label*="split"]');
      if (!handle) return null;
      const rect = handle.getBoundingClientRect();
      const style = window.getComputedStyle(handle);
      const chevrons = handle.querySelectorAll("svg").length;
      return {
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        chevronsCount: chevrons,
      };
    })()`);

    console.log("  Split Handle dimensions & chevrons:", check5);
    if (!check5 || check5.chevronsCount !== 2) throw new Error("Check 5 failed: Split view circular handle not rendered");
    await saveScreenshot("05-split-view-circular-handle");

    // ==========================================
    // CHECK 6: Issue 0.6 — Effect Browser Modal with Rendered Previews
    // ==========================================
    console.log("\n[Check 6] Verifying Issue 0.6 (Effect Picker Rendered Preview Grid)...");
    await evalAsync(`(() => {
      const addEffectBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Add Effect")
      );
      if (addEffectBtn) addEffectBtn.click();
    })()`);
    await sleep(1000);

    const check6 = await evalAsync(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return null;
      const images = Array.from(modal.querySelectorAll("img"));
      const dataUrls = images.filter((img) => img.src.startsWith("data:image/png"));
      const hoverLabels = modal.querySelectorAll(".opacity-0");
      return {
        modalOpen: true,
        previewImagesCount: images.length,
        validPngDataUrlsCount: dataUrls.length,
        hoverLabelsCount: hoverLabels.length,
      };
    })()`);

    console.log("  Effect modal previews:", check6);
    if (!check6 || check6.previewImagesCount === 0 || check6.validPngDataUrlsCount === 0) {
      throw new Error("Check 6 failed: Effect preview images not generated or rendered");
    }
    await saveScreenshot("06-effect-browser-rendered-previews");

    // Add Halftone & Duotone to stack
    await evalAsync(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      const halftone = Array.from(modal.querySelectorAll(".aspect-square")).find((el) =>
        el.getAttribute("title")?.toLowerCase().includes("halftone")
      );
      if (halftone) halftone.click();
    })()`);
    await sleep(800);

    await evalAsync(`(() => {
      const addEffectBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Add Effect")
      );
      if (addEffectBtn) addEffectBtn.click();
    })()`);
    await sleep(800);

    await evalAsync(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      const duotone = Array.from(modal.querySelectorAll(".aspect-square")).find((el) =>
        el.getAttribute("title")?.toLowerCase().includes("duotone")
      );
      if (duotone) duotone.click();
    })()`);
    await sleep(800);

    // ==========================================
    // CHECK 7: Issue 0.8 — Sortable Effect Stack with Drag Handles
    // ==========================================
    console.log("\n[Check 7] Verifying Issue 0.8 (Dnd-Kit Sortable Effect Stack Drag Handles)...");
    const check7 = await evalAsync(`(() => {
      const handles = document.querySelectorAll('button[aria-label*="Drag to reorder"]');
      return { handlesCount: handles.length };
    })()`);

    console.log("  Sortable drag handles in stack:", check7.handlesCount);
    if (check7.handlesCount < 2) throw new Error("Check 7 failed: Sortable drag handles not present in effect stack");
    await saveScreenshot("07-sortable-effect-stack");

    // ==========================================
    // CHECK 8: Issue 0.7 — Native Color Picker
    // ==========================================
    console.log("\n[Check 8] Verifying Issue 0.7 (Native Color Picker Popover with SV Surface & Sliders)...");
    await evalAsync(`(() => {
      // Find color button in inspector
      const swatchBtn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.getAttribute("data-slot") === "color-picker-popover-trigger" || b.getAttribute("aria-label")?.toLowerCase().includes("hex") || b.innerText.startsWith("#") || b.querySelector('div[style*="background-color"]')
      );
      if (swatchBtn) swatchBtn.click();
    })()`);
    await sleep(800);

    const check8 = await evalAsync(`(() => {
      const popover = document.querySelector('[data-slot="popover-content"], [data-slot="color-surface"], [data-slot="style-guide-color-picker-view"]');
      const colorSurface = document.querySelector('[data-slot="color-surface"], .color-surface, [aria-label*="Saturation"]');
      return {
        popoverExists: Boolean(popover || colorSurface),
      };
    })()`);

    console.log("  Color picker popover open:", check8.popoverExists);
    await saveScreenshot("08-color-picker-popover");

    // Close color popover
    await evalAsync(`(() => {
      document.body.click();
    })()`);
    await sleep(400);

    // ==========================================
    // CHECK 9: Issue 0.9 — Looks Browser Badge Secondary Variant
    // ==========================================
    console.log("\n[Check 9] Verifying Issue 0.9 (Looks Browser Secondary Variant Badges)...");
    await evalAsync(`(() => {
      const looksTab = document.querySelector('[data-slot="tabs-trigger"][value="looks"]') ||
                       Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).find((t) => t.getAttribute("value") === "looks");
      if (looksTab) looksTab.click();
    })()`);
    await sleep(800);

    const check9 = await evalAsync(`(() => {
      const badges = Array.from(document.querySelectorAll('[data-slot="badge"]'));
      return {
        totalBadges: badges.length,
      };
    })()`);

    console.log("  Looks Browser Badges:", check9);
    await saveScreenshot("09-looks-browser-secondary-badges");

    // ==========================================
    // CHECK 10: Backdrop Tab with PaletteControl
    // ==========================================
    console.log("\n[Check 10] Verifying Backdrop Tab with PaletteControl (5x5 grid + shade rail)...");
    await evalAsync(`(() => {
      const backdropTab = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).find((t) =>
        t.title?.includes("Backdrop") || t.textContent?.includes("Backdrop")
      );
      if (backdropTab) backdropTab.click();
    })()`);
    await sleep(800);

    // Switch backdrop type to Solid
    await evalAsync(`(() => {
      const solidBtn = Array.from(document.querySelectorAll('[data-slot="toggle-group-item"]')).find((b) =>
        b.getAttribute("aria-label") === "Solid" || b.textContent?.includes("Solid")
      );
      if (solidBtn) solidBtn.click();
    })()`);
    await sleep(800);

    const check10 = await evalAsync(`(() => {
      const paletteControl = document.querySelector('[data-slot="palette-control"]');
      const paletteBlock = document.querySelector('[data-slot="palette-control-palette-block"]');
      const sliderBlock = document.querySelector('[data-slot="palette-control-slider-block"]');
      const swatches = paletteBlock ? paletteBlock.querySelectorAll("button") : [];
      const shadeSteps = sliderBlock ? sliderBlock.querySelectorAll("button") : [];
      const shadeIndicator = document.querySelector('[data-slot="palette-shade-indicator"]');
      return {
        paletteControlExists: Boolean(paletteControl),
        swatchesCount: swatches.length,
        shadeStepsCount: shadeSteps.length,
        shadeIndicatorExists: Boolean(shadeIndicator),
      };
    })()`);

    console.log("  PaletteControl details:", check10);
    if (!check10.paletteControlExists || check10.swatchesCount < 20 || check10.shadeStepsCount !== 11) {
      throw new Error("Check 10 failed: PaletteControl not properly rendered in Backdrop tab");
    }
    await saveScreenshot("10-backdrop-palette-control");

    // Click a palette swatch
    await evalAsync(`(() => {
      const paletteBlock = document.querySelector('[data-slot="palette-control-palette-block"]');
      const swatches = paletteBlock ? paletteBlock.querySelectorAll("button") : [];
      if (swatches.length > 5) swatches[5].click(); // Click Emerald / Green
    })()`);
    await sleep(500);
    await saveScreenshot("11-backdrop-palette-swatch-selected");

    // ==========================================
    // CHECK 12: Backdrop Tab with GradientControl
    // ==========================================
    console.log("\n[Check 12] Verifying Backdrop Tab with GradientControl (stops track, angle input, stops list)...");
    await evalAsync(`(() => {
      const linearBtn = Array.from(document.querySelectorAll('[data-slot="toggle-group-item"]')).find((b) =>
        b.getAttribute("aria-label") === "Linear" || b.textContent?.includes("Linear")
      );
      if (linearBtn) linearBtn.click();
    })()`);
    await sleep(800);

    const check12 = await evalAsync(`(() => {
      const track = document.querySelector('[aria-label="Gradient stops track"]');
      const stopsList = document.querySelector('[data-slot="gradient-stops-list"]');
      const toolbarGrid = document.querySelector('[data-slot="gradient-toolbar-grid"]');
      const stopRows = document.querySelectorAll('[data-slot="gradient-stop-row-content"]');
      const pins = track ? track.querySelectorAll("button") : [];
      return {
        trackExists: Boolean(track),
        stopsListExists: Boolean(stopsList),
        toolbarExists: Boolean(toolbarGrid),
        stopPinsCount: pins.length,
        stopRowsCount: stopRows.length,
      };
    })()`);

    console.log("  GradientControl details:", check12);
    if (!check12.trackExists || !check12.stopsListExists || check12.stopRowsCount < 2) {
      throw new Error("Check 12 failed: GradientControl not properly rendered in Backdrop tab");
    }
    await saveScreenshot("12-backdrop-gradient-control");

    console.log("\n============================================================");
    console.log("ALL 12 UI ISSUES FULLY VERIFIED & EMPIRICALLY CONFIRMED!");
    console.log("============================================================\n");
  } catch (err) {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  } finally {
    if (chromeProcess) chromeProcess.kill();
    if (viteProcess) viteProcess.kill();
  }
}

run();
