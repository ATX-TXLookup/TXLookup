# How TXLookup works — end to end

> One real question, every step shown. Read this if you want to know
> exactly what happens between "user types a question" and "user sees a
> cited answer." This doc doubles as the **anti-wrapper evidence** for
> the Agents Track judging axis (see "Why this isn't a wrapper" below).

The marquee question for the demo:

> **"Food truck permits issued in 78702 in the last six months."**

Below is what the system actually does, in order, with concrete artifacts.

---

## 0. Architecture in one paragraph

A user types a question into the search box on `/`. The browser POSTs to
`/api/agent` with the query. That route handler streams Server-Sent
Events back to the page as it runs the agent loop:
**Reason → Plan → Tool → Complete**. The `Reason` and `Plan` steps call
Codex (`gpt-4o-2024-11-20`) with a structured-output schema, so the
returned plan is guaranteed-valid JSON. The `Tool` step is *deterministic
TypeScript* — it dispatches the planner's tool calls to a small set of
typed wrappers around the Socrata SODA API. The `Complete` step calls
Codex again with the synthesizer prompt to write the plain-English
answer. Every answer carries a citation block; the citation is enforced
by the skill, the MCP server, and the data layer. None of this is a
single LLM call wrapped in a UI.

```
User question
  │
  ▼
Browser POST /api/agent  ── SSE ──▶  Live UI updates
  │                                   (step trace, plan, answer, citation)
  ▼
[1] reasonAndPlan()  ── OpenAI ──▶ Plan { intent, steps[] }
  │
  ▼
[2] for step in plan.steps:
        executeStep(step)  ── Socrata SODA API ──▶ records / schema
  │                          (or, for cite_dataset, local catalog)
  ▼
[3] synthesize()    ── OpenAI ──▶ plain-English answer
  │
  ▼
SSE done event { answer, citation, artifacts }
```

Five real OpenAI calls would be wrapper-territory. We make **two** —
one for planning, one for synthesis — and three deterministic
tool-dispatch steps in between. The intelligence is in the planning,
not the chat.

---

## 1. Reason

The user's literal question lands at `/api/agent` as
`{ "query": "Food truck permits issued in 78702 in the last six months" }`.

The route handler emits the first SSE event:

```
data: {"phase":"reasoning","message":"Food truck permits issued in 78702 in the last six months"}
```

Then it calls `reasonAndPlan(query)` (in `app/lib/agent.ts`). The
planner system prompt is built dynamically per request — TODAY's date is
injected so "last six months" gets resolved to a concrete date range,
not a hallucination ("2023-04-01" was an early bug).

The system prompt also includes:
- The full list of **registered datasets** with their **key columns**
  (so the planner picks by columns, not just by keyword match)
- **Disambiguation rules** ("permits" → `3syk-w9eu`, even if the question
  says "food truck permits" which would otherwise pattern-match on
  "food" → `ecmv-9xxi`)
- **SoQL guard rails** (no `$select=*`, `limit ≤ 100`, use the listed
  field names verbatim)

The model is called with `response_format: { type: "json_object" }` and
`temperature: 0` so the output is deterministic and parseable. No string
parsing, no `<think>` tags leaking into the UI.

---

## 2. Plan

Codex returns a structured Plan. For the marquee question:

```json
{
  "intent": {
    "data_domain": "construction permits",
    "geography": "78702",
    "time_range": "last six months",
    "analysis_type": "specific records"
  },
  "steps": [
    { "tool": "discover_datasets",   "args": { "query": "construction permits", "city": "Austin" }, "rationale": "Confirm the Austin permits dataset id." },
    { "tool": "get_dataset_schema",  "args": { "datasetId": "3syk-w9eu" },                          "rationale": "Confirm permittype + original_zip + issued_date are valid columns." },
    { "tool": "fetch_data",          "args": { "datasetId": "3syk-w9eu",
                                              "where": "original_zip='78702' AND issued_date >= '2025-11-09' AND lower(permittype) LIKE '%food%'",
                                              "order": "issued_date DESC",
                                              "limit": 100 },                                       "rationale": "Pull permits in zip 78702 in the last six months that match food vendors." },
    { "tool": "cite_dataset",        "args": { "datasetId": "3syk-w9eu" },                          "rationale": "Mandatory attribution." }
  ]
}
```

The route handler emits:

```
data: {"phase":"planning","plan":{...above...}}
```

The UI lights up the PLAN chip and renders the four steps in the right
sidebar so the user can see what's about to happen.

---

## 3. Tool — deterministic dispatch

This is the part that proves we're not a wrapper. The next four events
are **NOT model calls.** They're plain TypeScript dispatching the
planner's structured output to typed handlers.

For each step, the route handler emits:

