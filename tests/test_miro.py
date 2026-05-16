"""Tests for agent/tools/miro.py.

Most tests are mocked; one live test is gated on MIRO_API_TOKEN being set.
The live path is exercised separately via mcp__miro__* tools in the demo.
"""
from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest


ROOT = Path(__file__).resolve().parents[1]


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


def test_miro_auth_header_trims_token_whitespace():
    """A stray newline in MIRO_API_TOKEN must not leak into Authorization."""
    from agent.tools import miro

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "  abc  \n"}):
        assert miro._headers()["Authorization"] == "Bearer abc"


@pytest.mark.asyncio
async def test_render_board_from_layout_uses_frame_local_item_coords():
    """Parented stickies are translated from frame-center layout coords."""
    from agent.tools import miro

    layout = {
        "board": {
            "name": "Frame regression",
            "frames": [
                {
                    "title": "Fresh frame",
                    "x": 0,
                    "y": 0,
                    "width": 1500,
                    "height": 1000,
                    "stickies": [
                        {
                            "content": "inside frame",
                            "color": "green",
                            "x": -650,
                            "y": -400,
                        }
                    ],
                }
            ],
        }
    }
    sticky_calls: list[dict[str, object]] = []

    async def fake_add_sticky(**kwargs):
        sticky_calls.append(kwargs)
        return {
            "status": "completed",
            "result": {"sticky_id": "S1"},
            "artifacts": [],
            "error": None,
        }

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "test_token"}):
        with (
            patch(
                "agent.tools.miro.create_board",
                new=AsyncMock(
                    return_value={
                        "status": "completed",
                        "result": {"board_id": "B1", "view_link": "https://miro/B1/"},
                        "artifacts": ["https://miro/B1/"],
                        "error": None,
                    }
                ),
            ),
            patch(
                "agent.tools.miro.add_frame",
                new=AsyncMock(
                    return_value={
                        "status": "completed",
                        "result": {"frame_id": "F1"},
                        "artifacts": [],
                        "error": None,
                    }
                ),
            ),
            patch("agent.tools.miro.add_sticky", side_effect=fake_add_sticky),
        ):
            res = await miro.render_board_from_layout(layout)

    assert res["status"] == "completed"
    assert sticky_calls == [
        {
            "board_id": "B1",
            "content": "inside frame",
            "color": "green",
            "x": 100,
            "y": 100,
            "frame_id": "F1",
            "width": 200,
        }
    ]


def test_render_to_miro_source_keeps_frame_space_translation():
    """Guard the TypeScript empty-board fix until it has exported unit seams."""
    source = (ROOT / "app/lib/agent.ts").read_text()

    assert "const parentDX = frameId ? FRAME_W / 2 : 0;" in source
    assert "const parentDY = frameId ? FRAME_H / 2 : 0;" in source
    assert source.count("x: x + parentDX") >= 3
    assert source.count("y: y + yOffset + parentDY") >= 3
    assert "position: { x, y: y + yOffset" not in source


def test_render_to_miro_source_trims_token_before_auth_header():
    """Guard against newline-polluted Miro bearer tokens."""
    source = (ROOT / "app/lib/agent.ts").read_text()

    assert "process.env.MIRO_API_TOKEN?.trim()" in source
    assert "Authorization: `Bearer ${miroToken}`" in source
    assert "Authorization: `Bearer ${process.env.MIRO_API_TOKEN}`" not in source


def test_cached_replay_source_recovers_miro_artifacts_for_done_event():
    """Cached replay must synthesize done artifacts from saved step output."""
    source = (ROOT / "app/api/agent/route.ts").read_text()

    assert "const recovered: string[] = [];" in source
    assert "const urlRe = /https?:\\/\\/" in source
    assert "preview.match(urlRe)" in source
    assert "if (matches) recovered.push(...matches);" in source
    assert "const artifacts = [...new Set(recovered)];" in source
    assert "artifacts," in source
    assert "artifacts: []" not in source
