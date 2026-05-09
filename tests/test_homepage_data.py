"""Mirrors of the SODA queries that drive the homepage live tickers.

The TS implementations live in app/lib/homepage-data.ts. We mirror them in pure
Python here so this test doesn't need a Node runtime — and so any future column
rename / dataset migration trips a fast unit test instead of a silent "—" on
the homepage.

Run:
    python -m pytest tests/test_homepage_data.py
"""
from __future__ import annotations

import datetime as dt
import urllib.parse
import urllib.request

import pytest

TIMEOUT = 15


def _soda(url: str) -> list[dict]:
    req = urllib.request.Request(url, headers={"User-Agent": "TXLookup-test"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        import json
        return json.loads(r.read().decode())


def _since(days: int) -> str:
    return (dt.datetime.utcnow() - dt.timedelta(days=days)).date().isoformat()


@pytest.mark.network
def test_austin_permits_7d_total_nonzero() -> None:
    url = (
        "https://data.austintexas.gov/resource/3syk-w9eu.json"
        f"?$select=count(*) AS count&$where=issue_date >= '{_since(7)}'"
    )
    rows = _soda(urllib.parse.quote(url, safe=":/?$=&,'"))
    assert rows and int(rows[0]["count"]) > 0


@pytest.mark.network
def test_austin_inspections_30d_by_zip_returns_top5() -> None:
    url = (
        "https://data.austintexas.gov/resource/ecmv-9xxi.json"
        f"?$select=zip_code AS zip, count(*) AS count"
        f"&$where=inspection_date >= '{_since(30)}'"
        "&$group=zip_code&$order=count DESC&$limit=5"
    )
    rows = _soda(urllib.parse.quote(url, safe=":/?$=&,'"))
    assert len(rows) > 0 and int(rows[0]["count"]) > 0


@pytest.mark.network
def test_austin_311_30d_nonzero() -> None:
    # xwdj-i9he lives on datahub.austintexas.gov, sr_created_date column.
    url = (
        "https://datahub.austintexas.gov/resource/xwdj-i9he.json"
        f"?$select=count(*) AS count&$where=sr_created_date >= '{_since(30)}'"
    )
    rows = _soda(urllib.parse.quote(url, safe=":/?$=&,'"))
    assert rows and int(rows[0]["count"]) > 0


@pytest.mark.network
def test_austin_open_code_violations_uses_status_column() -> None:
    # Regression: column is `status` with values Active/Pending/Closed,
    # NOT `case_status='OPEN'`. Bug fixed in this PR.
    url = (
        "https://data.austintexas.gov/resource/6wtj-zbtb.json"
        "?$select=count(*) AS count&$where=status in('Active','Pending')"
    )
    rows = _soda(urllib.parse.quote(url, safe=":/?$=&,'()"))
    assert rows and int(rows[0]["count"]) > 0
