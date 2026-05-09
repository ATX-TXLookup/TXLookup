"""Boot the TXLookup MCP server programmatically and assert each of the 8
registered tools returns the standard envelope shape:

    {"status": "completed" | "failed" | "accepted",
     "result": ...,
     "artifacts": [...],
     "error": str | None}

Several tools today return `accepted` (placeholder for the agent loop / Miro
wiring) — that's a valid in-flight envelope. The contract this test pins:
every tool returns a dict with `status`, `result` and (where applicable)
`error` keys, and `status` is one of the accepted values.

Network-touching tools are called with arguments that don't actually go to
the network (or fail fast and return the failed envelope), so this suite is
offline-safe.
"""
from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path
from typing import Any

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent
ALLOWED_STATUSES = {"completed", "failed", "accepted"}


# --------------------------------------------------------------------------- #
# Server fixture                                                               #
# --------------------------------------------------------------------------- #


@pytest.fixture(scope="module")
def server_module():
    """Load mcp/server.py by file path to bypass the local-vs-PyPI `mcp` shadow."""
    server_path = REPO_ROOT / "mcp" / "server.py"
    spec = importlib.util.spec_from_file_location("txlookup_mcp_envelope", server_path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _call(instance, name: str, args: dict[str, Any]) -> dict[str, Any]:
    """Call a FastMCP tool and unwrap to the result dict."""
    obj = asyncio.run(instance.call_tool(name, args))
    data = (
        getattr(obj, "data", None)
        or getattr(obj, "structured_content", None)
        or obj
    )
    assert isinstance(data, dict), f"tool {name} did not return a dict: {type(data)}"
    return data


def _assert_envelope(name: str, env: dict[str, Any]) -> None:
    """Assert every required envelope key + a sane status."""
    assert "status" in env, f"{name}: missing 'status' in envelope: {env}"
    assert env["status"] in ALLOWED_STATUSES, (
        f"{name}: status {env['status']!r} not in {sorted(ALLOWED_STATUSES)}"
    )
    assert "result" in env, f"{name}: missing 'result' key in envelope: {env}"
    # `error` is conventionally present when status is failed; for the others
    # it's either present-and-None or omitted. We require it on `failed`.
    if env["status"] == "failed":
        assert env.get("error"), (
            f"{name}: status=failed but no error string in envelope: {env}"
        )


# --------------------------------------------------------------------------- #
# Tests — one per registered tool                                              #
# --------------------------------------------------------------------------- #


def test_eight_tools_registered(server_module) -> None:
    """The server registers exactly the 8 tools we expect."""
    expected = {
        "ask_data",
        "get_task_status",
        "discover_datasets",
        "get_dataset_schema",
        "fetch_data",
        "create_miro_board",
        "add_to_miro",
        "list_known_tools",
    }
    tools = asyncio.run(server_module.mcp.list_tools())
    actual = {t.name for t in tools}
    assert actual == expected, f"tool surface drifted: {sorted(actual)}"


def test_envelope_ask_data(server_module) -> None:
    env = _call(server_module.mcp, "ask_data", {"query": "Austin permits in 78704"})
    _assert_envelope("ask_data", env)
    # Today this is a placeholder — accepts and echoes the query.
    assert env["status"] == "accepted"
    assert env["result"]["query"] == "Austin permits in 78704"


def test_envelope_get_task_status(server_module) -> None:
    env = _call(server_module.mcp, "get_task_status", {"task_id": "abc-123"})
    _assert_envelope("get_task_status", env)
    assert env["result"]["task_id"] == "abc-123"


def test_envelope_discover_datasets_completed(server_module) -> None:
    env = _call(
        server_module.mcp, "discover_datasets", {"query": "Austin building permits"}
    )
    _assert_envelope("discover_datasets", env)
    assert env["status"] == "completed"
    assert isinstance(env["result"], list)


def test_envelope_get_dataset_schema_failed_on_unknown(server_module) -> None:
    """Unknown dataset id should yield a clean failed envelope (not crash)."""
    env = _call(
        server_module.mcp,
        "get_dataset_schema",
        {"dataset_id": "zzzz-zzzz", "portal": "data.austintexas.gov"},
    )
    _assert_envelope("get_dataset_schema", env)
    # Either the catalog rejects it or the live HTTP fails — both fine.
    assert env["status"] in {"failed", "completed"}


def test_envelope_fetch_data_handles_failure(server_module) -> None:
    """An invalid dataset id must surface a failed envelope, not a crash."""
    env = _call(
        server_module.mcp,
        "fetch_data",
        {
            "portal": "data.austintexas.gov",
            "dataset_id": "zzzz-zzzz",
            "limit": 1,
        },
    )
    _assert_envelope("fetch_data", env)
    # Network-dependent — accept either failure (offline / 404) or success
    # (if some real server responds). In both paths the envelope shape holds.
    assert env["status"] in {"failed", "completed"}


def test_envelope_create_miro_board(server_module) -> None:
    env = _call(
        server_module.mcp,
        "create_miro_board",
        {"name": "TXLookup demo", "description": "test"},
    )
    _assert_envelope("create_miro_board", env)
    assert "board_id" in env["result"]


def test_envelope_add_to_miro(server_module) -> None:
    env = _call(
        server_module.mcp,
        "add_to_miro",
        {
            "board_id": "stub",
            "item_type": "sticky",
            "content": "hello",
        },
    )
    _assert_envelope("add_to_miro", env)
    assert env["result"]["type"] == "sticky"


def test_envelope_list_known_tools(server_module) -> None:
    env = _call(server_module.mcp, "list_known_tools", {})
    _assert_envelope("list_known_tools", env)
    assert env["status"] == "completed"
    grouped = env["result"]
    assert "agent" in grouped and "data" in grouped and "miro" in grouped
