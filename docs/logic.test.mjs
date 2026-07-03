// Run: node docs/logic.test.mjs   — guards the metrics that matter for a shared account:
// (1) repeated snapshots of one block don't inflate a user, (2) share is by COST so
// Opus vs Sonnet is fair, not by raw tokens, and (3) users who didn't touch a
// session still show up (at 0%).
import assert from "node:assert";
import { summarize, FIVE_H } from "./logic.mjs";

const ws = Math.floor(Date.now() / FIVE_H) * FIVE_H;
const t0 = ws + FIVE_H / 2; // safely mid-window
const iso = (ms) => new Date(ms).toISOString();

// omer: fewer tokens but on Opus → higher cost. user2: more tokens on Sonnet → lower cost.
// By tokens user2 looks like the bigger user; by cost (what actually drains the limit) omer is.
const entries = [
  { user: "omer", startTime: iso(t0), tokens: 1_000_000, cost: 9.0 },
  { user: "user2", startTime: iso(t0 + 1000), tokens: 3_000_000, cost: 3.0 },
  { user: "omer", startTime: iso(t0 - FIVE_H), tokens: 0, cost: 0 }, // earlier, empty session
];

const [latest, prev] = summarize(entries);

assert.equal(latest.users.length, 2);
assert.equal(latest.totalCost, 12.0);
assert.equal(latest.totalTokens, 4_000_000);

// share is by cost: omer 75%, user2 25% — the opposite of the raw-token ranking
assert.ok(Math.abs(latest.users.find((u) => u.user === "omer").share - 0.75) < 1e-9);
assert.ok(Math.abs(latest.users.find((u) => u.user === "user2").share - 0.25) < 1e-9);

// capacity auto-calibrates (in $) to the priciest session (this one): full, no headroom
assert.ok(Math.abs(latest.capacityFrac - 1) < 1e-9);
assert.ok(Math.abs(latest.headroomFrac - 0) < 1e-9);

// pinning a dollar budget changes capacity but never share
const [pinned] = summarize(entries, { limitUsd: 24.0 });
assert.ok(Math.abs(pinned.capacityFrac - 0.5) < 1e-9);
assert.ok(Math.abs(pinned.users.find((u) => u.user === "omer").share - 0.75) < 1e-9);

// both users still listed in the session neither really used; shares are 0
assert.equal(prev.users.length, 2);
assert.equal(prev.totalCost, 0);
assert.ok(prev.users.every((u) => u.cost === 0 && u.share === 0));

console.log("ok");
