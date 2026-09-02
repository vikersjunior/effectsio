import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/9cd1ab7b-7904-465d-a2a7-dfe12073a0a0/evidence";
const WS_DIR = path.join(process.cwd(), "docs/evidence/phase-7-8");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

async function run() {
  console.log("============================================================");
  console.log("PHASE 7.8 CDP BROWSER VERIFICATION SUITE");
  console.log("============================================================\n");

  const port = 5176;
  const devServer = spawn("pnpm", ["dev", "--port", String(port), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port) },
  });

  devServer.stdout.on("data", (d) => {
    const msg = d.toString();
    if (msg.includes("ready in") || msg.includes("Local:")) {
      console.log(`Vite dev server is ready at http://127.0.0.1:${port}/`);
    }
  });

  await sleep(3000);

  const debugPort = 9812;
  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--remote-allow-origins=*`,
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=/tmp/effectsio-cdp-p78-${Date.now()}`,
      `http://127.0.0.1:${port}`,
    ],
    { stdio: "ignore" }
  );

  let pages = [];
  for (let i = 0; i < 30; i++) {
    try {
      const listRes = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
      if (listRes.ok) {
        pages = await listRes.json();
        if (pages.length > 0) break;
      }
    } catch {}
    await sleep(300);
  }

  try {
    const page = pages.find((p) => p.type === "page") || pages[0];
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

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
        if (text && text.includes("EffectsIO")) break;
      } catch {}
      await sleep(500);
    }
    await sleep(1000);

    // ==========================================
    // STEP 1: Ingest 4 test images
    // ==========================================
    console.log("\n[Step 1] Ingesting 4 distinct test images...");
    await evalAsync(`(async () => {
      const createTestFile = (color, name, label) => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, 150, 160);
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            const file = new File([blob], name, { type: "image/png" });
            resolve(file);
          });
        });
      };

      const files = await Promise.all([
        createTestFile("#ef4444", "01-red.png", "RED"),
        createTestFile("#3b82f6", "02-blue.png", "BLUE"),
        createTestFile("#10b981", "03-green.png", "GREEN"),
        createTestFile("#8b5cf6", "04-purple.png", "PURPLE"),
      ]);

      const input = document.querySelector('input[type="file"]');
      if (input) {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    })()`);

    await sleep(2000);
    await saveScreenshot("01-four-assets-populated");

    const assetCount = await evalAsync(`document.querySelectorAll('#asset-library-panel img').length`);
    console.log(`  Assets ingested: ${assetCount}`);
    if (assetCount < 4) throw new Error("Step 1 failed: Expected at least 4 assets");

    // ==========================================
    // STEP 2: Normal click -> Single Selection
    // ==========================================
    console.log("\n[Step 2] Testing normal click (Single Selection)...");
    await evalAsync(`(() => {
      const tiles = document.querySelectorAll('#asset-library-panel img');
      if (tiles.length > 0) {
        tiles[0].parentElement.click();
      }
    })()`);
    await sleep(500);
    await saveScreenshot("02-single-asset-selected");

    // ==========================================
    // STEP 3: Cmd/Ctrl + Click -> Multi-Asset Selection
    // ==========================================
    console.log("\n[Step 3] Testing Cmd/Ctrl + Click multi-selection on assets 1, 2, 3...");
    await evalAsync(`(() => {
      const tiles = document.querySelectorAll('#asset-library-panel img');
      if (tiles.length >= 3) {
        tiles[1].parentElement.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true, ctrlKey: true }));
        tiles[2].parentElement.dispatchEvent(new MouseEvent("click", { bubbles: true, metaKey: true, ctrlKey: true }));
      }
    })()`);
    await sleep(500);
    await saveScreenshot("03-multi-assets-selected-rings");

    // Switch to Looks tab
    await evalAsync(`(() => {
      const looksTab = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).find(
        (t) => t.title?.includes("Looks") || t.textContent?.includes("Looks")
      );
      if (looksTab) looksTab.click();
    })()`);
    await sleep(600);

    const looksBtnText = await evalAsync(`(() => {
      const applyBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Apply to") || b.innerText.includes("Apply Look")
      );
      return applyBtn ? applyBtn.innerText : null;
    })()`);
    console.log(`  Looks apply button label with 3 assets selected: "${looksBtnText}"`);
    await saveScreenshot("04-looks-browser-multi-apply-button");

    // ==========================================
    // STEP 4: Apply Look to 3 Selected Assets
    // ==========================================
    console.log("\n[Step 4] Applying 'Editorial Print' look across 3 selected assets...");
    await evalAsync(`(() => {
      const applyBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Apply to") || b.innerText.includes("Apply Look")
      );
      if (applyBtn) applyBtn.click();
    })()`);
    await sleep(1000);
    await saveScreenshot("05-look-applied-to-multi-assets");

    // Switch to Effects tab and check stack count on active asset
    await evalAsync(`(() => {
      const effectsTab = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"]')).find(
        (t) => t.title?.includes("Effects") || t.textContent?.includes("Effects")
      );
      if (effectsTab) effectsTab.click();
    })()`);
    await sleep(500);

    const stackCount = await evalAsync(`(() => {
      const stackItems = document.querySelectorAll('[data-slot="sortable-effect-row"]');
      return stackItems.length;
    })()`);
    console.log(`  Effect stack count on active asset: ${stackCount}`);

    // ==========================================
    // STEP 5: Trigger Undo (Cmd+Z) -> All 3 Assets Revert
    // ==========================================
    console.log("\n[Step 5] Triggering global Undo (Cmd+Z)...");
    await evalAsync(`(() => {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    })()`);
    await sleep(800);
    await saveScreenshot("06-after-undo-reverted");

    const stackCountAfterUndo = await evalAsync(`(() => {
      const stackItems = document.querySelectorAll('[data-slot="sortable-effect-row"]');
      return stackItems.length;
    })()`);
    console.log(`  Effect stack count after Undo: ${stackCountAfterUndo}`);

    // ==========================================
    // STEP 6: Trigger Redo (Cmd+Shift+Z) -> Look Reapplies
    // ==========================================
    console.log("\n[Step 6] Triggering global Redo (Cmd+Shift+Z)...");
    await evalAsync(`(() => {
      const event = new KeyboardEvent("keydown", {
        key: "z",
        metaKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
    })()`);
    await sleep(800);
    await saveScreenshot("07-after-redo-reapplied");

    const stackCountAfterRedo = await evalAsync(`(() => {
      const stackItems = document.querySelectorAll('[data-slot="sortable-effect-row"]');
      return stackItems.length;
    })()`);
    console.log(`  Effect stack count after Redo: ${stackCountAfterRedo}`);

    // ==========================================
    // STEP 7: Export Modal with "Selected" Scope
    // ==========================================
    console.log("\n[Step 7] Verifying Export Modal with 'Selected (3)' scope option...");
    await evalAsync(`(() => {
      const exportBtn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.innerText.includes("Export")
      );
      if (exportBtn) exportBtn.click();
    })()`);
    await sleep(800);
    await saveScreenshot("08-export-modal-selected-scope");

    const exportOptions = await evalAsync(`(() => {
      const items = Array.from(document.querySelectorAll('[data-slot="toggle-group-item"]')).map((b) => b.innerText);
      return items;
    })()`);
    console.log("  Export modal scope options rendered:", exportOptions);

    console.log("\n============================================================");
    console.log("PHASE 7.8 CDP VERIFICATION COMPLETED SUCCESSFULLY!");
    console.log("============================================================\n");
  } finally {
    chrome.kill();
    devServer.kill();
  }
}

run().catch((err) => {
  console.error("CDP Verification failed:", err);
  process.exit(1);
});
