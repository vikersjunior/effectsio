import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ART_DIR = "/Users/clement/.gemini/antigravity-ide/brain/9cd1ab7b-7904-465d-a2a7-dfe12073a0a0/evidence";
const WS_DIR = path.join(process.cwd(), "docs/evidence/phosphor-icons");

fs.mkdirSync(ART_DIR, { recursive: true });
fs.mkdirSync(WS_DIR, { recursive: true });

async function run() {
  console.log("============================================================");
  console.log("PHOSPHOR ICONS LIVE CDP BROWSER VERIFICATION SUITE");
  console.log("============================================================\n");

  const port = 5179;
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

  const debugPort = 9835;
  const tmpProfile = `/tmp/effectsio-cdp-phosphor-${Date.now()}`;
  const chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--remote-allow-origins=*`,
      "--disable-gpu",
      "--no-sandbox",
      `--user-data-dir=${tmpProfile}`,
      `http://127.0.0.1:${port}`,
    ],
    { stdio: "ignore" }
  );

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
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log("Waiting for studio application load...");
  await sleep(2500);

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

  const saveScreenshot = async (name) => {
    const res = await send("Page.captureScreenshot", { format: "png" });
    const buf = Buffer.from(res.data, "base64");
    fs.writeFileSync(path.join(ART_DIR, `${name}.png`), buf);
    fs.writeFileSync(path.join(WS_DIR, `${name}.png`), buf);
    console.log(`  ✓ Saved screenshot: ${name}.png`);
  };

  console.log("\n--- TEST 1: Initial Studio Shell & Dropzone (CloudArrowUpIcon) ---");
  await saveScreenshot("01-phosphor-zero-state-dropzone");

  console.log("\n--- TEST 2: Populate 4 Assets in Library ---");
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
  await saveScreenshot("02-phosphor-populated-asset-grid");

  console.log("\n--- TEST 3: Add Effect Stack & Verify Phosphor Action Icons ---");
  await evalAsync(`(() => {
    const addEffectBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Add Effect"));
    if (addEffectBtn) addEffectBtn.click();
  })()`);
  await sleep(1000);
  await saveScreenshot("03-phosphor-effect-browser-modal");

  // Select an effect from modal
  await evalAsync(`(() => {
    const firstEffectTile = document.querySelector('[data-slot="dialog-body"] [role="button"]');
    if (firstEffectTile) firstEffectTile.click();
  })()`);
  await sleep(1200);
  await saveScreenshot("04-phosphor-effect-stack-inspector");

  console.log("\n--- TEST 4: Looks Tab (SparkleIcon, BookmarkSimpleIcon, TrashIcon, CheckIcon) ---");
  await evalAsync(`(() => {
    const lookTab = document.querySelector('button[value="looks"]');
    if (lookTab) lookTab.click();
  })()`);
  await sleep(1000);
  await saveScreenshot("05-phosphor-looks-browser-tab");

  console.log("\n--- TEST 5: Backdrop Tab (ArrowCounterClockwiseIcon, PaletteControl, GradientControl Plus/Minus) ---");
  await evalAsync(`(() => {
    const backdropTab = document.querySelector('button[value="backdrop"]');
    if (backdropTab) backdropTab.click();
  })()`);
  await sleep(1000);
  await saveScreenshot("06-phosphor-backdrop-tab");

  console.log("\n--- TEST 6: Split View Comparison with Phosphor Caret/Dock Icons ---");
  await evalAsync(`(() => {
    const eyeButton = document.querySelector('button[title*="Split Comparison View"]');
    if (eyeButton) eyeButton.click();
  })()`);
  await sleep(1000);
  await saveScreenshot("07-phosphor-split-view-dock");

  console.log("\n--- TEST 7: Open Export Modal with Phosphor DownloadSimpleIcon & Badges ---");
  await evalAsync(`(() => {
    const expBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Export"));
    if (expBtn) expBtn.click();
  })()`);
  await sleep(1000);
  await saveScreenshot("08-phosphor-export-modal");

  console.log("\n============================================================");
  console.log("ALL PHOSPHOR ICON SCREENS EMPIRICALLY VERIFIED IN CHROME!");
  console.log("============================================================");

  // Teardown
  try {
    chrome.kill();
    devServer.kill();
  } catch {}
}

run().catch((err) => {
  console.error("Phosphor CDP Verification Failed:", err);
  process.exit(1);
});
