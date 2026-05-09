---
name: txlookup
description: Use when an agent needs to discover, query, or summarize Texas public datasets (Austin / Dallas / San Antonio / Houston / state portals). Wraps Socrata SODA APIs with safe, bounded tools and a curated dataset catalog. Required hackathon deliverable for the Brainforge / Vicinity Texas Open Data Track.
license: MIT
maintainer: ATX-TXLookup
---

# TXLookup — Agent Skill

TXLookup is an open-source toolkit for **agents that work with Texas public open data**. It exposes a curated dataset catalog and a small set of safe, bounded tools so any agent (Claude Code, Cursor, Codex, custom orchestrators) can answer civic-data questions without re-implementing portal-specific logic.

This document IS the skill — it tells an agent *when* to invoke TXLookup, *which* tool to pick, *what* the safe bounds are, and *how* to cite results back to the user.

## When to use this skill

Use TXLookup when the user asks any question whose answer lives in a Texas city/state public dataset. Trigger phrases:

- "Austin permits / inspections / 311 / code violations / crime / traffic"
- "Dallas / San Antonio / Houston open data / public records / city data"
- "Texas state expenditures / franchise tax / mixed beverage / business filings"
- "Show me all X in zip Y" (where X is a permit type, complaint, inspection, etc.)
- "Compare [civic metric] across [neighborhoods | zip codes | cities | counties]"
- "Map / chart / list [public dataset slice]"

**Do NOT use this skill for:**
- Non-Texas data (skill is scoped to TX cities + state portals)
- Data behind authentication or paywalls (track rules forbid scraping auth-walled sources)
- Lookups of private individuals (no PII surfacing — see Safety below)
- Real-time emergency information (this is historical/reporting data, not 911)

## Tool catalog

The TXLookup MCP server exposes these tools. Pick the smallest tool that answers the question. Tool names below are the exact MCP-registered names (see `mcp/server.py`).

### `ask_data(query: str)`
High-level entry point: hand a plain-English data question to the agent loop. Returns a task envelope; the agent plans, fetches, and synthesizes a cited answer. Prefer the lower-level tools below when you want explicit control over each step.

### `get_task_status(task_id: str)`
Poll the status of a running `ask_data` task — phase, progress, partial results.

### `discover_datasets(query: str, city: str | None) -> Dataset[]`
Search the dataset catalog by natural-language intent. Returns ranked candidate datasets with their IDs, key columns, and update cadence. **Always call this first** if the user's question doesn't name a specific dataset.

### `get_dataset_schema(dataset_id: str, portal: str | None) -> Schema`
Return column names, types, sample rows, row count, and last-updated timestamp for a dataset. Call before issuing a non-trivial query.

### `fetch_data(portal: str, dataset_id: str, where, select, group, order, limit=100) -> Records`
Run a bounded SODA query against a dataset. **Hard limits enforced server-side**: `limit <= 5000`, query timeout 30s, paginates on cursor for larger pulls. Returns records + the exact URL invoked (for citation).

### `create_miro_board(name: str, description: str)`
Create a Miro board for the visual demo output. Returns the board id and URL.

### `add_to_miro(board_id, item_type, content, x, y, color)`
Add a sticky / shape / card to an existing Miro board at the given coordinates.

### `list_known_tools()`
Return the full registered tool list grouped by category — useful for agents discovering the MCP surface at runtime.

## Safe-use rules (non-negotiable)

1. **Attribution is mandatory.** Every user-facing answer must include the source portal and dataset name. Use `cite()`.
2. **Respect rate limits.** Default backoff: 1s/3s/10s on HTTP 429. Do not parallelize the same dataset more than 3 ways.
3. **No PII surfacing.** Many city datasets contain names/addresses tied to individuals (code violations, crime). When summarizing, prefer aggregates by zip / district. When showing rows, redact names unless the user explicitly asks for a single named record AND the dataset's own terms permit it.
4. **No auth-walled sources.** If `discover()` returns a dataset that requires login, drop it from candidates.
5. **Cap costs.** `limit > 5000` requires explicit user confirmation. Bulk pulls > 100k rows are out of scope for this skill.
6. **Cite freshness.** Always report the dataset's `last_updated` so users know if the answer is stale.

## Example invocations

### Example 1 — Bounded query, single dataset
> User: "Show me all building permits issued in 78704 in the last 90 days, grouped by permit type."

```python
ds = discover("Austin building permits", city="austin")[0]   # → 3syk-w9eu
schema = describe(ds.id)                                      # confirm columns: permit_type, original_zip, issued_date
result = summarize(
    ds.id,
    where="original_zip = '78704' AND issued_date > '2026-02-08'",
    dimensions=["permit_type"],
)
citation = cite(ds)
```

### Example 2 — Discovery first
> User: "What's the most common 311 complaint in East Austin this year?"

```python
candidates = discover("Austin 311 complaints", city="austin")
ds = candidates[0]                                            # → i26j-ai4z
result = summarize(
    ds.id,
    where="created_date > '2026-01-01' AND council_district IN (1,3,4)",
    dimensions=["sr_type"],
)
```

### Example 3 — Refuse PII
> User: "Show me everyone who got a code violation in 78745 last month with their full names."

Refuse the row-level personal-name dump. Offer the aggregate instead: counts by violation type and street block. Explain the safety rule.

## Personas this skill is built for

See `docs/personas.md` for full sketches. Short version:
- **Sarah** — parent in 78704, asking about restaurants, schools, parks
- **Marcus** — small-business owner, asking about permits, licenses, code zones
- **Jordan** — local journalist, asking for trends and patterns across districts

## How to extend

To add a new dataset to the catalog:
1. Add an entry to `config/datasets.yaml` under the right city
2. Document `key_columns`, `updated` cadence, and any sensitivity flags
3. The MCP server picks it up on next reload — no code change required

To add a new city portal:
1. Add a new top-level key in `config/datasets.yaml` with its `portal` host
2. Confirm the portal speaks SODA (most TX cities do)
3. Add a smoke-test query in `tests/smoke/`

## References

- Socrata SODA API: https://dev.socrata.com/docs/queries/
- Austin Open Data: https://data.austintexas.gov/
- Dallas Open Data: https://www.dallasopendata.com/
- San Antonio Open Data: https://data.sanantonio.gov/
- Houston Open Data: https://data.houstontx.gov/
- TX Open Data Aggregator: https://tryopendata.ai/
- Brainforge / Vicinity Texas Open Data Track requirements: see `docs/event.md`
