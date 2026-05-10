# Hackathon submission copy — paste into the form

> AITX × Codex Hackathon · Combined tracks: Agents + Open Data
> Freeze: Sun May 10 11:00 AM CT
> Last updated: Sun May 10 (post-cache-resilience)

Drop the following blocks into the matching form fields. All copy is final — no
"TODO"s or placeholders. Read it once, paste it in.

---

## Project name
**TXLookup**

## Tagline (≤ 100 chars)
Sourced answers from Texas open civic data, in 7 seconds.

## Track(s)
Agents + Open Data (combined). Pursuing the Miro MCP $500 bounty as stretch.

## One-line description
Multi-agent MCP server over Texas/Austin Socrata open-data portals — bounded discovery, scoped queries, citation-enforced summaries.

## Short description (≤ 280 chars)
TXLookup is an autonomous agent for Texas open civic data. Type a plain-English question — "permits in 78702 last six months", "failing inspections near 78704" — and a multi-agent loop (planner / data analyst / reporter / support / critic / scout) returns a sourced answer in seconds, every claim citable.

## Long description (≤ 1500 chars)
Texas publishes millions of public records every day — building permits, food inspections, 311 calls, code complaints, traffic fatalities, franchise tax. Almost no one queries them, because hand-writing SoQL against a dozen Socrata portals is brutal.

TXLookup turns those portals into a conversational data interface. A single search box hides a six-agent loop:

- **Planner** decomposes the question into a SoQL plan
- **Data analyst** computes statistics with quality flags (null rate, top concentration, sample factor)
- **Reporter** composes the answer with cited evidence
- **Support** handles meta-questions and disambiguation
- **Critic** rejects ungrounded answers
- **Scout** runs a 6-hour cron that adds new datasets autonomously

A pattern-based **doom-loop guard** (identical-3x and `[A,B,A,B]` cycle predicates) keeps the loop from spinning. A **replan-on-failure** path preserves the original intent across plan rewrites. A **local SQLite mirror** refreshed every 6h backs the entire site, so pages render in milliseconds and survive upstream throttling — every visible stat carries a freshness badge ("Mirror · 2h ago" / "Live").

Ships AS an MCP server (installable in Claude Code, Cursor, Codex). The same loop powers the web app at https://txlookup.vercel.app, the conversational `/chat` surface, and external MCP clients.

## Live URL
https://txlookup.vercel.app

## Demo URL (for the deterministic flow)
https://txlookup.vercel.app/q?demo=1&q=Restaurants%20near%2078704%20with%20failing%20inspections%20this%20year

## Repository (public, MIT)
https://github.com/ATX-TXLookup/TXLookup

## Demo video URL
*(YouTube unlisted — paste once recorded)*

## Tech stack
Next.js 14 App Router · TypeScript · Python 3.11+ async · OpenAI Codex (planner / analyst / reporter / support synthesizer) · Featherless (fallback inference) · Socrata SODA API (data) · Miro MCP (board generation, $500 bounty) · MCP transport (stdio) · SQLite + JSON local mirror · GitHub Actions (4 crons: deploy, scout 6h, ingestor 6h, watchdog 10m) · Vercel Hobby tier

