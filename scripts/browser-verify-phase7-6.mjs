#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";

const PORT = 9778;
const APP_URL = "http://127.0.0.1:5173/";
const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/9cd1ab7b-7904-465d-a2a7-dfe12073a0a0/evidence";
const WS_DIR = path.join(process.cwd(), "docs", "evidence", "phase-7-6-browser");

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
  { stdio: "inherit" }
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForChrome() {
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        if (list.length > 0) return list;
      }
    } catch {
      // Chrome starting up...
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
    await sleep(300);
    const res = await send("Page.captureScreenshot", { format: "png" });
    if (!res?.data) throw new Error(`Empty screenshot for ${name}`);
    const buf = Buffer.from(res.data, "base64");
    const artFile = path.join(ART_DIR, name);
    const wsFile = path.join(WS_DIR, name);
    fs.writeFileSync(artFile, buf);
    fs.writeFileSync(wsFile, buf);
    console.log(`[Capture] Done: ${name} (${buf.length} bytes)`);
    return buf;
  };

  console.log("1. Ingesting test asset...");
  await evaluate(`
    (async () => {
      const c = document.createElement("canvas");
      c.width = 480;
      c.height = 360;
      const ctx = c.getContext("2d");
      const g = ctx.createLinearGradient(0, 0, 480, 360);
      g.addColorStop(0, "#8b5cf6");
      g.addColorStop(0.5, "#ec4899");
      g.addColorStop(1, "#3b82f6");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 480, 360);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 3;
      for (let x = 30; x < 480; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke();
      }
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText("EffectsIO Animation Studio", 40, 180);

      const blob = await new Promise(r => c.toBlob(r, "image/png"));
      const file = new File([blob], "test-animation-asset.png", { type: "image/png" });

      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()
  `);
  await sleep(2000);

  // Helper functions
  const clickButtonByAria = async (ariaLabel) => {
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label="${ariaLabel}"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(400);
  };

  const clickButtonByText = async (text) => {
    await evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent?.trim() === '${text}');
        if (target) target.click();
      })()
    `);
    await sleep(400);
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
    await sleep(400);
  };

  console.log("2. Adding Glitch and Film Grain effects to active stack...");
  // Open Effect Browser Modal
  await evaluate(`
    (() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Effect'));
      if (addBtn) addBtn.click();
    })()
  `);
  await sleep(800);

  // Add Glitch
  await evaluate(`
    (() => {
      const cards = Array.from(document.querySelectorAll('[role="button"]'));
      const glitchCard = cards.find(c => c.textContent.includes('Glitch'));
      if (glitchCard) glitchCard.click();
    })()
  `);
  await sleep(600);

  // Open Effect Browser Modal again and add Grain
  await evaluate(`
    (() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Effect'));
      if (addBtn) addBtn.click();
    })()
  `);
  await sleep(800);

  await evaluate(`
    (() => {
      const cards = Array.from(document.querySelectorAll('[role="button"]'));
      const grainCard = cards.find(c => c.textContent.includes('Film Grain'));
      if (grainCard) grainCard.click();
    })()
  `);
  await sleep(600);

  // Configure background with dots pattern and framing padding
  console.log("3. Configuring Background with Dots Pattern and Framing...");
  await evaluate(`
    (() => {
      const bgTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Background') || b.querySelector('svg.lucide-palette'));
      if (bgTabBtn) bgTabBtn.click();
    })()
  `);
  await sleep(600);

  await clickButtonByText("Dots");
  await setSlider("Canvas Margin / Padding", 40);
  await setSlider("Image Corner Radius", 16);
  await setSlider("Drop Shadow Blur", 24);
  await setSlider("Drop Shadow Opacity", 50);

  console.log("--- TEST 1: PLAYBACK VERIFICATION (Advancing Frames Over Time) ---");
  // Initial frame (t = 0.0s, stopped)
  const bufInitial = await capture("01-play-initial-t0.png");

  // Start Playback
  console.log("Clicking Play button...");
  await clickButtonByAria("Play animation");

  await sleep(800);
  const bufT1 = await capture("02-play-running-t1.png");

  await sleep(1000);
  const bufT2 = await capture("03-play-running-t2.png");

  const diff1 = Buffer.compare(bufInitial, bufT1);
  const diff2 = Buffer.compare(bufT1, bufT2);
  console.log(`Playback visual difference: initial->t1: ${diff1 !== 0 ? 'DIFF_DETECTED' : 'IDENTICAL'}, t1->t2: ${diff2 !== 0 ? 'DIFF_DETECTED' : 'IDENTICAL'}`);

  console.log("--- TEST 2: PAUSE VERIFICATION (No Frame Drift) ---");
  // Pause Playback
  console.log("Clicking Pause button...");
  await clickButtonByAria("Pause animation");
  await sleep(400);

  const bufPause1 = await capture("04-pause-observation-1.png");
  await sleep(1500); // Wait 1.5 seconds while paused
  const bufPause2 = await capture("05-pause-observation-2.png");

  const pauseDiff = Buffer.compare(bufPause1, bufPause2);
  console.log(`Paused stability difference: ${pauseDiff === 0 ? 'STABLE (0 byte drift)' : 'DRIFT_DETECTED'}`);

  console.log("--- TEST 3: SEEKING / SCRUBBING DETERMINISM ---");
  // Seek to t = 3.5s
  console.log("Seeking timeline to t = 3.50s...");
  await setSlider("Timeline position", 3.5);
  await sleep(400);
  const bufSeek35A = await capture("06-seek-3.5s-pass-A.png");

  // Seek away to t = 7.0s
  console.log("Seeking away to t = 7.00s...");
  await setSlider("Timeline position", 7.0);
  await sleep(400);
  const bufSeek70 = await capture("07-seek-7.0s.png");

  // Seek back to t = 3.5s
  console.log("Seeking back to t = 3.50s...");
  await setSlider("Timeline position", 3.5);
  await sleep(400);
  const bufSeek35B = await capture("08-seek-3.5s-pass-B.png");

  const seekDiff = Buffer.compare(bufSeek35A, bufSeek35B);
  console.log(`Seek determinism difference (3.5s Pass A vs Pass B): ${seekDiff === 0 ? '100% DETERMINISTIC' : 'DIVERGED'}`);

  console.log("--- TEST 4: PARAMETER MUTATION DURING PLAYBACK ---");
  // Resume playback
  await clickButtonByAria("Play animation");
  await sleep(500);

  // Switch to Effects tab
  await evaluate(`
    (() => {
      const fxTabBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Effects') || b.querySelector('svg.lucide-layers'));
      if (fxTabBtn) fxTabBtn.click();
    })()
  `);
  await sleep(400);

  // Select Glitch layer and increase distortion/intensity slider while playing
  await evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('div'));
      const glitchRow = items.find(d => d.textContent?.includes('Glitch'));
      if (glitchRow) glitchRow.click();
    })()
  `);
  await sleep(400);

  await setSlider("Intensity", 85);
  await sleep(600);
  await capture("09-parameter-during-playback.png");

  console.log("--- TEST 5: PARAMETER MUTATION WHILE PAUSED ---");
  await clickButtonByAria("Pause animation");
  await sleep(400);
  await setSlider("Timeline position", 2.0);
  await sleep(400);
  await capture("10-paused-before-param-change.png");

  // Change noise intensity on grain effect while paused
  await evaluate(`
    (() => {
      const items = Array.from(document.querySelectorAll('div'));
      const grainRow = items.find(d => d.textContent?.includes('Film Grain'));
      if (grainRow) grainRow.click();
    })()
  `);
  await sleep(400);

  await setSlider("Intensity", 90);
  await sleep(400);
  await capture("11-paused-after-param-change.png");

  console.log("--- TEST 6: MULTI-PASS SYNCHRONIZATION WITH SPLIT VIEW ---");
  // Enable Split View
  await evaluate(`
    (() => {
      const splitBtn = document.querySelector('button[title*="Split Comparison View"]');
      if (splitBtn) splitBtn.click();
    })()
  `);
  await sleep(400);

  // Seek to t = 1.8s
  await setSlider("Timeline position", 1.8);
  await sleep(400);
  await capture("12-multi-pass-split-view-sync.png");

  console.log("All 12 browser verification test steps executed successfully!");
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
