// Standalone smoke for the orchestrator's delegate_to plumbing (issue #67).
// Verifies the specialist registry routes correctly and the executor's
// delegate_to case folds the SpecialistEnvelope into the ToolEnvelope shape.
//
// Run with: npx tsx --test tests/specialists_smoke.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// tsx exposes TS modules as CJS — pull named exports via the default object.
import specs from "../app/lib/specialists.ts";
const {
  isSpecialistName,
  callSpecialist,
  _setSpecialistForTest,
  _resetSpecialistsForTest,
} = specs;

import agent from "../app/lib/agent.ts";
const { executeStep } = agent;

test("isSpecialistName recognizes the three roster names", () => {
  assert.equal(isSpecialistName("data_analyst"), true);
  assert.equal(isSpecialistName("reporter"), true);
  assert.equal(isSpecialistName("support"), true);
  assert.equal(isSpecialistName("orchestrator"), false);
  assert.equal(isSpecialistName("nope"), false);
});

test("all three specialists are now LIVE (no stubs left in the registry)", async () => {
  _resetSpecialistsForTest();
  for (const name of ["data_analyst", "reporter", "support"]) {
    const env = await callSpecialist(name, {});
    assert.equal(env.agent, name);
    // Each LIVE specialist returns its own response for empty input —
    // data_analyst/reporter fail with their own validation, support
    // intentionally returns a friendly intro. None should return the
    // generic "not yet implemented" stub message.
    assert.doesNotMatch(env.error ?? "", /not yet implemented/i, `${name} should not return the stub message`);
  }
});

test("reporter — empty input fails clearly (no crash)", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("reporter", {});
  assert.equal(env.agent, "reporter");
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /dataset_id|query/i);
});

test("reporter — unknown dataset_id fails clearly", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("reporter", {
    query: "report on permits",
    dataset_id: "phantom-id",
  });
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /unknown dataset_id/i);
});

test("data_analyst — empty input fails clearly (no crash)", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("data_analyst", {});
  assert.equal(env.agent, "data_analyst");
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /dataset_id|dimension/i);
});

test("data_analyst — unknown dataset_id fails clearly", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("data_analyst", {
    dataset_id: "phantom-id",
    dimensions: ["foo"],
  });
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /unknown dataset_id/i);
});

// Pure-function test for the delta math — doesn't hit Socrata.
import deltaPkg from "../app/lib/specialists.ts";
const { computeDeltas } = deltaPkg;

test("computeDeltas — basic +/- and zero-prior cases", () => {
  const current = [
    { permit_class_mapped: "Residential", count: 1200 },
    { permit_class_mapped: "Commercial", count: 480 },
    { permit_class_mapped: "Industrial", count: 12 }, // new category, zero prior
  ];
  const prior = [
    { permit_class_mapped: "Residential", count: 1000 },
    { permit_class_mapped: "Commercial", count: 600 },
    { permit_class_mapped: "Mixed", count: 50 }, // dropped to zero
  ];
  const deltas = computeDeltas(current, prior, "permit_class_mapped", "count");
  assert.equal(deltas.length, 4, "should include all keys from both windows");

  const byKey = Object.fromEntries(deltas.map((d) => [d.key, d]));
  // Residential: 1000 → 1200 = +20%
  assert.equal(byKey.Residential.delta, 200);
  assert.ok(Math.abs(byKey.Residential.pct - 20) < 0.01);
  // Commercial: 600 → 480 = -20%
  assert.equal(byKey.Commercial.delta, -120);
  assert.ok(Math.abs(byKey.Commercial.pct - -20) < 0.01);
  // Industrial: 0 → 12 = no prior baseline
  assert.equal(byKey.Industrial.prior, 0);
  assert.equal(byKey.Industrial.pct, null, "zero-prior should yield null pct (avoid div-by-zero)");
  // Mixed: 50 → 0 = -100%
  assert.equal(byKey.Mixed.delta, -50);
  assert.ok(Math.abs(byKey.Mixed.pct - -100) < 0.01);
});

test("computeDeltas — sort puts biggest absolute pct change first", () => {
  const deltas = computeDeltas(
    [{ k: "A", n: 110 }, { k: "B", n: 200 }, { k: "C", n: 1000 }],
    [{ k: "A", n: 100 }, { k: "B", n: 100 }, { k: "C", n: 950 }],
    "k",
    "n",
  );
  // B: +100% — biggest pct change
  assert.equal(deltas[0].key, "B");
});

test("support specialist — catalog meta query returns pre-canned summary (no LLM)", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("support", { query: "what datasets do you have?" });
  assert.equal(env.agent, "support");
  assert.equal(env.status, "completed");
  assert.equal(env.error, null);
  const r = env.result;
  assert.ok(typeof r.message === "string" && r.message.length > 30);
  assert.ok(Array.isArray(r.datasets), "expected datasets[] in catalog summary");
  assert.ok(r.datasets.length >= 9, "should list all catalog entries");
  assert.ok(r.datasets[0].id && r.datasets[0].title);
});

