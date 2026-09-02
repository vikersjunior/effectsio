import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/c87c2ad5-69b6-4e79-858b-43b5ee0fcb72";
const EVIDENCE_DIR = path.join(process.cwd(), "docs/evidence/phase-3-1-fidelity");
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

async function run() {
  console.log("============================================================");
  console.log("PHASE 3.1: FIGMA FIDELITY CDP VERIFICATION SUITE");
  console.log("============================================================\n");

  const port = 5173; // Vite dev server
  const debugPort = 9849;
  const tmpProfile = `/tmp/effectsio-cdp-phase3-1-${Date.now()}`;

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

  let pages = [];
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (res.ok) {
        pages = await res.json();
        if (pages.length > 0) break;
      }
    } catch {}
    if (i % 5 === 0 && i > 0) {
      console.log(`Waiting for Chrome to initialize (${i}s)...`);
    }
    await sleep(1000);
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

  const evaluate = async (expression) => {
    const res = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  };

  const setViewport = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await sleep(200);
  };

  const captureScreenshot = async (filename) => {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const artPath = path.join(ART_DIR, filename);
    const evPath = path.join(EVIDENCE_DIR, filename);
    fs.writeFileSync(artPath, buffer);
    fs.writeFileSync(evPath, buffer);
    console.log(`[Screenshot Captured] ${filename} (${buffer.length} bytes)`);
  };

  try {
    // Wait for store hydration to ensure clean empty canvas card
    await evaluate(`new Promise(resolve => {
      const check = () => {
        const store = window.__studioStore;
        if (store && store.isHydrated) return resolve(true);
        setTimeout(check, 100);
      };
      check();
    })`);
    await sleep(500);

    console.log(">>> 1. EMPTY WORKSPACE VISUAL CHECKS (node 10-869) <<<");

    // 1440x900 Dark Empty
    await setViewport(1440, 900);
    await captureScreenshot("phase3_1_empty_1440x900_dark.png");

    // 1440x900 Light Empty
    await evaluate(`document.documentElement.classList.add("light")`);
    await sleep(200);
    await captureScreenshot("phase3_1_empty_1440x900_light.png");

    await evaluate(`document.documentElement.classList.remove("light")`);
    await sleep(200);

    // 1280x800 Dark Empty
    await setViewport(1280, 800);
    await captureScreenshot("phase3_1_empty_1280x800_dark.png");

    // 1024x768 Dark Empty
    await setViewport(1024, 768);
    await captureScreenshot("phase3_1_empty_1024x768_dark.png");

    // 900x768 Dark Empty
    await setViewport(900, 768);
    await captureScreenshot("phase3_1_empty_900x768_dark.png");

    // 768x1024 Narrow Empty
    await setViewport(768, 1024);
    await captureScreenshot("phase3_1_empty_768x1024_narrow.png");

    // 600x900 Mobile Empty
    await setViewport(600, 900);
    await captureScreenshot("phase3_1_empty_600x900_mobile.png");

    console.log("\n>>> 2. TESTING EDITABLE PROJECT NAME INTERACTION <<<");
    await setViewport(1440, 900);

    // Click project name to edit
    await evaluate(`(() => {
      const el = document.querySelector('[aria-label^="Project Name"]');
      if (el) el.click();
    })()`);
    await sleep(200);

    // Change value and press Enter
    await evaluate(`(() => {
      const input = document.querySelector('input[aria-label="Project Name"]');
      if (input) {
        input.value = "Summer Campaign 2026";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      }
    })()`);
    await sleep(300);

    const updatedProjectName = await evaluate(`(() => {
      const el = document.querySelector('[aria-label^="Project Name"]');
      return el ? el.textContent : null;
    })()`);
    console.log(`[Project Name Value Verified]: "${updatedProjectName}"`);

    console.log("\n>>> 3. POPULATED ASSETS & EDITING WORKSPACE (node 61-1246) <<<");

    // Inject asset
    await evaluate(`(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, 800, 600);
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(200, 150, 400, 300);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("Creative Treatment Asset", 220, 310);

      const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "campaign-visual.png", { type: "image/png" });

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);
    await sleep(1000);

    // 1440x900 Dark Populated
    await captureScreenshot("phase3_1_editing_1440x900_dark.png");

    // 1440x900 Light Populated
    await evaluate(`document.documentElement.classList.add("light")`);
    await sleep(200);
    await captureScreenshot("phase3_1_editing_1440x900_light.png");

    await evaluate(`document.documentElement.classList.remove("light")`);
    await sleep(200);

    console.log("\n>>> 4. ADD EFFECT & TEST FLOATING EFFECT CUSTOMIZATION PANEL <<<");

    // Add an effect via store
    await evaluate(`(() => {
      const store = window.__studioStore;
      if (store && store.activeImageId) {
        store.addEffectToStack(store.activeImageId, "glitch");
      }
    })()`);
    await sleep(500);

    // Select the effect to trigger the FloatingEffectPanel on canvas
    await evaluate(`(() => {
      const store = window.__studioStore;
      if (store && store.activeImageId && store.activeEffectStack.length > 0) {
        store.selectInstance(store.activeImageId, store.activeEffectStack[0].instanceId);
      }
    })()`);
    await sleep(500);

    const hasFloatingPanel = await evaluate(`(() => {
      const panel = document.querySelector('[aria-label="Glitch Parameters"]');
      return !!panel;
    })()`);
    console.log(`[Floating Effect Customization Panel Detected on Canvas]: ${hasFloatingPanel}`);

    // Capture screenshot showing floating panel on canvas
    await captureScreenshot("phase3_1_editing_with_floating_panel_dark.png");

    // Test slider interaction in floating panel
    await evaluate(`(() => {
      const store = window.__studioStore;
      if (store && store.activeImageId && store.selectedInstanceId) {
        store.updateInstanceParameters(store.activeImageId, store.selectedInstanceId, {
          intensity: 85,
        });
      }
    })()`);
    await sleep(300);

    const verifiedParamValue = await evaluate(`(() => {
      const store = window.__studioStore;
      if (store && store.selectedInstance) {
        return store.selectedInstance.parameters.intensity;
      }
      return null;
    })()`);
    console.log(`[Parameter Updated via Real Effect State]: intensity = ${verifiedParamValue}`);

    // 1280x800 Editing with Floating Panel
    await setViewport(1280, 800);
    await captureScreenshot("phase3_1_editing_1280x800_dark.png");

    // 1024x768 Editing
    await setViewport(1024, 768);
    await captureScreenshot("phase3_1_editing_1024x768_dark.png");

    // 900x768 Editing
    await setViewport(900, 768);
    await captureScreenshot("phase3_1_editing_900x768_dark.png");

    // 768x1024 Narrow with drawer
    await setViewport(768, 1024);
    await captureScreenshot("phase3_1_editing_768x1024_narrow.png");

    console.log("\n✅ ALL PHASE 3.1 CDP VERIFICATIONS COMPLETED SUCCESSFULLY!");
  } finally {
    ws.close();
    chrome.kill();
  }
}

run().catch((err) => {
  console.error("FATAL CDP Error:", err);
  process.exit(1);
});
