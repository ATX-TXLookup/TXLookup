# TXLookup Build Plan — Step 0 through Demo

> Read this before picking up an issue. Updated as we go.

## North star

Win **both** tracks (Agents + Brainforge/Vicinity Open Data) with a single agent that:
1. Reasons about a Texas civic question
2. Plans a multi-step data analysis
3. Uses the TXLookup MCP server to discover, query, and summarize datasets
4. Completes by delivering a clear answer (and, for the wow demo, a Miro board)

**Required deliverables (track rules):**
- Custom MCP server with discovery / bounded query / summary tools — `mcp/`
- Agent skill document — `skills/txlookup/SKILL.md`

**Bounty deliverables:**
- Miro MCP integration for visual output ($500)
- DeepInvent submission for Best Patentable Hack ($500 + provisional patent)

**Explicit non-goal at submission:** broad multi-city coverage. We win with **depth on one dataset, breadth scoped on paper.**

---

## Step 0 — Austin Permits as the breadth validator

We pick **one dataset** and exercise *every* feature against it. If the full agent loop works on Austin building permits, every other dataset is a config-file change.

**Dataset:** Austin Issued Construction Permits — `3syk-w9eu` on `data.austintexas.gov`. ~2.34M rows, daily refresh, well-documented schema, no PII concerns.

### What "breadth on one dataset" means

Every layer of the architecture exercised against permits:

| Layer | Exercised by |
|---|---|
| **Discovery** | "find me the right permits dataset" → `discover()` returns this one, ranked first |
| **Schema introspection** | `describe()` returns columns, sample rows, freshness |
| **Bounded query** | `query(where, select, limit)` with SODA filters |
| **Aggregation/summary** | `summarize(dimensions=[...])` for top-N, group-by counts |
| **Citation** | `cite()` returns portal URL + dataset attribution |
| **Agent reasoning** | Planner picks dataset given a fuzzy persona query |
| **Tool dispatch** | Executor invokes the right MCP tool sequence |
| **Doom-loop safety** | If the agent keeps calling the same query, the loop guard kicks in |
| **Visualization** | Miro board with frames, color-coded stickies, summary card |
| **NLI surface** | Web UI where Sarah/Marcus/Jordan ask in plain English |
| **Persona-driven UX** | Map for Sarah, saved-filter for Marcus, district chart for Jordan |
| **Citation in output** | Every answer carries portal source + freshness |

### Step 0 success criteria
- All three persona hero queries (one per persona) run end-to-end on permits
- Miro board renders for the most visual one (probably Marcus's permit-by-zone)
- The MCP server passes its smoke test against the live Socrata endpoint
- The skill document gets validated by an outside agent (Codex or another Claude session) successfully completing one of the queries from the skill spec alone

---

## Step 1 — Scope the next datasets (no code, just prove it scales)

Once Step 0 is green, we *register* (not implement) the next datasets:

- Austin: food inspections, 311, code violations
- Dallas: one flagship dataset
- San Antonio: one flagship dataset
- Houston: one flagship dataset

"Register" = add to `config/datasets.yaml` with `id`, `key_columns`, `updated` cadence. The MCP server picks them up on reload. We *don't* build new tools per dataset — that's the win condition.

We confirm the skill works on the new datasets with one smoke query each, then leave them as "supported, not featured."

---

## Step 2 — Demo polish

- Pre-cache demo results (Socrata API can have latency spikes)
- Record the demo video at 80% completion, re-record once polished
- Strip model internals from UI (no `<think>` tags, no JSON dumps)
- Submission form discovered + filled by Saturday noon
- Live demo URL on Vercel with auto-deploy from main

---

## Working backward from Sun 11:00 AM code freeze

| Deadline | Required state |
|---|---|
| **Sat 7:00 PM** (progress check-in) | End-to-end happy path: one persona query → live data → cited answer. Demo is rough but real. |
| **Sat midnight** | All five MCP tools land. Skill doc complete. Demo script drafted. |
| **Sun 8:00 AM** | Demo video recorded. Submission form filled in draft. |
| **Sun 10:30 AM** | Dry run #2. Final polish. |
| **Sun 11:00 AM** | Submit. |

---

## Architecture (whiteboard, codified)

See `docs/architecture.md` for the diagram + layer responsibilities.

Highlights:
- **Models** is its own layer (LLM provider routing — Codex / Featherless / local)
- **MCP** is a peer of Agents and APIs, not a child of Agents
- **DB** is optional for v1 — go direct portal-to-agent live, no caching
- Caching kicks in at Step 1 once we want repeat-query speed

---

## Coordination

See `CONTRIBUTING.md` for the rules. Short version:
- Pick an issue, comment to claim it
- Branch + PR, no direct push to `main`
- One person owns the merge button
- Daily stand-up via the pinned tracking issue
- Lessons-learned go in `docs/lessons.md` (captured live, not retro'd at the end)

## Open questions for the team

1. Are we using Supabase, or going direct portal-to-agent for v1?
2. Who owns the Miro board template — manual layout, or agent-generated from scratch?
3. Demo machine: laptop or pre-deployed Vercel? (Don't depend on local laptop on demo day.)
4. Voice input for Sarah's persona — or text-only for v1?
5. Do we submit DeepInvent's Best Patentable Hack? (~30 min Saturday, downside-free.)
