const INDEX_KEY = "__usage_index__";

async function getJson(kv, key, fallback) {
  const value = await kv.get(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn(`Ignoring invalid JSON in KV key "${key}"`, error);
    return fallback;
  }
}

async function updateUsageIndex(kv, key, data) {
  const index = await getJson(kv, INDEX_KEY, {});
  index[key] = data;
  await kv.put(INDEX_KEY, JSON.stringify(index));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/log" && request.method === "POST") {
      const data = await request.json(); // { user, blockId, startTime, endTime, tokens, cost }
      // Key by user + 5-hour block so repeated reports of the same block
      // overwrite (keep the latest cumulative snapshot) instead of stacking up
      // and being double-counted. Falls back to timestamp for legacy payloads.
      const key = `${data.user}:${data.blockId || data.timestamp}`;
      await env.USAGE_KV.put(key, JSON.stringify(data));
      await updateUsageIndex(env.USAGE_KV, key, data);
      return new Response("ok", { headers: cors });
    }

    if (url.pathname === "/leaderboard" && request.method === "GET") {
      const index = await getJson(env.USAGE_KV, INDEX_KEY, {});
      const entries = Array.isArray(index) ? index : Object.values(index);
      return new Response(JSON.stringify(entries), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
