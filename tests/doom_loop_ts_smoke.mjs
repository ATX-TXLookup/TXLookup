// Standalone smoke test for app/lib/doomLoop.ts — mirrors the cases in
// tests/test_doom_loop.py to prove the TS port detects the same patterns.
//
// Run with: npx tsx tests/doom_loop_ts_smoke.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// tsx exposes TS modules as CJS — pull named exports via the default object.
import dl from "../app/lib/doomLoop.ts";
const { DoomLoopGuard, detect, CORRECTIVE_SYSTEM_PROMPT } = dl;

test("two identical calls do NOT trip", () => {
  const g = new DoomLoopGuard();
  assert.equal(g.observe("fetch_data", { id: "3syk-w9eu" }), null);
  assert.equal(g.observe("fetch_data", { id: "3syk-w9eu" }), null);
});

test("three identical calls TRIP (kind=identical)", () => {
  const g = new DoomLoopGuard();
  g.observe("fetch_data", { id: "3syk-w9eu" });
  g.observe("fetch_data", { id: "3syk-w9eu" });
  const hit = g.observe("fetch_data", { id: "3syk-w9eu" });
  assert.ok(hit, "third identical should trip");
  assert.equal(hit.kind, "identical");
  assert.equal(hit.repeats, 3);
  assert.ok(hit.message.startsWith(CORRECTIVE_SYSTEM_PROMPT.slice(0, 30)));
});

test("identical with different args do NOT trip", () => {
  const g = new DoomLoopGuard();
  g.observe("fetch_data", { id: "a" });
  g.observe("fetch_data", { id: "b" });
  assert.equal(g.observe("fetch_data", { id: "c" }), null);
});

test("[A,B,A,B] sequence trips", () => {
  const g = new DoomLoopGuard();
  g.observe("discover_datasets", { q: "x" });
  g.observe("get_dataset_schema", { id: "y" });
  g.observe("discover_datasets", { q: "x" });
  const hit = g.observe("get_dataset_schema", { id: "y" });
  assert.ok(hit, "[A,B,A,B] should trip");
  assert.equal(hit.kind, "sequence");
});

test("[A,B,A] does NOT trip — only one full cycle", () => {
  const g = new DoomLoopGuard();
  g.observe("a", {});
  g.observe("b", {});
  assert.equal(g.observe("a", {}), null);
});

test("argument-key order does not affect fingerprint", () => {
  const g = new DoomLoopGuard();
  g.observe("t", { a: 1, b: 2 });
  g.observe("t", { b: 2, a: 1 });
  const hit = g.observe("t", { a: 1, b: 2 });
  assert.ok(hit, "key order should not change fingerprint");
  assert.equal(hit.kind, "identical");
});

test("reset clears history", () => {
  const g = new DoomLoopGuard();
  g.observe("t", {});
  g.observe("t", {});
  g.reset();
  assert.equal(g.observe("t", {}), null, "first call after reset should not trip");
});

test("detect() works on a static history", () => {
  const hit = detect([
    ["fetch_data", { x: 1 }],
    ["fetch_data", { x: 1 }],
    ["fetch_data", { x: 1 }],
  ]);
  assert.ok(hit);
  assert.equal(hit.kind, "identical");
});

test("[A,B,C,A,B,C] trips with kind=sequence", () => {
  const hit = detect([
    ["a", {}],
    ["b", {}],
    ["c", {}],
    ["a", {}],
    ["b", {}],
    ["c", {}],
  ]);
  assert.ok(hit);
  assert.equal(hit.kind, "sequence");
  assert.equal(hit.repeats, 2);
});
