#!/usr/bin/env node

const port = process.env.HEADROOM_PORT || "8787";
const statsUrl = `http://127.0.0.1:${port}/stats`;

async function fetchStats() {
  try {
    const res = await fetch(statsUrl);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    const data = await res.json();

    console.log("==================================================");
    console.log("  Headroom Context Optimization Metrics (EffectsIO)");
    console.log("==================================================");
    console.log(`Status            : Active`);
    console.log(`Proxy Endpoint    : http://127.0.0.1:${port}`);
    console.log(`Optimization Mode : ${data.compression_cache?.mode || "cache"}`);
    console.log(`Total Requests    : ${data.requests?.total || 0}`);
    console.log(`Input Tokens      : ${data.tokens?.input || 0}`);
    console.log(`Output Tokens     : ${data.tokens?.output || 0}`);
    console.log(`Tokens Saved      : ${data.tokens?.saved || 0}`);
    console.log(`Saved Percentage  : ${((data.tokens?.savings_percent || 0) * 100).toFixed(2)}%`);
    console.log(`Cache Reads       : ${data.prefix_cache?.totals?.cache_read_tokens || 0}`);
    console.log(`Average Latency   : ${data.latency?.average_ms || 0} ms`);
    console.log("==================================================");
  } catch (err) {
    console.error(`[headroom] Could not fetch stats from ${statsUrl}`);
    console.error(`Error: ${err.message}`);
    console.error(`Make sure Headroom proxy is running ('pnpm agent:proxy').`);
    process.exit(1);
  }
}

fetchStats();
