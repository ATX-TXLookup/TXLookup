# Hackathon retrospective — TXLookup at AITX × Codex

> 48 hours, May 8–10, 2026, Antler VC, Austin TX. We didn't win. The winner
> was **Atlas TX** (`sbauwow/atlas-tx`, atlastexas.org). This is a candid
> retrospective so the team doesn't miss a beat next time.
>
> Read once before the next hackathon. Print the pre-flight checklist.

---

## What we set out to do

Build a multi-agent system that turns plain-English questions about Texas civic data into sourced answers. Combine Agents Track + Open Data Track. Pursue Miro MCP $500 + DeepInvent patent bounty.

## What we shipped (v1.0.0 at 10:45 AM CT, Sun May 10)

- **6,061 datasets indexed** across 6 Texas open-data portals (4 Socrata + 2 CKAN)
- **11 deeply curated** with cached rows refreshed every 6h
- **7 specialist agents** with pattern-based doom-loop guard + intent-preserving replan
- **8 MCP tools** installable in Claude Code / Cursor / Codex
- **11 web routes**: hero, ask, chat, datasets, reports (5 + cross-dataset Heat Index), sources, architecture, agents, pitch, about, install
- **Live deploy** at txlookup.vercel.app, MIT, repo public at github.com/ATX-TXLookup/TXLookup
- DeepInvent submission filed (doom-loop fingerprint + intent-preserving replan)
- Real Miro demo board generated programmatically

## Why we didn't win — the Atlas TX read

Atlas TX shipped a **product**; we shipped a **tool**. Both were technically strong. Products win demos.

| Dimension | Atlas TX | TXLookup |
|---|---|---|
| Story | Evidence workstation / OS for county evidence | Ask Texas civic data anything |
| Workflow | Investigation (watchlists, saved state, returning user) | One-shot Q&A |
| Surfaces | 3 (Web + MCP + **Android field-verification app**) | 2 (Web + MCP) |
| Physical-world tie-in | Water-testing strips, GPS-tagged photos | None |
| User persona | Investigators / journalists / operators (specific, budgets) | "Normal users" (broad, no budget) |
| Provenance model | 3 explicit evidence classes: authoritative · modeled · community | Single citation per claim |
| Vertical depth | Deep on counties × water × permits × operators | Wide across 6 portals × all topics |
| Domain | atlastexas.org | txlookup.vercel.app |
| Release discipline | v1.0.0 tagged, CHANGELOG.md | Audit log only, no tags at freeze |
| Data backing | Prisma + DB | JSON file cache |

### Three asymmetries that swung it

1. **Field verification.** Android app that touches the physical world is rare. Hardware-software combos read as moats, not features.
2. **Vertical depth over horizontal breadth.** They picked counties × water and went deep. We covered all of civic data and stayed shallow. Sharper demos beat broader ones.
3. **Investigation as the unit of work.** Watchlists that follow a county over months = returning product. Q&A = one-shot tool. The product wins.

## Where TXLookup was actually stronger

Worth keeping for v2:

- **Multi-agent observatory** — DAG / Steps / Telemetry tabs showing the live agent loop
- **Doom-loop guard + intent-preserving replan** — pattern-based, patentable, novel
- **Cross-portal indexing** — 6,061 datasets across Socrata + CKAN with two-protocol abstraction
- **Cross-dataset Heat Index** report (78704 leads composite at 73.7) — agent-composed long-form analysis from 4 datasets
- **Skill doc + MCP manifest** treatment — more rigorous than most submissions
- **Cache-resilience layer** — local JSON mirror with `cache → live → stale-cache → error` fallback chain and per-tile freshness badges

## What we'd do differently next time

### Product

