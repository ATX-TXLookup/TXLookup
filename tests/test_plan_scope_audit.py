"""Plan-scope guards for the bug classes found in the 2026-05-13 corpus audit.

The audit swept all 190 cached lookups and found 86 (45%) were failed or weak
non-answers, clustering into a handful of systematic planning bugs:

  1. "District N" mapped onto a department column (Austin 311 has no district
     column at all) -> zero rows -> fabricated finding.
  2. "Join X with Y" plans that touch only one dataset -> no real join.
  3. "Top N / outliers" plans with no `order` arg -> results not ranked.
  4. "Trend over the last 24 months" not recognized as a date-scoped query.

These tests pin `validate_plan_scope` to catch each class. They are pure unit
tests (no network, no OpenAI) — they build Plan objects directly and assert on
the returned issue list.
"""

from __future__ import annotations

from agent.planner import Plan, validate_plan_scope


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #

_INTENT = {
    "intent": "data_analysis",
    "data_domain": "civic",
    "geography": "Austin",
    "time_range": "this year",
    "analysis_type": "ranking",
}


def _plan(*steps: dict) -> Plan:
    """Build a Plan from raw step dicts."""
    return Plan.model_validate({"intent": _INTENT, "steps": list(steps)})


def _reasons(query: str, plan: Plan) -> list[str]:
    return [i["reason"] for i in validate_plan_scope(query, plan)]


# --------------------------------------------------------------------------- #
# District scoping — the headline audit bug                                    #
# --------------------------------------------------------------------------- #


def test_district_mapped_to_department_column_is_flagged():
    """'District 3' pinned onto sr_department_desc returns zero rows — flag it."""
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "xwdj-i9he",
                "where": "sr_department_desc='District 3'",
                "dimensions": ["sr_type_desc"],
            },
        }
    )
    reasons = _reasons("Top complaint type in District 3 this year", plan)
    assert any("department column" in r for r in reasons), reasons


def test_district_on_real_council_column_is_clean():
    """council_district is the correct field — no district issue."""
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "fdj4-gpfu",
                "where": "council_district='3' AND occ_date > '2026-01-01'",
                "dimensions": ["crime_type"],
                "order": "count DESC",
            },
        }
    )
    reasons = _reasons("Top crime types in District 3 this year", plan)
    assert not any("district" in r.lower() for r in reasons), reasons


def test_district_query_with_no_district_constraint_is_flagged():
    """Question names a district but the plan never constrains one."""
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "xwdj-i9he",
                "where": "sr_created_date > '2026-01-01'",
                "dimensions": ["sr_type_desc"],
            },
        }
    )
    reasons = _reasons("How many complaints came from District 5 this year?", plan)
    assert any("council_district" in r for r in reasons), reasons


# --------------------------------------------------------------------------- #
# Join queries — must touch >= 2 datasets                                       #
# --------------------------------------------------------------------------- #


def test_join_query_touching_one_dataset_is_flagged():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "fdj4-gpfu",
                "where": "occ_date > '2026-01-01'",
                "dimensions": ["council_district"],
            },
        }
    )
    reasons = _reasons(
        "Join crime reports with code violations by zip for the same period", plan
    )
    assert any("join" in r.lower() for r in reasons), reasons


def test_join_query_touching_two_datasets_is_clean():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "fdj4-gpfu",
                "where": "occ_date > '2026-01-01'",
                "dimensions": ["council_district"],
            },
        },
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "6wtj-zbtb",
                "where": "opened_date > '2026-01-01'",
                "dimensions": ["zip_code"],
            },
        },
    )
    reasons = _reasons(
        "Join crime reports with code violations by zip for the same period", plan
    )
    assert not any("join" in r.lower() for r in reasons), reasons


# --------------------------------------------------------------------------- #
# Ranking / outlier queries — must carry an `order` arg                         #
# --------------------------------------------------------------------------- #


def test_ranking_query_without_order_is_flagged():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "3syk-w9eu",
                "where": "issue_date > '2026-01-01'",
                "dimensions": ["permittype"],
            },
        }
    )
    reasons = _reasons("Top 5 outliers in permit valuation this year", plan)
    assert any("order" in r.lower() for r in reasons), reasons


def test_ranking_query_with_order_is_clean():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "3syk-w9eu",
                "where": "issue_date > '2026-01-01'",
                "dimensions": ["permittype"],
                "metric": "count",
                "order": "count DESC",
                "limit": 5,
            },
        }
    )
    reasons = _reasons("Top 5 outliers in permit valuation this year", plan)
    assert not any("order" in r.lower() for r in reasons), reasons


# --------------------------------------------------------------------------- #
# Long-trend windows — "over the last 24 months" must be date-scoped            #
# --------------------------------------------------------------------------- #


def test_24_month_trend_without_date_column_is_flagged():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "9fxf-t2tr",
                "where": "",
                "dimensions": ["call_type"],
            },
        }
    )
    reasons = _reasons(
        "Show dallas police active calls trend over the last 24 months by quarter",
        plan,
    )
    assert any("date-column" in r for r in reasons), reasons


def test_rolling_window_phrase_without_date_column_is_flagged():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {"datasetId": "naix-2893", "where": "", "dimensions": ["quarter"]},
        }
    )
    reasons = _reasons(
        "Show mixed beverage gross receipts over the last 8 quarters", plan
    )
    assert any("date-column" in r for r in reasons), reasons


def test_24_month_trend_with_date_column_is_clean():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "fdj4-gpfu",
                "where": "occ_date > '2024-05-01'",
                "dimensions": ["crime_type"],
                "order": "count DESC",
            },
        }
    )
    reasons = _reasons(
        "Show crime reports trend over the last 24 months by quarter", plan
    )
    assert not any("date-column" in r for r in reasons), reasons


# --------------------------------------------------------------------------- #
# Regression — existing checks still hold                                       #
# --------------------------------------------------------------------------- #


def test_zip_not_in_where_still_flagged():
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "ecmv-9xxi",
                "where": "score < 70",
                "dimensions": ["restaurant_name"],
            },
        }
    )
    reasons = _reasons("How many restaurants in 78704 failed inspections?", plan)
    assert any("78704" in r for r in reasons), reasons


def test_one_step_scoped_plan_still_flagged():
    plan = _plan(
        {"tool": "summarize_data", "args": {"datasetId": "ecmv-9xxi", "where": ""}}
    )
    reasons = _reasons("Restaurants in 78704 this year", plan)
    assert any("1-step plan" in r for r in reasons), reasons


def test_well_scoped_plan_has_no_issues():
    """A correctly scoped, multi-step, ordered plan should be clean."""
    plan = _plan(
        {"tool": "discover_datasets", "args": {"query": "Austin food inspections"}},
        {"tool": "get_dataset_schema", "args": {"dataset_id": "ecmv-9xxi"}},
        {
            "tool": "summarize_data",
            "args": {
                "datasetId": "ecmv-9xxi",
                "where": "inspection_date > '2026-01-01'",
                "dimensions": ["restaurant_name"],
                "order": "count DESC",
                "limit": 5,
            },
        },
        {"tool": "cite_dataset", "args": {"dataset_id": "ecmv-9xxi"}},
    )
    assert validate_plan_scope("Top 5 worst restaurants this year", plan) == []


def test_non_scoped_query_stays_clean():
    """A plain question with no zip/date/district/join/ranking signal: clean."""
    plan = _plan(
        {
            "tool": "summarize_data",
            "args": {"datasetId": "3syk-w9eu", "dimensions": ["permittype"]},
        }
    )
    assert validate_plan_scope("What permit types exist in Austin?", plan) == []
