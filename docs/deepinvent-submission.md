# DeepInvent — Best Patentable Hack submission

> Draft for the **DeepInvent Best Patentable Hack** bounty ($500 + provisional patent filing). Submit at https://deepinvent.ai with the contents of this file. The deepinvent team reviews submissions through their platform and selects the winner.

---

## Title

**System and method for a bounded, citation-enforcing, replanning agent for public open data — with structured doom-loop detection and an installable cross-agent policy contract**

(Working title; the deepinvent team can refine when filing.)

---

## Plain-English summary (for the deepinvent reviewers)

TXLookup is an open-source autonomous data agent for Texas civic data. What's novel — and we believe defensible as a method — is the *combination* of mechanisms that turn an LLM into a bounded, recoverable, multi-tenant tool rather than a chat wrapper:

1. A typed, structured Reason → Plan → Tool → (Replan) → Complete loop where the planner emits a JSON-schema-validated step list, the dispatcher is deterministic non-LLM code, and a replanner is invoked only when a step fails — re-prompted with the original intent, the failed step, and the failure detail.
2. A **doom-loop detector** that fingerprints every (tool, args) pair the planner emits and short-circuits into the replanner if 3+ identical consecutive calls or `[A,B,A,B]`-style cycles are detected. The replanner receives a corrective system message describing the loop pattern.
3. A **skill-document-as-policy** contract — a portable Markdown file with YAML frontmatter that any MCP-compatible agent runtime can load to inherit when/how to use TXLookup, including non-negotiable safety bounds (mandatory attribution, no PII surfacing, no auth-walled scraping, hard query caps).
4. A **multi-layer enforcement architecture** where the same safety bounds are enforced at four independent layers (skill, MCP server, data client, doom guard) so a misbehaving agent cannot escape even one of them.
5. An **agent observatory** rendering the live multi-step trace (timestamps, tool args, intermediate results, replan diagnoses, token counts, durations) as a first-class user-facing surface — making the "agent thinking" auditable in real time.

The combination is what we believe is patentable. Component 1 alone is not; component 2 alone has prior art in retry literature. The *integration* — particularly the policy-as-skill-document contract that allows the same bounded loop to be installed across any MCP-compatible agent runtime — appears novel.

---

## Problem we solve

Public open-data portals (Socrata, CKAN, custom) hold millions of civic records — building permits, food inspections, 311 calls, traffic data — but each portal has its own SQL dialect, schema, freshness cadence, and rate limits. A typical user can't write a SoQL query. A typical LLM hallucinates dataset IDs and column names.

Existing approaches:
- **Manual web search** — slow, citation-fragile.
- **A direct LLM-to-SQL chatbot** — hallucinates, doesn't recover from errors, doesn't cite, doesn't enforce safety.
- **A hand-built dashboard** — locked to one dataset, doesn't generalize.

What's missing: a *bounded autonomous agent* that picks the right dataset, runs valid queries, recovers from inevitable errors, cites every answer, and is installable as a tool by any other agent in the ecosystem.

---

## Independent claim 1 (preliminary draft)

A computer-implemented method for executing a bounded multi-step query against a heterogeneous set of public data portals, comprising:

(a) receiving, from a user, a natural-language query;

(b) generating, by a first language model invocation, a structured plan comprising
   (i) an **intent record** including a data domain, a geographic scope, a time range, an analysis type, and a plain-English "thinking" string,
   (ii) an **ordered list of steps**, each step comprising a **tool name** drawn from a closed enumeration, a **tool argument object** validated against a per-tool JSON schema, and a **rationale string**;
   wherein the plan is constrained such that the final step is a **citation tool** that produces a stable attribution record;

(c) for each step in the plan, **dispatching the tool name to a deterministic non-LLM handler** that
   (i) executes the tool against an external system, where the external system is one of: a Socrata Open Data API endpoint, a metadata-introspection endpoint, an in-memory dataset catalog, or a third-party agent system,
   (ii) returns a uniform envelope comprising a status, a result, an error, and an optional artifact list,
   (iii) emits a server-sent event indicating the start and end of the step, with a measured duration;

(d) for each emitted (tool name, tool argument) pair, **fingerprinting the pair via a hash of the tool name and a stable JSON serialization of the arguments**, recording the fingerprint in a bounded streaming history, and detecting a **looping pattern** comprising either:
   (i) three or more consecutive identical fingerprints, or
   (ii) a window-of-length-2-to-5 fingerprint sequence repeated two or more cycles in a row;

(e) **on detection of either a step failure or a looping pattern**, invoking a second language model invocation, the **replanner**, with:
   (i) the original intent record,
   (ii) the original step list with the failed step marked,
   (iii) the failure error and result, and
   (iv) when the trigger was a looping pattern, a **corrective system message** describing the looping pattern in natural language;
   the replanner emitting a new structured plan including a one-sentence diagnosis of the failure and a corrected step list, replacing all steps from the failed step onward;

(f) on completion of the step list (or after a configured maximum of replan attempts), invoking a third language model invocation, the **synthesizer**, to produce a plain-English answer constrained to use only counts and dates from the emitted tool results;

(g) **transmitting to the user**:
   (i) the synthesized answer,
   (ii) the citation record produced by the citation tool, comprising a portal label, a dataset name, a dataset identifier, a portal URL, and an API URL,
   (iii) the artifact list comprising the exact API URLs invoked during dispatch.

---

## Independent claim 2 (preliminary draft)

A computer-readable system for distributing the method of claim 1 across heterogeneous agent runtimes, comprising:

