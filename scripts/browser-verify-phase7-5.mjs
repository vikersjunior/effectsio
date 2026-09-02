#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9777;
const APP_URL = "http://127.0.0.1:5173/";
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/4a3d3b7d-9255-468a-82e0-73b6719a0a59/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "phase-7-5-browser");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

const chromeExecutable = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

if (!fs.existsSync(chromeExecutable)) {
  console.error("Chrome not found at", chromeExecutable);
  process.exit(1);
}

console.log(`Starting headless Chrome on port ${PORT}...`);

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
    `--user-data-dir=/tmp/effectsio-qa-${Date.now()}`,
    APP_URL,
  ],
  { stdio: "ignore" }
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  await sleep(2500);

  const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const list = await listRes.json();
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
  await sleep(3000);

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
    const artFile = path.join(ART_DIR, name);
    const wsFile = path.join(WS_DIR, name);
    fs.writeFileSync(artFile, buf);
    fs.writeFileSync(wsFile, buf);
    console.log(`[Capture] Done: ${name} (${buf.length} bytes)`);
  };

  console.log("1. Ingesting test assets (Opaque Geometric Pattern & Transparent Cutout)...");
  await evaluate(`
    (async () => {
      // 1. Opaque test asset (400x300 gradient with geometric grid and label)
      const c1 = document.createElement("canvas");
      c1.width = 400;
      c1.height = 300;
      const ctx1 = c1.getContext("2d");
      const g = ctx1.createLinearGradient(0, 0, 400, 300);
      g.addColorStop(0, "#ff0077");
      g.addColorStop(0.5, "#7928ca");
      g.addColorStop(1, "#00dfd8");
      ctx1.fillStyle = g;
      ctx1.fillRect(0, 0, 400, 300);
      ctx1.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx1.lineWidth = 2;
      for (let x = 20; x < 400; x += 40) {
        ctx1.beginPath(); ctx1.moveTo(x, 0); ctx1.lineTo(x, 300); ctx1.stroke();
      }
      ctx1.fillStyle = "#ffffff";
      ctx1.font = "bold 24px sans-serif";
      ctx1.fillText("EffectsIO Opaque Asset", 40, 160);
      const b1 = await new Promise(r => c1.toBlob(r, "image/png"));
      const f1 = new File([b1], "test-opaque-pattern.png", { type: "image/png" });

      // 2. Transparent test asset with circular ring cutout
      const c2 = document.createElement("canvas");
      c2.width = 400;
      c2.height = 300;
      const ctx2 = c2.getContext("2d");
      ctx2.clearRect(0, 0, 400, 300);
      ctx2.fillStyle = "#10b981";
      ctx2.beginPath();
      ctx2.arc(200, 150, 110, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalCompositeOperation = "destination-out";
      ctx2.beginPath();
      ctx2.arc(200, 150, 50, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.globalCompositeOperation = "source-over";
      const b2 = await new Promise(r => c2.toBlob(r, "image/png"));
      const f2 = new File([b2], "test-transparent-cutout.png", { type: "image/png" });

      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(f1);
        dt.items.add(f2);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()
  `);

  await sleep(2000);

  console.log("2. Switching to Background tab in Inspector...");
  await evaluate(`
    (() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Background') || b.querySelector('svg.lucide-palette'));
      if (btn) btn.click();
    })()
  `);
  await sleep(800);

  // Helper functions
  const selectAsset = async (assetName) => {
    await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('[role="button"]'));
        const target = cards.find(c => c.textContent?.includes('${assetName}') || c.querySelector('img')?.alt?.includes('${assetName}'));
        if (target) target.click();
      })()
    `);
    await sleep(600);
  };

  const clickBgMode = async (label) => {
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === '${label}');
        if (btn) btn.click();
      })()
    `);
    await sleep(600);
  };

  const setSlider = async (ariaLabel, value) => {
    await evaluate(`
      (() => {
        const input = document.querySelector('input[type="range"][aria-label="${ariaLabel}"]');
        if (input) {
          const proto = window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(input, ${value});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(600);
  };

  const clickSwatch = async (rgbValue) => {
    await evaluate(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.style.backgroundColor?.includes('${rgbValue}') || b.style.backgroundColor?.includes('${rgbValue.toLowerCase()}'));
        if (btn) btn.click();
      })()
    `);
    await sleep(600);
  };

  // --- PART 1: OPAQUE ASSET VERIFICATION (Framed with 40px padding & 16px radius) ---
  console.log("--- PART 1: OPAQUE ASSET VERIFICATION ---");
  await selectAsset("test-opaque");
  await setSlider("Canvas Margin / Padding", 40);
  await setSlider("Image Corner Radius", 16);
  await setSlider("Drop Shadow Blur", 24);
  await setSlider("Drop Shadow Opacity", 50);

  // 1. Transparent
  console.log("Mode 1/6 (Opaque): Transparent");
  await clickBgMode("Alpha");
  await capture("01-opaque-transparent.png");

  // 2. Solid Color (Blue & Red)
  console.log("Mode 2/6 (Opaque): Solid Blue");
  await clickBgMode("Solid");
  await clickSwatch("rgb(59, 130, 246)"); // Blue #3b82f6
  await capture("02-opaque-solid-blue.png");

  console.log("Mode 2/6 (Opaque): Solid Red");
  await clickSwatch("rgb(239, 68, 68)"); // Red #ef4444
  await capture("03-opaque-solid-red.png");

  // 3. Linear Gradient (135° and 45°)
  console.log("Mode 3/6 (Opaque): Linear Gradient 135 deg");
  await clickBgMode("Linear");
  await capture("04-opaque-linear-135deg.png");

  console.log("Mode 3/6 (Opaque): Linear Gradient live Angle 45 deg");
  await setSlider("Gradient Angle", 45);
  await capture("05-opaque-linear-45deg.png");

  // 4. Radial Gradient
  console.log("Mode 4/6 (Opaque): Radial Gradient");
  await clickBgMode("Radial");
  await capture("06-opaque-radial.png");

  // 5. Dots Pattern (24px and 48px live spacing)
  console.log("Mode 5/6 (Opaque): Dots Pattern 24px");
  await clickBgMode("Dots");
  await setSlider("Pattern Spacing", 24);
  await capture("07-opaque-dots-24px.png");

  console.log("Mode 5/6 (Opaque): Dots Pattern live Spacing 48px");
  await setSlider("Pattern Spacing", 48);
  await capture("08-opaque-dots-48px.png");

  // 6. Grid Pattern (24px and 48px live spacing)
  console.log("Mode 6/6 (Opaque): Grid Pattern 24px");
  await clickBgMode("Grid");
  await setSlider("Pattern Spacing", 24);
  await capture("09-opaque-grid-24px.png");

  console.log("Mode 6/6 (Opaque): Grid Pattern live Spacing 48px");
  await setSlider("Pattern Spacing", 48);
  await capture("10-opaque-grid-48px.png");

  // 7. Canvas Framing, Margin, Corner Radius & Shadow
  console.log("Testing Canvas Framing & Padding on Opaque Asset...");
  await clickBgMode("Radial");
  await setSlider("Canvas Margin / Padding", 48);
  await setSlider("Image Corner Radius", 24);
  await setSlider("Drop Shadow Blur", 32);
  await setSlider("Drop Shadow Opacity", 60);
  await capture("11-opaque-framing-padding-radius.png");

  // --- PART 2: TRANSPARENT ASSET COMPOSITING VERIFICATION ---
  console.log("--- PART 2: TRANSPARENT ASSET COMPOSITING VERIFICATION ---");
  await selectAsset("test-transparent");

  // Reset padding to 0 first
  await setSlider("Canvas Margin / Padding", 0);

  // Transparent ring over Dots
  console.log("Transparent Ring over Dots Pattern...");
  await clickBgMode("Dots");
  await setSlider("Pattern Spacing", 24);
  await capture("12-transparent-dots-composite.png");

  // Transparent ring over Linear Gradient with 32px padding & rounded corners
  console.log("Transparent Ring over Linear Gradient with Padding...");
  await clickBgMode("Linear");
  await setSlider("Canvas Margin / Padding", 32);
  await setSlider("Image Corner Radius", 20);
  await capture("13-transparent-linear-padded.png");

  // Transparent ring over Grid
  console.log("Transparent Ring over Grid Pattern...");
  await setSlider("Canvas Margin / Padding", 0);
  await clickBgMode("Grid");
  await capture("14-transparent-grid-composite.png");

  // Transparent ring over Radial Gradient
  console.log("Transparent Ring over Radial Gradient...");
  await clickBgMode("Radial");
  await capture("15-transparent-radial-composite.png");

  // Transparent ring over Solid Color
  console.log("Transparent Ring over Solid Color...");
  await clickBgMode("Solid");
  await clickSwatch("rgb(239, 68, 68)");
  await capture("16-transparent-solid-composite.png");


  console.log("All 14 real browser visual verification screenshots captured successfully!");
  ws.close();
}

try {
  await run();
} catch (e) {
  console.error("Verification failed:", e);
  process.exitCode = 1;
} finally {
  chromeProcess.kill();
  process.exit(process.exitCode || 0);
}
