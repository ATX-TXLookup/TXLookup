# Event — AITX Community x Codex Hackathon

> Source of truth for event details. Update this file instead of re-downloading from Notion.

## Logistics

- **Event:** AITX Community x Codex Hackathon
- **Dates:** Friday May 8 – Sunday May 10, 2026
- **Venue:** Antler VC, Austin TX
- **Tracks we're entering:** Agents Track + Brainforge / Vicinity Texas Open Data Track
- **Bounty we're chasing:** Miro MCP Integration ($500)

## Timeline

| When | What |
|---|---|
| **Fri May 8, 5:00 PM** | Doors open, kickoff |
| **Fri May 8, 7:30 PM** | Hacking begins |
| **Sat May 9 (all day)** | Build day |
| **Sun May 10 (morning)** | Demos & judging |
| **Sun May 10 (TBD)** | Submission form due — **find the form by Sat noon** |

## Track 1 — Agents Track

> "Build Autonomous AI Agents."

**The ask:** AI systems that can reason, plan, use tools, and complete meaningful tasks with minimal human intervention. Beyond a chatbot or LLM wrapper.

**Judging signals:**
- Take a goal, break it into steps
- Interact with external systems
- Make decisions
- Recover from errors
- Produce useful outputs

**Strong submissions show:**
- What the agent can do
- What tools or data sources it can access
- How it decides what actions to take
- How it handles ambiguity, failure, or changing context

**Quote from spec:** *"The best projects will feel like a real glimpse into the future of software: systems that do work, not just answer questions."*

**Example project ideas (from spec):**
- Researches companies, finds decision-makers, drafts personalized outreach
- Coding agent that fixes bugs across a repo and opens a PR
- Local Austin assistant that plans errands, books reservations, optimizes a schedule
- Sales ops agent that enriches leads, updates a CRM, summarizes next steps
- Data agent that answers business questions by querying multiple internal tools ← *this is our lane*

## Track 2 — Brainforge / Vicinity Texas Open Data Track

> "Make Texas Public Data Useful."

**The ask:** Open-source tools that help people explore, understand, and interact with real Texas public data. Visual interface required.

**Judging axes (per kickoff whiteboard distillation):**
1. **Approachable** — non-technical users can use it
2. **Visual Interface** — maps, charts, tables, filters, dashboards
3. **NLI** — natural-language input
4. **Persona Driven** — built for actual people, not abstract "users"

**Constraints:**
- Public datasets only, with **clear attribution**
- Respectful use of terms of service — **no scraping behind authentication**
- **No PII / sensitive-field misuse**

### Technical requirement (one of)

Teams must deliver at least one of:

1. **Custom MCP server** with well-scoped tools for discovery, bounded query, and/or summaries
2. **Proper agent skill** with a skill document and references explaining how to use the project safely and effectively in an agent workflow

> **Teams that ship both an MCP server AND an agent skill will be especially competitive.** ← *we're shipping both*

### Approved data sources

| City / Source | URL | Notes |
|---|---|---|
| Austin | https://data.austintexas.gov/ | Socrata SODA — our primary for Step 0 |
| Dallas | https://www.dallasopendata.com/ | Socrata SODA |
| San Antonio | https://data.sanantonio.gov/ | Socrata SODA |
| Houston | https://data.houstontx.gov/ | Socrata SODA |
| Texas aggregator | https://tryopendata.ai/ | Cross-portal index |

**Step-0 dataset (full breadth validator):** Austin Issued Construction Permits — `3syk-w9eu` on `data.austintexas.gov`. ~2.34M rows, daily refresh. See `docs/plan.md`.

### Example project ideas (from spec)

- Map-based tool for housing, zoning, or permitting data
- Dashboard comparing economic indicators across counties
- Visual explorer for education / transportation / energy / infrastructure
- Civic data assistant that helps users query and summarize ← *this is our lane*
- County-by-county comparison tool
- MCP-powered Texas data server that lets agents discover, query, and summarize safely ← *also our lane*

## Judging criteria — 100 points total

| # | Axis | Question judges ask |
|---|---|---|
| 1 | **Technical Execution & Completeness** | Did you actually build a working, complex system? |
| 2 | **Partner Ecosystem & Utility** | Did you leverage the unique tools and software provided? |
| 3 | **Value & Impact** | Is the solution actually useful and valuable in the real world? |
| 4 | **Innovation & Execution** | Did you push the boundaries of what's capable with the technology? |

### How TXLookup hits each axis

**1. Technical Execution & Completeness** — Live working agent loop (Reason → Plan → Tool → Complete) with doom-loop safety. MCP server with 5 well-scoped tools. End-to-end flow from natural-language question → bounded query → cited answer + visual output. No mocked steps.

**2. Partner Ecosystem & Utility** — Codex Pro for the planner. Featherless for cheap iteration. Miro MCP for the visual output (and the $500 bounty). Socrata SODA for every TX city portal. We use what the event provides; we don't reinvent it.

**3. Value & Impact** — Three concrete personas (parent / small-business owner / journalist) with hero queries that map to real decisions. Live demo answers a question a real Austinite has on a real day, citing a real city dataset.

**4. Innovation & Execution** — Single agent crossing both tracks. Agent skill document + MCP server (the "especially competitive" combo per Open Data track). One dataset deeply exercised (Step 0 = full feature breadth on Austin permits) so adding a new dataset is config-only — judges see the depth and the multiplier.

## Bounty — Miro MCP Integration ($500)

Use Miro's MCP server to deliver visual output from the agent. Bounty is **separate from track placement** — we can win the bounty without winning the track, and vice versa.

**Strategy:** Miro is the demo wow-layer for one polished flow (probably Marcus's permit-by-zone or Jordan's district comparison). Not a primary deliverable.

## Resources we have access to

- OpenAI Codex Pro (free at the event)
- Featherless — unlimited open-source model inference
- Miro MCP — early access + the $500 bounty
- Fal.ai API key for image/video if useful

## Win conditions (per `HACKATHON.md`)

1. Live working demo — real data from a real Texas portal
2. Agent reasons about which dataset to use (not hardcoded)
3. Miro board created live during demo (bounty + wow factor)
4. Shows the value of combining agent intelligence with open data access
5. Error recovery — agent hits a bad dataset, finds an alternative, completes
6. **Both** MCP server AND agent skill shipped (per Open Data track requirement)

## Submission checklist (find this on the actual form Saturday)

- [ ] Project name + one-line description
- [ ] Track selection: Agents + Open Data
- [ ] Demo video URL (3 min max — record at 80% completion, re-record after polish)
- [ ] Live demo URL (Vercel)
- [ ] GitHub repo URL (https://github.com/ATX-TXLookup/TXLookup)
- [ ] MCP server endpoint or installation instructions
- [ ] Agent skill document path
- [ ] Team names + emails
- [ ] Bounty entry: Miro MCP

## Contact / coordination

- Repo: https://github.com/ATX-TXLookup/TXLookup
- Pinned tracking issue: TBD (creating shortly)
- Team chat: TBD
