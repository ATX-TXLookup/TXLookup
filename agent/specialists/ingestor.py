"""Ingestor — populates the SQLite cache from live Socrata.

Run via `python -m agent.specialists.ingestor` (CLI). Designed to be cron-driven
via .github/workflows/ingestor.yml (every 6 hours offset from the dataset scout).

For each catalog dataset, paginates through SODA, writes curated columns into
data/cache.db, updates cache_meta with last_ingested timestamps. Keeps the
write-side simple: one query per dataset (recent N rows for fast access).

This is the WRITE side. The READ side lives in app/lib/cache.ts (sql.js).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

CACHE_DB = Path(__file__).resolve().parent.parent.parent / "data" / "cache.db"

# Datasets to ingest. Per-dataset: portal, primary id, columns, ORDER BY,
# how many recent rows to keep in cache.
INGEST_SPEC: list[dict[str, Any]] = [
    {
        "dataset_id": "3syk-w9eu",
        "portal": "data.austintexas.gov",
        "select": "permit_number,permittype,permit_class_mapped,status_current,original_address1,original_zip,issue_date,total_existing_bldg_sqft",
        "order": "issue_date DESC",
        "limit": 5000,
    },
    {
        "dataset_id": "ecmv-9xxi",
        "portal": "data.austintexas.gov",
        "select": "restaurant_name,score,address,zip_code,inspection_date,facility_id",
        "order": "inspection_date DESC",
        "limit": 2000,
    },
    {
        "dataset_id": "xwdj-i9he",
        "portal": "datahub.austintexas.gov",
        "select": "sr_type_desc,sr_status_desc,sr_location_zip_code,sr_council_district,sr_created_date,sr_department_desc",
        "order": "sr_created_date DESC",
        "limit": 5000,
    },
    {
        "dataset_id": "6wtj-zbtb",
        "portal": "data.austintexas.gov",
        "select": "case_id,case_type,status,address,zip_code,opened_date,priority,department",
        "order": "opened_date DESC",
        "limit": 3000,
    },
]

HTTP_TIMEOUT = 60


def _http_get_json(url: str) -> Any:
    req = urllib.request.Request(url)
    key_id = os.environ.get("SOCRATA_KEY_ID")
    key_secret = os.environ.get("SOCRATA_KEY_SECRET")
    if key_id and key_secret:
        import base64

        token = base64.b64encode(f"{key_id}:{key_secret}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as r:
        return json.loads(r.read().decode("utf-8"))


def _normalize_query(dataset_id: str, params: dict[str, Any]) -> str:
    ordered = {k: params[k] for k in sorted(params.keys())}
    payload = {"datasetId": dataset_id, **ordered}
    return json.dumps(payload, separators=(",", ":"))


def _hash_query(dataset_id: str, params: dict[str, Any]) -> str:
    return hashlib.sha256(_normalize_query(dataset_id, params).encode()).hexdigest()[:24]


def _open_db() -> sqlite3.Connection:
    CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(CACHE_DB)
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS cache_meta (
          dataset_id TEXT PRIMARY KEY,
          last_ingested INTEGER NOT NULL,
          row_count INTEGER NOT NULL,
          schema_hash TEXT
        );
        CREATE TABLE IF NOT EXISTS cache_query (
          query_hash TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          row_count INTEGER NOT NULL,
          fetched_at INTEGER NOT NULL,
          ttl_seconds INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_cache_query_ds ON cache_query(dataset_id);
        """
    )
    return db


def _per_dataset_ttl(dataset_id: str) -> int:
    return {
        "3syk-w9eu": 3600,
        "ecmv-9xxi": 86400,
        "xwdj-i9he": 3600,
        "6wtj-zbtb": 86400,
        "fdj4-gpfu": 86400 * 7,
        "y2wy-tgr5": 86400 * 30,
        "9cir-efmm": 86400 * 7,
    }.get(dataset_id, 3600)


def ingest_one(spec: dict[str, Any], db: sqlite3.Connection, verbose: bool = False) -> dict[str, Any]:
    qs = urllib.parse.urlencode(
        {"$select": spec["select"], "$order": spec["order"], "$limit": spec["limit"]}
    )
    url = f"https://{spec['portal']}/resource/{spec['dataset_id']}.json?{qs}"
    if verbose:
        print(f"  → {spec['dataset_id']}", file=sys.stderr)
    try:
        rows = _http_get_json(url)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        return {"ok": False, "dataset_id": spec["dataset_id"], "error": str(e)}
    if not isinstance(rows, list):
        return {"ok": False, "dataset_id": spec["dataset_id"], "error": "unexpected response shape"}

    # Write the canonical query envelope (this is what cache_lookup reads).
    cache_params = {
        "select": spec["select"],
        "order": spec["order"],
        "limit": spec["limit"],
    }
    query_hash = _hash_query(spec["dataset_id"], cache_params)
    now_ts = int(datetime.now(tz=timezone.utc).timestamp())
    ttl = _per_dataset_ttl(spec["dataset_id"])

    db.execute(
        """
        INSERT INTO cache_query (query_hash, dataset_id, payload, row_count, fetched_at, ttl_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(query_hash) DO UPDATE SET
          payload = excluded.payload,
          row_count = excluded.row_count,
          fetched_at = excluded.fetched_at,
          ttl_seconds = excluded.ttl_seconds
        """,
        (query_hash, spec["dataset_id"], json.dumps(rows), len(rows), now_ts, ttl),
    )

    # Also write a "headline" empty-params query so a generic cache lookup
    # without specific args can find SOMETHING. Useful for the Status tile
    # on /datasets that wants any row count.
    headline_hash = _hash_query(spec["dataset_id"], {})
    db.execute(
        """
        INSERT INTO cache_query (query_hash, dataset_id, payload, row_count, fetched_at, ttl_seconds)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(query_hash) DO UPDATE SET
          payload = excluded.payload,
          row_count = excluded.row_count,
          fetched_at = excluded.fetched_at,
          ttl_seconds = excluded.ttl_seconds
        """,
        (headline_hash, spec["dataset_id"], json.dumps(rows[:10]), len(rows), now_ts, ttl),
    )

    db.execute(
        """
        INSERT INTO cache_meta (dataset_id, last_ingested, row_count, schema_hash)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(dataset_id) DO UPDATE SET
          last_ingested = excluded.last_ingested,
          row_count = excluded.row_count,
          schema_hash = excluded.schema_hash
        """,
        (spec["dataset_id"], now_ts, len(rows), hashlib.md5(spec["select"].encode()).hexdigest()[:12]),
    )
    db.commit()
    return {"ok": True, "dataset_id": spec["dataset_id"], "row_count": len(rows)}


def main() -> int:
    parser = argparse.ArgumentParser(description="TXLookup cache ingestor")
    parser.add_argument("--dataset", help="Single dataset id (default: all)")
    parser.add_argument("--all", action="store_true", help="Ingest all known datasets")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    specs = INGEST_SPEC
    if args.dataset:
        specs = [s for s in INGEST_SPEC if s["dataset_id"] == args.dataset]

    db = _open_db()
    results = []
    for spec in specs:
        results.append(ingest_one(spec, db, verbose=args.verbose))
    db.close()

    summary = {
        "ingested_at": datetime.now(tz=timezone.utc).isoformat(),
        "datasets": results,
        "ok": all(r["ok"] for r in results),
    }
    print(json.dumps(summary, indent=2))
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
