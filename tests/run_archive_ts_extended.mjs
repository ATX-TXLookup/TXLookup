// Extended smoke test for app/lib/run-archive.ts — file-based path only.
// Companion to run_archive_ts_smoke.mjs; this file adds the cases called out
// in #59 review: hash-collision (two queries normalize to the same hash),
// markRun on missing hash, and listRuns(limit).
//
// Run with: npx tsx tests/run_archive_ts_extended.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

delete process.env.KV_URL;

const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "txlookup-runs-ext-"));
process.chdir(tmpRoot);

const mod = await import("../app/lib/run-archive.ts");
const { saveRun, findRun, listRuns, markRun, hashQuery, getRun } = mod;

test("hash collision — two queries that normalize to the same hash collapse to one entry", async () => {
  // hashQuery normalizes by trim + lowercase + collapsed-whitespace. Any two
  // strings that produce the same normalized form must map to the same hash
  // and therefore the same archive slot.
  const a = "How many   open 311 SRs?";
  const b = "  HOW MANY open 311 srs?  ";
  assert.equal(hashQuery(a), hashQuery(b), "normalization should match");

  const first = await saveRun(a, { steps: [{ tool: "first" }] }, [{ phase: "done" }], "answer-a", null, 100, 10);
  const second = await saveRun(b, { steps: [{ tool: "second" }] }, [{ phase: "done" }], "answer-b", null, 200, 20);

  assert.equal(first.hash, second.hash, "same hash slot");

  // The second save must overwrite the first — there is one record per hash.
  const got = await getRun(first.hash);
  assert.ok(got);
  assert.equal(got.answer, "answer-b", "second save overwrites first");
  assert.equal(got.tokenTotal, 20);

  // Either form looks up the same row.
  const viaA = await findRun(a);
  const viaB = await findRun(b);
  assert.equal(viaA?.hash, viaB?.hash);
  assert.equal(viaA?.answer, "answer-b");

  // The list contains exactly one entry for that hash (no dupes from a
  // second insertion).
  const runs = await listRuns(50);
  const matches = runs.filter((r) => r.hash === first.hash);
  assert.equal(matches.length, 1, `expected 1 entry for hash, got ${matches.length}`);
});

test("markRun on missing hash returns null (NOT throws, NOT a partial record)", async () => {
  const r1 = await markRun("ffffffffffffffff", "good");
  assert.equal(r1, null);
  const r2 = await markRun("0000000000000000", "bad");
  assert.equal(r2, null);
  // Sanity — falsiness ('false-like') is the contract; downstream callers
  // can treat the null as a missing-record signal.
  assert.ok(!r1);
  assert.ok(!r2);
});

test("listRuns honors the limit parameter", async () => {
  // Seed a handful of records so the limit truncation is observable.
  for (const q of ["alpha-1", "beta-2", "gamma-3", "delta-4", "epsilon-5"]) {
    await saveRun(q, null, [], "x", null, 1, 1);
    await new Promise((r) => setTimeout(r, 2));
  }

  const all = await listRuns(50);
  assert.ok(all.length >= 5, `seeded at least 5, got ${all.length}`);

  const two = await listRuns(2);
  assert.equal(two.length, 2, "limit=2 returns exactly 2");

  const one = await listRuns(1);
  assert.equal(one.length, 1, "limit=1 returns exactly 1");

  // Limit larger than archive returns everything (no padding, no error).
  const big = await listRuns(1000);
  assert.equal(big.length, all.length, "limit >> size returns full archive");

  // Newest-first ordering: the most-recently-saved query (epsilon-5) is index 0
  // in the unbounded list AND in the limit=1 list.
  assert.equal(all[0].query, "epsilon-5");
  assert.equal(one[0].query, "epsilon-5");
});

test("cleanup", () => {
  rmSync(tmpRoot, { recursive: true, force: true });
});
