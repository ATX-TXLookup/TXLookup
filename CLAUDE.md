# CLAUDE.md

> Context file for AI agents working in this repo.

## Project: TXLookup

Autonomous data agent for Texas/Austin open data. Combines Agents Track (Reason, Plan, Tool Use, Complete) with Open Data Track. Ingests public datasets, analyzes them with LLM-powered agents, visualizes results on Miro boards.

**Hackathon:** AITX Community x Codex Hackathon (May 8-10, 2026)
**Tracks:** Agents + Open Data (combined)
**Bounty:** Miro MCP Integration ($500)

## Quick Context

- Frontend: Next.js 14 App Router in `app/`
- Agent runtime: Python 3.11+ async in `agent/`
- MCP server: FastMCP in `mcp/`
- Prompts: Markdown system prompts in `prompts/`
- Config: Model routing in `config/models.yaml`, dataset catalog in `config/datasets.yaml`

## Architecture: Dataset → Ingest → DB → Context → UI

1. **Dataset** — TX/Austin open data portals (Socrata SODA API)
2. **Ingest** — Fetch, parse, normalize, validate
3. **DB** — Supabase (PostgreSQL) for structured storage
4. **Context** — Agents reason over data: plan queries, analyze results, identify patterns
5. **UI** — Next.js search interface + Miro boards for visual output

## Core Loop

```
Data Question → Reason → Plan → Execute (tools) → Complete (Miro board)
```

If a step fails, the agent replans from the failure point. Max 3 retries per step, 10 steps per plan.

## Coding Conventions

### Python (`agent/`, `mcp/`)
- Always `async/await` — the agent is concurrent
- Type hints on every function signature
- Pydantic models for structured data (datasets, records, plans)
- Every tool returns `{"status": "completed|failed", "result": ..., "artifacts": [...]}`
- Try/except with structured error returns — never crash the loop
- Imports at top, no inline imports except for optional deps

### TypeScript (`app/`)
- Next.js 14 App Router — use `app/` directory, not `pages/`
- React Server Components where possible
- Tailwind CSS, no CSS modules
- No `localStorage` — use React state or server state

### Both
- Commit prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- TODOs: `# TODO: Codex —` or `// TODO: Codex —`
- Never commit `.env` or API keys
- Keep the agent loop simple — complexity goes in tools, not the orchestrator

## Key Files

| File | Purpose |
|------|---------|
| `agent/main.py` | Orchestrator — the brain |
| `agent/planner.py` | LLM-powered query decomposition |
| `agent/executor.py` | Step execution with tool dispatch |
| `agent/tools/data.py` | Socrata SODA API client — primary data tool |
| `agent/tools/miro.py` | Miro board creation and population |
| `agent/tools/browser.py` | Playwright for portals without APIs |
| `mcp/server.py` | FastMCP server exposing agent + data tools |
| `prompts/*.md` | System prompts for each agent role |
| `config/datasets.yaml` | Catalog of known TX/Austin datasets |
| `app/page.tsx` | Main search/explore interface |

## Data Sources

Primary: Socrata SODA API (used by data.texas.gov, data.austintexas.gov)
```
https://data.austintexas.gov/resource/{dataset-id}.json?$where=...&$limit=1000
```

Secondary: Playwright scraping for portals without APIs (TX SOS, Comptroller)

## Environment Variables

```
OPENAI_API_KEY     — Codex / GPT-4o for reasoning
MIRO_API_TOKEN     — Miro board operations
MIRO_BOARD_ID      — Default board
SUPABASE_URL       — Data storage
SUPABASE_KEY       — Supabase anon key
FEATHERLESS_API_KEY — Open-source model inference (free)
SOCRATA_KEY_ID     — Socrata API key id (HTTP Basic auth, recommended)
SOCRATA_KEY_SECRET — Socrata API key secret (paired with KEY_ID)
```

## Running Locally

```bash
npm install && npm run dev          # Frontend on :3000
pip install -r requirements.txt     # Python deps
python agent/main.py                # Agent runtime
python mcp/server.py                # MCP server
```

## What NOT to Do

- Don't add new top-level directories without updating AGENTS.md
- Don't use synchronous I/O in the agent runtime
- Don't hardcode API keys, board IDs, or dataset IDs
- Don't skip error handling on tool calls
- Don't make the orchestrator complex — push logic to tools
- Don't store raw API responses without normalizing first

## Pre-submission protocol (mandatory before any hackathon/release submission)

**Any agent operating in this repo, before any action whose user-facing
description includes "submit", "release", "ship", "freeze", or "v1.0"
must run BOTH of these in sequence and surface findings before the user
clicks the submit button:**

1. **`scripts/pre-submission-review.md`** — fresh-agent audit of every
   claim in `docs/hackathon-form-copy.md` against the actual code +
   live deploy. Catches drift, fake numbers, broken routes,
   aspirational features, overstated capabilities. ~30 min.

2. **`scripts/scout-the-room.md`** — open-web sweep for competitor
   positioning, sponsor bounty updates, judge social posts, community
   signals. ~30 min.

These are not optional. We built and shipped TXLookup v1.0.0 without
them; the retrospective at `docs/hackathon-retrospective.md` documents
the BLOCKER findings each would have surfaced.

When the user asks to submit / release / tag / freeze, treat the two
scripts as required pre-flight steps the same way a build script
treats a compile step. Refuse to proceed without running them, or at
minimum surface every finding from both before the user confirms.
