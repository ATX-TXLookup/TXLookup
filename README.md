# TXLookup — Open Data Agents for Texas

**AITX Community × Codex Hackathon | May 8-10, 2026 | Antler VC, Austin TX**

**Tracks:** Agents + Brainforge / Vicinity Texas Open Data
**Bounties:** Miro MCP ($500), DeepInvent Best Patentable Hack ($500 + provisional patent)

## Joining the build (5-minute version)

1. Make sure you have org write access to `ATX-TXLookup` (ping Ravinder with your GH handle if not)
2. Read [`docs/setup.md`](docs/setup.md) — clone, env, smoke test (~20 min)
3. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) — how we coordinate (issues, branches, PRs)
4. Pick your first issue: `gh issue list --repo ATX-TXLookup/TXLookup --label ready --label priority:p0`
5. Join WhatsApp: https://chat.whatsapp.com/EcDliphWA7XA4QImK2drhy
6. Track via the pinned 📌 Demo Tracker issue

**Code freeze: Sunday May 10, 11:00 AM CT.** Working backward from that — see [`docs/plan.md`](docs/plan.md).

## What It Does

TXLookup connects autonomous agents to Texas and Austin open data portals. Point it at any public dataset — permits, inspections, business filings, census data, 311 calls, transit routes — and the agent ingests, analyzes, and visualizes what it finds on Miro boards.

It doesn't just answer questions. It reasons about data, plans multi-step analyses, uses tools to query and transform datasets, and delivers finished visual outputs.

### Example Flows
- "Show me all restaurant health inspections in 78701 that failed in the last 6 months"
- "Compare Austin building permit trends across zip codes and map the hotspots on Miro"
- "Pull the latest 311 complaint data, categorize by type, and show me the top issues by neighborhood"
- "Find which Austin startups filed with the TX Secretary of State this quarter"

## Architecture (from whiteboard)

```
┌─────────────────────────────────────────┐
│               Dataset                    │
│   (Texas Open Data, Austin Data Portal,  │
│    data.texas.gov, Socrata APIs)         │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│              Ingest                      │
│   (Fetch, parse, normalize, validate)    │
└─────────────┬───────────────────────────┘
              │
┌─────────────▼───────────────────────────┐
│                DB                        │
│     (Supabase — structured storage)      │
└─────────┬──────────┬────────────────────┘
          │          │
┌─────────▼──┐ ┌────▼─────┐ ┌───────────┐
│   Agents   │ │   APIs   │ │    MCP    │
│  (Context) │ │          │ │  Servers  │
│            │ │ - Socrata│ │           │
│ - Planner  │ │ - Search │ │ - Miro    │
│ - Analyst  │ │ - LLM    │ │ - Data    │
│ - Browser  │ │ - Geo    │ │ - Tools   │
└─────────┬──┘ └────┬─────┘ └─────┬─────┘
          │          │             │
┌─────────▼──────────▼─────────────▼──────┐
│                  UI                      │
│   (Next.js — search, explore, results)   │
│   (Miro — visual data boards)            │
└─────────────────────────────────────────┘
```

## Core Loop: Reason → Plan → Tool Use → Complete

1. **Reason** — Agent receives a data question, identifies which datasets and sources are relevant
2. **Plan** — Breaks the analysis into ordered steps: fetch data, filter, aggregate, compare, visualize
3. **Tool Use** — Executes each step: Socrata API queries, data transforms, Miro board creation
4. **Complete** — Delivers a finished Miro board with organized findings + text summary

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Next.js 14, React, Tailwind CSS |
| **Agent Engine** | Python 3.11+, OpenAI Codex / GPT-4o |
| **Data Sources** | data.texas.gov, data.austintexas.gov (Socrata SODA API) |
| **Data Ingestion** | httpx, pandas, Socrata API client |
| **Database** | Supabase (PostgreSQL) |
| **MCP Server** | FastMCP — exposes agent + data tools |
| **Visualization** | Miro MCP — boards, frames, stickies, cards |
| **Browser** | Playwright (for data portals without APIs) |

## Open Data Sources

| Source | URL | API |
|--------|-----|-----|
| Texas Open Data | data.texas.gov | Socrata SODA |
| Austin Open Data | data.austintexas.gov | Socrata SODA |
| TX Secretary of State | sos.state.tx.us | Web scraping |
| TX Comptroller | comptroller.texas.gov | CSV/Excel downloads |
| US Census (TX) | data.census.gov | Census API |

### Socrata SODA API
Most Texas/Austin open data portals run on Socrata. Query any dataset with SQL-like syntax:
```
https://data.austintexas.gov/resource/{dataset-id}.json?$where=zip_code='78701'&$limit=1000
```

## Quick Start

```bash
git clone https://github.com/ATX-TXLookup/TXLookup.git
cd TXLookup

# Frontend
npm install
cp .env.example .env
npm run dev

# Agent runtime
pip install -r requirements.txt
python agent/main.py

# MCP server
python mcp/server.py
```

## Judging Criteria

| Criteria | How We Hit It |
|----------|--------------|
| **Reason** | Agent parses data questions, identifies relevant TX/Austin datasets |
| **Plan** | Decomposes into data fetch → transform → analyze → visualize steps |
| **Tool Use** | Socrata API, Playwright scraping, pandas transforms, Miro MCP |
| **Complete** | Delivers organized Miro board with frames, color-coded findings, summary |

## Contributing

Both humans and AI agents contribute to this repo. See:
- [`AGENTS.md`](AGENTS.md) — Instructions for AI coding agents (Codex, Cursor, etc.)
- [`CLAUDE.md`](CLAUDE.md) — Additional agent context
- [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) — PR template
- [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) — Issue templates

## Team

Built at the AITX Community x Codex Hackathon, May 8-10, 2026.
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how the team coordinates work.

## License

MIT