(a) a **policy document** in human-readable Markdown format with structured YAML frontmatter, the document specifying:
   (i) **trigger phrases** indicating when the method is to be invoked,
   (ii) the **closed enumeration of tool names** with their argument schemas,
   (iii) **non-negotiable safety constraints** including mandatory attribution, prohibited surfacing of personally identifiable information, prohibited access to authentication-walled sources, and hard caps on query result size and duration,
   (iv) **worked examples** demonstrating correct invocation;

(b) a **Model Context Protocol server** exposing the tool enumeration to any compliant agent runtime, the server programmatically enforcing the safety constraints from (a)(iii) at the network boundary;

(c) a **client adapter** in a runtime such that loading the policy document of (a) and connecting to the server of (b) is sufficient for that runtime to invoke the method of claim 1 without further code changes;

wherein the same policy document is loadable by at least three different agent runtimes (e.g. Claude Code, OpenAI Codex, custom orchestrators) producing equivalent bounded behavior.

---

## Dependent claims (sketch)

3. The method of claim 1, wherein the looping detection of (d) further includes a stateless "after-the-fact" detection function that operates on a complete tool history without maintaining streaming state, providing equivalent results to the streaming detector.

4. The method of claim 1, wherein the dispatcher of (c) further enforces a **hard query result limit** of N records (e.g. N=5000) by rejecting tool argument objects that specify a higher limit and by truncating server responses that exceed the limit.

5. The method of claim 1, wherein the dispatcher of (c) further enforces a **per-step timeout** by aborting the tool invocation after a configured duration and emitting a failure envelope, such that the replanner of (e) receives the timeout as a recoverable failure rather than terminating the loop.

6. The method of claim 1, wherein at least one tool of the closed enumeration in (b)(ii) is an **agent-to-agent handoff tool** that issues a network request to a second agent system (e.g. Miro REST API for visual board generation) and returns a third-party artifact URL as part of the envelope.

7. The method of claim 1, further comprising a **demo-replay mode** wherein, upon detection of a query-string parameter or request header, the dispatcher of (c) substitutes pre-recorded results for the configured marquee questions while remaining live for non-matching questions, providing deterministic stage-demo behavior without disabling the live path.

8. The system of claim 2, wherein the policy document additionally specifies **persona-driven trigger heuristics** mapping user-shape descriptors (e.g. "parent on mobile asking about my neighborhood") to preferred tool sequences (e.g. discover → fetch → cite with limit=10).

9. The system of claim 2, wherein the policy document and the MCP server are stored in the same source-controlled repository and are CI-validated such that any change to the closed tool enumeration in the server triggers a corresponding required update to the policy document.

10. The method of claim 1, wherein the user-facing surface includes an **observatory column** rendering each emitted server-sent event as a timestamped, level-tagged log entry adjacent to the synthesized answer, such that a viewer can audit every tool call, every replan, and every model invocation that produced the answer.

---

## Prior art the team is aware of (be honest with the deepinvent reviewers)

- **Retry-with-exponential-backoff** (well-known, e.g. AWS SDK). Our doom-loop detector is *not* time-based; it's pattern-based on fingerprinted (tool, args) calls.
- **OpenAI function calling / structured outputs** (well-known). We use it; what's distinctive is the closed enumeration + per-tool argument schema + replanner prompt that feeds in the original intent.
- **Retrieval-augmented generation** (RAG, well-known). RAG is one-shot retrieve-then-generate. Our system is multi-step plan-dispatch-replan with deterministic non-LLM dispatch in the middle.
- **Anthropic Model Context Protocol (MCP)** (Anthropic, public spec). We *use* MCP as the transport for cross-runtime distribution. What's novel is the policy-document contract that makes the same bounded behavior reproducible across multiple MCP-compliant runtimes via a single Markdown file.
- **Civic open-data search engines** (CKAN, Socrata Discovery, USAFacts). These are catalogs; they don't reason, plan, dispatch, or recover. They don't generate answers; they return links.

---

## Implementation we ship as evidence (filed with submission)

- Open-source repository: https://github.com/ATX-TXLookup/TXLookup (MIT)
- Live demo: https://txlookup.vercel.app (basic-auth gated during dev; will be public for judging)
- The full method as TS at `app/api/agent/route.ts` and `app/lib/agent.ts`
- The doom-loop detector at `app/lib/doomLoop.ts` (TS) and `agent/doom_loop.py` (Python — same algorithm)
- The policy document at `skills/txlookup/SKILL.md`
- The MCP server at `mcp/server.py`
- The architecture writeup at https://txlookup.vercel.app/architecture and `docs/architecture.md`
- The end-to-end live trace at `docs/how-it-works.md`

---

## Inventors

- **Ravinder Jilkapally** (jravinder, GitHub) — primary architect, agent loop, observatory
- **Kunal Vyas** (promptkv, GitHub) — data quality, dataset onboarding, catalog correctness
- **Godwyn James** (goodguygoddy, GitHub) — doom-loop wiring, token usage tracking, performance instrumentation
- **Raj Akula** (rajakula1, GitHub) — external-client validation, MCP integration testing

(Built collaboratively at the AITX Community × Codex Hackathon, May 8–10, 2026.)

---

## Filing checklist

- [ ] Submit this document at https://deepinvent.ai
- [ ] Attach link to public repo
- [ ] Attach link to live demo (after public-toggle Sunday)
- [ ] List all four inventors with email addresses
- [ ] Confirm willingness to file provisional through deepinvent
- [ ] Specify open-source license (MIT) — does NOT preclude provisional patent filing on the method

---

## What we're NOT claiming

- We are not claiming the LLM (gpt-4o, Claude, etc.) itself.
- We are not claiming Socrata's SODA API or any of the public datasets.
- We are not claiming the MCP transport spec (Anthropic's).
- We are not claiming "agent" or "RAG" as concepts.

We are claiming the specific *integration* described above as a method/system, when reduced to practice in the manner shown.
