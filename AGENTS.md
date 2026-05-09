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
2. **Check existing issues** — pick one labeled `good-first-issue` or `agent-task`
3. **Create a branch** — `feat/tool-name` or `fix/description`
4. **Implement with tests** — at minimum, the happy path should work
5. **Open a PR** — use the PR template, reference the issue
6. **Keep changes focused** — don't refactor unrelated code in the same PR

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
