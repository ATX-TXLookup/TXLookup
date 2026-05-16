"""Miro REST API wrappers for the agent's Complete step.

Implements the contract specified in `docs/miro-board-template.md`:

    create_board(name, description="") -> {board_id, view_link}
    add_frame(board_id, title, x, y, width, height, header_color="stone")
    add_sticky(board_id, content, color, x, y, frame_id=None)
    add_card(board_id, title, description, x, y, frame_id=None)
    render_board_from_layout(layout) -> {board_id, view_link, items_created}

Uses the Miro REST API directly (httpx) so the agent works in any Python
runtime — Vercel serverless, local CLI, or inside an MCP client session.

Auth: requires `MIRO_API_TOKEN` in env. The agent does NOT store or log this.

Hard rules from `skills/txlookup/SKILL.md`:
- Every board must include the citation footer (mandatory attribution).
- No PII on stickies (the agent's responsibility — this module just renders).
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, Optional

import httpx


_API_BASE = "https://api.miro.com/v2"
_DEFAULT_TIMEOUT = 30.0


_STICKY_COLORS: dict[str, str] = {
    "green": "green",
    "yellow": "yellow",
    "red": "red",
    "primary-fixed": "light_yellow",
    "secondary-fixed": "light_blue",
    "stone": "gray",
    "gray": "gray",
    "light_yellow": "light_yellow",
    "light_blue": "light_blue",
    "light_green": "light_green",
    "light_pink": "light_pink",
    "blue": "blue",
    "violet": "violet",
    "pink": "pink",
}


def _miro_color(name: str) -> str:
    return _STICKY_COLORS.get(name, "gray")


def _token() -> str:
    token = (os.environ.get("MIRO_API_TOKEN") or "").strip()
    if not token:
        raise RuntimeError(
            "MIRO_API_TOKEN missing from env. Get one from "
            "https://miro.com/app/settings and set it."
        )
    return token


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_token()}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def _post(client: httpx.AsyncClient, url: str, json: dict) -> dict:
    resp = await client.post(url, headers=_headers(), json=json, timeout=_DEFAULT_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


async def create_board(name: str, description: str = "") -> dict[str, Any]:
    """Create a new Miro board.

    Returns the standard envelope: {status, result: {board_id, view_link}, ...}.
    """
    try:
        async with httpx.AsyncClient() as client:
            data = await _post(
                client,
                f"{_API_BASE}/boards",
                {
                    "name": name[:60],
                    "description": description[:300],
                    "policy": {"sharingPolicy": {"access": "private"}},
                },
            )
        board_id = data["id"]
        view_link = data.get("viewLink") or f"https://miro.com/app/board/{board_id}/"
        return {
            "status": "completed",
            "result": {"board_id": board_id, "view_link": view_link, "name": name},
            "artifacts": [view_link],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": None, "error": str(exc), "artifacts": []}


async def add_frame(
    board_id: str,
    title: str,
    x: int,
    y: int,
    width: int,
    height: int,
    header_color: str = "stone",
) -> dict[str, Any]:
    """Add a frame (named region) to a board. Center-based coordinates."""
    try:
        async with httpx.AsyncClient() as client:
            data = await _post(
                client,
                f"{_API_BASE}/boards/{board_id}/frames",
                {
                    "data": {"title": title[:80], "type": "freeform", "format": "custom"},
                    "position": {"x": x, "y": y, "origin": "center"},
                    "geometry": {"width": width, "height": height},
                },
            )
        return {
            "status": "completed",
            "result": {"frame_id": data["id"], "title": title},
            "artifacts": [],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": None, "error": str(exc), "artifacts": []}


async def add_sticky(
    board_id: str,
    content: str,
    color: str,
    x: int,
    y: int,
    frame_id: Optional[str] = None,
    width: int = 200,
) -> dict[str, Any]:
    """Add a sticky note. Color is the brand-name (mapped to Miro palette)."""
    try:
        body: dict[str, Any] = {
            "data": {"content": content, "shape": "rectangle"},
            "style": {"fillColor": _miro_color(color)},
            "position": {"x": x, "y": y, "origin": "center"},
            "geometry": {"width": width},
        }
        if frame_id:
            body["parent"] = {"id": frame_id}
        async with httpx.AsyncClient() as client:
            data = await _post(
                client,
                f"{_API_BASE}/boards/{board_id}/sticky_notes",
                body,
            )
        return {
            "status": "completed",
            "result": {"sticky_id": data["id"], "color": color},
            "artifacts": [],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": None, "error": str(exc), "artifacts": []}


async def add_card(
    board_id: str,
    title: str,
    description: str,
    x: int,
    y: int,
    frame_id: Optional[str] = None,
) -> dict[str, Any]:
    """Add a card (title + description box)."""
    try:
        body: dict[str, Any] = {
            "data": {"title": title[:120], "description": description[:1000]},
            "position": {"x": x, "y": y, "origin": "center"},
        }
        if frame_id:
            body["parent"] = {"id": frame_id}
        async with httpx.AsyncClient() as client:
            data = await _post(
                client,
                f"{_API_BASE}/boards/{board_id}/cards",
                body,
            )
        return {
            "status": "completed",
            "result": {"card_id": data["id"], "title": title},
            "artifacts": [],
            "error": None,
        }
    except Exception as exc:  # noqa: BLE001
        return {"status": "failed", "result": None, "error": str(exc), "artifacts": []}


async def render_board_from_layout(layout: dict[str, Any]) -> dict[str, Any]:
    """Apply a complete layout JSON (synthesizer's output) to a new board.

    Layout schema — see docs/miro-board-template.md for the full spec.
    The citation footer is mandatory (track rules) and rendered at the bottom.
    """
    board = layout.get("board") or {}
    name = board.get("name") or "TXLookup query result"
    description = board.get("description") or ""

    created = await create_board(name, description)
    if created["status"] != "completed":
        return created
    board_id = created["result"]["board_id"]
    view_link = created["result"]["view_link"]

    items_created = 1
    failed: list[dict] = []

    for frame_spec in board.get("frames", []):
        frame_res = await add_frame(
            board_id=board_id,
            title=frame_spec.get("title", ""),
            x=int(frame_spec.get("x", 0)),
            y=int(frame_spec.get("y", 0)),
            width=int(frame_spec.get("width", 1500)),
            height=int(frame_spec.get("height", 1000)),
            header_color=frame_spec.get("header_color", "stone"),
        )
        if frame_res["status"] != "completed":
            failed.append({"frame": frame_spec.get("title"), "error": frame_res["error"]})
            continue
        frame_id = frame_res["result"]["frame_id"]
        items_created += 1

        for sticky_spec in frame_spec.get("stickies", []):
            # Miro v2 interprets parented item positions in frame-local
            # coordinates. Layouts are authored around the frame center, so
            # translate them into the positive frame box before parenting.
            sticky_x = (
                int(sticky_spec.get("x", 0))
                + int(frame_spec.get("width", 1500)) // 2
            )
            sticky_y = (
                int(sticky_spec.get("y", 0))
                + int(frame_spec.get("height", 1000)) // 2
            )
            sticky_res = await add_sticky(
                board_id=board_id,
                content=sticky_spec.get("content", ""),
                color=sticky_spec.get("color", "gray"),
                x=sticky_x,
                y=sticky_y,
                frame_id=frame_id,
                width=int(sticky_spec.get("width", 200)),
            )
            if sticky_res["status"] == "completed":
                items_created += 1
            else:
                failed.append(
                    {"sticky": sticky_spec.get("content", "")[:60], "error": sticky_res["error"]}
                )
            await asyncio.sleep(0.05)

    citation = board.get("citation")
    if citation:
        citation_text = (
            f"Source: {citation.get('portal', 'Unknown')} · "
            f"{citation.get('dataset_name', '')} ({citation.get('dataset_id', '')})\n"
            f"Last refreshed: {citation.get('last_refreshed', '—')}\n"
            f"{citation.get('url', '')}"
        )
        cite_res = await add_card(
            board_id=board_id,
            title="Citation",
            description=citation_text,
            x=0,
            y=2200,
        )
        if cite_res["status"] == "completed":
            items_created += 1

    return {
        "status": "completed" if not failed else "completed_with_errors",
        "result": {
            "board_id": board_id,
            "view_link": view_link,
            "items_created": items_created,
            "failed": failed,
        },
        "artifacts": [view_link],
        "error": None if not failed else f"{len(failed)} item(s) failed to render",
    }
