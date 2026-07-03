import { execSync } from "child_process";
import os from "os";

const WORKER_URL = "https://usage-tracker-worker.omer-aj.workers.dev/log";

// Codex has no 5-hour blocks like Claude — ccusage reports per-session totals.
// Each session has a stable sessionId, so reporting the newest one on every run
// refreshes its snapshot instead of double-counting (server keys by user+id).
// ponytail: newest session per run is enough — the server keeps the last
// snapshot of every id we ever report, so full history builds up over time.
function latestSession() {
  const raw = execSync("npx ccusage codex session --json", { encoding: "utf8" });
  const sessions = JSON.parse(raw).sessions || [];
  if (sessions.length === 0) return null;
  return sessions.reduce((a, b) => (a.lastActivity > b.lastActivity ? a : b));
}

async function main() {
  const s = latestSession();
  if (!s) return;
  const payload = {
    user: os.userInfo().username,
    source: "codex",
    blockId: `codex:${s.sessionId}`, // stable per session, prefixed so it won't collide with Claude blocks
    startTime: s.lastActivity, // codex sessions report no start; only lastActivity
    endTime: s.lastActivity,
    tokens: s.totalTokens,
    cost: s.costUSD,
    timestamp: new Date().toISOString(),
  };
  await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

main().catch(() => {}); // silent fail — nothing is watching this process's output anyway
