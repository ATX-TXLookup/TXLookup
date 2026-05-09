// End-to-end smoke test for the admin surface (#59).
//
// Spec: walks the full admin flow against a running TXLookup instance —
// auth gate, dataset table, /api/agent demo run + saveRun hook, run-archive
// list/get/mark APIs, fallback replay path, and the /admin/replay/[hash] view.
//
// Usage:
//   bash .tmp/start-admin.sh &           # or any equivalent starter
//   sleep 4
//   node tests/e2e_admin_smoke.mjs       # default base http://localhost:3012
//   node tests/e2e_admin_smoke.mjs http://localhost:3012  # explicit
//
// Env:
//   ADMIN_BASIC_AUTH=test:test           # must match TXLOOKUP_BASIC_AUTH
//
// node:test only — no new npm deps.

import test, { describe, before } from "node:test";
import assert from "node:assert/strict";

const BASE = process.argv[2] || "http://localhost:3012";
const AUTH_RAW = process.env.ADMIN_BASIC_AUTH || "test:test";
const AUTH = `Basic ${Buffer.from(AUTH_RAW).toString("base64")}`;
// A query that maps to the food-inspections fixture in app/lib/demo-fixtures.ts.
const QUERY = "Restaurants near 78704 with failing inspections this year";

async function readSse(res) {
  const events = [];
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          try { events.push(JSON.parse(line.slice(6))); } catch {}
        }
      }
    }
  }
  return events;
}

let HASH = null;

describe("admin smoke", () => {
  before(async () => {
    const r = await fetch(`${BASE}/api/admin/runs`, { headers: { Authorization: AUTH } });
    assert.equal(r.ok, true, `precheck failed — server not up at ${BASE}`);
  });

  test("a. /admin without auth -> 401", async () => {
    const r = await fetch(`${BASE}/admin`);
    assert.equal(r.status, 401);
  });

  test("b. /admin with auth -> 200 + dataset row + Issued Construction Permits", async () => {
    const r = await fetch(`${BASE}/admin`, { headers: { Authorization: AUTH } });
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes("Issued Construction Permits"), "expected dataset title in HTML");
    // Some dataset shows a row count > 0 (tabular-nums column rendered).
    const m = html.match(/tabular-nums[^>]*>([0-9,]+)</);
    assert.ok(m, "expected at least one numeric row count");
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    assert.ok(n > 0, `row count should be > 0, got ${m[1]}`);
  });

  test("c. POST /api/agent?demo=1 streams SSE ending in phase=done", async () => {
    const r = await fetch(`${BASE}/api/agent?demo=1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY }),
    });
    assert.equal(r.ok, true);
    const events = await readSse(r);
    assert.ok(events.length > 0, "expected events");
    assert.equal(events[events.length - 1].phase, "done", "last event phase=done");
    // Capture the hash for downstream steps. Hash function = sha256(normalized).slice(0,16).
    const { createHash } = await import("node:crypto");
    HASH = createHash("sha256")
      .update(QUERY.trim().toLowerCase().replace(/\s+/g, " "))
      .digest("hex")
      .slice(0, 16);
    // give the saveRun hook a moment to finish writing
    await new Promise((res) => setTimeout(res, 1000));
  });

  test("d. GET /api/admin/runs lists the just-saved run", async () => {
    assert.ok(HASH, "step c must capture hash");
    const r = await fetch(`${BASE}/api/admin/runs`, { headers: { Authorization: AUTH } });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.runs), "runs is an array");
    assert.ok(j.runs.length >= 1, "at least one run");
    const found = j.runs.find((x) => x.hash === HASH);
    assert.ok(found, `expected hash ${HASH} in run list`);
  });

  test("e. GET /api/admin/runs?hash= returns full run with events", async () => {
    const r = await fetch(`${BASE}/api/admin/runs?hash=${HASH}`, { headers: { Authorization: AUTH } });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.hash, HASH);
    assert.ok(Array.isArray(j.events), "events array");
    assert.ok(j.events.length > 0, "events not empty");
  });

  test("f. POST /api/admin/runs marks good", async () => {
    const r = await fetch(`${BASE}/api/admin/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: AUTH },
      body: JSON.stringify({ hash: HASH, status: "good" }),
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, "good");
  });

  test("g. POST /api/agent { fallback: true } replays archive + sets X-TXLookup-Mode: fallback", async () => {
    const r = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, fallback: true }),
    });
    assert.equal(r.ok, true);
    assert.equal(r.headers.get("x-txlookup-mode"), "fallback");
    const events = await readSse(r);
    assert.ok(events.length > 0, "fallback should replay events");
    assert.equal(events[events.length - 1].phase, "done");
  });

  test("h. GET /admin/replay/<hash> renders AgentRunner scaffold", async () => {
    const r = await fetch(`${BASE}/admin/replay/${HASH}`, { headers: { Authorization: AUTH } });
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(
      html.includes("AgentRunner") || html.includes("Replay"),
      "replay page should mention AgentRunner or Replay",
    );
  });

  test("i. /api/admin/runs without auth -> 401", async () => {
    const r = await fetch(`${BASE}/api/admin/runs`);
    assert.equal(r.status, 401);
  });
});
