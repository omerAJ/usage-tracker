import { execSync } from "child_process";
import os from "os";

const WORKER_URL = "https://usage-tracker-worker.omer-aj.workers.dev/log";

// Newest real (non-gap) 5-hour block with its cumulative totals so far.
// The server keys by blockId and overwrites, so reporting the same block on
// every SessionEnd just refreshes its snapshot instead of double-counting.
// ponytail: one block per run is enough — the server keeps the last snapshot of
// every block we ever report, so full history builds up over time on its own.
function latestBlock() {
  const raw = execSync("npx ccusage blocks --json", { encoding: "utf8" });
  const blocks = (JSON.parse(raw).blocks || []).filter((b) => !b.isGap);
  if (blocks.length === 0) return null;
  return blocks.reduce((a, b) => (a.startTime > b.startTime ? a : b));
}

async function main() {
  const b = latestBlock();
  if (!b) return;
  const payload = {
    user: os.userInfo().username,
    blockId: b.id, // stable per 5-hour block → server overwrites, no dupes
    startTime: b.startTime,
    endTime: b.endTime,
    tokens: b.totalTokens,
    cost: b.costUSD,
    timestamp: new Date().toISOString(),
  };
  await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

main().catch(() => {}); // silent fail — nothing is watching this process's output anyway