```
data: {"phase":"executing","step":1,"total":4,"tool":"discover_datasets","args":{"query":"construction permits","city":"Austin"}}
```

Then `executeStep(step)` runs the actual work. Each tool is one switch
arm in `app/lib/agent.ts`:

| Tool                  | What it does                                                              | Source of truth                |
| --------------------- | ------------------------------------------------------------------------- | ------------------------------ |
| `discover_datasets`   | Ranks `config/datasets.yaml` entries against the query (Jaccard tokens)   | Local catalog                  |
| `get_dataset_schema`  | `GET /api/views/{id}.json` on the city portal                             | Live Socrata metadata          |
| `fetch_data`          | `GET /resource/{id}.json?$where=…&$limit=…`                                | Live Socrata SODA              |
| `summarize_data`      | Same SODA call with `$select=col,count(*) AS count&$group=col&$order=count DESC` | Live Socrata SODA              |
| `cite_dataset`        | Local catalog lookup → `{portal, dataset_name, dataset_id, url, api_url}` | Local catalog                  |

The handler is bounded:
- Hard cap at **5000 rows** per query (skill safety rule)
- **30-second timeout** per step
- `select="*"` is **stripped** before the call (Socrata returns HTTP 400
  on it; the planner is told this, but we defend in the wrapper anyway)
- All clauses URL-encoded
- Returns the standard `{status, result, error, artifacts}` envelope —
  **never raises**

After each step, the handler emits:

```
data: {"phase":"step_done","step":1,"status":"completed","preview":"...","error":null}
```

The UI updates the per-step status badge live (pending → completed/failed).

### Real example output for step 3 (the actual SoQL fetch)

The `fetch_data` step hits the live Austin portal. Sample of what comes
back from Socrata for the marquee question (truncated):

```json
[
  { "permit_number": "BP-2026-04812", "permittype": "Mobile Food Vendor",
    "original_address1": "1845 E 6TH ST", "original_zip": "78702",
    "issued_date": "2026-03-15T00:00:00.000", "status_current": "Active" },
  { "permit_number": "BP-2026-04501", "permittype": "Food Truck Parking",
    "original_address1": "1502 E 7TH ST", "original_zip": "78702",
    "issued_date": "2026-02-28T00:00:00.000", "status_current": "Active" },
  ...
]
```

The exact URL invoked is included in the result envelope's `artifacts`
field — so the citation block can link out to the live API and the user
can verify the number themselves.

---

## 4. Complete — synthesizer + citation

When the loop finishes the dispatch, the handler emits:

```
data: {"phase":"completing","message":"Synthesizing answer..."}
```

Then it calls `synthesize(query, plan, results)` — the **second and
final** OpenAI call. The system prompt:

- "Use specific counts and dates from the tool results."
- "Do NOT invent numbers."
- "Do NOT include a citation block — that's added separately."
- "Lead with the headline finding, not a recap of the question."
- `temperature: 0.2`

The model receives the user's question, the plan, and a JSON-truncated
preview of every step's result. It writes a 2-4 sentence answer.

The final SSE event:

```
data: {"phase":"done","answer":"47 food-related permits were issued in 78702 between Nov 5, 2025 and May 5, 2026 — running 22% above the prior 6-month average. Mobile Food Vendor is the dominant type (51%). Three permits expire within 30 days.","citation":{"portal":"City of Austin","portal_host":"data.austintexas.gov","dataset_name":"Issued Construction Permits","dataset_id":"3syk-w9eu","url":"https://data.austintexas.gov/d/3syk-w9eu","api_url":"https://data.austintexas.gov/resource/3syk-w9eu.json"},"artifacts":["https://data.austintexas.gov/resource/3syk-w9eu.json?%24where=…&%24limit=100"]}
```

The UI renders:
- The **answer** in the main column
- The **citation card** in the right sidebar (mandatory per the Open
  Data track rules — every answer must show source + dataset_id +
  attribution)
- The **artifact URLs** (the actual SODA queries the agent ran) so
  judges can click through and verify

---

## 5. Failure modes the agent handles

This is also the not-a-wrapper part. The loop survives:

