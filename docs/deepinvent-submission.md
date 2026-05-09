# DeepInvent — Best Patentable Hack submission

> Draft for the DeepInvent Best Patentable Hack bounty ($500 + provisional patent filing). Submit at https://deepinvent.ai. Six pages of prose; no fluff.

---

## Title

A doom-loop-aware autonomous data agent with intent-preserving replan-on-failure for public open civic data.

---

## Field of the invention

The invention relates to large-language-model-driven autonomous agents that issue tool calls against external data systems, and more particularly to detecting non-progressing tool-call patterns and recovering from them by re-prompting the language model with the original user intent and a structured diagnosis of the failure, such that prior step results are preserved and the agent emits a corrective continuation plan rather than restarting.

---

## Background and problem

An autonomous data agent is a language model coupled to a closed enumeration of tools — for example, a Socrata SODA query tool, a metadata-discovery tool, and a citation tool. The model emits a structured plan, a deterministic dispatcher executes each step, and the model synthesizes an answer.

Two failure modes recur in production. First, a step fails with a recoverable error — a wrong column name, an exhausted rate budget, a transient network fault — and naive retry re-runs the same call and fails again. Second, the model itself emits the same tool call repeatedly, or oscillates between two calls, without producing new information; the agent appears to be "thinking" but is in fact stuck. Existing frameworks treat both as either fatal exceptions or undifferentiated retries.

What is required is (a) a method for detecting non-progressing tool-call patterns by their fingerprint rather than by elapsed time, and (b) a method for recovering from such patterns or from explicit failures by re-invoking the language model with sufficient context that the corrective continuation preserves prior progress.

---

## Independent claim 1 — pattern-based loop detection

A computer-implemented method for detecting non-progressing behavior in an autonomous tool-using agent, the method comprising:

(a) receiving, at a deterministic guard module operating outside the language model, a stream of tool-invocation records, each tool-invocation record comprising a tool name drawn from a closed enumeration and a tool argument object;

(b) computing, for each tool-invocation record, a fingerprint comprising a hash of the tool name concatenated with a stable serialization of the tool argument object, wherein the stable serialization is produced by sorting object keys prior to encoding such that semantically equivalent argument objects yield identical fingerprints;

(c) appending each fingerprint to a bounded ordered history of length at most M;

(d) responsive to each appended fingerprint, evaluating the history against two pattern predicates, comprising:

  (i) an identical-call predicate that is satisfied when the most recent K consecutive fingerprints are equal, wherein K is at least three; and

  (ii) a periodic-cycle predicate that is satisfied when, for some window length W in a configured range, the trailing W * R fingerprints comprise R consecutive identical windows of length W, wherein R is at least two and the window contains at least two distinct fingerprints;

(e) responsive to either predicate being satisfied, emitting a structured loop-hit record comprising a kind label, the repeating pattern, the repeat count, and a corrective natural-language message instructing the language model to take a different approach;

(f) routing the loop-hit record to a recovery procedure that interrupts further dispatch and invokes the language model with the corrective natural-language message of (e) appended to the system context;

wherein the deterministic guard module operates without invoking a language model, such that the cost of detection is bounded and independent of model latency or pricing.

**Novelty over prior art.** LangGraph's retry primitives, OpenAI's function-calling client, and Anthropic's tool-use loop all treat repetition as a side effect of unbounded iteration; the framework counts iterations, not call shapes. None fingerprint the (tool, normalized-args) pair, none distinguish the periodic-cycle pattern from identical-call repetition, and none surface a structured loop-hit record back to the model as a corrective system message. Exponential-backoff retry libraries (AWS SDK, tenacity, p-retry) are time-based, not pattern-based, and act on transport failures rather than on semantically identical successful tool calls. The claimed method detects loops that complete successfully at the transport layer but fail to advance the plan — a class of failure that prior art does not address.

---

## Independent claim 2 — intent-preserving replanner

A computer-implemented method for recovering from a failed step in a multi-step plan emitted by a language-model-driven agent, the method comprising:

(a) maintaining, for an in-flight execution, an intent record comprising at least the original natural-language query and a structured intent object emitted by an initial planning invocation, the structured intent object comprising a domain, a geographic scope, a time range, and an analysis type;

(b) maintaining an ordered list of completed step results, each completed step result comprising a tool name, a tool argument object, a status, and a result envelope, wherein steps that completed successfully are retained verbatim;

(c) responsive to a step failing, or responsive to receiving a loop-hit record from a doom-loop guard, constructing a replan prompt comprising:

  (i) the intent record of (a),

  (ii) the original ordered step list with the failing step explicitly marked,

  (iii) a structured failure diagnosis comprising the tool name of the failing step, the tool argument object, the status, the error string, and a truncated result preview, and

  (iv) when the trigger is a loop-hit record, the corrective natural-language message of claim 1(e);

(d) invoking the language model with the replan prompt of (c) constrained to emit a JSON object validated against a plan schema, the schema requiring a one-sentence diagnosis field and a corrected step list;

(e) splicing the corrected step list into the in-flight execution such that the prior completed step results of (b) are preserved and only steps from the failing index onward are replaced;

(f) resuming dispatch from the spliced index;

wherein the language model is re-prompted with the original intent rather than restarted from the user query alone, such that the corrective continuation plan inherits the constraints, scope, and prior progress of the original plan.

