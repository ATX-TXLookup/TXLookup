"""Dataset scout — scans Texas Socrata-compatible portals on a 6h cron.

Scope (v0.1):
  - Hits each portal's public catalog API (`/api/views.json`) and pulls
    every dataset's id + name + updatedAt + rowCount.
  - Filters to NEW datasets (not in `data/scout/last_seen.json`) OR
    datasets refreshed since the last scout tick.
  - Scores each candidate on a basic quality rubric:
      + has at least 1 temporal column (ends with `_date` / `_timestamp` / `_at`)
      + has at least 1 geographic column (zip / address / lat / lon / district / county)
      + row count > 1000
      + freshness (updatedAt within last 30 days)
      + license is open / public-domain / unspecified-but-government
  - Top-N candidates above threshold get filed as GitHub issues with a
    suggested catalog entry (id, portal, key columns, sample questions).

Wire:
  - Run via `python -m agent.specialists.dataset_scout` (CLI in __main__).
  - GitHub Actions workflow at `.github/workflows/dataset-scout.yml`
    fires every 6h, runs this script, commits last_seen.json + opens
    issues for any candidate above threshold.
  - State: `data/scout/last_seen.json` per-portal map of dataset_id ->
    {first_seen, last_updated_at, last_scout_run}.

This is a deliberately small, safe v0.1: no automatic catalog mutation,
no automatic ingestion. Every candidate becomes a GitHub issue for a
human to review + merge into app/lib/catalog.ts.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

# Where the scout state lives. Committed back via the cron's bot account.
STATE_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "scout"
STATE_FILE = STATE_DIR / "last_seen.json"

# TX Socrata-compatible portals to scan.
PORTALS: list[dict[str, str]] = [
    {"host": "data.austintexas.gov", "city": "Austin"},
    {"host": "datahub.austintexas.gov", "city": "Austin"},
    {"host": "www.dallasopendata.com", "city": "Dallas"},
    {"host": "data.texas.gov", "city": "TX state"},
    # Future:
    # {"host": "data.sanantonio.gov", "city": "San Antonio"},
    # {"host": "data.houstontx.gov", "city": "Houston"},
]

# Quality-score threshold for issuing a candidate as a GitHub issue.
SCORE_THRESHOLD = 3
TOP_N_PER_RUN = 10
HTTP_TIMEOUT = 30


@dataclass
class Candidate:
    portal: str
    city: str
    dataset_id: str
    name: str
    description: str
    columns: list[dict[str, str]]
    row_count: int | None
    updated_at: str | None  # ISO
    license: str | None
    score: int
    reasons: list[str]


def _http_get_json(url: str) -> Any:
    """GET url with optional Socrata key headers; return parsed JSON or None."""
    req = urllib.request.Request(url)
    key_id = os.environ.get("SOCRATA_KEY_ID")
    key_secret = os.environ.get("SOCRATA_KEY_SECRET")
    if key_id and key_secret:
        import base64

        token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! fetch {url} → {e}", file=sys.stderr)
        return None


def list_portal_datasets(host: str, limit: int = 200) -> Iterable[dict]:
    """Pull `limit` most-recent datasets from a Socrata portal via the
    Discovery API (`api.us.socrata.com/api/catalog/v1`).

    Why Discovery API and not `/api/views.json`: the per-portal views.json
    catalog endpoint returns SUMMARIES that omit `columns` and `license`.
    Without column info, the temporal / geographic scoring signals can
    never fire (root cause of the zero-yield rubric, see #161). Discovery
    API inlines `columns_field_name` / `columns_datatype` / `columns_name`
    as parallel arrays per resource.

    Returns dicts normalized to the legacy views.json shape so the rest of
    the scoring code can stay unchanged: each dict has `id`, `name`,
    `description`, `columns` (list of {fieldName, name, dataTypeName}),
    `viewCount`, `downloadCount`, `rowsUpdatedAt` (epoch), `license`.
    """
    qs = urllib.parse.urlencode(
        {"domains": host, "limit": limit, "order": "page_views_last_month"}
    )
    url = f"https://api.us.socrata.com/api/catalog/v1?{qs}"
    data = _http_get_json(url)
    if not isinstance(data, dict):
        return []
    results = data.get("results") or []
    normalized: list[dict] = []
    for r in results:
        res = r.get("resource") or {}
        meta = r.get("metadata") or {}
        # Reconstruct columns from parallel arrays
        field_names = res.get("columns_field_name") or []
        display_names = res.get("columns_name") or []
        datatypes = res.get("columns_datatype") or []
        columns = []
        for i in range(max(len(field_names), len(display_names), len(datatypes))):
            columns.append(
                {
                    "fieldName": field_names[i] if i < len(field_names) else None,
                    "name": display_names[i] if i < len(display_names) else None,
                    "dataTypeName": (datatypes[i] if i < len(datatypes) else "").lower().replace(" ", "_") or None,
                }
            )
        # data_updated_at is ISO; convert to epoch for backward compat
        updated_iso = res.get("data_updated_at") or res.get("updatedAt")
        updated_epoch = None
        if updated_iso:
            try:
                updated_epoch = int(datetime.fromisoformat(updated_iso.replace("Z", "+00:00")).timestamp())
            except (ValueError, TypeError):
                pass
        page_views = res.get("page_views") or {}
        normalized.append(
            {
                "id": res.get("id"),
                "name": res.get("name") or "",
                "description": res.get("description") or "",
                "columns": columns,
                "viewCount": page_views.get("page_views_total") or 0,
                "downloadCount": res.get("download_count") or 0,
                "rowsUpdatedAt": updated_epoch,
                "license": meta.get("license"),
            }
        )
    return normalized


def detect_temporal_columns(columns: list[dict]) -> list[str]:
    out = []
    for c in columns:
        name = (c.get("fieldName") or c.get("name") or "").lower()
        dtype = (c.get("dataTypeName") or "").lower()
        if dtype in ("calendar_date", "date", "datetime", "timestamp"):
            out.append(name)
        elif name.endswith("_date") or name.endswith("_at") or name.endswith("_timestamp"):
            out.append(name)
    return out


def detect_geographic_columns(columns: list[dict]) -> list[str]:
    out = []
    for c in columns:
        name = (c.get("fieldName") or c.get("name") or "").lower()
        dtype = (c.get("dataTypeName") or "").lower()
        if dtype in ("point", "polygon", "multipoint", "location"):
            out.append(name)
        elif any(
            k in name
            for k in ("zip", "address", "latitude", "longitude", "district", "council", "county", "ward", "precinct", "geo")
        ):
            out.append(name)
    return out


def score_candidate(view: dict) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []
    cols = view.get("columns") or []
    rows = view.get("viewCount") or view.get("downloadCount")
    # Row count signal: viewCount is a proxy. Real row-count needs a
    # separate count(*) query which we don't do in the scout v0.1 — too expensive.
    if rows and rows > 100:
        score += 1
        reasons.append(f"viewCount={rows}")
    if detect_temporal_columns(cols):
        score += 1
        reasons.append("has temporal column")
    if detect_geographic_columns(cols):
        score += 1
        reasons.append("has geographic column")
    # Freshness: updatedAt within last 30 days
    updated = view.get("rowsUpdatedAt") or view.get("indexUpdatedAt")
    if updated:
        try:
            dt = datetime.fromtimestamp(int(updated), tz=timezone.utc)
            if (datetime.now(timezone.utc) - dt) < timedelta(days=30):
                score += 1
                reasons.append("refreshed in last 30d")
        except (ValueError, TypeError):
            pass
    # License: open / public-domain
    lic = (view.get("license") or {}).get("name") if isinstance(view.get("license"), dict) else view.get("license")
    if lic and isinstance(lic, str):
        if "public" in lic.lower() or "open" in lic.lower() or "cc" in lic.lower():
            score += 1
            reasons.append(f"license={lic}")
    return score, reasons


def to_candidate(view: dict, portal_host: str, portal_city: str) -> Candidate:
    cols = view.get("columns") or []
    score, reasons = score_candidate(view)
    updated = view.get("rowsUpdatedAt") or view.get("indexUpdatedAt")
    updated_iso = None
    if updated:
        try:
            updated_iso = datetime.fromtimestamp(int(updated), tz=timezone.utc).isoformat()
        except (ValueError, TypeError):
            pass
    lic = view.get("license")
    if isinstance(lic, dict):
        lic = lic.get("name")
    return Candidate(
        portal=portal_host,
        city=portal_city,
        dataset_id=view.get("id") or "",
        name=view.get("name") or "",
        description=(view.get("description") or "")[:500],
        columns=[
            {"name": c.get("fieldName") or c.get("name") or "", "type": c.get("dataTypeName") or ""}
            for c in cols[:30]
        ],
        row_count=None,  # not fetched in v0.1
        updated_at=updated_iso,
        license=lic,
        score=score,
        reasons=reasons,
    )


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"runs": [], "seen": {}}
    try:
        return json.loads(STATE_FILE.read_text())
    except json.JSONDecodeError:
        return {"runs": [], "seen": {}}


def save_state(state: dict) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def render_issue_body(c: Candidate) -> str:
    cols_md = "\n".join(f"- `{x['name']}` ({x['type']})" for x in c.columns[:12])
    if len(c.columns) > 12:
        cols_md += f"\n- _…{len(c.columns) - 12} more_"
    sample_qs = "\n".join(
        f"- {q}"
        for q in [
            f"What's in {c.name.lower()}?",
            f"Top values in {c.name.lower()} grouped by zip last 30 days",
            f"How has {c.name.lower()} trended year-over-year?",
            f"Compare {c.name.lower()} across the major cities",
        ]
    )
    reasons = ", ".join(c.reasons) or "—"
    return f"""## Scout candidate · `{c.portal}/{c.dataset_id}`

**{c.name}**

{c.description}

### Quality score: {c.score} / 5
Signals: {reasons}

### Suggested catalog entry

```ts
{{
  id: "{c.dataset_id}",
  title: "{c.name}",
  portal: "{c.portal}",
  city: "{c.city}",
  blurb: {json.dumps(c.description[:200])},
  keyColumns: [{', '.join(json.dumps(x['name']) for x in c.columns[:6])}],
  sample_questions: [
    "What's in {c.name.lower()}?",
    "Top values grouped by zip last 30 days",
    "Year-over-year trend",
    "Compare across cities"
  ],
}}
```

### Columns ({len(c.columns)})
{cols_md}

### Suggested sample questions
{sample_qs}

### Metadata
- Updated: `{c.updated_at or "unknown"}`
- License: `{c.license or "unspecified"}`
- Live URL: https://{c.portal}/d/{c.dataset_id}
- API URL: https://{c.portal}/resource/{c.dataset_id}.json

---
Auto-filed by the **dataset scout** at `agent/specialists/dataset_scout.py`. To merge: copy the suggested entry into `app/lib/catalog.ts` + `config/datasets.yaml`, run `pytest tests/test_catalog_integrity.py`.
"""


def scout_once(verbose: bool = False, force_all: bool = False) -> tuple[list[Candidate], dict]:
    state = load_state()
    seen: dict = state.get("seen", {})
    all_candidates: list[Candidate] = []
    run_started = datetime.now(timezone.utc).isoformat()
    score_histogram: dict[int, int] = {}

    for p in PORTALS:
        host, city = p["host"], p["city"]
        if verbose:
            print(f"→ scanning {host}", file=sys.stderr)
        views = list_portal_datasets(host)
        for view in views:
            ds_id = view.get("id")
            if not ds_id:
                continue
            updated = view.get("rowsUpdatedAt") or view.get("indexUpdatedAt") or 0
            seen_key = f"{host}/{ds_id}"
            already = seen.get(seen_key)
            is_new = already is None
            is_refreshed = (
                already is not None and updated and updated > already.get("last_updated_at", 0)
            )
            if not (is_new or is_refreshed) and not force_all:
                continue
            candidate = to_candidate(view, host, city)
            all_candidates.append(candidate)
            score_histogram[candidate.score] = score_histogram.get(candidate.score, 0) + 1
            if verbose:
                reasons_str = ", ".join(candidate.reasons) if candidate.reasons else "(none)"
                print(
                    f"  score={candidate.score}/5  {host}/{ds_id}  '{candidate.name[:50]}'  reasons: {reasons_str}",
                    file=sys.stderr,
                )
            if not force_all:
                seen[seen_key] = {
                    "first_seen": already.get("first_seen") if already else run_started,
                    "last_updated_at": updated,
                    "last_scout_run": run_started,
                }

    if verbose:
        hist_line = "  ".join(f"{s}:{score_histogram.get(s, 0)}" for s in range(6))
        print(f"\n  score histogram (score:count): {hist_line}", file=sys.stderr)

    # Filter + sort top-N
    qualified = [c for c in all_candidates if c.score >= SCORE_THRESHOLD]
    qualified.sort(key=lambda c: c.score, reverse=True)
    top = qualified[:TOP_N_PER_RUN]

    state["seen"] = seen
    runs = state.get("runs", [])
    runs.append(
        {
            "started_at": run_started,
            "candidates_total": len(all_candidates),
            "candidates_qualified": len(qualified),
            "candidates_filed": len(top),
        }
    )
    state["runs"] = runs[-50:]  # keep last 50

    return top, state


def main() -> int:
    parser = argparse.ArgumentParser(description="TXLookup dataset scout")
    parser.add_argument("--dry-run", action="store_true", help="Don't write state or output issue bodies")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--force-all", action="store_true", help="Score every dataset on the portal, ignoring seen-state cache (diagnostic)")
    parser.add_argument("--issue-bodies-out", default="data/scout/pending_issues.json", help="Where to dump pending issue bodies for the workflow to pick up")
    args = parser.parse_args()

    top, state = scout_once(verbose=args.verbose, force_all=args.force_all)
    print(f"Scout: {len(top)} candidate(s) above threshold {SCORE_THRESHOLD}", file=sys.stderr)
    for c in top:
        print(f"  · {c.portal}/{c.dataset_id}  score={c.score}  '{c.name[:60]}'", file=sys.stderr)

    if args.dry_run:
        print("Dry-run: not writing state or issue bodies.", file=sys.stderr)
        return 0

    # Persist state
    save_state(state)

    # Emit issue bodies for the GH workflow to consume + open
    issues = [
        {
            "title": f"scout-find: {c.name[:80]} · {c.portal}/{c.dataset_id} (score {c.score})",
            "body": render_issue_body(c),
            "labels": ["area:data", "scout-find"],
        }
        for c in top
    ]
    out_path = Path(args.issue_bodies_out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(issues, indent=2) + "\n")
    print(f"Wrote {len(issues)} pending issue(s) to {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
