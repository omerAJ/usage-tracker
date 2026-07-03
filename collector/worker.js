import { execSync } from "child_process";
import os from "os";

const WORKER_URL = "https://usage-tracker-worker.omer-aj.workers.dev/log";

function getCurrentBlockTokens() {
  const raw = execSync("npx ccusage blocks --json", { encoding: "utf8" });
  const data = JSON.parse(raw);
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
}

main().catch(() => {}); // silent fail — nothing is watching this process's output anyway