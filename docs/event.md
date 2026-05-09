# Event — AITX Community × Codex Hackathon

> Source of truth for event details. Update this file instead of re-checking the event page.

## Logistics

- **Event:** AITX Community × Codex Hackathon
- **Dates:** Friday May 8 – Sunday May 10, 2026
- **Venue:** [Antler VC, Austin TX](https://maps.app.goo.gl/Vn4z8mWcYjdLoLna6)
- **Format:** In person
- **WhatsApp (primary comms):** https://chat.whatsapp.com/EcDliphWA7XA4QImK2drhy
- **Organizer email:** team@aitxcommunity.com
- **Tracks we're entering:** Agents Track + Brainforge / Vicinity Texas Open Data Track
- **Bounties we're chasing:** Miro MCP ($500), DeepInvent Best Patentable Hack ($500 + provisional patent)
- **Submission form:** TBD — published during the event. **Find it Saturday morning at the latest.**
- **CODE FREEZE: Sunday May 10, 11:00 AM CT** ← non-negotiable

## Detailed agenda

### Day 1 — Friday May 8

| Time | Event |
|---|---|
| 5:00 PM – 5:30 PM | Doors open + check-in |
| 5:30 PM – 7:00 PM | Kickoff: welcome + hackathon intro |
| 7:00 PM | Dinner served (pizza) |
| **7:30 PM** | **Hacking begins** |
| 8:30 PM onward | Overnight hacking |

### Day 2 — Saturday May 9

| Time | Event |
|---|---|
| 8:30 AM – 9:30 AM | Breakfast |
| 9:30 AM onward | Continue hacking |
| 12:30 PM – 2:30 PM | Lunch served |
| 12:30 PM – 1:30 PM | Lunchtime networking |
| 6:30 PM – 7:00 PM | **Progress check-in** ← demo what you have |
| 7:00 PM | Dinner served (Chipotle) |
| 7:00 PM onward | Overnight hacking |

### Day 3 — Sunday May 10

| Time | Event |
|---|---|
| 8:30 AM – 9:30 AM | Breakfast |
| **11:00 AM** | **Code freeze — submissions due** |
| 11:00 AM – 2:00 PM | Hack Fair station setup |
| 11:30 AM – 3:00 PM | Judging |
| 11:30 AM – 1:00 PM | Developer roundtables |
| 2:00 PM – 5:00 PM | Hack Fair + public voting |
| 4:00 PM – 5:00 PM | Finale: awards + winner demos |

### Working backward from 11AM Sunday

- **Sat 7:00 PM (progress check-in):** end-to-end happy path runs — one persona query → live data → cited answer. Demo is rough but real.
- **Sat midnight:** all five MCP tools land. Skill doc complete. Demo script drafted.
- **Sun 8:00 AM:** demo video recorded. Submission form filled in draft.
- **Sun 10:30 AM:** dry run #2. Final polish.
- **Sun 11:00 AM:** submit.

---

## Tracks

### Track 1 (entering) — Agents Track

> "Build Autonomous AI Agents."

AI systems that **reason, plan, use tools, and complete meaningful tasks** with minimal human intervention. Beyond a chatbot or LLM wrapper.

Strong submissions show: what the agent can do, what tools/data it can access, how it decides actions, how it handles ambiguity, failure, or changing context.

Quote from spec: *"The best projects will feel like a real glimpse into the future of software: systems that do work, not just answer questions."*

Spec example we map to: *"A data agent that answers business questions by querying multiple internal tools."*

### Track 2 (entering) — Brainforge / Vicinity Texas Open Data Track

> "Make Texas Public Data Useful."

Open-source tools that help people **explore, understand, and interact with real Texas public data** through a visual interface (maps, charts, tables, filters, dashboards, NLI, agent workflows).

**Constraints:**
- Public datasets only, with **clear attribution**
- Respectful use of TOS — **no scraping behind authentication**
- **No PII / sensitive-field misuse**

#### Technical requirement (one of)

1. **Custom MCP server** with well-scoped tools for discovery, bounded query, and/or summaries
2. **Proper agent skill** with a skill document and references explaining how to use it safely

> **Teams that ship both an MCP server AND an agent skill will be especially competitive.** ← *we're shipping both*

#### Approved data sources

| City / Source | URL | Notes |
|---|---|---|
| Austin | https://data.austintexas.gov/ | Socrata SODA — primary for Step 0 |
| Dallas | https://www.dallasopendata.com/ | Socrata SODA |
| San Antonio | https://data.sanantonio.gov/ | Socrata SODA |
| Houston | https://data.houstontx.gov/ | Socrata SODA |
| Texas aggregator | https://tryopendata.ai/ | Cross-portal index |

**Step-0 dataset (full breadth validator):** Austin Issued Construction Permits — `3syk-w9eu` on `data.austintexas.gov`. ~2.34M rows, daily refresh. See `docs/plan.md`.

### Track 3 (NOT entering, FYI) — AutoHDR Photo-to-Video Track

Photo-to-video generation pipelines. First $5K, second $2.5K, third $500. We're not entering this one — it's a different problem domain.

[AutoHDR challenge rundown (Google Doc)](https://docs.google.com/document/d/1VoEvz5WTxr6Z-W8tBWpi6sAmKtfQP2HdgHPseyy31x8/edit?tab=t.0)

---

## Judging criteria — 100 points total

| # | Axis | Question judges ask |
|---|---|---|
| 1 | **Technical Execution & Completeness** | Did you actually build a working, complex system? |
| 2 | **Partner Ecosystem & Utility** | Did you leverage the unique tools and software provided? |
| 3 | **Value & Impact** | Is the solution actually useful and valuable in the real world? |
| 4 | **Innovation & Execution** | Did you push the boundaries of what's capable with the technology? |

### How TXLookup hits each axis

**1. Technical Execution & Completeness** — Live working agent loop (Reason → Plan → Tool → Complete) with doom-loop safety. MCP server with 5 well-scoped tools. End-to-end flow: natural-language question → bounded query → cited answer + visual output. No mocked steps.

**2. Partner Ecosystem & Utility** — Codex Pro for the planner. Featherless for cheap iteration. Miro MCP for the visual output (and the $500 bounty). Apify if we need supplementary scraping (we shouldn't — Socrata covers it). We use what the event provides.

**3. Value & Impact** — Three concrete personas (parent / small-business owner / journalist) with hero queries that map to real decisions. Live demo answers a question a real Austinite has on a real day, citing a real city dataset.

**4. Innovation & Execution** — Single agent crossing both tracks. Agent skill document + MCP server (the "especially competitive" combo per Open Data track). One dataset deeply exercised (Step 0 = full feature breadth on Austin permits) so adding a new dataset is config-only — judges see depth and the multiplier.

---

## Bounties

### Miro — $500 (entering)

Use Miro's MCP server to deliver visual output from the agent. Bounty separate from track placement — we can win the bounty without placing in the track, and vice versa.

**Strategy:** Miro is the demo wow-layer for one polished flow (probably Marcus's permit-by-zone or Jordan's district comparison). Not the primary deliverable.

[Miro hackathon board](https://miro.com/app/board/uXjVHdaoUbk=/)

### DeepInvent — Best Patentable Hack ($500 + provisional patent filing) (worth submitting)

Open to any team in any track. Submit through [deepinvent.ai](https://deepinvent.ai/). Their team picks the winner.

**Why we should submit:** the agent-skill + MCP-server combo applied to civic data, with the persona-driven NLI surface, is a defensible methodology. The provisional patent is downside-free. Allocate ~30 min Saturday to the submission.

### DeepInvent — Top Science Project ($250k license, 1 year) (not eligible)

Science-only (cancer, materials science, genetics, peptide discovery, AI research). Civic data doesn't qualify.

### AutoHDR — $5K / $2.5K / $500 (not entering)

AutoHDR Photo-to-Video Track only. Not our domain.

---

## Hacker resources

### Codex (OpenAI) — $50 API credits + Codex coding agent

Redemption code for $50 in OpenAI API credits emailed at kickoff. **Must be present at kickoff** or notify an organizer.

- [Codex use cases](https://developers.openai.com/codex/use-cases)
- Recommended for our build: [Operations Optimization](https://developers.openai.com/codex/use-cases/verified-operations-workflows), [Idea to POC](https://developers.openai.com/codex/use-cases/idea-to-proof-of-concept), [Updating Documentation](https://developers.openai.com/codex/use-cases/update-documentation)

### Miro — sandbox + early MCP access

Setup steps (do before Friday):
1. Accept Miro Sandbox invite (separate email, check spam)
2. Connect OpenAI Codex account
3. Install [Miro MCP for OpenAI Codex](https://miro.com/marketplace/miro-mcp-for-openai-codex)
4. Select "AITX Community Hackathon" team
5. Restart Codex / open new session

**Pro tip:** use the same email for Miro Sandbox and Codex.

Optional prep: [intro video](https://www.youtube.com/watch?v=OYuJY1LW7JA) · [MCP overview](https://miro.com/ai/mcp/) · [developer docs](https://developers.miro.com/docs/mcp-intro)

### Featherless — unlimited free open-source model inference

See setup PDF distributed at the event. Quickstart video on Drive (link in event page).

**Use:** cheap iteration on planner + summarizer prompts; fallback if Codex API hits rate limits.

### Apify — $50 free credits

Cloud platform for web scraping + browser-based automation.

Apply at: Apify.com → Console → Billing → Special Offers → code **`AITX_CODEX_HACK`**

**Use case for us:** if any TX dataset isn't on a Socrata portal but on an HTML page (no auth required), Apify Actors are the cleanest fallback. Avoid otherwise — Socrata covers the primary need.

---

## Submission checklist

To be filled when the form is published:

- [ ] Project name + one-line description
- [ ] Track selection: Agents + Open Data
- [ ] Demo video URL (3 min max — record at 80% completion, re-record after polish)
- [ ] Live demo URL (Vercel)
- [ ] GitHub repo URL: https://github.com/ATX-TXLookup/TXLookup
- [ ] MCP server installation instructions
- [ ] Agent skill document path: `skills/txlookup/SKILL.md`
- [ ] Team names + emails
- [ ] Bounty entries: Miro MCP, DeepInvent Best Patentable Hack

---

## Sponsors

- **Codex** (OpenAI) — coding agent, headline sponsor
- **Antler** — pre-seed VC ($600K first checks), event venue
- **Miro** — visual workspace, MCP early access, $500 bounty
- **AutoHDR** — AI for real-estate listings, $8M ARR in <1yr, separate track sponsor
- **Atlassian for Startups** — collaboration tools
- **Brainforge** — embedded data + AI team, co-sponsors the Texas Open Data track
