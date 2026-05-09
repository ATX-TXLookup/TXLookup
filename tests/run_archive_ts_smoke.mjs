// Smoke test for app/lib/run-archive.ts — file-based path only.
// Forces the file backend by clearing KV_URL and points the module at a
// throwaway tmp directory via cwd.
//
// Run with: npx tsx tests/run_archive_ts_smoke.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// Disable the KV path explicitly so the test always exercises the file backend.
delete process.env.KV_URL;

// Use a throwaway working directory so we don't pollute the repo's data/.
const tmpRoot = mkdtempSync(path.join(os.tmpdir(), "txlookup-runs-"));
process.chdir(tmpRoot);

const mod = await import("../app/lib/run-archive.ts");
const { saveRun, findRun, listRuns, markRun, hashQuery } = mod;

test("hashQuery normalizes whitespace + case", () => {
  assert.equal(hashQuery("  Hello WORLD  "), hashQuery("hello world"));
  assert.notEqual(hashQuery("a"), hashQuery("b"));
});

test("save + find roundtrip", async () => {
  const q = "How many active food inspections in 78704?";
  const events = [{ phase: "reasoning", message: q }, { phase: "done" }];
  const saved = await saveRun(q, { steps: [] }, events, "answer", null, 1234, 567);
  assert.equal(saved.query, q);
  assert.equal(saved.status, "pending");
  assert.equal(saved.tokenTotal, 567);

  const found = await findRun(q);
  assert.ok(found, "findRun should hit");
  assert.equal(found.hash, saved.hash);
  assert.equal(found.answer, "answer");
  assert.equal(found.events.length, 2);

  // Case + whitespace insensitive.
  const found2 = await findRun("  HOW many  active food inspections in 78704?  ");
  assert.ok(found2, "case/whitespace normalized lookup should hit");
  assert.equal(found2.hash, saved.hash);
});

test("listRuns ordering — newest first", async () => {
  await saveRun("query alpha", null, [], "a", null, 1, 1);
  await new Promise((r) => setTimeout(r, 5));
  await saveRun("query beta", null, [], "b", null, 1, 1);
  await new Promise((r) => setTimeout(r, 5));
  await saveRun("query gamma", null, [], "c", null, 1, 1);

  const runs = await listRuns(10);
  assert.ok(runs.length >= 3);
  // Newest first — gamma before beta before alpha (when present).
  const queries = runs.map((r) => r.query);
  const idxA = queries.indexOf("query alpha");
  const idxB = queries.indexOf("query beta");
  const idxC = queries.indexOf("query gamma");
  assert.ok(idxC < idxB && idxB < idxA, `order should be gamma<beta<alpha, got ${queries}`);
});

test("markRun mutates status + persists", async () => {
  const q = "another query for marking";
  const saved = await saveRun(q, null, [], "x", null, 1, 1);
  assert.equal(saved.status, "pending");

  const marked = await markRun(saved.hash, "good");
  assert.ok(marked);
  assert.equal(marked.status, "good");

  const refound = await findRun(q);
  assert.equal(refound?.status, "good");

  const reverted = await markRun(saved.hash, "bad");
  assert.equal(reverted?.status, "bad");
});

test("listRuns honors limit", async () => {
  const runs = await listRuns(2);
  assert.ok(runs.length <= 2);
});

test("markRun on missing hash returns null", async () => {
  const r = await markRun("0000000000000000", "good");
  assert.equal(r, null);
});

test("cleanup", () => {
  rmSync(tmpRoot, { recursive: true, force: true });
});
