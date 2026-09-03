#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9802;
const APP_PORT = 5173;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/366d5d88-213d-467c-9510-d012ad567de2";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "correction-02-4");

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
      `--window-size=1440,900`,
      `--no-first-run`,
      `--no-default-browser-check`,
      `--disable-background-networking`,
      `--disable-features=Translate,MediaRouter`,
      `--mute-audio`,
      `--disable-gpu`,
    ],
    { stdio: "ignore" }
  );

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        console.log("Chrome debug port is ready.");
        return;
      }
    } catch {
      await sleep(200);
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
    console.log(`Saved screenshot: ${filename}`);
  }

  async close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function run() {
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

    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    console.log(`Navigating to http://127.0.0.1:5173/...`);
    await cdp.send("Page.navigate", { url: "http://127.0.0.1:5173/" });
    
    // Wait for file input to exist in DOM
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.evaluate(`(() => document.querySelector('input[type="file"]') !== null)()`);
      if (ready) {
        console.log("File input detected in DOM!");
        break;
      }
      await sleep(300);
    }
    await sleep(500);

    // Setup a real asset with canvas image loaded
    const uploadResult = await cdp.evaluate(`
      (async () => {
        const realInput = document.querySelector('input[type="file"]');
        if (!realInput) return "no-input";
        const c = document.createElement("canvas");
        c.width = 600;
        c.height = 400;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(0, 0, 600, 400);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Sample Canvas Asset", 180, 200);

        const blob = await new Promise(r => c.toBlob(r, "image/png"));
        const file = new File([blob], "sample-model.png", { type: "image/png" });
        const dt = new DataTransfer();
        dt.items.add(file);
        realInput.files = dt.files;
        realInput.dispatchEvent(new Event("change", { bubbles: true }));
        return "dispatched";
      })()
    `);
    console.log("Upload result:", uploadResult);

    // Wait until asset is ingested and inspector shows populated sections
    for (let i = 0; i < 25; i++) {
      const isReady = await cdp.evaluate(`
        (() => {
          return document.querySelector('button[aria-label="Add background"]') !== null;
        })()
      `);
      if (isReady) {
        console.log("Asset ingested and inspector populated!");
        break;
      }
      await sleep(300);
    }

    // Ensure Design mode is active
    await cdp.evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const designBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Design');
        if (designBtn) designBtn.click();
      })()
    `);
    await sleep(500);

    // Add an effect to the stack to verify the Minus icon in the effects layer panel
    console.log("Adding Duotone effect to stack...");
    await cdp.evaluate(`
      (() => {
        const addEffectBtn = document.querySelector('button[aria-label="Add effect"]');
        if (addEffectBtn) addEffectBtn.click();
      })()
    `);
    await sleep(600);
    await cdp.evaluate(`
      (() => {
        const modalButtons = Array.from(document.querySelectorAll('button, div[role="button"]'));
        const duotone = modalButtons.find(b => b.textContent && b.textContent.includes('Duotone'));
        if (duotone) duotone.click();
      })()
    `);
    await sleep(800);

    // Capture 1: Empty Inspector Background Section with Effect row (Minus icon)
    console.log("Capturing 1: Inspector with Effect row (Minus icon)...");
    await cdp.captureScreenshot("bg_01_empty_inspector.png");

    // Click Background "+" button -> directly opens floating Add Background panel
    console.log("Clicking Background + button (direct open)...");
    await cdp.evaluate(`
      (() => {
        const addBtn = document.querySelector('button[aria-label="Add background"]');
        if (addBtn) addBtn.click();
      })()
    `);
    await sleep(800);

    // Capture 2: Direct Open of Floating Add Background Panel & Active Inspector Row
    console.log("Capturing 2: Direct Open of Floating Add Background Panel...");
    await cdp.captureScreenshot("bg_02_direct_floating_panel_opened.png");

    // Drag the Floating Panel across the canvas
    console.log("Dragging floating panel...");
    const dragCoord = await cdp.evaluate(`
      (() => {
        const panel = document.querySelector('div[aria-label="Add Background"]');
        if (!panel) return null;
        const header = panel.firstElementChild;
        if (!header) return null;
        const rect = header.getBoundingClientRect();
        return { x: Math.round(rect.left + 60), y: Math.round(rect.top + 14) };
      })()
    `);

    if (dragCoord) {
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: dragCoord.x, y: dragCoord.y, button: "left", clickCount: 1 });
      await sleep(100);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: dragCoord.x + 280, y: dragCoord.y + 140, button: "left" });
      await sleep(100);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: dragCoord.x + 280, y: dragCoord.y + 140, button: "left", clickCount: 1 });
      await sleep(300);
    }

    // Capture 3: Floating panel dragged
    console.log("Capturing 3: Floating panel dragged...");
    await cdp.captureScreenshot("bg_03_floating_panel_dragged.png");

    // Switch to Gradient via toolbar in floating panel
    console.log("Switching to Gradient in floating panel...");
    await cdp.evaluate(`
      (() => {
        const gradBtn = document.querySelector('button[aria-label="Gradient"]');
        if (gradBtn) gradBtn.click();
      })()
    `);
    await sleep(600);

    // Capture 4: Floating Gradient panel with Type dropdown, Reverse, Reset, Preview Track, and Steps
    console.log("Capturing 4: Floating Gradient panel...");
    await cdp.captureScreenshot("bg_04_floating_gradient_panel.png");

    // Add a gradient stop using Steps "+"
    console.log("Adding gradient stop...");
    await cdp.evaluate(`
      (() => {
        const addStopBtn = document.querySelector('button[aria-label="Add gradient stop"]');
        if (addStopBtn) addStopBtn.click();
      })()
    `);
    await sleep(500);

    // Drag the newly added stop pin on the gradient track
    console.log("Dragging stop pin on track...");
    const stopPinCoord = await cdp.evaluate(`
      (() => {
        const pin = document.querySelector('button[aria-label="Gradient stop 2"]');
        if (!pin) return null;
        const rect = pin.getBoundingClientRect();
        return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
      })()
    `);

    if (stopPinCoord) {
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: stopPinCoord.x, y: stopPinCoord.y, button: "left", clickCount: 1 });
      await sleep(100);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: stopPinCoord.x - 40, y: stopPinCoord.y, button: "left" });
      await sleep(100);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: stopPinCoord.x - 40, y: stopPinCoord.y, button: "left", clickCount: 1 });
      await sleep(300);
    }

    // Capture 5: Gradient with interactive draggable stops
    console.log("Capturing 5: Gradient with interactive draggable stops...");
    await cdp.captureScreenshot("bg_05_gradient_stops_added_and_dragged.png");

    // Switch to Light Theme to verify accent tokens
    console.log("Switching to Light Theme...");
    await cdp.evaluate(`
      (() => {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.documentElement.setAttribute('data-theme', 'light');
      })()
    `);
    await sleep(600);

    // Capture 6: Light Theme with pink-100 accent background and pink-500 accent foreground
    console.log("Capturing 6: Light Theme Accent Tokens...");
    await cdp.captureScreenshot("bg_06_light_theme_accent_tokens.png");

    // Switch to Dot Pattern
    console.log("Switching to Dot Pattern...");
    await cdp.evaluate(`
      (() => {
        const dotBtn = document.querySelector('button[aria-label="Dot Pattern"]');
        if (dotBtn) dotBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_07_dot_pattern_panel.png");

    // Switch to Alpha
    console.log("Switching to Alpha...");
    await cdp.evaluate(`
      (() => {
        const alphaBtn = document.querySelector('button[aria-label="Alpha"]');
        if (alphaBtn) alphaBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_08_alpha_panel.png");

    // Switch to Grid Pattern
    console.log("Switching to Grid Pattern...");
    await cdp.evaluate(`
      (() => {
        const gridBtn = document.querySelector('button[aria-label="Grid Pattern"]');
        if (gridBtn) gridBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_12_grid_pattern_panel.png");

    // Switch back to dark theme
    await cdp.evaluate(`
      (() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      })()
    `);
    await sleep(400);

    // Close floating panel with X
    console.log("Closing floating panel with X...");
    await cdp.evaluate(`
      (() => {
        const closeBtn = document.querySelector('button[aria-label="Close parameters"]');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_09_panel_closed_bg_intact.png");

    // Reopen by clicking active background row in Inspector
    console.log("Reopening floating panel by clicking row...");
    await cdp.evaluate(`
      (() => {
        const row = document.querySelector('[data-slot="background-row"]');
        if (row) row.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_10_reopened_from_row.png");

    // Remove background with "-" in Inspector
    console.log("Removing background with - in Inspector...");
    await cdp.evaluate(`
      (() => {
        const removeBtn = document.querySelector('button[aria-label="Remove background"]');
        if (removeBtn) removeBtn.click();
      })()
    `);
    await sleep(500);
    await cdp.captureScreenshot("bg_11_removed_restores_plus.png");

    console.log("All empirical screenshots captured successfully!");
    await cdp.close();
  } catch (err) {
    console.error("Error during CDP execution:", err);
  } finally {
    if (chromeProcess) {
      chromeProcess.kill();
    }
  }
}

run();
