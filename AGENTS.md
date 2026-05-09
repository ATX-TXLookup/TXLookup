# AGENTS.md — Instructions for AI Coding Agents

> This file is read by OpenAI Codex, Cursor, and other AI agents.
> It defines how agents should work in this repo alongside human contributors.

## Project: TXLookup

TXLookup is an autonomous data agent that connects to Texas and Austin open data portals, ingests public datasets, reasons about the data, and delivers visual analysis on Miro boards. Built at the AITX Community x Codex Hackathon (May 8-10, 2026).

**Tracks:** Agents Track + Open Data Track (combined)
**Bounty:** Miro MCP Integration ($500)

## Architecture

```
Dataset → Ingest → DB → Context (Agents) → UI (Next.js + Miro)
                          │
             ┌────────────┼────────────┐
             │            │            │
        Data Tool    Miro MCP     Browser Tool
       (Socrata)    (FastMCP)    (Playwright)
```

### Core Loop: Reason → Plan → Tool Use → Complete

1. **Reason** — Parse the user's data question, identify relevant datasets and sources
2. **Plan** — Decompose into ordered steps: fetch, filter, aggregate, compare, visualize
3. **Execute** — Run each step using the appropriate tool (Socrata API, pandas, Miro)
4. **Complete** — Deliver a Miro board with organized findings + text summary

## Directory Structure

```
TXLookup/
├── AGENTS.md              # THIS FILE — agent instructions
├── README.md              # Human-readable project overview
├── HACKATHON.md           # Hackathon battle plan & demo script
├── app/                   # Next.js 14 frontend (App Router)
│   ├── page.tsx           # Main search/explore interface
│   ├── layout.tsx         # App layout with metadata
│   └── api/               # API routes
│       └── agent/route.ts # POST endpoint for data queries
├── agent/                 # Python agent runtime
│   ├── main.py            # Orchestrator — Reason→Plan→Execute→Complete
│   ├── planner.py         # LLM-powered query decomposition
│   ├── executor.py        # Step execution with tool dispatch
│   ├── tools/             # Tool implementations
│   │   ├── __init__.py
│   │   ├── data.py        # Open data ingestion (Socrata SODA API)
│   │   ├── browser.py     # Playwright for portals without APIs
│   │   ├── search.py      # Web search for supplementary info
│   │   ├── writer.py      # Content generation (summaries, reports)
│   │   └── miro.py        # Miro board operations
│   └── memory.py          # Task state, context, history
├── mcp/                   # MCP server (FastMCP)
│   ├── server.py          # MCP tool definitions
│   └── tools.py           # Shared tool logic
├── prompts/               # System prompts for each agent role
│   ├── planner.md         # Planning agent prompt
│   ├── executor.md        # Execution agent prompt
│   ├── data.md            # Data ingestion/analysis prompt
│   ├── browser.md         # Browser automation prompt
│   └── miro.md            # Miro layout agent prompt
├── config/
│   ├── models.yaml        # Model routing configuration
│   └── datasets.yaml      # Known TX/Austin dataset catalog
├── docs/                  # Additional documentation
│   └── miro-integration.md
├── .github/               # GitHub collaboration templates
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
├── package.json
├── requirements.txt
├── .env.example
└── .gitignore
```

## Coding Standards

### Python (agent/, mcp/)
- Python 3.11+
- Async/await everywhere — the agent is concurrent
- Type hints on all function signatures
- Pydantic models for structured data (datasets, query results, plans)
- Every tool function must return a dict with `status`, `result`, and optional `artifacts`
- Error handling: try/except with structured error returns, never crash the loop

### TypeScript (app/)
- Next.js 14 App Router conventions
- React Server Components where possible
- Tailwind CSS for styling
- No `localStorage` — use React state or server state

### General
- Commit messages: `feat:`, `fix:`, `docs:`, `refactor:` prefixes
- One feature per PR, linked to an issue
- All TODOs are marked with `# TODO: Codex —` or `// TODO: Codex —`
- Never commit `.env` files or API keys

## Open Data Sources

### Primary: Socrata SODA API
Most TX/Austin portals use Socrata. Query pattern:
```
GET https://data.austintexas.gov/resource/{dataset-id}.json
?$where=column='value'
&$select=col1,col2,count(*)
&$group=col1
&$order=count DESC
&$limit=1000
```

### Known Portals
| Portal | Base URL | Example Datasets |
|--------|----------|-----------------|
| Austin Open Data | data.austintexas.gov | Permits, 311, inspections, code violations |
| Texas Open Data | data.texas.gov | State agencies, licensing, comptroller data |
| TX Comptroller | comptroller.texas.gov | Tax data, revenue, economic indicators |
| US Census (TX) | data.census.gov | Demographics, housing, business patterns |

## How to Contribute (for agents)

1. **Read this file first** — understand the architecture before writing code
2. **Check existing issues** — pick one labeled `good-first-issue` or `agent-task` (use the `pickup-next` skill in `.claude/skills/`)
3. **Work in your own git worktree** — see "Working in isolation" below. Required.
4. **Create a branch** — `feat/issue-N-short-slug` or `fix/issue-N-short-slug`
5. **Maintain a `log.md` in your worktree** — see "Logging convention" below. Required.
6. **Implement with tests** — at minimum, the happy path should work
7. **Update the GitHub issue as you go** — use the `update-issue` skill in `.claude/skills/`
8. **Open a PR** — use the PR template, reference the issue with `Closes #N`
9. **Keep changes focused** — don't refactor unrelated code in the same PR

## Working in isolation (REQUIRED for local AI agents)

