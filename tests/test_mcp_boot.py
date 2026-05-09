"""Smoke test: TXLookup MCP server boots and exposes the expected tools.

The local `mcp/` directory shadows the PyPI `mcp` package (which fastmcp
depends on). Importing via `import mcp.server` would resolve to the
site-packages `mcp` shadow, so we load the file by path with importlib.
"""
from __future__ import annotations

import asyncio
import importlib.util
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parent.parent


@pytest.fixture(scope="module")
def server_module():
    """Load mcp/server.py by file path to bypass the local-vs-PyPI mcp shadow."""
    server_path = REPO_ROOT / "mcp" / "server.py"
    spec = importlib.util.spec_from_file_location("txlookup_mcp_server", server_path)
    assert spec and spec.loader, f"could not build spec for {server_path}"
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_fastmcp_instance_created(server_module):
    """The server module exposes a FastMCP instance under the expected name."""
    assert hasattr(server_module, "mcp"), "expected `mcp` attribute on server module"
    instance = server_module.mcp
    assert instance is not None
    assert getattr(instance, "name", None) == "TXLookup"


def test_tools_registered(server_module):
    """All expected tool names are registered with the MCP instance."""
    expected = {
        # Agent
        "ask_data",
        "get_task_status",
        # Data
        "discover_datasets",
        "get_dataset_schema",
        "fetch_data",
        # Miro
        "create_miro_board",
        "add_to_miro",
        # Utility
        "list_known_tools",
    }

    instance = server_module.mcp
    # FastMCP returns a list[Tool] from list_tools()
    tools = asyncio.run(instance.list_tools())
    actual = {t.name for t in tools}
    missing = expected - actual
    assert not missing, f"missing expected tools: {sorted(missing)}; actual={sorted(actual)}"


def test_discover_returns_typed_envelope(server_module):
    """discover_datasets returns the standard {status, result, error} envelope."""
    instance = server_module.mcp
    result_obj = asyncio.run(instance.call_tool("discover_datasets", {"query": "Austin building permits"}))
    # FastMCP returns a structured ToolResult; pull the data dict out.
    result = getattr(result_obj, "data", None) or getattr(result_obj, "structured_content", None) or result_obj
    assert result["status"] == "completed", result
    assert isinstance(result["result"], list)
    assert result["error"] is None
    # Top result should be Austin permits dataset.
    if result["result"]:
        assert result["result"][0]["id"] == "3syk-w9eu", result["result"][0]
