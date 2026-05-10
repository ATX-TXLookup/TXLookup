# Demo delivery — one-page cheatsheet

> Print this. Keep it open in a separate tab during the live demo. Every beat
> has a wall-clock, a click target, a hard line to say, and a recovery path.
> Pair with `docs/demo-script.md` for the full talking script.
>
> **Total: 3:00. Budget breaks at 0:15 / 0:40 / 1:30 / 2:30.**

---

## T-15 minutes · Pre-flight

| Check | Action | Pass criteria |
|---|---|---|
| Site live | `curl -sI https://txlookup.vercel.app` | HTTP 200 |
| Cache fresh | `curl -s https://txlookup.vercel.app/api/cache-stats \| jq '.cacheStats'` | `enabled:true, dataset_count:6, oldest<21600` |
| Crons green | `gh run list --workflow=deploy.yml --limit 1` | `success` |
| Demo replay path | Open `https://txlookup.vercel.app/q?demo=1&q=Restaurants%20near%2078704...` | Renders agent flow |
| Backup video | `demo-walkthrough.mp4` ready to fullscreen | mp4 plays |
| Miro board | Open https://miro.com/app/board/uXjVHV1MEmQ=/ in tab 2 | Board loads |
| Tabs open | (1) live URL, (2) Miro, (3) `?demo=1`, (4) /api/cache-stats | All loaded |
| Browser zoom | Cmd-0 then Cmd-+ ×2 | 110% |
| Keep it quiet | Slack DND on, phone face-down, AirPods removed | — |

---

## 0:00 → 0:15 · Hook (15s)

- **Tab:** homepage `https://txlookup.vercel.app`
- **Click:** none — just the homepage hero
- **Say:** "Texas publishes 6,061 public datasets across six open-data portals. Almost no one queries them — hand-writing SoQL is brutal. TXLookup turns those portals into a conversational data interface."
- **Point at:** the "**6,061 Texas datasets indexed**" line in the hero subtitle.
- **If site won't load:** flip to backup mp4, switch narration to "Here's what it looks like when it's running."

## 0:15 → 0:40 · What it does (25s)

- **Click:** a marquee chip — *"Restaurants near 78704 with failing inspections this year"*
- **Wait for:** SSE stream to fire. The `/q` page renders immediately, agent runs ~7-9s.
- **Say while it runs:** "Watch the right panel. Six specialist agents — planner, data analyst, reporter, support, critic, scout. Plain-English question goes in. Bounded SoQL plan comes out. Critic verifies. Citation attached."
- **Point at:** the **DAG tab** while it animates. Hover one node — info tooltip appears showing what that agent does.
- **If `/q` stalls past 10s:** switch URL bar to add `?demo=1` and hit return. Same flow, fixture replay. Continue narration unchanged.

## 0:40 → 1:30 · The answer (50s)

- **Show:** the synthesized answer block ("Only one restaurant in 78704...")
- **Point at:** the **VERIFIED · 9.2s · 1 cited** badge.
- **Click:** the "Open dataset" button → opens the Socrata page in a new tab. Brings back the home tab.
- **Say:** "Every claim is sourced. City of Austin, dataset `ecmv-9xxi`, refreshed today, exact SODA URL replayable. A judge can replay it."
- **Click:** the **+ NEW QUERY** button at the bottom of the right panel. Show the in-result search popping open. Type a follow-up: *"Compare to 78745."* — fires immediately, no page bounce.
- **If credentials/CORS error appears:** ignore visibly, switch to `?demo=1` tab.

## 1:30 → 2:30 · The depth (60s)

Pick **one** of the two paths below based on judge mood. Don't try both.

### Path A — for judges who want the data story
- **Tab:** `https://txlookup.vercel.app/reports/austin-construction-2026`
- **Scroll** through the multi-perspective section. Hover the heatmap (permit class × month). Hover the dot map (Austin zips). Show the cumulative YTD area chart.
- **Say:** "All four charts are computed from a 5,000-row local mirror — refreshed every 6 hours by an autonomous ingest agent. The site survives upstream throttling. Each tile carries a freshness badge: 'Mirror · 2h ago' or 'Live · just now.'"

### Path B — for judges who want the agent story
- **Tab:** `https://txlookup.vercel.app/chat`
- **Click** the starter chip *"How does the agent work?"*. Watch the support agent answer.
- **Say:** "Same multi-agent loop, conversational surface. The support specialist handles disambiguation — vague-geography questions, schema clarifications. Doesn't fire SoQL; just talks about the system."
- **Tab:** `https://txlookup.vercel.app/agents`
- **Show:** the 6 agent cards.
- **Say:** "Seven specialists. Five fire on every /q request. Two — scout and ingestor — run on a six-hour cron and grow the system in the background."

## 2:30 → 3:00 · Close (30s)

- **Tab:** Miro board (https://miro.com/app/board/uXjVHV1MEmQ=/)
- **Say:** "TXLookup ships AS an MCP server — installable in Claude Code, Cursor, Codex. The Miro tool is wired. The skill document is portable."
- **Tab:** `https://txlookup.vercel.app/about`
- **Say:** "Built by four people. MIT licensed. Code at `github.com/ATX-TXLookup/TXLookup`."
- **End on:** the homepage `+ NEW QUERY` button or the search box.

---

## Hard rules

- **Never wait silently** for a slow load. If the agent runs >10s, switch to `?demo=1` and don't apologize.
- **Never speak through a click** — make the click, beat, say the line.
- **Don't read the JSON.** If something fails at the network layer, it doesn't matter — the story is the multi-agent loop, not the network.
- **Don't promise live numbers.** Every stat tile carries its own freshness badge — let it speak.

## Fallback playbook

| Failure | Recovery |
|---|---|
| Site 5xx | Flip to `demo-walkthrough.mp4`, narrate over it. |
| Agent timeout | Add `?demo=1` to URL, continue. |
| OpenAI 429 | Same as timeout. The cache-fallback in `sodaQuery()` will surface stale rows with a "served from local mirror" caveat. |
| Wifi drop | mp4 fallback. Narration unchanged. |
| Miro doesn't load | Skip the close-tab. Just say "Miro is wired — running on demo board <number>" and end on /about. |
| Question accidentally hits a non-cached dataset | The dataset gets answered via the discovery layer — agent reads catalog metadata, plans a query, runs it. Frame it as a feature: "This wasn't in our deeply-curated 9 — agent figured it out from the indexed catalog." |

---

## After the demo

- Capture: the `?demo=1` URL with the question that fired (judges will replay).
- Capture: the Miro board URL.
- Capture: `/api/cache-stats` JSON (proves the resilience layer is real).
- Submit form: paste from `docs/hackathon-form-copy.md` field-by-field.
- DeepInvent: upload `docs/deepinvent-submission.md` to the submission portal.

## What NOT to demo

- The dataset scout cron firing. (Boring; show its output, not the cron.)
- The build / deploy pipeline. (Boring; trust the green badge.)
- Live ingestion. (We mirror; we don't real-time stream — own that framing.)
- Comparisons to specific competitors. (You don't need them. Lead with the work.)
