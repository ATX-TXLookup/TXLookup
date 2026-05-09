"""
Open data ingestion tool — Socrata SODA API client for TX/Austin portals.
This is the primary data tool for TXLookup.

Portals:
  - data.austintexas.gov (Austin city data)
  - data.texas.gov (Texas state data)
  - data.census.gov (US Census for TX)

Reference: https://dev.socrata.com/docs/queries/
Reference: prompts/data.md for full SODA query patterns
"""

from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx
import yaml

from agent.models import Citation, Column, Dataset, Schema


KNOWN_PORTALS = {
    "austin": "data.austintexas.gov",
    "texas": "data.texas.gov",
    "census": "data.census.gov",
}

# Human labels for the portals — used by ``cite()`` so output reads naturally.
PORTAL_LABELS = {
    "data.austintexas.gov": "City of Austin",
    "data.texas.gov": "State of Texas",
    "data.census.gov": "US Census Bureau",
}

# Socrata app token for higher rate limits (optional)
SOCRATA_APP_TOKEN = os.getenv("SOCRATA_APP_TOKEN", "")

# Hard caps for the bounded SODA wrapper — see skills/txlookup/SKILL.md.
MAX_LIMIT = 5000
HTTP_TIMEOUT = 30.0
BACKOFF_SECONDS = (1, 3, 10)

# Catalog lives at config/datasets.yaml relative to the repo root.
_REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = _REPO_ROOT / "config" / "datasets.yaml"

# Tokens that don't help discriminate between datasets — strip from the bag-of-words.
_STOP_WORDS = {
    "a", "an", "and", "the", "of", "in", "on", "at", "for", "to", "with",
    "by", "from", "is", "are", "was", "were", "be", "been", "show", "me",
    "all", "data", "dataset", "datasets", "list", "find", "get", "give",
    "tell", "about", "what", "where", "when", "how", "many", "any", "this",
    "that", "these", "those", "i", "we", "you", "my", "our",
}

_TOKEN_RE = re.compile(r"[a-z0-9]+")


def _socrata_headers() -> dict:
    """Get Socrata API headers."""
    headers = {"Accept": "application/json"}
    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
    return headers


# --------------------------------------------------------------------------- #
# soda_query — bounded async Socrata fetch with backoff                       #
# --------------------------------------------------------------------------- #


