import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/c87c2ad5-69b6-4e79-858b-43b5ee0fcb72";
const EVIDENCE_DIR = path.join(process.cwd(), "docs/evidence/phase-3-layout");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function run() {
  console.log("============================================================");
  console.log("PHASE 3: FIGMA WORKSPACE LAYOUT CDP VERIFICATION SUITE");
  console.log("============================================================\n");

  const port = 5173; // Connect to running Vite dev server
  const debugPort = 9848;
  const tmpProfile = `/tmp/effectsio-cdp-phase3-${Date.now()}`;

  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      "--remote-allow-origins=*",
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${tmpProfile}`,
      `http://127.0.0.1:${port}`,
    ],
    { stdio: "ignore" }
  );

  // Poll for Chrome CDP endpoint
  let pages = [];
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        pages = await res.json();
        if (pages.length > 0) break;
      }
    } catch {}
    await sleep(300);
  }

  const page = pages.find((p) => p.type === "page") || pages[0];
  if (!page || !page.webSocketDebuggerUrl) {
    chrome.kill();
    throw new Error("Could not acquire Chrome CDP WebSocket target URL");
  }

  console.log("Connected to Chrome WebSocket Target:", page.webSocketDebuggerUrl);
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
      console.error("WS Parse Error:", e);
    }
  };

  const send = (method, params = {}) => {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`Timeout on ${method}`));
      }, 30000);
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

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");

  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  };

  const setViewport = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 900,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await sleep(400);
  };

  const captureScreenshot = async (filename) => {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const artPath = path.join(ART_DIR, filename);
    const evPath = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(artPath, buffer);
    fs.writeFileSync(evPath, buffer);
    console.log(`Saved screenshot: ${filename}`);
  };

  const measureLayout = async (label) => {
    const metrics = await evaluate(`(() => {
      const left = document.getElementById("asset-library-panel");
      const right = document.getElementById("inspector-panel");
      const canvas = document.querySelector("main");
      const toolbar = document.querySelector(".floating-popup-surface");
      const leftRect = left ? left.getBoundingClientRect() : null;
      const rightRect = right ? right.getBoundingClientRect() : null;
      const canvasRect = canvas ? canvas.getBoundingClientRect() : null;
      const toolbarRect = toolbar ? toolbar.getBoundingClientRect() : null;
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      const root = document.documentElement;

      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hasHorizontalOverflow: root.scrollWidth > window.innerWidth,
        leftPanel: leftRect ? { width: Math.round(leftRect.width), height: Math.round(leftRect.height), visible: leftRect.width > 0 } : null,
        rightPanel: rightRect ? { width: Math.round(rightRect.width), height: Math.round(rightRect.height), visible: rightRect.width > 0 } : null,
        canvas: canvasRect ? { width: Math.round(canvasRect.width), height: Math.round(canvasRect.height) } : null,
        toolbar: toolbarRect ? { width: Math.round(toolbarRect.width), left: Math.round(toolbarRect.left), bottomDist: Math.round(window.innerHeight - toolbarRect.bottom) } : null,
        theme: {
          background: bodyStyle.backgroundColor,
          color: bodyStyle.color,
          fontFamily: bodyStyle.fontFamily,
          radius: htmlStyle.getPropertyValue("--radius").trim(),
        }
      };
    })()`);

    console.log(`\n--- Layout Metrics [${label}] ---`);
    console.log(`Viewport: ${metrics.viewportWidth}x${metrics.viewportHeight} | Horizontal Overflow: ${metrics.hasHorizontalOverflow}`);
    if (metrics.leftPanel) {
      console.log(`Left Panel Width: ${metrics.leftPanel.width}px (${((metrics.leftPanel.width / metrics.viewportWidth) * 100).toFixed(1)}%)`);
    }
    if (metrics.canvas) {
      console.log(`Canvas Width: ${metrics.canvas.width}px (${((metrics.canvas.width / metrics.viewportWidth) * 100).toFixed(1)}%)`);
    }
    if (metrics.rightPanel) {
      console.log(`Right Panel Width: ${metrics.rightPanel.width}px (${((metrics.rightPanel.width / metrics.viewportWidth) * 100).toFixed(1)}%)`);
    }
    if (metrics.toolbar) {
      console.log(`Toolbar: ${metrics.toolbar.width}px wide, centered at ${metrics.toolbar.left}px, ${metrics.toolbar.bottomDist}px from bottom`);
    }
    console.log(`Theme: background=${metrics.theme.background}, radius=${metrics.theme.radius}, font=${metrics.theme.fontFamily.slice(0, 30)}...`);
    return metrics;
  };

  try {
    // Wait for hydration
    await sleep(1500);

    // Ensure Dark Theme initially
    await evaluate(`document.documentElement.classList.remove("light")`);
    await sleep(200);

    console.log("\n>>> TESTING EMPTY WORKSPACE (Figma node 10-869) <<<");

    // 1. 1440x900 Dark Mode
    await setViewport(1440, 900);
    await measureLayout("1440x900 Dark (Empty)");
    await captureScreenshot("phase3_empty_1440x900_dark.png");

    // 2. 1440x900 Light Mode
    await evaluate(`document.documentElement.classList.add("light")`);
    await sleep(200);
    await measureLayout("1440x900 Light (Empty)");
    await captureScreenshot("phase3_empty_1440x900_light.png");

    // Revert to Dark Mode for remaining tests
    await evaluate(`document.documentElement.classList.remove("light")`);
    await sleep(200);

    // 3. 1280x800
    await setViewport(1280, 800);
    await measureLayout("1280x800 Dark (Empty)");
    await captureScreenshot("phase3_empty_1280x800_dark.png");

    // 4. 1024x768
    await setViewport(1024, 768);
    await measureLayout("1024x768 Dark (Empty)");
    await captureScreenshot("phase3_empty_1024x768_dark.png");

    // 5. 900x768
    await setViewport(900, 768);
    await measureLayout("900x768 Dark (Empty)");
    await captureScreenshot("phase3_empty_900x768_dark.png");

    // 6. 768x1024 (Narrow / Drawer Mode)
    await setViewport(768, 1024);
    await measureLayout("768x1024 Dark (Narrow Canvas)");
    await captureScreenshot("phase3_empty_768x1024_narrow_canvas.png");

    // Open Assets drawer
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Assets"));
      if (btn) btn.click();
    })()`);
    await sleep(300);
    await captureScreenshot("phase3_empty_768x1024_assets_drawer.png");

    // Close Assets drawer
    await evaluate(`(() => {
      const closeBtn = document.querySelector('[aria-label="Close assets panel"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(300);

    // Open Inspector drawer
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Inspector"));
      if (btn) btn.click();
    })()`);
    await sleep(300);
    await captureScreenshot("phase3_empty_768x1024_inspector_drawer.png");

    // Close Inspector drawer
    await evaluate(`(() => {
      const closeBtn = document.querySelector('[aria-label="Close inspector panel"]');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(300);

    // 7. 600x900 (Mobile)
    await setViewport(600, 900);
    await measureLayout("600x900 Mobile (Narrow Canvas)");
    await captureScreenshot("phase3_empty_600x900_mobile.png");

    console.log("\n>>> TESTING EDITING WORKSPACE (Figma node 61-1246) <<<");

    // Inject a sample asset into studio store for editing state verification
    await evaluate(`(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ff69b4";
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("Sample Creative Asset", 120, 210);

      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "sample-model.png", { type: "image/png" });

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(1000);

    // Reset to 1440x900 desktop
    await setViewport(1440, 900);
    await measureLayout("1440x900 Dark (Editing)");
    await captureScreenshot("phase3_editing_1440x900_dark.png");

    // 1440x900 Light Editing
    await evaluate(`document.documentElement.classList.add("light")`);
    await sleep(200);
    await measureLayout("1440x900 Light (Editing)");
    await captureScreenshot("phase3_editing_1440x900_light.png");

    await evaluate(`document.documentElement.classList.remove("light")`);
    await sleep(200);

    // 1280x800 Editing
    await setViewport(1280, 800);
    await measureLayout("1280x800 Dark (Editing)");
    await captureScreenshot("phase3_editing_1280x800_dark.png");

    // 1024x768 Editing
    await setViewport(1024, 768);
    await measureLayout("1024x768 Dark (Editing)");
    await captureScreenshot("phase3_editing_1024x768_dark.png");

    // 900x768 Editing
    await setViewport(900, 768);
    await measureLayout("900x768 Dark (Editing)");
    await captureScreenshot("phase3_editing_900x768_dark.png");

    // 768x1024 Narrow Editing with drawer
    await setViewport(768, 1024);
    await measureLayout("768x1024 Dark (Narrow Editing)");
    await captureScreenshot("phase3_editing_768x1024_narrow.png");

    // Open Inspector drawer with active asset
    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent && b.textContent.includes("Inspector"));
      if (btn) btn.click();
    })()`);
    await sleep(300);
    await captureScreenshot("phase3_editing_768x1024_inspector_drawer.png");

    console.log("\n✅ ALL CDP BROWSER VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } finally {
    ws.close();
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("FATAL CDP Error:", err);
  process.exit(1);
});