## Datasets used
**6,061 Texas civic datasets indexed across 6 portals** (catalog metadata from each portal's API — Socrata for Austin/Dallas/TX state, CKAN for San Antonio/Houston). Of those, **9 are deeply curated** for the demo (full schema knowledge, hand-picked SoQL, locally mirrored every 6h). Everything else is answered on demand — agent reads the schema live, plans a query, runs it. Not a shadow database — a smart layer over the source-of-truth portals.

Indexed totals: data.austintexas.gov (2,387) · datahub.austintexas.gov (1,333) · TX state data.texas.gov (1,051) · dallasopendata.com (1,044) · data.sanantonio.gov (163) · data.houstontx.gov (83).

The 9 deeply-curated datasets:
- `data.austintexas.gov` — building permits (3syk-w9eu), food inspections (ecmv-9xxi), code complaints (6wtj-zbtb), crime (fdj4-gpfu), traffic fatalities (y2wy-tgr5)
- `datahub.austintexas.gov` — 311 service requests (xwdj-i9he)
- `data.texas.gov` — TX franchise tax holders (9cir-efmm)
- `dallasopendata.com` — Dallas 311 (gc4d-8a49), Dallas police active calls (9fxf-t2tr)

## How we addressed the four judging axes (≤ 1500 chars)
**Technical Execution & Completeness (25 pts)** — MCP server boots clean (8 tools, `tests/test_mcp_boot.py` 3/3); doom-loop guard with pattern detection (`tests/test_doom_loop.py` 11/11 + TS port); catalog integrity passes 18/18 LIVE against Socrata; e2e against deployed `/api/agent` 3/3; auto-deploy + post-verify green on every push; SQLite + JSON cache layer with cache-fallback on 429.

**Partner Ecosystem & Utility (25 pts)** — Codex used for 4 distinct LLM roles; Miro MCP for board generation (brainstorm board live); ships AS an MCP server (`mcp/manifest.json`, `smithery.yaml`); Featherless documented fallback path; Socrata is the primary data source.

**Value & Impact (25 pts)** — 30 user-story questions fixtured; 90-question harness across 9 datasets × 10 personas; 3 hero personas documented (`docs/personas.md`); citation enforcement asserted in e2e — every answer carries portal + dataset_id + URL; pre-built dataset insights live on /datasets.

**Innovation & Execution (25 pts)** — Pattern-based doom-loop (not retry-counter); intent-preserving replan-on-failure; demo-mode fixture replay (insurance for stage demo); A2A handoff via render_to_miro; skill document as cross-runtime policy; per-step duration_ms + token usage emitted; visible "Local mirror" trust badge per stat.

## Team
- **Ravinder Jilkapally** (jravinder · jravinderreddy@gmail.com) — agent loop, replanner, observatory
- **Kunal Vyas** (promptkv) — dataset onboarding, catalog correctness
- **Godwyn James** (goodguygoddy) — doom-loop wiring, instrumentation
- **Raj Akula** (rajakula1) — external-runtime validation, MCP integration

## What was novel / patentable
A doom-loop-aware autonomous data agent with intent-preserving replan-on-failure. Specifically: pattern-based fingerprint loop detection (identical-3x AND `[A,B,A,B]` cycle predicates) + structured-failure replanning that preserves the original user intent across plan rewrites. Filed under DeepInvent — see `docs/deepinvent-submission.md`.

## Open-source / installable
Yes. MIT-licensed. Installable as an MCP server in Claude Code, Cursor, Codex. Smithery submission via `smithery.yaml` at repo root; awesome-mcp-servers PR staged. Every dataset accessible via `npx`-style flow once published to npm/PyPI (post-hackathon).

## What's next
Post-freeze: deeply curate the next ~50 highest-pageview datasets (auto-onboarding pipeline already drafted); npm package for one-line MCP install; full historical mirroring for the curated subset (move from JSON to Neon/Postgres); Miroverse template submission for the Miro $500 bonus; per-user saved searches; expand the discovery layer to all 254 Texas counties (currently just the 5 metros + state).

---

## Field-by-field paste cheatsheet

| Form field | Source above |
|---|---|
| Project name | "Project name" section |
| Tagline | "Tagline" section |
| Description / About | "Long description" section |
| Tracks | "Track(s)" section |
| Live URL | https://txlookup.vercel.app |
| Demo URL | https://txlookup.vercel.app/q?demo=1&... |
| Repository | https://github.com/ATX-TXLookup/TXLookup |
| Video | YouTube unlisted — paste once recorded |
| Tech stack | "Tech stack" section |
| Datasets | "Datasets used" section |
| Team | "Team" section |
| Bounties pursued | Miro MCP ($500), DeepInvent (Best Patentable Hack) |