1. **Pick a vertical. Drop the rest from the headline.** Don't say "all of Texas civic data." Say "permits + 311 in Austin" and go deep on it.
2. **Build a returning primitive.** Watchlists, saved investigations, email/SMS digests. Q&A doesn't bring users back.
3. **Add a physical-world primitive.** QR-code-to-mission. "Verify this restaurant" walk-by mobile flow. Citizen-reported issue upload with photo. Anything that touches the real world.
4. **Target a specific persona with budget.** Journalists, civic-tech analysts, operators. Don't target "normal users" — they have no budget and no return frequency.
5. **Three evidence classes, not one citation.** Authoritative · modeled · community. The governance model is what journalists need.
6. **Buy a domain on day 1.** `something.org` reads as product; `something.vercel.app` reads as hackathon.

### Engineering

1. **Tag v0.1 on day 1, v1.0 at freeze.** Release discipline is signal.
2. **Maintain a `CHANGELOG.md` from day 1.** Atlas TX had one; we didn't.
3. **Don't burn the upload quota.** Vercel free-tier caps at 5000 file uploads / 24h. We hit it. Pro upgrade was the only path. **Either**: (a) budget Vercel Pro from day 1 ($20), or (b) keep PR count to <20/day. Or both.
4. **Use `paths-ignore` from day 1.** Doc-only and gitignore-only commits shouldn't burn Vercel deploys.
5. **Switch auto-deploy off post-freeze.** Either go tag-only (`push:tags:["v*"]`) or workflow_dispatch-only. We burned an extra ~20 deploys post-freeze because auto-deploy was still on.
6. **Don't direct-push to main during a hackathon.** PR + auto-merge is the pattern. We mostly stuck to it, but the few direct-pushes triggered classifier reviews that ate minutes.

### Demo

1. **Record a backup video on Saturday night.** We did. It saved us mental load on Sunday morning.
2. **Pre-fire one marquee question via `curl` 30 seconds before the live demo.** Warms the Vercel function; first request after cold start is 800ms slower.
3. **Open 4 tabs**: live URL, Miro board, `?demo=1` fixture replay, `/api/cache-stats` resilience proof.
4. **`?demo=1` query-param fixture mode is insurance.** Build it. We did; never needed it. Sleep better.
5. **Mute Slack DND, phone face-down, no AirPods.** Sounds obvious. Do it anyway.

### Storytelling

1. **The hook is the problem, not the product.** "Sifting your city's data is hard unless you're a developer, journalist, or official." Open with the problem. Lead with empathy.
2. **Concierge agent framing beats Q&A framing.** "Think of Google search, but with a concierge guiding you." Concrete metaphor wins over abstract architecture.
3. **One real number, not three abstract ones.** "78704 is the only zip in the top quartile on all four dimensions" beats "we have a multi-axis composite score."
4. **Show the agent working, not just the answer.** The DAG / Steps panel was unique. Lean on it harder.
5. **Patent angle is rare. Lead with it once.** The doom-loop guard is novel. Don't bury it in slide 4.

## Pre-flight checklist for the next hackathon

Print this. Tape it to the laptop.

### Day -7 (one week before)

- [ ] Confirm team roster + roles (Builder, Designer, Comms, PR/Demo)
- [ ] Buy a domain (`projectname.org` or similar). $10. Worth it.
- [ ] Set up GitHub org with team members invited (avoid Saturday morning admin)
- [ ] Set up Vercel Pro ($20/mo). Cancel after. Worth not hitting the free-tier cap.
- [ ] Set up OpenAI / Anthropic accounts with **enough credit budget for the weekend** (budget $50-100, watch usage)
- [ ] Provision Socrata/CKAN/Miro API keys. Do this BEFORE the kickoff hour.

### Day 0 (kickoff morning)

- [ ] `git init` + first commit by 10 AM
- [ ] Scaffold via Claude Code (or whichever agent CLI you prefer). Use **subagent parallelism** — it's the productivity multiplier.
- [ ] Pick ONE vertical. Write the persona on a sticky note.
- [ ] Write a 3-sentence pitch and tape it to the laptop. Re-read every 6 hours.
- [ ] Tag `v0.0.1` at the first deploy. Future you will be grateful.
- [ ] Add `CHANGELOG.md` and a `paths-ignore` block in `.github/workflows/deploy.yml` for `docs/**`, `*.md`, `data/scout/**`, `tests/fixtures/**`.
- [ ] **Set up Vercel project + custom domain.** Don't demo a `.vercel.app` URL.

