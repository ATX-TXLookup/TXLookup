"""
TXLookup MCP Server — exposes the open-data agent as MCP tools.

Wraps `agent.tools.data` so external agents (Claude Code, Cursor, Codex)
can discover, describe, query, and summarize Texas open-data sources via the
Socrata SODA API. Also exposes Miro tools for the visual demo (issue #16).
"""

from __future__ import annotations

import sys
from pathlib import Path

# Local `mcp/` directory shadows the PyPI `mcp` package that fastmcp depends on
# when this file is imported as a package. We sidestep by importing fastmcp
# *before* anything else and ensuring the agent path is reachable for tools.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastmcp import FastMCP  # noqa: E402

from agent.tools import data as data_tool  # noqa: E402


mcp = FastMCP("TXLookup")


# ---------------------------------------------------------------------------
# Agent-loop tools (placeholder until issues #10, #11 land)
# ---------------------------------------------------------------------------


@mcp.tool()
async def ask_data(query: str) -> dict:
    """
    Ask a natural-language question about Texas/Austin public data.

    Args:
        query: Plain-English data question, e.g.
            "What are the most common building permit types in 78701?"

    Returns:
        Dict with task_id and status. The full agent loop lands in issue #10/#11;
        for now this records the question and returns an accepted-but-not-yet-run
        envelope so the MCP surface contract is stable.
    """
    return {
        "status": "accepted",
        "result": {"task_id": "pending", "query": query},
        "artifacts": [],
        "error": None,
    }


@mcp.tool()
async def get_task_status(task_id: str) -> dict:
    """
    Check the current status of a running agent task.

    Args:
        task_id: Task ID returned from `ask_data`.

    Returns:
        Dict with current phase, progress, and any partial results.
    """
    return {
        "status": "completed",
        "result": {"task_id": task_id, "phase": "unknown"},
        "artifacts": [],
        "error": None,
    }


# ---------------------------------------------------------------------------
# Data tools (live — wired to agent.tools.data)
# ---------------------------------------------------------------------------


@mcp.tool()
async def discover_datasets(query: str, city: str | None = None) -> dict:
    """
    Search the TXLookup catalog for datasets matching a natural-language query.

    Args:
        query: Search terms, e.g. "restaurant inspections", "building permits".
        city: Optional filter — "austin" / "dallas" / "san_antonio" / "houston" / "texas".

    Returns:
        Dict with status and a ranked list of candidate datasets.
    """
    try:
        results = data_tool.discover(query, city)
        return {
            "status": "completed",
            "result": [ds.model_dump() for ds in results],
            "artifacts": [],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": [], "error": str(exc)}


@mcp.tool()
async def get_dataset_schema(dataset_id: str, portal: str | None = None) -> dict:
    """
    Get column schema, sample rows, row count, and last_updated timestamp.

    Args:
        dataset_id: Socrata dataset id, e.g. "3syk-w9eu".
        portal: Optional portal hostname (default = look up via the catalog).

    Returns:
        Dict with the dataset Schema, including columns and sample rows.
    """
    try:
        schema = await data_tool.describe(dataset_id, portal)
        return {
            "status": "completed",
            "result": schema.model_dump(),
            "artifacts": [],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": None, "error": str(exc)}


@mcp.tool()
async def fetch_data(
    portal: str,
    dataset_id: str,
    where: str | None = None,
    select: str | None = None,
    group: str | None = None,
    order: str | None = None,
    limit: int = 100,
) -> dict:
    """
    Run a bounded SODA query against a Socrata dataset.

    Args:
        portal: Portal hostname, e.g. "data.austintexas.gov".
        dataset_id: Socrata dataset id.
        where: SoQL `$where` filter.
        select: Comma-separated column list for `$select`.
        group: SoQL `$group` clause.
        order: SoQL `$order` clause.
        limit: Max records. Hard cap at 5000 (skill safety rule).

    Returns:
        Dict with the records and the exact URL invoked (for citation).
    """
    select_list = [s.strip() for s in select.split(",")] if select else None
    group_list = [g.strip() for g in group.split(",")] if group else None
    return await data_tool.soda_query(
        portal=portal,
        dataset_id=dataset_id,
        where=where,
        select=select_list,
        group_by=group_list,
        order_by=order,
        limit=limit,
    )


# ---------------------------------------------------------------------------
# Miro tools (stubs — issue #16 wires Miro MCP)
# ---------------------------------------------------------------------------


@mcp.tool()
async def create_miro_board(name: str, description: str = "") -> dict:
    """Create a Miro board for data visualization. Wired in issue #16."""
    return {
        "status": "accepted",
        "result": {
            "board_id": "pending",
            "url": "https://miro.com/app/board/pending",
            "name": name,
            "description": description,
        },
        "artifacts": [],
        "error": None,
    }


@mcp.tool()
async def add_to_miro(
    board_id: str,
    item_type: str,
    content: str,
    x: int = 0,
    y: int = 0,
    color: str = "yellow",
) -> dict:
    """Add an item to a Miro board. Wired in issue #16."""
    return {
        "status": "accepted",
        "result": {
            "item_id": "pending",
            "type": item_type,
            "position": {"x": x, "y": y},
            "color": color,
        },
        "artifacts": [],
        "error": None,
    }


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------


@mcp.tool()
async def list_known_tools() -> dict:
    """List all tools the TXLookup MCP server exposes, grouped by category."""
    return {
        "status": "completed",
        "result": {
            "agent": ["ask_data", "get_task_status"],
            "data": ["discover_datasets", "get_dataset_schema", "fetch_data"],
            "miro": ["create_miro_board", "add_to_miro"],
            "utility": ["list_known_tools"],
        },
        "artifacts": [],
        "error": None,
    }


if __name__ == "__main__":
    mcp.run()
