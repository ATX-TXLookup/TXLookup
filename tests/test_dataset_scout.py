"""Dataset-scout qualification rubric — pinning the #161 zero-yield fix.

Before #161 the scout pulled from Socrata's `/api/views.json` catalog endpoint
which OMITS `columns` and `license` from per-dataset summaries. That made 3 of
the 5 scoring signals (temporal column, geographic column, license) structurally
impossible to fire, so nothing ever scored ≥ 3 across 18 runs / 800+ datasets.

These tests pin the corrected behavior using Discovery API fixture data:

  1. `score_candidate` correctly assigns points across all 5 signals when the
     Discovery API shape is normalized.
  2. `list_portal_datasets` normalizes Discovery API responses into the
     internal shape with proper columns / license / freshness fields.
  3. End-to-end: a known-good fixture portal produces ≥1 qualified candidate.

These are pure unit tests — no network. The Discovery API call is mocked via a
fixture dict so the test is deterministic.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

from agent.specialists.dataset_scout import (
    SCORE_THRESHOLD,
    Candidate,
    detect_geographic_columns,
    detect_temporal_columns,
    list_portal_datasets,
    score_candidate,
    scout_once,
)


def _now_epoch() -> int:
    return int(datetime.now(timezone.utc).timestamp())


def _discovery_response(items: list[dict]) -> dict:
    """Build a Discovery API response wrapping a list of resource dicts."""
    return {
        "results": [
            {
                "resource": item,
                "metadata": {"license": item.pop("_license", None)} if "_license" in item else {},
            }
            for item in items
        ]
    }


# --------------------------------------------------------------------------- #
# Column detection                                                            #
# --------------------------------------------------------------------------- #


def test_detect_temporal_column_by_datatype():
    cols = [{"fieldName": "x", "dataTypeName": "calendar_date"}]
    assert detect_temporal_columns(cols) == ["x"]


def test_detect_temporal_column_by_suffix():
    cols = [{"fieldName": "incident_date", "dataTypeName": "text"}]
    assert detect_temporal_columns(cols) == ["incident_date"]


def test_detect_geographic_column_by_datatype():
    cols = [{"fieldName": "loc", "dataTypeName": "point"}]
    assert detect_geographic_columns(cols) == ["loc"]


def test_detect_geographic_column_by_name_zip():
    cols = [{"fieldName": "zip_code", "dataTypeName": "text"}]
    assert detect_geographic_columns(cols) == ["zip_code"]


# --------------------------------------------------------------------------- #
# Scoring rubric — 5 independent signals                                       #
# --------------------------------------------------------------------------- #


def test_score_high_value_dataset_qualifies():
    """A real Austin-shaped dataset hits 4-5 signals and qualifies."""
    view = {
        "columns": [
            {"fieldName": "occurred_date", "dataTypeName": "calendar_date"},
            {"fieldName": "address", "dataTypeName": "text"},
            {"fieldName": "zip_code", "dataTypeName": "text"},
        ],
        "viewCount": 5000,
        "rowsUpdatedAt": _now_epoch() - 60 * 60 * 24 * 3,  # 3 days ago
        "license": {"name": "Public Domain"},
    }
    score, reasons = score_candidate(view)
    assert score >= SCORE_THRESHOLD, f"got score {score}, reasons: {reasons}"
    assert "has temporal column" in reasons
    assert "has geographic column" in reasons


def test_score_zero_when_no_columns_no_views():
    view = {"columns": [], "viewCount": 0, "rowsUpdatedAt": 0, "license": None}
    score, reasons = score_candidate(view)
    assert score == 0
    assert reasons == []


def test_score_freshness_fails_when_stale():
    view = {
        "columns": [],
        "viewCount": 0,
        "rowsUpdatedAt": _now_epoch() - 60 * 60 * 24 * 90,  # 90 days ago
    }
    score, reasons = score_candidate(view)
    assert score == 0
    assert "refreshed in last 30d" not in reasons


def test_score_license_signal_open_data():
    view = {"columns": [], "viewCount": 0, "rowsUpdatedAt": 0, "license": "CC0 1.0"}
    score, reasons = score_candidate(view)
    assert score == 1
    assert "license=CC0 1.0" in reasons


# --------------------------------------------------------------------------- #
# list_portal_datasets — Discovery API normalization (regression for #161)    #
# --------------------------------------------------------------------------- #


def test_list_portal_datasets_normalizes_discovery_response():
    """The Discovery API returns columns as parallel arrays. The scout must
    re-zip them into the per-column dict shape that score_candidate expects.
    This was the structural bug behind #161: the old `/api/views.json`
    endpoint never returned columns at all, so 3/5 signals couldn't fire.
    """
    fake = {
        "results": [
            {
                "resource": {
                    "id": "abcd-efgh",
                    "name": "Crime Reports",
                    "description": "Incident reports",
                    "columns_field_name": ["occurred_date", "address", "zip_code"],
                    "columns_name": ["Occurred Date", "Address", "Zip Code"],
                    "columns_datatype": ["Calendar date", "Text", "Text"],
                    "page_views": {"page_views_total": 12500},
                    "download_count": 800,
                    "data_updated_at": datetime.now(timezone.utc).isoformat(),
                },
                "metadata": {"license": "Public Domain"},
            }
        ]
    }
    with patch(
        "agent.specialists.dataset_scout._http_get_json", return_value=fake
    ):
        out = list_portal_datasets("data.example.gov", limit=10)
    out_list = list(out)
    assert len(out_list) == 1
    v = out_list[0]
    assert v["id"] == "abcd-efgh"
    assert len(v["columns"]) == 3
    assert v["columns"][0]["fieldName"] == "occurred_date"
    assert v["columns"][0]["dataTypeName"] == "calendar_date"
    assert v["viewCount"] == 12500
    assert v["license"] == "Public Domain"
    assert v["rowsUpdatedAt"] is not None  # ISO → epoch conversion happened


def test_list_portal_datasets_handles_missing_optional_fields():
    fake = {
        "results": [
            {
                "resource": {
                    "id": "zzzz-9999",
                    "name": "Minimal Dataset",
                    # no columns, no page_views, no data_updated_at
                },
            }
        ]
    }
    with patch(
        "agent.specialists.dataset_scout._http_get_json", return_value=fake
    ):
        out = list(list_portal_datasets("data.example.gov"))
    assert len(out) == 1
    assert out[0]["columns"] == []
    assert out[0]["viewCount"] == 0
    assert out[0]["rowsUpdatedAt"] is None


def test_list_portal_datasets_empty_response_returns_empty():
    with patch(
        "agent.specialists.dataset_scout._http_get_json", return_value=None
    ):
        out = list(list_portal_datasets("data.example.gov"))
    assert out == []


# --------------------------------------------------------------------------- #
# End-to-end qualification (regression: ≥1 candidate from a known-good fixture) #
# --------------------------------------------------------------------------- #


def test_scout_once_produces_qualified_candidate_from_realistic_portal(tmp_path, monkeypatch):
    """The original symptom from #161: 800+ candidates seen, 0 qualified.
    With the Discovery API fix in place, a realistic portal response must
    produce at least one qualified candidate."""
    fake = {
        "results": [
            {
                "resource": {
                    "id": "high-value",
                    "name": "Crime Reports (High Value)",
                    "description": "All reported crimes",
                    "columns_field_name": ["occurred_date", "address", "zip_code", "offense"],
                    "columns_name": ["Date", "Address", "Zip", "Offense"],
                    "columns_datatype": ["Calendar date", "Text", "Text", "Text"],
                    "page_views": {"page_views_total": 50000},
                    "data_updated_at": datetime.now(timezone.utc).isoformat(),
                },
                "metadata": {"license": "Public Domain"},
            },
            {
                "resource": {
                    "id": "low-value",
                    "name": "Internal Audit Report 2008",
                    "columns_field_name": ["section"],
                    "columns_datatype": ["Text"],
                    "page_views": {"page_views_total": 12},
                },
                "metadata": {},
            },
        ]
    }
    # Isolate state file
    monkeypatch.chdir(tmp_path)
    (tmp_path / "data" / "scout").mkdir(parents=True)

    with patch(
        "agent.specialists.dataset_scout._http_get_json", return_value=fake
    ):
        top, _state = scout_once(verbose=False, force_all=True)

    assert len(top) >= 1, "expected at least one qualified candidate from a high-value fixture"
    assert top[0].score >= SCORE_THRESHOLD
    assert top[0].name.startswith("Crime Reports")
