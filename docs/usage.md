# Using TXLookup — integration guide

> For external developers and agents. If you're contributing to the build, start with [`CONTRIBUTING.md`](../CONTRIBUTING.md) instead.

TXLookup is an open-source toolkit for **agents that work with Texas public open data**. It exposes:

- A **MCP server** (`mcp/server.py`) with bounded, safe tools for discovery, query, schema, and summaries against Austin / Dallas / San Antonio / Houston / state open-data portals
- An **agent skill** ([`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md)) that tells any agent runtime *when* and *how* to use the tools safely
- A small **Python API** (`agent.tools.data`) you can call directly without the MCP layer

This doc shows how to install and use each.

## Install the MCP server

### Option A — Claude Code

The repo ships a project-scoped MCP config at `.mcp.json`. Cloning the repo and running `claude` from the directory auto-discovers TXLookup's MCP server. (The `.mcp.json` actually wires Miro MCP today — TXLookup's own server runs as a subprocess, see Option C.)

To bind TXLookup's MCP server explicitly to your Claude Code session:

```bash
# from the repo root after pip install -r requirements.txt
claude mcp add --transport stdio txlookup "python $(pwd)/mcp/server.py"
```

Then in your `claude` session, type `/mcp` to confirm it's connected. The server's tools become callable as `mcp__txlookup__*`.

### Option B — Codex CLI

```bash
# add as a stdio MCP server
codex mcp add txlookup "python /absolute/path/to/TXLookup/mcp/server.py"
```

### Option C — Standalone (any MCP-compliant client)

```bash
git clone https://github.com/ATX-TXLookup/TXLookup.git
cd TXLookup
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python mcp/server.py
```

The server uses stdio transport by default. Point your client at the process.

## Tool catalog

All 8 tools follow a consistent envelope:

```python
{"status": "completed" | "failed" | "accepted",
 "result": <tool-specific>,
 "artifacts": list[str],   # URLs for citation
 "error": str | None}
```

### Data tools (live)

#### `discover_datasets(query: str, city: str | None = None) -> dict`
Search the catalog for datasets matching a NL query.

```python
discover_datasets("Austin building permits")
# → {"status": "completed",
#    "result": [{"id": "3syk-w9eu", "name": "Issued Construction Permits",
#                "portal": "data.austintexas.gov",
#                "key_columns": [...], "updated": "daily"}, ...]}
```

#### `get_dataset_schema(dataset_id: str, portal: str | None = None) -> dict`
Fetch column schema, sample rows, row count, and last-updated.

```python
get_dataset_schema("3syk-w9eu")
# → {"status": "completed",
#    "result": {"id": "3syk-w9eu",
#               "columns": [{"name": "permittype", "display_name": "Permit Type", ...}, ...],
#               "row_count": 2354632,
#               "last_updated": 1778243167,
#               "sample_rows": [...]}}
```

#### `fetch_data(portal, dataset_id, where=None, select=None, group=None, order=None, limit=100) -> dict`
Run a bounded SODA query.

```python
fetch_data(
    portal="data.austintexas.gov",
    dataset_id="3syk-w9eu",
    where="original_zip='78701' AND issue_date > '2026-02-08'",
    select="permittype,issue_date,original_address",
    limit=50,
)
# → {"status": "completed",
#    "result": {"records": [...], "url": "https://data.austintexas.gov/resource/3syk-w9eu.json?..."}}
```

**Hard limit:** `limit ≤ 5000` server-side. Larger pulls require explicit user confirmation per the skill rules.

### Agent tools (placeholder until issues #10/#11 land)

#### `ask_data(query: str) -> dict`
Submit a natural-language question to the full agent loop. Returns an accepted envelope today; the full Reason→Plan→Tool→Complete loop lands in issues #10/#11.

#### `get_task_status(task_id: str) -> dict`
Poll a running agent task.

### Miro tools (stubs until issue #16 lands)

#### `create_miro_board(name, description="") -> dict`
Create a Miro board for the visual demo. Currently returns an `accepted` envelope.

#### `add_to_miro(board_id, item_type, content, x=0, y=0, color="yellow") -> dict`
Add a sticky / card / frame / text to a board.

### Utility

#### `list_known_tools() -> dict`
Returns all tool names grouped by category. Useful for runtime introspection.

## Use the agent skill from any runtime

The skill document at [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) IS the API for agent behavior. It tells an agent:

- **When to use** TXLookup (trigger phrases)
- **Which tool to pick** for which question shape
- **Safety rules** — attribution required, no PII, no auth-walled sources, rate-limit backoff
- **Worked examples** — bounded query, discovery-first, refusing PII

Any agent runtime that supports skill documents (Claude Code, Cursor, Codex, custom orchestrators) can load it. To install in Claude Code:

```bash
mkdir -p ~/.claude/skills/txlookup
cp skills/txlookup/SKILL.md ~/.claude/skills/txlookup/
```

Then the `Skill` tool in Claude Code will surface it whenever a user asks a Texas-civic-data question.

## Python API (no MCP layer)

If you want to call the data tools directly from Python:

```python
import asyncio
from agent.tools import data

# Discover
candidates = data.discover("Austin restaurant inspections")
print(candidates[0].id)  # → "ecmv-9xxi"

# Describe (async — hits Socrata metadata)
schema = asyncio.run(data.describe("ecmv-9xxi"))
print(schema.row_count, len(schema.columns))

# Query (async — hits SODA)
result = asyncio.run(data.soda_query(
    portal="data.austintexas.gov",
    dataset_id="ecmv-9xxi",
    where="zip_code='78701' AND score < 80",
    limit=100,
))
print(result["status"], len(result["result"]["records"]))
```

## Citation requirement (non-negotiable)

Every user-facing answer must carry attribution. The `result["artifacts"]` list contains the exact dataset URL invoked, and `discover_datasets` returns the canonical portal name. The shipped `CitationBlock` React component (issue #15) consumes these directly.

If you build your own UI on top of TXLookup tools, **you must** display:

```
Source: <portal name> · <dataset name> (<dataset_id>)
Last refreshed: <ISO timestamp>
Open dataset → <url>
```

This is a hard requirement of the Brainforge / Vicinity Texas Open Data Track. No exceptions.

## Rate limits & safety bounds

These are enforced server-side; you don't need to handle them yourself but should expect them:

- **Per-query timeout:** 30 seconds
- **Max records per query:** 5000
- **Backoff on HTTP 429:** exponential — 1s, 3s, 10s — up to 3 retries
- **No PII surfacing:** when summarizing personal records (code violations, crime), prefer aggregates by zip / district. Row-level personal-name dumps will be refused.
- **No auth-walled sources:** datasets requiring login are filtered out of `discover_datasets` results.

## Catalog: what's pre-registered

See [`config/datasets.yaml`](../config/datasets.yaml) for the full list. Currently registered:

- **Austin** (`data.austintexas.gov`) — building permits, food inspections, 311, code violations, crime reports, traffic fatalities
- **Texas state** (`data.texas.gov`) — active business filings, state expenditures, mixed beverage receipts
- **Dallas / San Antonio / Houston** — TODO (issues being filed)

To register a new dataset, add an entry to `config/datasets.yaml` and the MCP server picks it up on next reload — no code change required.

## Where to file issues / contribute

- **Issues:** https://github.com/ATX-TXLookup/TXLookup/issues
- **Contributing:** [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- **Coordination tracker:** [#17 📌 Demo Tracker](https://github.com/ATX-TXLookup/TXLookup/issues/17)

## See also

- [`docs/agents-strategy.md`](agents-strategy.md) — **how Codex makes TXLookup work** (Partner Ecosystem story)
- [`skills/txlookup/SKILL.md`](../skills/txlookup/SKILL.md) — the agent skill (deliverable)
- [`docs/architecture.md`](architecture.md) — layered architecture diagram
- [`docs/personas.md`](personas.md) — who TXLookup is built for
- [`docs/event.md`](event.md) — hackathon details, judging criteria, deadlines