test("support specialist — vague geography returns needs_input + clarifier chips", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("support", {
    query: "show me permits in south austin last six months",
  });
  assert.equal(env.agent, "support");
  assert.equal(env.status, "needs_input");
  assert.ok(Array.isArray(env.next_actions) && env.next_actions.length >= 3);
  for (const chip of env.next_actions) {
    assert.ok(/^\d{5}$/.test(chip.label), `chip label should be a bare zip: ${chip.label}`);
    assert.match(chip.query, /\d{5}/, "chip query should contain the substituted zip");
    assert.ok(!/south austin/i.test(chip.query), "chip query should have replaced 'south austin'");
    // Reject the regression where the rewrite produced "in in 78704" / "to to 78704" / etc.
    assert.ok(
      !/\b(in|to|at|for|near|of|on|by|from)\s+\1\b/i.test(chip.query),
      `chip query has duplicated preposition (rewrite bug): ${chip.query}`,
    );
    // The substituted query should still scan as a normal sentence — no double spaces.
    assert.ok(!/  +/.test(chip.query), `chip query has double-space: ${chip.query}`);
  }
  // First chip's full text — concrete sanity that the rewrite is clean.
  assert.equal(
    env.next_actions[0].query,
    "show me permits in 78704 last six months",
    "first chip query should read as a clean sentence",
  );
});

test("support specialist — bare 'south austin' query returns a chip query that is just the zip", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("support", { query: "south austin" });
  assert.equal(env.status, "needs_input");
  assert.equal(env.next_actions[0].query, "78704");
});

test("support specialist — failure-explanation mode returns plain English", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("support", {
    query: "",
    context: {
      failed: true,
      failedTool: "summarize_data",
      error: "HTTP 400 on https://...",
    },
  });
  assert.equal(env.agent, "support");
  assert.equal(env.status, "completed");
  const msg = env.result.message;
  assert.ok(/summarize_data/.test(msg) && /HTTP 400/.test(msg));
  assert.ok(/try rephrasing/i.test(msg) || /broaden|different/i.test(msg));
});

test("support specialist — empty query returns a friendly intro (no crash)", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("support", { query: "" });
  assert.equal(env.status, "completed");
  assert.ok(typeof env.result.message === "string" && env.result.message.length > 10);
});

test("delegate_to executor case → unknown specialist fails clearly", async () => {
  _resetSpecialistsForTest();
  const env = await executeStep({
    tool: "delegate_to",
    args: { specialist: "phantom_analyst", input: {} },
  });
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /unknown specialist/i);
});

test("delegate_to executor case → routes to registered specialist + folds envelope", async () => {
  _setSpecialistForTest("data_analyst", async (input) => ({
    agent: "data_analyst",
    status: "completed",
    result: { findings: [{ text: "permits up 12% yoy", value: 12, unit: "%" }] },
    error: null,
    confidence: 0.9,
    caveats: ["small sample size in 78753"],
  }));

  const env = await executeStep({
    tool: "delegate_to",
    args: { specialist: "data_analyst", input: { question: "yoy?" } },
  });

  assert.equal(env.status, "completed");
  assert.equal(env.error, null);
  const r = env.result;
  assert.equal(r.agent, "data_analyst");
  assert.equal(r.confidence, 0.9);
  assert.deepEqual(r.caveats, ["small sample size in 78753"]);
  assert.ok(Array.isArray(r.findings));

  _resetSpecialistsForTest();
});

test("delegate_to status='needs_input' → executor surfaces it as completed + needs_input flag", async () => {
  _setSpecialistForTest("support", async () => ({
    agent: "support",
    status: "needs_input",
    result: { question: "South Austin is broad — pick one:" },
    error: null,
    next_actions: [
      { label: "78704", query: "show me X in 78704" },
      { label: "78745", query: "show me X in 78745" },
    ],
  }));

  const env = await executeStep({
    tool: "delegate_to",
    args: { specialist: "support", input: { query: "south austin" } },
  });

  // needs_input must NOT trigger the replan loop — it's a soft pause.
  assert.equal(env.status, "completed");
  assert.equal(env.result.needs_input, true);
  assert.equal(env.result.agent, "support");
  assert.equal(env.result.next_actions.length, 2);

  _resetSpecialistsForTest();
});

test("non-delegate_to steps don't touch the specialist registry", async () => {
  // discover_datasets is the cheapest live tool that doesn't hit Socrata —
  // proves the existing executor cases still work after the new switch arm.
  const env = await executeStep({
    tool: "discover_datasets",
    args: { query: "permits" },
  });
  assert.equal(env.status, "completed");
  assert.ok(Array.isArray(env.result));
});
