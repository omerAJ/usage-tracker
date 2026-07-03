import { execSync } from "child_process";
import os from "os";

const WORKER_URL = "https://usage-tracker-worker.omer-aj.workers.dev/log";

function getCurrentBlockTokens() {
  const raw = execSync("npx ccusage@latest blocks --json", { encoding: "utf8" });
  const data = JSON.parse(raw);
  // ccusage returns a list of 5-hour blocks; the active one has isActive: true
  const activeBlock = data.blocks?.find((b) => b.isActive);
  return activeBlock ? activeBlock.totalTokens : 0;
}

async function main() {
  const tokens = getCurrentBlockTokens();
  const payload = {
    user: os.userInfo().username,
    tokens,
    timestamp: new Date().toISOString(),
  };

  await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("Logged:", payload);
}

main().catch((err) => console.error("Collector failed:", err));