**Novelty over prior art.** OpenAI function-calling, Anthropic tool-use, and LangGraph all support retry, but on retry they re-emit a tool call inside the same conversation context — they do not invoke a separate planning function with a structured failure diagnosis. ReAct-style agents append the error to the scratchpad and let the next step react, which is unstructured and frequently re-emits the failing call. Plan-and-execute frameworks (BabyAGI, AutoGPT) discard the prior plan on failure and start over, losing prior step results. The claimed method is distinct in three respects: the failure is presented to the model as a structured diagnosis rather than as a chat turn; the original intent is re-supplied verbatim so the corrective plan cannot drift; and prior completed step results are preserved and spliced rather than re-executed.

---

## Dependent claims

3. The method of claim 1, wherein the bounded ordered history of (c) is implemented as a streaming guard maintaining state across invocations, and a stateless detection function is additionally provided that operates on a complete tool history without retained state and produces equivalent loop-hit records, such that detection is reproducible from a stored execution trace.

4. The method of claim 1, wherein the periodic-cycle predicate of (d)(ii) is evaluated for window lengths W in the closed range two to five inclusive, and is suppressed when the window contains only a single distinct fingerprint, such that identical-call patterns are reported only by the predicate of (d)(i).

5. The method of claim 1, wherein the corrective natural-language message of (e) is parameterized by the kind label and includes a human-readable description of the repeating pattern, such that the language model receives an explanation of why it was interrupted in addition to the instruction to take a different approach.

6. The method of claim 2, wherein the structured failure diagnosis of (c)(iii) further comprises a truncated serialization of the result field bounded to a configured byte budget, such that large result payloads do not exhaust the model context window during replan.

7. The method of claim 2, further comprising a maximum replan attempt counter, wherein on exceeding the counter the agent emits a terminal envelope comprising the synthesized partial results and a status indicating that the plan was not completed, rather than entering an unbounded replan loop.

8. The method of claim 2, wherein the corrected step list of (d) is constrained by the plan schema to terminate in a citation tool drawn from the closed tool enumeration, such that no recovery path can produce a final answer without an attribution record.

9. The method of claim 2, wherein the replan prompt of (c) is augmented with a per-step rationale string from the original plan, such that the corrective continuation plan can refer to and preserve the reasoning of completed steps when constructing replacement steps.

10. The method of claim 1, in combination with the method of claim 2, wherein a loop-hit record from claim 1(e) is routed into the replan prompt construction of claim 2(c)(iv), such that pattern-based loop detection and intent-preserving replanning are composed in a single recovery procedure that handles both explicit step failure and silent non-progression.

---

## Reduction to practice

The claimed methods are implemented in TypeScript and Python in the open-source TXLookup repository. The streaming guard of claim 1 is `DoomLoopGuard` in `app/lib/doomLoop.ts` (lines 96–118), wrapping the fingerprint function (lines 22–33), the identical-call predicate `checkIdentical` (lines 50–62), and the periodic-cycle predicate `checkSequence` (lines 64–94). The stateless detector of claim 3 is exported as `detect` (lines 120–125). The corrective system message of claim 1(e) is constructed via `buildHit` (lines 35–48) using the prompt template `CORRECTIVE_SYSTEM_PROMPT` (lines 8–12). A behaviorally equivalent Python implementation is in `agent/doom_loop.py`.

The intent-preserving replanner of claim 2 is `replan` in `app/lib/agent.ts` (lines 234–270). The replan prompt of claim 2(c) is constructed by `buildReplanPrompt` (lines 105–173), which takes the intent record, the original step list, the failed-step index, the failure envelope, and the prior completed step results. The structured failure diagnosis of claim 2(c)(iii) is produced by `summarizePriorStep` (lines 88–103). The plan-schema validation of claim 2(d) is enforced via the OpenAI `response_format: { type: "json_object" }` parameter (line 261) and a runtime shape check on the parsed plan (lines 265–268). The composition of claim 10 is performed at the call site in `app/api/agent/route.ts`, where a loop-hit record from `DoomLoopGuard.observe` is forwarded as the `correctiveSystem` argument to `replan` (line 255 of `agent.ts`).

The configurable bounds of claim 1(c) and claim 7 — history length M, identical-call threshold K, cycle window range W, repeat threshold R, replan attempt counter — are exposed as runtime constants and are unit-tested against synthetic histories in `tests/doom_loop_test.ts` and `tests/replan_integration_test.ts`.

The MIT-licensed source, a public live deployment at https://txlookup.vercel.app, and end-to-end execution traces in `docs/how-it-works.md` are provided as evidence of reduction to practice as of the filing date.

---

## What is not claimed

The language model itself, the Socrata SODA API, the Model Context Protocol transport, the underlying OpenAI or Anthropic SDKs, and the public datasets queried by the agent are not claimed. The general concept of an LLM-driven agent, retrieval-augmented generation, retry-on-failure, and structured-output function-calling are not claimed. What is claimed is the specific composition of pattern-based fingerprint loop detection (claim 1), intent-preserving structured-failure replanning (claim 2), and their integrated recovery procedure (claim 10), as reduced to practice in the cited source.

---

## Inventors

- Ravinder Jilkapally (jravinder, GitHub) — agent loop, replanner, observatory.
- Kunal Vyas (promptkv, GitHub) — dataset onboarding, catalog correctness.
- Godwyn James (goodguygoddy, GitHub) — doom-loop wiring, instrumentation.
- Raj Akula (rajakula1, GitHub) — external-runtime validation, MCP integration.

Built at the AITX Community x Codex Hackathon, May 8–10, 2026.

---

## Filing checklist

- [ ] Submit this document at https://deepinvent.ai.
- [ ] Attach link to public repository (https://github.com/ATX-TXLookup/TXLookup).
- [ ] Attach link to live deployment.
- [ ] List inventors with email addresses.
- [ ] Confirm willingness to file provisional through DeepInvent.
- [ ] Confirm MIT license does not preclude provisional filing on the method.
