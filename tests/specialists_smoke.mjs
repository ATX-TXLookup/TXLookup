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

test("stub specialists return failed envelope with not-yet-implemented message", async () => {
  _resetSpecialistsForTest();
  const env = await callSpecialist("data_analyst", {});
  assert.equal(env.agent, "data_analyst");
  assert.equal(env.status, "failed");
  assert.match(env.error ?? "", /not yet implemented/i);
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
