# Multi-agent architecture

> Status: design + in-flight build. Refs #62 #63 #64 #65.

## The pivot

Today the agent loop is a single LLM playing all roles: reason, plan, dispatch, synthesize. Works for one-shot questions but doesn't compose. We're splitting it into specialists with an orchestrator on top, so:

- A reporting agent can compose a /reports page WITHOUT a human at the keyboard
- A data-analysis agent can do statistical reasoning (deltas, correlations, percentiles) the planner currently can't
- A customer-support agent can disambiguate user input + answer "what can this thing do" without burning a Codex roundtrip on every "hello"
- The orchestrator routes + maintains shared context, and the UI shows which agent is active at any moment

Miro stays in the catalog as one possible artifact target — but it's a tool, not the headline.

## The roster

```
        ┌─────────────────────────┐
        │    Orchestrator         │
        │ (existing /api/agent)   │
        │ classify → delegate     │
        └──┬───────┬─────────┬────┘
           │       │         │
   ┌───────▼─┐  ┌──▼─────┐  ┌▼──────────┐
   │ Data    │  │ Report │  │ Support   │
   │ analyst │  │ agent  │  │ agent     │
   └───┬─────┘  └────┬───┘  └────┬──────┘
       │             │            │
       │ Socrata     │ Reads      │ Catalog
       │ tools       │ run-archive│ + skill doc
       │             │ + tools    │
```

### 1. Orchestrator (`app/lib/agent.ts`, today)
Classifies intent + builds top-level plan. Plan steps now have two kinds:
- `tool_call` — direct Socrata / Miro / cite_dataset (existing)
- `delegate_to(specialist, input)` — handoff to a specialist agent (NEW)

Specialist outputs return as structured envelopes the orchestrator can splice back into the plan or hand to the synthesizer.

### 2. Data-analysis agent (`agent/specialists/data_analyst.py`)
Owns statistical reasoning. Takes `(query, datasetIds[], context)`, returns `(findings, confidence, caveats, viz_spec)`. Uses analytical SoQL: `$select=count(*), avg(...), percentile_disc(...) over (...)`, `$having`, year-over-year deltas, top-N with ties broken. Tool: `analyze_data`.

### 3. Reporting agent (`agent/specialists/reporter.py`)
Takes `(slug, findings[], template)`, returns the JSON snapshot at `data/reports/{slug}.json` with hero stats / time series / sections / viz spec / sources. Reads from the run-archive (PR #59) when adjacent insights exist. Drives `/reports/[slug]/page.tsx`. Tool: `compose_report`.

### 4. Support agent (`agent/specialists/support.py`)
Lightweight; answers TXLookup-meta questions ("what data do you have", "how does this work", "what does X mean"), disambiguates ambiguous user input ("you said South Austin — did you mean 78704 or 78745?"), suggests follow-up angles. Reads catalog + SKILL.md, no Socrata calls. Tool: `support_handoff`.

## Wire format

Every specialist returns the same envelope:

```json
{
  "agent": "data_analyst" | "reporter" | "support",
  "status": "completed" | "failed" | "needs_input",
  "result": <agent-specific JSON>,
  "confidence": 0.0..1.0,
  "caveats": ["..."],
  "tokens": { "prompt": N, "completion": N, "total": N },
  "duration_ms": N,
  "next_actions": ["follow-up question 1", ...]
}
```

This matches the existing `ToolEnvelope` so the executor doesn't need a parallel code path.

## Orchestration patterns

**Sequential handoff (A2A)** — most common. Orchestrator emits a plan with steps like `[discover_datasets, delegate_to(data_analyst, ...), delegate_to(reporter, ...), cite_dataset]`. Each specialist runs to completion before the next starts.

**Parallel fanout** — when the user asks something like "compare permits AND violations", orchestrator dispatches two `analyze_data` calls concurrently, then a synthesizer step joins.

**Loopback** — support agent may detect ambiguity and emit `status: "needs_input"` with `next_actions`, which the orchestrator surfaces to the UI as a clarification chip set rather than blindly continuing.

## UI surfacing

Right-rail Flow tab gets a new visual: each plan step is colored by which agent is executing it. Status tab gains a "Active agent" line. Telemetry tab tags each event with the responsible agent.

## What this is NOT

- Not crewAI / autogen / langgraph — we keep the deterministic dispatcher in TS/Python; LLMs propose, code disposes.
- Not autonomous goal-pursuit — every plan still terminates at `cite_dataset` and synthesizer. Specialists are scoped subroutines, not free-roaming agents.
- Not RAG — the catalog is structured tool metadata, not embeddings. Specialists know their domain because the prompt loads the right schema/vocab, not because we retrieved similar text.

## The moat angle

Multi-agent with deterministic orchestration + per-agent envelopes + provenance for every step is what most "AI data agents" can't ship. The doom-loop guard + scope validators + plan-shape rule already differentiate us; specialist envelopes with `confidence` + `caveats` + `next_actions` is the next layer of the same edge.
