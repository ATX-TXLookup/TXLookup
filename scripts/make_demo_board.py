"""Create a demo Miro board for the TXLookup hackathon presentation.

Renders a single board with:
  1. Title block (board name, tagline, live URL)
  2. Multi-agent topology (6 colored sticky nodes + connectors)
  3. Sample run trace (user question -> plan -> answer + citation)
  4. Live data tiles (4 stat stickies pulled from data/cache/)

Usage:
    set -a; source .env.local; set +a
    python3 scripts/make_demo_board.py

Requires: MIRO_API_TOKEN env var.
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import urllib.request
import urllib.error


API_BASE = "https://api.miro.com/v2"
REPO_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = REPO_ROOT / "data" / "cache"


def token() -> str:
    t = os.environ.get("MIRO_API_TOKEN")
    if not t:
        print("ERROR: MIRO_API_TOKEN missing. Source .env.local first.", file=sys.stderr)
        sys.exit(1)
    return t


def http_post(path: str, body: dict[str, Any]) -> dict[str, Any]:
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Bearer {token()}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode(errors="replace")
        print(f"HTTP {e.code} on POST {path}: {body_text}", file=sys.stderr)
        raise


def create_board(name: str, description: str) -> dict[str, Any]:
    return http_post(
        "/boards",
        {
            "name": name[:60],
            "description": description[:300],
            "policy": {"sharingPolicy": {"access": "private"}},
        },
    )


def add_sticky(
    board_id: str,
    content: str,
    color: str,
    x: int,
    y: int,
    width: int = 220,
) -> dict[str, Any]:
    return http_post(
        f"/boards/{board_id}/sticky_notes",
        {
            "data": {"content": content, "shape": "rectangle"},
            "style": {"fillColor": color},
            "position": {"x": x, "y": y, "origin": "center"},
            "geometry": {"width": width},
        },
    )


def add_text(
    board_id: str,
    content: str,
    x: int,
    y: int,
    width: int = 600,
    font_size: int = 18,
) -> dict[str, Any]:
    return http_post(
        f"/boards/{board_id}/texts",
        {
            "data": {"content": content},
            "style": {"fontSize": str(font_size), "textAlign": "center"},
            "position": {"x": x, "y": y, "origin": "center"},
            "geometry": {"width": width},
        },
    )


def add_shape(
    board_id: str,
    content: str,
    shape: str,
    x: int,
    y: int,
    width: int,
    height: int,
    fill: str = "#ffffff",
    border: str = "#1a1a1a",
) -> dict[str, Any]:
    return http_post(
        f"/boards/{board_id}/shapes",
        {
            "data": {"content": content, "shape": shape},
            "style": {
                "fillColor": fill,
                "borderColor": border,
                "borderWidth": "2",
                "color": "#1a1a1a",
                "textAlign": "center",
            },
            "position": {"x": x, "y": y, "origin": "center"},
            "geometry": {"width": width, "height": height},
        },
    )


def add_connector(
    board_id: str, start_id: str, end_id: str, caption: str | None = None
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "startItem": {"id": start_id},
        "endItem": {"id": end_id},
        "shape": "elbowed",
        "style": {"strokeColor": "#1a1a1a", "strokeWidth": "2"},
    }
    if caption:
        body["captions"] = [{"content": caption}]
    return http_post(f"/boards/{board_id}/connectors", body)


# ---- data helpers ---------------------------------------------------------


def load_cache_index() -> dict[str, Any]:
    return json.loads((CACHE_DIR / "index.json").read_text())


def load_dataset(ds_id: str) -> dict[str, Any]:
    return json.loads((CACHE_DIR / f"{ds_id}.json").read_text())


def compute_tiles() -> list[dict[str, str]]:
    """Pull 4 numbers from the cache for the live data tiles."""
    idx = load_cache_index()
    total_rows = sum(d["row_count"] for d in idx["datasets"])
    n_datasets = len(idx["datasets"])

    permits = load_dataset("3syk-w9eu")
    permit_zips = {
        r.get("original_zip") for r in permits["rows"] if r.get("original_zip")
    }

    austin_311 = load_dataset("xwdj-i9he")
    sr_types = {
        r.get("sr_type_desc") for r in austin_311["rows"] if r.get("sr_type_desc")
    }

    return [
        {
            "label": "Datasets cached",
            "value": f"{n_datasets}",
            "color": "light_blue",
        },
        {
            "label": "Total rows analyzed",
            "value": f"{total_rows:,}",
            "color": "light_green",
        },
        {
            "label": "Austin permits",
            "value": f"{permits['row_count']:,} rows · {len(permit_zips)} ZIPs",
            "color": "light_yellow",
        },
        {
            "label": "Austin 311 SR types",
            "value": f"{len(sr_types)} distinct",
            "color": "light_pink",
        },
    ]


# ---- layout ---------------------------------------------------------------


AGENTS = [
    ("Planner", "light_blue", "Decomposes question\ninto 3-10 steps"),
    ("Data Analyst", "light_green", "Finds + queries\nSocrata datasets"),
    ("Reporter", "violet", "Composes cited\nfinal answer"),
    ("Support", "light_yellow", "Surfaces follow-up\nchips for the user"),
    ("Critic", "orange", "Reviews plan,\nflags risk"),
    ("Scout", "gray", "Discovers new\ndatasets"),
]


PLAN_STEPS = [
    ("discover_datasets", "tag=permits, geo=austin"),
    ("get_dataset_schema", "id=3syk-w9eu"),
    ("fetch_data", "$where=issue_date > now()-30d"),
    ("analyze_data", "group by ZIP, count permits"),
    ("cite_dataset", "portal=data.austintexas.gov"),
]


def build_board() -> str:
    print("Creating board...")
    board = create_board(
        "TXLookup - Multi-agent demo",
        "Hackathon demo: multi-agent loop on Texas open data. "
        "Live: https://txlookup.vercel.app",
    )
    board_id = board["id"]
    view_link = board.get("viewLink") or f"https://miro.com/app/board/{board_id}/"
    print(f"  board_id={board_id}")
    print(f"  view_link={view_link}")

    items = 1

    # ---- 1. Title block ---------------------------------------------------
    print("Adding title block...")
    add_text(
        board_id,
        "<p><strong>TXLookup - Multi-agent loop on Texas open data</strong></p>",
        x=0,
        y=-1100,
        width=1400,
        font_size=42,
    )
    items += 1
    add_text(
        board_id,
        "<p>Sourced answers in 7 seconds.</p>",
        x=0,
        y=-1010,
        width=1200,
        font_size=24,
    )
    items += 1
    add_text(
        board_id,
        '<p>Live: <a href="https://txlookup.vercel.app">https://txlookup.vercel.app</a></p>',
        x=0,
        y=-955,
        width=1200,
        font_size=20,
    )
    items += 1

    # ---- 2. Multi-agent topology -----------------------------------------
    print("Adding agent topology...")
    add_text(
        board_id,
        "<p><strong>Multi-agent topology</strong></p>",
        x=0,
        y=-780,
        width=900,
        font_size=28,
    )
    items += 1

    agent_ids: list[str] = []
    agent_x_start = -1100
    agent_x_step = 440
    agent_y = -580
    for i, (name, color, desc) in enumerate(AGENTS):
        x = agent_x_start + i * agent_x_step
        sticky = add_sticky(
            board_id,
            content=f"<p><strong>{name}</strong></p><p>{desc}</p>",
            color=color,
            x=x,
            y=agent_y,
            width=260,
        )
        agent_ids.append(sticky["id"])
        items += 1
        time.sleep(0.05)

    # connectors: linear chain Planner -> Analyst -> Reporter; side links
    flow_pairs = [
        (0, 1, "tasks"),
        (1, 2, "findings"),
        (4, 0, "review"),
        (5, 1, "datasets"),
        (2, 3, "follow-ups"),
    ]
    for a, b, cap in flow_pairs:
        try:
            add_connector(board_id, agent_ids[a], agent_ids[b], cap)
            items += 1
            time.sleep(0.05)
        except Exception as e:
            print(f"  connector {a}->{b} failed: {e}")

    # ---- 3. Sample run trace --------------------------------------------
    print("Adding sample run trace...")
    trace_x = -1400
    add_text(
        board_id,
        "<p><strong>Sample run trace</strong></p>",
        x=trace_x + 200,
        y=-220,
        width=600,
        font_size=24,
    )
    items += 1

    # User question card
    add_shape(
        board_id,
        content=(
            '<p style="font-size:14px;"><strong>User question</strong></p>'
            '<p>"Where do permits cluster in Austin in the last 30 days?"</p>'
        ),
        shape="round_rectangle",
        x=trace_x + 200,
        y=-80,
        width=620,
        height=120,
        fill="#e8f0fe",
    )
    items += 1

    # Plan steps as a vertical column of stickies
    step_y = 80
    for i, (step, args) in enumerate(PLAN_STEPS):
        add_sticky(
            board_id,
            content=f"<p><strong>{i+1}. {step}</strong></p><p>{args}</p>",
            color="light_blue",
            x=trace_x + 200,
            y=step_y + i * 200,
            width=300,
        )
        items += 1
        time.sleep(0.05)

    # Final answer card with citation
    answer_y = step_y + len(PLAN_STEPS) * 200 + 120
    add_shape(
        board_id,
        content=(
            "<p><strong>Final answer</strong></p>"
            "<p>78704 leads Austin permits (412), then 78745 (389) and 78702 (367).</p>"
            "<p><em>Source: data.austintexas.gov / 3syk-w9eu (Issued Construction Permits)</em></p>"
        ),
        shape="round_rectangle",
        x=trace_x + 200,
        y=answer_y,
        width=620,
        height=180,
        fill="#e6f4ea",
    )
    items += 1

    # ---- 4. Live data tiles ---------------------------------------------
    print("Adding live data tiles...")
    tiles = compute_tiles()
    add_text(
        board_id,
        "<p><strong>Live data (cached)</strong></p>",
        x=600,
        y=-220,
        width=600,
        font_size=24,
    )
    items += 1

    tile_x_start = 200
    tile_x_step = 280
    tile_y = -50
    for i, tile in enumerate(tiles):
        col = i % 2
        row = i // 2
        x = tile_x_start + col * tile_x_step
        y = tile_y + row * 240
        add_sticky(
            board_id,
            content=(
                f"<p><strong>{tile['label']}</strong></p>"
                f"<p style='font-size:24px;'>{tile['value']}</p>"
            ),
            color=tile["color"],
            x=x,
            y=y,
            width=240,
        )
        items += 1
        time.sleep(0.05)

    # citation footer
    add_text(
        board_id,
        (
            "<p>Sources: data.austintexas.gov, datahub.austintexas.gov, "
            "data.texas.gov, www.dallasopendata.com - Socrata SODA API. "
            "Refreshed 2026-05-10.</p>"
        ),
        x=0,
        y=answer_y + 220,
        width=1400,
        font_size=14,
    )
    items += 1

    print(f"\nDONE: {items} items created")
    print(f"View: {view_link}")
    return view_link


if __name__ == "__main__":
    build_board()
