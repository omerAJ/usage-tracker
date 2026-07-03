import { describe, expect, it } from "vitest";
import worker from "../src";

function createKv(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));

  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function fetch(request, kv = createKv()) {
  return worker.fetch(request, { USAGE_KV: kv });
}

describe("usage tracker worker", () => {
  it("stores usage logs by user and block id", async () => {
    const kv = createKv();
    const payload = {
      user: "alice",
      blockId: "2026-07-03T10",
      startTime: "2026-07-03T10:00:00Z",
      endTime: "2026-07-03T15:00:00Z",
      tokens: 1234,
      cost: 0.42,
    };

    const response = await fetch(
      new Request("https://example.com/log", {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }),
      kv,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(JSON.parse(await kv.get("alice:2026-07-03T10"))).toEqual(payload);
    expect(JSON.parse(await kv.get("__usage_index__"))).toEqual({
      "alice:2026-07-03T10": payload,
    });
  });

  it("returns leaderboard entries from the usage index", async () => {
    const kv = createKv({
      "__usage_index__": JSON.stringify({
        "alice:block-1": { user: "alice", tokens: 100 },
        "bob:block-1": { user: "bob", tokens: 200 },
      }),
    });

    const response = await fetch(new Request("https://example.com/leaderboard"), kv);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual([
      { user: "alice", tokens: 100 },
      { user: "bob", tokens: 200 },
    ]);
  });

  it("returns an empty leaderboard when the usage index is invalid", async () => {
    const kv = createKv({
      "__usage_index__": "{not json",
    });

    const response = await fetch(new Request("https://example.com/leaderboard"), kv);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("responds to CORS preflight requests", async () => {
    const response = await fetch(
      new Request("https://example.com/leaderboard", { method: "OPTIONS" }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
