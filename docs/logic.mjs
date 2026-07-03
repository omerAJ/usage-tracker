export const FIVE_H = 5 * 60 * 60 * 1000;

// Turn raw block snapshots into per-session summaries. Two questions get answered:
//   share    — of what the account actually burned this session, how much was
//              each user? Measured in cost ($), NOT tokens: ccusage prices each
//              model, so a dollar of Opus and a dollar of Sonnet count the same,
//              and cheap cache-read tokens don't swamp expensive output. This is
//              the fair "who drained it" metric that settles arguments.
//   capacity — how full did the session get vs our heaviest session on record?
//              Claude's real 5-hour limit isn't a published number, and its per-
//              model weighting roughly tracks cost, so cost is the best proxy.
//              The heaviest window we've seen is the honest, self-calibrating
//              ceiling (same idea as ccusage's `--token-limit max`). Pass an
//              explicit `limitUsd` to pin it to your plan's real budget instead.
//
// ponytail: windows are a fixed global 5-hour grid (floor(ts / 5h)), so every
// machine buckets identically and users in the same real window line up. It
// approximates Claude's floating per-account reset within a few hours.
export function summarize(entries, { limitUsd = null, maxSessions = 12 } = {}) {
  const windows = new Map(); // windowStart(ms) -> Map(user -> {tokens, cost})
  const users = new Set();

  for (const e of entries) {
    if (!e || !e.startTime) continue; // ignore legacy rows without a block window
    users.add(e.user);
    const ws = Math.floor(new Date(e.startTime).getTime() / FIVE_H) * FIVE_H;
    if (!windows.has(ws)) windows.set(ws, new Map());
    const byUser = windows.get(ws);
    const cur = byUser.get(e.user) || { tokens: 0, cost: 0 };
    cur.tokens += e.tokens || 0;
    cur.cost += e.cost || 0;
    byUser.set(e.user, cur);
  }

  const allUsers = [...users].sort();
  const totals = [...windows.entries()].map(([ws, byUser]) => ({
    ws,
    byUser,
    totalCost: [...byUser.values()].reduce((s, d) => s + d.cost, 0),
    totalTokens: [...byUser.values()].reduce((s, d) => s + d.tokens, 0),
  }));

  // ceiling ($): pinned budget, else priciest combined session ever (min 0.01 to avoid /0)
  const ceiling = limitUsd || Math.max(0.01, ...totals.map((t) => t.totalCost));

  return totals
    .sort((a, b) => b.ws - a.ws) // newest session first
    .slice(0, maxSessions)
    .map(({ ws, byUser, totalCost, totalTokens }) => {
      const perUser = allUsers.map((u) => {
        const d = byUser.get(u) || { tokens: 0, cost: 0 };
        return {
          user: u,
          tokens: d.tokens,
          cost: d.cost,
          share: totalCost ? d.cost / totalCost : 0, // by $, so Opus vs Sonnet is fair
        };
      });
      return {
        start: ws,
        end: ws + FIVE_H,
        active: Date.now() < ws + FIVE_H,
        users: perUser,
        totalTokens,
        totalCost,
        capacityFrac: totalCost / ceiling,
        headroomFrac: Math.max(0, 1 - totalCost / ceiling),
        ceiling,
      };
    });
}
