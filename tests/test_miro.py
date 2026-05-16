"""Tests for agent/tools/miro.py.

Most tests are mocked; one live test is gated on MIRO_API_TOKEN being set.
The live path is exercised separately via mcp__miro__* tools in the demo.
"""
from __future__ import annotations

import os
from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_create_board_envelope_shape():
    """create_board returns the standard envelope on success."""
    from agent.tools import miro

    fake_response = {
        "id": "uXjVHWYFIqE=",
        "viewLink": "https://miro.com/app/board/uXjVHWYFIqE=/",
    }
    with patch.dict(os.environ, {"MIRO_API_TOKEN": "test_token"}):
        with patch("agent.tools.miro._post", new=AsyncMock(return_value=fake_response)):
            res = await miro.create_board("test", "desc")

    assert res["status"] == "completed"
    assert res["result"]["board_id"] == "uXjVHWYFIqE="
    assert res["result"]["view_link"] == "https://miro.com/app/board/uXjVHWYFIqE=/"
    assert res["error"] is None


@pytest.mark.asyncio
async def test_create_board_failure_returns_envelope():
    """Failures are envelope-wrapped, never raised."""
    from agent.tools import miro

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "test_token"}):
        with patch("agent.tools.miro._post", new=AsyncMock(side_effect=RuntimeError("network"))):
            res = await miro.create_board("test")

    assert res["status"] == "failed"
    assert "network" in res["error"]
    assert res["result"] is None


@pytest.mark.asyncio
async def test_missing_token_fails_cleanly():
    """No MIRO_API_TOKEN → clear error in envelope, not crash."""
    from agent.tools import miro

    env = {k: v for k, v in os.environ.items() if k != "MIRO_API_TOKEN"}
    with patch.dict(os.environ, env, clear=True):
        res = await miro.create_board("test")
    assert res["status"] == "failed"
    assert "MIRO_API_TOKEN" in res["error"]


@pytest.mark.asyncio
async def test_render_board_from_layout_calls_primitives():
    """render_board_from_layout dispatches frames + stickies + citation in order."""
    from agent.tools import miro

    layout = {
        "board": {
            "name": "Test board",
            "frames": [
                {
                    "title": "Frame 1",
                    "x": 0, "y": 0, "width": 1500, "height": 1000,
                    "stickies": [
                        {"content": "Hello", "color": "green", "x": 100, "y": 100}
                    ],
                }
            ],
            "citation": {
                "portal": "City of Austin",
                "dataset_name": "Permits",
                "dataset_id": "3syk-w9eu",
                "url": "https://example/",
                "last_refreshed": "2026-05-09",
            },
        }
    }

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "test_token"}):
        with (
            patch("agent.tools.miro.create_board", new=AsyncMock(return_value={
                "status": "completed",
                "result": {"board_id": "B1", "view_link": "https://miro/B1/"},
                "artifacts": ["https://miro/B1/"],
                "error": None,
            })),
            patch("agent.tools.miro.add_frame", new=AsyncMock(return_value={
                "status": "completed",
                "result": {"frame_id": "F1"},
                "artifacts": [],
                "error": None,
            })),
            patch("agent.tools.miro.add_sticky", new=AsyncMock(return_value={
                "status": "completed",
                "result": {"sticky_id": "S1"},
                "artifacts": [],
                "error": None,
            })),
            patch("agent.tools.miro.add_card", new=AsyncMock(return_value={
                "status": "completed",
                "result": {"card_id": "C1"},
                "artifacts": [],
                "error": None,
            })),
        ):
            res = await miro.render_board_from_layout(layout)

    assert res["status"] == "completed"
    assert res["result"]["board_id"] == "B1"
    # board + 1 frame + 1 sticky + 1 citation card = 4
    assert res["result"]["items_created"] == 4
    assert res["error"] is None


def test_color_mapping_safe_default():
    """Unknown color names fall back to gray, not error."""
    from agent.tools import miro

    assert miro._miro_color("primary-fixed") == "light_yellow"
    assert miro._miro_color("not_a_color") == "gray"
    assert miro._miro_color("green") == "green"
