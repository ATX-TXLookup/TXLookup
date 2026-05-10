# Demo script — 3 minutes, judging-day

> Read aloud while recording. Every line is sayable in under eight seconds.
> Italicized lines are presenter notes — pauses, eye contact cues,
> tab-switching beats. Wall-clock from "GO".
>
> Pair with `docs/demo-delivery.md` for the per-beat operational cheatsheet.

**URL on screen:** https://txlookup.vercel.app

**Setup before recording:**
- Browser at 110% zoom. No extensions visible. Status panel in frame.
- Pre-warm one marquee question with curl 30 seconds before recording.
- Second tab open at the Miro board. Third tab open at `?demo=1` for the contingency path. Fourth tab on `/api/cache-stats` for the resilience proof.

---

## 0:00 → 0:25 · The hook (25s)

> *(Homepage on screen. Look at camera.)*
>
> "Sifting through your city's data is hard. Unless you're a developer, a city official, or a reporter."
>
> *(Beat.)*
>
> "Texas publishes 6,061 datasets across 6 portals. Permits. Inspections. 311 calls. Code violations. Public. Free. Almost no normal person can use them."
>
> *(Gesture at the Motivation block — six portals · schema drift · brutal SoQL · download + sift.)*
>
> "The current path is: download a CSV, open a spreadsheet, hope you didn't miss a column."

---

## 0:25 → 0:50 · The product (25s)

> *(Pull up to hero.)*
>
> "TXLookup brings the power of agentic AI to normal users."
>
> *(Beat.)*
>
> "Think of it as Google search — but with a concierge agent guiding you. You ask in plain English. A team of OpenAI-powered specialists works for you. They pick the dataset, write the query, run it on the source-of-truth portal, and hand you a sourced answer."
>
> *(Click into a "What people ask" chip — `Restaurants near 78704 with failing inspections this year`.)*

---

## 0:50 → 1:35 · The agent in action (45s)

> *(Page renders /q. Right panel animates: status → DAG → steps → telemetry.)*
>
> "Watch the right panel. Seven specialist agents."
>
> *(Point at the DAG. Hover a node — info tooltip appears.)*
>
> "Planner picks the dataset. Data analyst writes the SoQL. Critic verifies. Reporter composes."
>
> *(Beat. The answer renders.)*
>
> "Seven seconds. One sourced answer. Citation attached — City of Austin, dataset `ecmv-9xxi`, refreshed today, exact SODA URL replayable."
>
> *(Click the purple **Open dataset** button — opens the Socrata page in a new tab. Bring back the home tab.)*
>
> "Every claim auditable. Every step replayable."

---

## 1:35 → 2:05 · How the agents coordinate (30s)

> *(Tab to /architecture, scroll to the "Why agents" section.)*
>
> "Each agent does the work you used to do by hand. Planner reads the schema and drafts the plan. Analyst computes the stats with quality flags. Reporter composes plain English. Critic catches ungrounded answers and forces a revision. Support handles disambiguation. Two background agents — scout and ingestor — grow the corpus on a six-hour cron."
>
> *(Tap the doom-loop guard line.)*
>
> "Pattern-based doom-loop guard catches cycles in code. Replan path preserves user intent across rewrites. That's the patent."

---

## 2:05 → 2:30 · The corpus grows (25s)

> *(Tab to /datasets — universe browse with 6,061 indexed.)*
>
> "Today: 11 datasets are deeply curated — full schema, locally mirrored every six hours, instant answers."
>
> *(Scroll to the "Beyond the curated" section.)*
>
> "The other six thousand are answered live: the agent reads catalog metadata, plans a query, hits the source portal, comes back."
>
> *(Beat.)*
>
> "As the data analyst agent works through more datasets, more graduate into the curated corpus. The system grows itself."

---

## 2:30 → 2:50 · It's extensible (20s)

> *(Tab to /use-as-agent.)*
>
> "TXLookup ships as an MCP server. Eight tools. Installable in Claude Code, Cursor, Codex — one command."
>
> *(Show the terminal block on screen.)*
>
> ```
> claude mcp add txlookup -- python -m mcp.server
> ```
>
> "Now your coding agent can query Texas civic data the same way ours does. Skill doc teaches any runtime when to call which tool."
>
> *(Beat.)*
>
> "Texas today. Same pipeline ingests Chicago, NYC, San Francisco — anywhere there's a Socrata or CKAN portal. Open source. Anyone can extend it."

---

## 2:50 → 3:00 · Close (10s)

> *(Tab to /about. Show team. Show GitHub link.)*
>
> "Four people. Multi-agent loop. MIT licensed. Code at github dot com slash A-T-X dash T-X-Lookup."
>
> *(End on the homepage with the search box visible. Beat. Cut.)*

---

## What you're demonstrating, mapped to the four judging axes

- **Technical (25):** working multi-agent loop · pattern-based doom-loop guard · live SSE stream · cache-resilience layer · MCP server with 8 tools
- **Partner (25):** Codex (4 LLM roles) · Miro (live demo board) · MCP transport (3 client runtimes) · Featherless fallback · Socrata + CKAN
- **Value (25):** plain-English in / sourced answer out · 11 deeply curated + 6,061 indexed · citation enforced · /chat conversational · /reports editorial
- **Innovation (25):** doom-loop pattern detection (patentable) · replan preserves intent · skill doc as cross-runtime policy · cross-dataset Heat Index report · agent-authored synthesis with grounded numbers

---

## Recovery playbook (don't break frame)

| Failure | Recovery line |
|---|---|
| `/q` stalls past 10s | Switch URL to `?demo=1`. "Same flow, fixture replay. Watch the agents fire." |
| Vercel 5xx | Switch to `demo-walkthrough.mp4`. "Here's it running 30 minutes ago." |
| OpenAI 429 | The cache-fallback in `sodaQuery` returns stale rows with a "served from local mirror" caveat. The answer still renders. |
| Question hits a non-curated dataset | "That one wasn't in our deeply-curated 11 — agent figured it out from the indexed catalog." Frame as a feature. |
| Miro board doesn't load | Skip it. End on `/about` instead. |

---

## Hard rules

- Never wait silently. If a load takes more than 10 seconds, switch to `?demo=1` and don't apologize.
- Never speak through a click. Click. Beat. Say the line.
- Don't promise live numbers. Every stat tile carries its own freshness badge.
- Don't read JSON aloud. The story is the multi-agent loop, not the network.

## After the demo

- Capture: the `?demo=1` URL with the question that fired (judges will replay).
- Capture: the Miro board URL.
- Capture: `/api/cache-stats` JSON (proves the resilience layer is real).
- Submit form: paste from `docs/hackathon-form-copy.md` field by field.
- DeepInvent: upload `docs/deepinvent-submission.md` text.