### Day 1

- [ ] First end-to-end working agent answer by Saturday noon.
- [ ] Cache layer wired by Saturday evening. Don't trust upstream public data.
- [ ] First Stitch / v0 design generation by Saturday afternoon. Get the visual language out of the way early.
- [ ] First Miro / visualization render by Saturday night.
- [ ] **Lock the pitch on Saturday night.** No new narratives Sunday morning.

### Day 2 (freeze day)

- [ ] All code work stops 2 hours before freeze. Bug fixes only.
- [ ] Record backup demo video by 9 AM (2 hours before freeze).
- [ ] Pre-fire one marquee question 30 seconds before demo to warm the function.
- [ ] **Tag `v1.0.0` at the freeze-moment commit.** Annotated tag with what shipped.
- [ ] Submit hackathon form (paste from `docs/hackathon-form-copy.md`)
- [ ] Submit DeepInvent (paste from `docs/deepinvent-submission.md`)
- [ ] Sleep.

## Tool feedback we'd file again

Real incidents from this build are at `notes/partner-feedback.md` (gitignored, kept local). Headline takeaways:

- **Anthropic / Claude Code:** Parallel subagent dispatch is the single biggest productivity multiplier. Skill doc as cross-runtime policy is the most underrated MCP primitive.
- **OpenAI / Codex:** Structured outputs parse first time. 429s with no per-route visibility are scary pre-demo.
- **Miro REST:** Dev token in 60s. Free-tier rate limits hit fast. No batch endpoint.
- **Socrata SODA:** SoQL is learnable in an hour. The undocumented `/api/catalog/v1` endpoint is the most powerful surface they have. Schema drift mid-build is the unsolved problem.
- **Stitch (Google):** 90s text-to-design is magic for v2-v5 of a screen. Token-bloat in MCP-style returns blocks agentic workflows.
- **Vercel:** Pro from day 1 if you're going to do 20+ deploys. Free tier caps at 5000 file uploads / 24h.

## Inventory of artifacts we built that we'd reuse

If we run another hackathon, grab from this repo:

- `app/components/AustinZipDotMap.tsx` — interactive zip dot map with hand-tuned centroids, hover tooltip, click-to-ask-agent
- `app/components/HeroTexasLeaflet.tsx` — Leaflet + OSM Texas portal map
- `app/lib/cache.ts` — JSON-file cache reader with `cache → live → stale → error` chain
- `app/lib/cached-stats.ts` + `app/lib/heat-index-aggregates.ts` — cached-rows-to-aggregate pattern
- `app/lib/doomLoop.ts` — pattern-based loop detector (patentable)
- `app/lib/agent.ts` — orchestrator with planner / critic / replan / delegate_to / render_to_miro dispatch
- `app/q/AgentSidebar.tsx` + `AgentDAG.tsx` — multi-agent observatory (DAG / Steps / Telemetry tabs)
- `app/reports/[slug]/AustinConstructionReport.tsx` — USAFacts-style editorial report template
- `mcp/server.py` + `mcp/manifest.json` + `smithery.yaml` — MCP server template
- `skills/txlookup/SKILL.md` — cross-runtime skill doc template
- `scripts/fetch-discovered-catalog.mjs` — Socrata + CKAN universe indexer
- `scripts/make_demo_board.py` — programmatic Miro board generator
- `.github/workflows/{deploy,dataset-scout,ingestor,watchdog}.yml` — 4 cron patterns

## The single most useful pattern from this build

**The skill doc as a cross-runtime policy.** Write one `SKILL.md` that teaches every agent runtime (Claude Code, Cursor, Codex) when to call which tool, what the bounds are, and what never to do. One file, three runtimes. We'll reuse this pattern on every multi-runtime project from now on.

## Final note

Atlas TX is a great product. Read their repo. Borrow the watchlist primitive. Borrow the three-class evidence model. Borrow the county-first navigation pattern.

We built good engineering. Next time, build a product around the engineering.

— TXLookup team, post-mortem, May 11, 2026