Local AI agents (Claude Code, Codex, Cursor running on a teammate's machine) **must work in a dedicated git worktree** — not in the shared checkout. This prevents the parallel-push trap (one of the documented hackathon-killer pitfalls — see `docs/lessons.md`).

### Setting up a worktree

```bash
# From the main repo checkout:
ISSUE=42                         # the issue number you claimed
SLUG=discover-tool               # short, hyphenated
git fetch origin
git worktree add ../TXLookup-issue-${ISSUE}-${SLUG} -b feat/issue-${ISSUE}-${SLUG} origin/main
cd ../TXLookup-issue-${ISSUE}-${SLUG}
```

You now have a clean, isolated working directory at `../TXLookup-issue-42-discover-tool/` on a fresh branch. Build there. Push from there. Open the PR from there.

### Cleaning up after merge

```bash
cd /path/to/main/checkout
git worktree remove ../TXLookup-issue-${ISSUE}-${SLUG}
git fetch --prune
```

### Why
- No accidental commits to `main`
- No fighting another agent for `git pull` / `git push` on the same checkout
- The orchestrator can spawn N parallel agents on N different issues without coordination overhead

## Logging convention (REQUIRED for local AI agents)

Every agent working on an issue **must maintain a `log.md` in the root of its worktree**, tracking what it did and what it learned. This is *not* committed to the repo (it's in `.gitignore`) — it's the agent's working memory and the human's audit trail.

### Format

```markdown
# Agent log — issue #42 (discover() tool)

Agent: claude-code (or codex, cursor)
Worktree: ../TXLookup-issue-42-discover-tool
Started: 2026-05-09 14:12

## Plan
- [ ] Read existing catalog loader in agent/tools/data.py
- [ ] Implement discover() with NL → ranked candidates
- [ ] Add unit test against permits + 311
- [ ] Wire into MCP server.py
- [ ] Update SKILL.md examples if signature changed

## Log

### 2026-05-09 14:18 — exploration
Read agent/tools/data.py and config/datasets.yaml. Catalog loader returns
flat dict; need to wrap with NL match. Considering simple keyword + Jaccard
score for v1, embedding-based for v2.

### 2026-05-09 14:35 — decision
Going with keyword + Jaccard. Embeddings would need a model dependency we
haven't picked yet — punted to a follow-up issue.

### 2026-05-09 15:02 — progress
discover() returns ranked list. Tested locally: "Austin permits" → 3syk-w9eu
top, "311" → i26j-ai4z top. Posting progress comment to issue.

### 2026-05-09 15:40 — blocker
Need to confirm with team: should discover() also accept a `city:` filter?
Current sig only takes query string. Asked in tracking issue.
```

### When to log

- **At start**: write the plan (3-7 bullets)
- **At meaningful decisions**: which library, which approach, which trade-off
- **At every ~20 minutes** of active work: short progress note
- **When blocked**: what's blocking, who can unblock
- **When resuming after a pause**: catch yourself up by re-reading the log
- **At PR open**: final summary that becomes the PR body

### Mirror to GitHub

Every blocker, every decision worth remembering, and every "done" event also gets a comment on the GitHub issue (use the `update-issue` skill). The `log.md` is for *you*; the issue comment is for the *team*.

### Why
- Survives context resets — you can re-read your own log after a compaction
- Lets a human pick up where you left off if you crash
- Makes post-mortems trivial — the log already wrote itself

## How to Contribute (for humans)

1. Open an issue describing what you want to build or fix
2. Label it: `agent-task` if Codex should do it, `human` if you'll do it
3. Assign yourself or leave unassigned for anyone to pick up
4. Use the PR template when submitting
5. Review agent-generated PRs before merging

## Tool Implementation Pattern

```python
from typing import Dict, Any

async def tool_name(param1: str, param2: int = 0) -> Dict[str, Any]:
    """
    Clear description of what this tool does.

    Args:
        param1: What this parameter controls
        param2: Optional parameter with default

    Returns:
        Dict with status, result, and optional artifacts
    """
    try:
        result = await do_the_thing(param1, param2)
        return {
            "status": "completed",
            "result": result,
            "artifacts": []  # URLs, file paths, board IDs, dataset IDs
        }
    except Exception as e:
        return {
            "status": "failed",
            "error": str(e),
            "result": None
        }
```

## Data Ingestion Pattern

```python
async def fetch_dataset(portal: str, dataset_id: str, query: dict) -> Dict[str, Any]:
    """
    Fetch data from a Socrata open data portal.

    Args:
        portal: Base URL (e.g., 'data.austintexas.gov')
        dataset_id: Socrata dataset identifier (e.g., 'abcd-1234')
        query: SODA query params ($where, $select, $group, $order, $limit)

    Returns:
        Dict with status, result (list of records), and metadata
    """
    try:
        url = f"https://{portal}/resource/{dataset_id}.json"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=query, timeout=30)
            resp.raise_for_status()
            records = resp.json()
        return {
            "status": "completed",
            "result": {"records": records, "count": len(records)},
            "artifacts": [url]
        }
    except Exception as e:
        return {"status": "failed", "error": str(e), "result": None}
```

## Reference Repos

These sibling repos have working code to reference:
- `../studypal/` — WebSocket, Playwright browser automation
- `../homenest/mcp_server.py` — FastMCP server (working example)
- `../job_copilot/` — LiteLLM multi-model routing, agentic search
- `../ml-intern/` — Agentic loop with doom loop detection
- `../hd-research-agent/` — Multi-agent autonomous research system

## Priority Build Order

1. Data ingestion tool — Socrata SODA API client for TX/Austin open data
2. Python agent orchestrator with planner + executor loop
3. Miro MCP integration — visualize data findings on boards
4. Browser tool (Playwright) for portals without APIs
5. FastMCP server exposing agent + data capabilities
6. Next.js frontend — search interface, dataset explorer, results display
7. End-to-end demo: data question → fetch → analyze → Miro board