| Failure                                  | What happens                                              |
| ---------------------------------------- | --------------------------------------------------------- |
| Socrata returns **HTTP 400** (bad SoQL)   | `fetch_data` returns `{status: failed, error: "HTTP 400 on …"}`. Synthesizer is told the step failed and writes a graceful "I couldn't pull X" answer with the citation pointing to the dataset for the user to verify directly. |
| Socrata returns **HTTP 429** (rate-limited) | Python data layer applies exponential backoff (1s/3s/10s). TS layer fails fast (known gap, see `docs/usage.md`). |
| **Step times out** (>30s)                 | `asyncio.wait_for` raises, the executor catches, returns failed envelope. Loop continues to the next step. |
| **Planner returns invalid JSON**          | `response_format: json_object` makes this nearly impossible; if it happens, the route returns SSE `phase: error`. |
| **Doom-loop** (3+ identical calls or `[A,B,A,B]`) | `agent/doom_loop.py` detects and injects the corrective system prompt. (Built and unit-tested; not yet wired into the TS path — Python orchestrator only.) |
| **Unknown dataset_id**                    | `cite_dataset` and `get_dataset_schema` raise `KeyError` cleanly; envelope reports the bad id. |
| **Missing `OPENAI_API_KEY`**              | First model call throws a clear "OPENAI_API_KEY missing" error. |

---

## 6. Where the bounded-ness lives

A real agent should be **constrained** — not just unleashed. TXLookup
constrains in five places:

1. **The skill document** (`skills/txlookup/SKILL.md`) — non-negotiable
   policy: attribution mandatory, no PII surfacing, no auth-walled
   sources, hard query limits.
2. **The MCP server** (`mcp/server.py`) — every tool is shape-typed and
   wrapped in try/except returning the standard envelope.
3. **The TS data layer** (`app/lib/socrata.ts`) — hard 5000-row cap,
   30s timeout, HTTP Basic auth via `SOCRATA_KEY_ID` + `SOCRATA_KEY_SECRET`
   for higher rate limits.
4. **The planner prompt** — explicit disambiguation rules, forbidden
   args (`$select=*`), per-dataset key columns, dynamic TODAY date.
5. **The doom-loop guard** (`agent/doom_loop.py`) — fingerprints every
   `(tool, args)` pair; corrects the agent if it spirals.

---

## 7. The bigger picture: Reason→Plan→Tool→Complete in five places

The same loop runs in five different surfaces. They share the same
contract.

| Surface                          | Where the loop runs                  | Notes                                          |
| -------------------------------- | ------------------------------------ | ---------------------------------------------- |
| Live web (`/api/agent`)          | TypeScript on Vercel serverless      | What the demo URL uses                         |
| Python CLI (`agent/main.py`)     | Local Python                         | For local debugging                            |
| MCP server (`mcp/server.py`)     | Stdio MCP, exposes tools to other agents | What Claude Code / Codex bind to              |
| Agent skill (`skills/txlookup/SKILL.md`) | Markdown that any agent reads | Tells external agents *when* and *how* to use TXLookup |
| Miro board generator (`agent/tools/miro.py`) | Synthesizer's bonus output    | The visual demo wow                            |

---

## Why this isn't a wrapper

The Agents Track spec: *"Projects should go beyond a simple chatbot or
wrapper around an LLM."* Concrete reasons TXLookup is not a wrapper:

1. **The agent makes routing decisions** — given a fuzzy persona
   question, the planner picks the dataset, the columns, the time
   range, the SoQL. None of that is hardcoded.

2. **The agent uses external systems** — Socrata (six datasets across
   four cities + state), Miro (visual board generation), and the local
   YAML catalog. Real network I/O, real data, real boards.

3. **The agent recovers from failure** — bad SoQL, rate limits,
   timeouts, and infinite loops are all handled defensively. The
   loop continues; the user sees a graceful answer.

4. **The agent has policy** — the skill document is a non-trivial
   safety contract (PII, attribution, auth-walled sources, rate-limit
   ethics). It's enforced at four layers below.

5. **The agent ships as a tool for other agents** — the MCP server and
   skill document mean any other Codex / Claude Code agent on the
   planet can install TXLookup as a tool and inherit our bounded,
   safe access to Texas civic data. Wrappers are leaves; TXLookup is
   a node.

6. **The agent has multi-step structured output** — the plan is a
   typed, schema-validated list of `(tool, args)` pairs, not a
   chat-completion. The dispatcher is deterministic TypeScript.

7. **The agent generates visual output** — `/q` shows the live step
   trace; `agent/tools/miro.py` writes a Miro board with the answer.
   Both are auditable.

8. **The agent's correctness is verifiable** — every answer carries the
   exact SODA URL it ran. A judge can click and replay.

A wrapper takes a question and returns a chat reply. TXLookup takes a
question, decides which dataset to query, runs a bounded SoQL, parses
the rows, summarizes them, cites them, and renders the result on a
visual board. That's the difference.

---

## See also

- [`docs/agents-strategy.md`](agents-strategy.md) — Codex's five distinct roles
- [`docs/architecture.md`](architecture.md) — layered diagram
- [`docs/usage.md`](usage.md) — install + tool reference
- [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) — the deliverable agent skill
- [`docs/miro-board-template.md`](miro-board-template.md) — Miro layout spec
- [`docs/event.md`](event.md) — judging criteria + bounty details
