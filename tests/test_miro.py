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


# --------------------------------------------------------------------------- #
# Regression coverage for issue #165 — three Miro fixes in production:        #
#   1. token .strip() before building the Authorization header                 #
#   2. frame-local coord translation for parented stickies                     #
#   3. cached-replay artifact recovery in app/api/agent/route.ts              #
# These pin the fixes so silent regressions show up at test time, not at      #
# demo time.                                                                   #
# --------------------------------------------------------------------------- #


def test_token_strips_trailing_newline():
    """A token with a trailing newline must not flow into the bearer header."""
    from agent.tools import miro

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "abc123\n"}):
        assert miro._token() == "abc123"


def test_token_strips_surrounding_whitespace():
    """Same defense for spaces / tabs around the token."""
    from agent.tools import miro

    with patch.dict(os.environ, {"MIRO_API_TOKEN": "  abc123\t\n"}):
        assert miro._token() == "abc123"


def test_token_missing_env_raises_clear_error():
    from agent.tools import miro

    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(RuntimeError, match="MIRO_API_TOKEN missing"):
            miro._token()


@pytest.mark.asyncio
async def test_render_board_translates_sticky_to_frame_local_coords():
    """Parented stickies authored around frame-center must be translated to
    positive frame-local coordinates before being sent to Miro v2. Without
    the translation, items land outside parent boundaries and Miro rejects
    them with 400."""
    from agent.tools import miro

    layout = {
        "board": {
            "name": "Coord regression",
            "frames": [
                {
                    "title": "Center-authored frame",
                    "x": 0,
                    "y": 0,
                    "width": 1500,
                    "height": 1000,
                    "stickies": [
                        # Far top-left corner relative to frame center
                        {"content": "TL", "x": -750, "y": -500, "color": "green"},
                        # Frame center → midpoint after translation
                        {"content": "C", "x": 0, "y": 0, "color": "blue"},
                    ],
                }
            ],
        }
    }
    sticky_calls: list[dict[str, object]] = []

    async def capture_sticky(**kwargs):
        sticky_calls.append(kwargs)
        return {
            "status": "completed",
            "result": {"sticky_id": f"S{len(sticky_calls)}"},
            "artifacts": [],
            "error": None,
        }

    with (
        patch.dict(os.environ, {"MIRO_API_TOKEN": "test"}),
        patch(
            "agent.tools.miro.create_board",
            new=AsyncMock(
                return_value={
                    "status": "completed",
                    "result": {
                        "board_id": "B1",
                        "view_link": "https://miro.com/B1/",
                    },
                    "artifacts": ["https://miro.com/B1/"],
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
        patch("agent.tools.miro.add_sticky", side_effect=capture_sticky),
    ):
        res = await miro.render_board_from_layout(layout)

    assert res["status"] == "completed"
    # First sticky: -750 + 1500/2 = 0; -500 + 1000/2 = 0  → top-left of frame
    assert sticky_calls[0]["x"] == 0
    assert sticky_calls[0]["y"] == 0
    # Second sticky: 0 + 750 = 750; 0 + 500 = 500 → midpoint of frame
    assert sticky_calls[1]["x"] == 750
    assert sticky_calls[1]["y"] == 500


@pytest.mark.asyncio
async def test_render_board_handles_default_frame_dimensions():
    """When a frame doesn't declare width/height, defaults (1500x1000) apply
    so the translation math still produces sane positive coords."""
    from agent.tools import miro

    layout = {
        "board": {
            "name": "Default-size frame",
            "frames": [
                {
                    "title": "Defaults",
                    "x": 0,
                    "y": 0,
                    "stickies": [
                        {"content": "C", "x": 0, "y": 0, "color": "gray"}
                    ],
                }
            ],
        }
    }
    sticky_calls: list[dict[str, object]] = []

    async def capture_sticky(**kwargs):
        sticky_calls.append(kwargs)
        return {
            "status": "completed",
            "result": {"sticky_id": "S1"},
            "artifacts": [],
            "error": None,
        }

    with (
        patch.dict(os.environ, {"MIRO_API_TOKEN": "test"}),
        patch(
            "agent.tools.miro.create_board",
            new=AsyncMock(
                return_value={
                    "status": "completed",
                    "result": {
                        "board_id": "B1",
                        "view_link": "https://miro.com/B1/",
                    },
                    "artifacts": [],
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
        patch("agent.tools.miro.add_sticky", side_effect=capture_sticky),
    ):
        await miro.render_board_from_layout(layout)

    # Default frame is 1500x1000 → midpoint (750, 500)
    assert sticky_calls[0]["x"] == 750
    assert sticky_calls[0]["y"] == 500


def test_typescript_agent_keeps_frame_translation_guards():
    """Source-level guard: TS frame translation in app/lib/agent.ts must
    remain. If a refactor accidentally drops it, the empty-Miro-board bug
    regresses on the live render path."""
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "app/lib/agent.ts").read_text()
    assert "FRAME_W / 2" in source, "frame-width translation removed"
    assert "FRAME_H / 2" in source, "frame-height translation removed"


def test_typescript_agent_trims_miro_token_before_auth_header():
    """Source-level guard: TS-side .trim() must remain. Without it, a
    newline-polluted MIRO_API_TOKEN silently 401s the entire render."""
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "app/lib/agent.ts").read_text()
    assert "process.env.MIRO_API_TOKEN?.trim()" in source, "token .trim() removed"


def test_cached_replay_recovers_artifacts_from_saved_events():
    """Source-level guard: replaySavedRun must scan saved events for
    artifact URLs (the fix that lets cached Miro embeds render). Without
    this, cached replays of Miro runs show no board link."""
    from pathlib import Path

    source = (Path(__file__).resolve().parents[1] / "app/api/agent/route.ts").read_text()
    assert "const recovered: string[] = [];" in source, "artifact recovery loop removed"
    assert "preview.match(urlRe)" in source, "preview URL extraction removed"
