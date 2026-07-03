/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

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
      return new Response("ok", { headers: cors });
    }

    if (url.pathname === "/leaderboard" && request.method === "GET") {
      const list = await env.USAGE_KV.list();
      const entries = await Promise.all(
        list.keys.map(async (k) => JSON.parse(await env.USAGE_KV.get(k.name)))
      );
      return new Response(JSON.stringify(entries), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};