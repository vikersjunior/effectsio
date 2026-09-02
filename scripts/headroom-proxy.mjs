#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const pythonExecutables = [
  "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
  "python3",
  "python",
];

let pythonCmd = "python3";
for (const exe of pythonExecutables) {
  if (existsSync(exe) || exe === "python3") {
    pythonCmd = exe;
    break;
  }
}

const host = process.env.HEADROOM_HOST || "127.0.0.1";
const port = process.env.HEADROOM_PORT || "8787";
const mode = process.env.HEADROOM_MODE || "cache";

console.log(`[headroom] Launching Headroom Context Optimization Proxy...`);
console.log(`[headroom] Bind: http://${host}:${port}`);
console.log(`[headroom] Mode: ${mode} (Prefix cache optimization + tool-output compression)`);

const args = [
  "-m",
  "headroom.cli",
  "proxy",
  "--host",
  host,
  "--port",
  port,
  "--mode",
  mode,
  "--code-aware",
  "--intercept-tool-results",
  "--memory",
  "--memory-storage",
  "project",
];

const proxyProcess = spawn(pythonCmd, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PYTHONUNBUFFERED: "1",
  },
});

proxyProcess.on("error", (err) => {
  console.error(`[headroom] Failed to start proxy process: ${err.message}`);
  process.exit(1);
});

proxyProcess.on("exit", (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`[headroom] Proxy exited with code ${code}`);
  }
  process.exit(code ?? 0);
});