async def soda_query(
    portal: str,
    dataset_id: str,
    where: Optional[str] = None,
    select: Optional[str] = None,
    group_by: Optional[str] = None,
    order_by: Optional[str] = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """Run a bounded Socrata SODA query.

    Args:
        portal: Portal host (e.g. ``data.austintexas.gov``) or shortname (``austin``).
        dataset_id: Socrata dataset ID (e.g. ``3syk-w9eu``).
        where: SoQL ``$where`` clause.
        select: SoQL ``$select`` clause (column list or aggregates).
        group_by: SoQL ``$group`` clause.
        order_by: SoQL ``$order`` clause.
        limit: Row cap. Hard ceiling at ``MAX_LIMIT`` — anything larger raises
            ``ValueError`` so the agent can ask the user to narrow the query.

    Returns:
        ``{"status": "completed"|"failed", "result": {"records": [...], "url": "..."}, "error": Optional[str]}``.
    """
    if limit > MAX_LIMIT:
        raise ValueError(
            f"limit={limit} exceeds hard cap of {MAX_LIMIT} — narrow the query "
            "or paginate via offset"
        )

    base_url = KNOWN_PORTALS.get(portal, portal)
    url = f"https://{base_url}/resource/{dataset_id}.json"

    params: dict[str, Any] = {"$limit": limit}
    if where:
        params["$where"] = where
    if select:
        params["$select"] = select
    if group_by:
        params["$group"] = group_by
    if order_by:
        params["$order"] = order_by

    last_err: Optional[str] = None
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            for attempt, delay in enumerate((0,) + BACKOFF_SECONDS):
                if delay:
                    await asyncio.sleep(delay)
                resp = await client.get(
                    url, params=params, headers=_socrata_headers()
                )
                if resp.status_code == 429:
                    last_err = f"HTTP 429 (attempt {attempt + 1})"
                    continue
                resp.raise_for_status()
                records = resp.json()
                return {
                    "status": "completed",
                    "result": {
                        "records": records,
                        "url": str(resp.request.url),
                    },
                    "error": None,
                }
            return {
                "status": "failed",
                "result": None,
                "error": f"rate-limited after {len(BACKOFF_SECONDS) + 1} attempts: {last_err}",
            }
    except Exception as e:  # noqa: BLE001 — structured return, never crash the loop
        return {"status": "failed", "result": None, "error": str(e)}


# --------------------------------------------------------------------------- #
# discover — NL string → ranked Dataset candidates from the YAML catalog       #
# --------------------------------------------------------------------------- #


def _tokenize(text: str) -> set[str]:
    """Lowercase + strip stop-words → set of tokens for Jaccard scoring."""
    return {
        t for t in _TOKEN_RE.findall(text.lower())
        if t and t not in _STOP_WORDS
    }


def _load_catalog() -> list[Dataset]:
    """Flatten ``config/datasets.yaml`` into a list of Dataset entries."""
    if not CATALOG_PATH.exists():
        return []
    with CATALOG_PATH.open("r", encoding="utf-8") as f:
        raw = yaml.safe_load(f) or {}

    out: list[Dataset] = []
    for city, block in raw.items():
        if not isinstance(block, dict):
            continue
        default_portal = block.get("portal", "")
        for slug, entry in (block.get("datasets") or {}).items():
            if not isinstance(entry, dict):
                continue
            out.append(
                Dataset(
                    id=str(entry.get("id", "")),
                    name=str(entry.get("name", slug)),
                    portal=str(entry.get("portal") or default_portal),
                    key_columns=list(entry.get("key_columns") or []),
                    updated=str(entry.get("updated", "")),
                    city=city,
                )
            )
    return out


def _score(query_tokens: set[str], ds: Dataset, slug_tokens: set[str]) -> float:
    """Jaccard score between query tokens and dataset's bag-of-words."""
    bag = set(slug_tokens)
    bag |= _tokenize(ds.name)
    bag |= _tokenize(" ".join(ds.key_columns))
    if ds.city:
        bag.add(ds.city.lower())
    if not query_tokens or not bag:
        return 0.0
    inter = query_tokens & bag
    union = query_tokens | bag
    return len(inter) / len(union)


def discover(query: str, city: Optional[str] = None) -> list[Dataset]:
    """Match an NL query to ranked candidates from the dataset catalog.

    v1 = simple Jaccard over tokenized {yaml-key, name, key_columns, city}.
    Embedding-based ranking is deferred to a follow-up issue.

    Args:
        query: Natural-language description of what the user wants.
        city: Optional filter — when provided, only datasets in that city block
            (e.g. ``"austin"``, ``"texas"``) are scored.

    Returns:
        Ranked list of Datasets, highest score first. Datasets with score 0
        are dropped so callers can rely on ``[0]`` being a real match.
    """
    catalog = _load_catalog()
    if city:
        catalog = [d for d in catalog if (d.city or "").lower() == city.lower()]

    q_tokens = _tokenize(query)
    if not q_tokens:
        return []

    # Re-derive the slug tokens by walking the YAML once — cheaper than
    # mutating Dataset to carry slug separately.
    raw = {}
    if CATALOG_PATH.exists():
        with CATALOG_PATH.open("r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
    slug_lookup: dict[str, set[str]] = {}
    for _city, block in raw.items():
        for slug, entry in ((block or {}).get("datasets") or {}).items():
            if isinstance(entry, dict) and entry.get("id"):
                slug_lookup[str(entry["id"])] = _tokenize(slug.replace("_", " "))

    scored: list[Dataset] = []
    for ds in catalog:
        s = _score(q_tokens, ds, slug_lookup.get(ds.id, set()))
        if s > 0:
            scored.append(ds.model_copy(update={"score": s}))

    scored.sort(key=lambda d: d.score, reverse=True)
    return scored


# --------------------------------------------------------------------------- #
# describe — Socrata metadata + a tiny sample row pull                         #
# --------------------------------------------------------------------------- #


def _portal_for(dataset_id: str) -> str:
    """Best-effort: look up the portal for a dataset_id from the catalog."""
    for ds in _load_catalog():
        if ds.id == dataset_id:
            return ds.portal
    # Default to Austin — the bulk of curated datasets live there.
    return KNOWN_PORTALS["austin"]


async def describe(dataset_id: str, portal: Optional[str] = None) -> Schema:
    """Return live schema + sample rows for a Socrata dataset.

    Hits ``https://{portal}/api/views/{dataset_id}.json`` for column metadata
    and pulls a 5-row sample via ``soda_query`` for "what does this data look
    like" prompts.

    Args:
        dataset_id: Socrata dataset ID (e.g. ``3syk-w9eu``).
        portal: Optional portal host. If omitted, looked up from the catalog,
            falling back to Austin.

    Returns:
        Populated ``Schema`` model. On failure, fields default to empty —
        ``name`` will contain an ``[error: ...]`` marker so the agent can
        surface the problem instead of silently emitting an empty schema.
    """
    host = KNOWN_PORTALS.get(portal, portal) if portal else _portal_for(dataset_id)
    meta_url = f"https://{host}/api/views/{dataset_id}.json"

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.get(meta_url, headers=_socrata_headers())
            resp.raise_for_status()
            meta = resp.json()
    except Exception as e:  # noqa: BLE001
        return Schema(
            id=dataset_id,
            name=f"[error: {e}]",
            portal=host,
            url=meta_url,
        )

    columns = [
        Column(
            name=c.get("fieldName") or c.get("name", ""),
            type=c.get("dataTypeName", ""),
            description=c.get("description", "") or "",
            display_name=c.get("name", "") or "",
        )
        for c in meta.get("columns", [])
    ]

    # Best-effort sample pull — don't let it tank the whole describe() call.
    sample_rows: list[dict[str, Any]] = []
    try:
        sample = await soda_query(host, dataset_id, limit=5)
        if sample.get("status") == "completed":
            sample_rows = sample["result"]["records"]
    except Exception:  # noqa: BLE001
        pass

    return Schema(
        id=dataset_id,
        name=meta.get("name", ""),
        portal=host,
        description=meta.get("description", "") or "",
        columns=columns,
        sample_rows=sample_rows,
        row_count=_extract_row_count(meta),
        last_updated=meta.get("rowsUpdatedAt") or meta.get("viewLastModified"),
        url=meta_url,
    )


def _extract_row_count(meta: dict) -> Optional[int]:
    """Socrata stores row counts in a few possible places."""
    for key in ("rowsCount", "rowCount"):
        val = meta.get(key)
        if isinstance(val, int):
            return val
    for col in meta.get("columns", []):
        cs = col.get("cachedContents") or {}
        if "non_null" in cs and "null" in cs:
            try:
                return int(cs["non_null"]) + int(cs["null"])
            except (TypeError, ValueError):
                continue
    return None


# --------------------------------------------------------------------------- #
# summarize — group + count via SoQL (issue #6)                                #
# --------------------------------------------------------------------------- #


async def summarize(
    dataset_id: str,
    *,
    where: Optional[str] = None,
    dimensions: list[str],
    portal: Optional[str] = None,
    limit: int = 1000,
) -> dict[str, Any]:
    """Group + count via SoQL. Cheaper than fetching rows.

    Builds ``$select=<dims>, count(*) AS count`` and ``$group=<dims>`` then
    delegates to ``soda_query``. Always includes the resolved Socrata URL in
    both ``result.url`` and ``artifacts`` so callers can cite the exact query.

    Args:
        dataset_id: Socrata dataset ID (e.g. ``3syk-w9eu``).
        where: Optional SoQL ``$where`` clause.
        dimensions: One or more column names to group by. Required — empty
            list returns a ``failed`` status with a clear error.
        portal: Optional portal host or shortname. If omitted, looked up from
            the catalog (falling back to Austin).
        limit: Row cap on the grouped result set. Defaults to 1000.

    Returns:
        ``{
          "status": "completed" | "failed",
          "result": {
            "dimensions": [...],
            "rows": [{"<dim>": ..., "count": <int>}, ...],
            "url": "<resolved socrata url>"
          },
          "artifacts": ["<the url>"],
          "error": Optional[str]
        }``

    Empty result sets return ``rows: []`` with status ``completed`` — an
    empty group-by is a valid answer (e.g. zip + permit-type combination
    that has no records), not an error.
    """
    if not dimensions:
        return {
            "status": "failed",
            "result": None,
            "artifacts": [],
            "error": "dimensions must contain at least one column name",
        }

    host = (
        KNOWN_PORTALS.get(portal, portal) if portal
        else _portal_for(dataset_id)
    )

    dims_clause = ", ".join(dimensions)
    select_clause = f"{dims_clause}, count(*) AS count"
    group_clause = dims_clause
    # Order by count desc so the most common bucket comes back first — the
    # natural "top X" framing for grouped queries.
    order_clause = "count DESC"

    try:
        out = await soda_query(
            portal=host,
            dataset_id=dataset_id,
            where=where,
            select=select_clause,
            group_by=group_clause,
            order_by=order_clause,
            limit=limit,
        )
    except Exception as e:  # noqa: BLE001 — keep the loop alive
        return {
            "status": "failed",
            "result": None,
            "artifacts": [],
            "error": str(e),
        }

    if out.get("status") != "completed":
        return {
            "status": "failed",
            "result": None,
            "artifacts": [],
            "error": out.get("error") or "soda_query failed",
        }

    raw_rows = out["result"].get("records") or []
    # Coerce count → int so downstream callers don't have to. Socrata
    # returns aggregates as strings.
    rows: list[dict[str, Any]] = []
    for r in raw_rows:
        row = dict(r)
        if "count" in row:
            try:
                row["count"] = int(row["count"])
            except (TypeError, ValueError):
                pass
        rows.append(row)

    url = out["result"].get("url", "")

    return {
        "status": "completed",
        "result": {
            "dimensions": list(dimensions),
            "rows": rows,
            "url": url,
        },
        "artifacts": [url] if url else [],
        "error": None,
    }


# --------------------------------------------------------------------------- #
# cite + cite_with_freshness — stable attribution (issue #7)                   #
# --------------------------------------------------------------------------- #


def _portal_label(host: str) -> str:
    """Map a portal host to a human-readable label.

    Falls back to the host itself if we don't have a label registered.
    """
    return PORTAL_LABELS.get(host, host)


def _catalog_entry(dataset_id: str) -> Dataset:
    """Look up a Dataset by id in the catalog, raising KeyError if absent."""
    for ds in _load_catalog():
        if ds.id == dataset_id:
            return ds
    raise KeyError(
        f"dataset_id={dataset_id!r} not found in config/datasets.yaml — "
        "add it to the catalog before citing"
    )


def cite(dataset_id: str, *, portal: Optional[str] = None) -> Citation:
    """Return a stable citation for a dataset. Sync — pulls from the catalog
    only, no network call.

    Args:
        dataset_id: Socrata dataset ID. Must be present in
            ``config/datasets.yaml``.
        portal: Optional portal host or shortname. When provided, overrides
            the catalog's portal — useful for datasets that exist on
            multiple portals.

    Returns:
        Populated ``Citation`` with ``last_refreshed=None``. Use
        ``cite_with_freshness()`` if you need the freshness stamp.

    Raises:
        KeyError: If ``dataset_id`` isn't in the catalog.
    """
    ds = _catalog_entry(dataset_id)

    host = (
        KNOWN_PORTALS.get(portal, portal) if portal
        else (ds.portal or KNOWN_PORTALS["austin"])
    )

    return Citation(
        portal=_portal_label(host),
        portal_host=host,
        dataset_name=ds.name,
        dataset_id=ds.id,
        url=f"https://{host}/d/{ds.id}",
        api_url=f"https://{host}/resource/{ds.id}.json",
        last_refreshed=None,
    )


def _coerce_last_refreshed(ts: Any) -> Optional[str]:
    """Best-effort convert Socrata's ``last_updated`` into ISO-8601.

    Socrata stores it as a unix epoch (int seconds). Strings get returned
    as-is — they're already a portal-provided format and rejecting them
    would lose information.
    """
    if ts is None:
        return None
    if isinstance(ts, (int, float)):
        try:
            return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()
        except (ValueError, OSError, OverflowError):
            return None
    if isinstance(ts, str):
        return ts
    return None


async def cite_with_freshness(
    dataset_id: str,
    *,
    portal: Optional[str] = None,
) -> Citation:
    """Same as ``cite()`` but also calls ``describe()`` to populate
    ``last_refreshed``.

    Falls back to the bare ``cite()`` Citation if the metadata fetch fails —
    a missing freshness stamp is a soft warning, not a fatal error.

    Args:
        dataset_id: Socrata dataset ID.
        portal: Optional portal host or shortname.

    Returns:
        ``Citation`` with ``last_refreshed`` populated when the portal
        reports it; ``None`` otherwise.

    Raises:
        KeyError: If ``dataset_id`` isn't in the catalog.
    """
    base = cite(dataset_id, portal=portal)

    try:
        schema = await describe(dataset_id, portal=portal or base.portal_host)
    except Exception:  # noqa: BLE001
        return base

    fresh = _coerce_last_refreshed(schema.last_updated)
    if fresh is None:
        return base
    return base.model_copy(update={"last_refreshed": fresh})


# --------------------------------------------------------------------------- #
# Legacy wrappers — kept so other in-flight branches don't break               #
# --------------------------------------------------------------------------- #


async def data_discover(query: str, portal: str = "austin") -> dict[str, Any]:
    """Legacy wrapper around ``discover()``.

    Returns the structured-tool dict shape. ``portal`` here is treated as a
    city filter (austin/texas/census) for back-compat.
    """
    try:
        city = portal if portal in {"austin", "texas", "census"} else None
        results = discover(query, city=city)
        return {
            "status": "completed",
            "result": {
                "datasets": [d.model_dump() for d in results],
                "count": len(results),
            },
            "artifacts": [],
        }
    except Exception as e:  # noqa: BLE001
        return {"status": "failed", "error": str(e), "result": None}


async def data_fetch(
    portal: str,
    dataset_id: str,
    where: Optional[str] = None,
    select: Optional[str] = None,
    group: Optional[str] = None,
    order: Optional[str] = None,
    limit: int = 1000,
    offset: int = 0,
) -> dict[str, Any]:
    """Legacy wrapper around ``soda_query()``.

    Note: ``offset`` is accepted for back-compat but ignored — the new
    ``soda_query`` enforces a hard 5000 cap; pagination is the caller's
    responsibility (issue a follow-up query with a different ``$where``).
    """
    if offset:
        # Keep the wrapper honest — surface the limitation rather than silently dropping.
        return {
            "status": "failed",
            "error": "offset pagination removed in the new soda_query; refine $where instead",
            "result": None,
        }
    out = await soda_query(
        portal=portal,
        dataset_id=dataset_id,
        where=where,
        select=select,
        group_by=group,
        order_by=order,
        limit=limit,
    )
    if out["status"] != "completed":
        return {"status": "failed", "error": out.get("error"), "result": None}
    records = out["result"]["records"]
    columns = list(records[0].keys()) if records else []
    return {
        "status": "completed",
        "result": {
            "records": records,
            "count": len(records),
            "columns": columns,
            "source": out["result"]["url"],
        },
        "artifacts": [out["result"]["url"]],
    }


async def data_metadata(portal: str, dataset_id: str) -> dict[str, Any]:
    """Legacy wrapper around ``describe()``.

    Returns the structured-tool dict shape.
    """
    try:
        schema = await describe(dataset_id, portal=portal)
        return {
            "status": "completed",
            "result": {
                "name": schema.name,
                "description": schema.description,
                "columns": [c.model_dump() for c in schema.columns],
                "row_count": schema.row_count,
                "updated": schema.last_updated,
            },
            "artifacts": [schema.url],
        }
    except Exception as e:  # noqa: BLE001
        return {"status": "failed", "error": str(e), "result": None}


async def data_transform(records: list, operations: list) -> dict[str, Any]:
    """Transform fetched records — filter, aggregate, sort, compute.

    Still a stub; pandas-based transforms land in a separate issue.
    """
    return {"status": "not_implemented", "result": None, "artifacts": []}
