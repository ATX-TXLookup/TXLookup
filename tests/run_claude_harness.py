"""Claude-mode harness: Socrata fetch → Claude synthesizes → saves baseline.

No OpenAI key needed. Claude (in the Claude Code session) acts as the LLM.
Run this once to build tests/fixtures/claude-baseline.json, which the main
test harness can later use in --mode baseline (no LLM tokens required at all).

Usage:
    python tests/run_claude_harness.py

Writes: tests/fixtures/claude-baseline.json
"""

from __future__ import annotations
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta

SOCRATA_APP_TOKEN = os.environ.get("SOCRATA_APP_TOKEN", "")

# ─── dataset registry (post-fix from PR #41) ────────────────────────────────
DATASETS = {
    "food": {"portal": "data.austintexas.gov",  "id": "ecmv-9xxi"},
    "permits": {"portal": "data.austintexas.gov", "id": "3syk-w9eu"},
    "s311": {"portal": "datahub.austintexas.gov", "id": "xwdj-i9he"},
}

# ─── date helpers ────────────────────────────────────────────────────────────
def ym(delta_days: int) -> str:
    return (datetime.utcnow() - timedelta(days=delta_days)).strftime("%Y-%m-%dT00:00:00.000")

YEAR_START = "2026-01-01T00:00:00.000"
SIX_MO    = ym(180)
THREE_MO  = ym(90)
ONE_MO    = ym(30)

# ─── question → SoQL map ────────────────────────────────────────────────────
# Each entry: (dataset_key, select, where, group, order, limit, note)
# 'note' is a human-readable label shown in output.
QUERIES: list[dict] = [
    # ── food_inspections ──────────────────────────────────────────────────
    {"story": "food_inspections", "q": 1,
     "note": "restaurants score<80, last 6mo, worst first",
     "ds": "food",
     "select": "restaurant_name,score,inspection_date,zip_code",
     "where": f"score < 80 AND inspection_date > '{SIX_MO}'",
     "order": "score ASC", "limit": 15},
    {"story": "food_inspections", "q": 2,
     "note": "most common violation types (via process_description)",
     "ds": "food",
     "select": "process_description,count(*) AS cnt",
     "where": f"inspection_date > '{SIX_MO}'",
     "group": "process_description",
     "order": "cnt DESC", "limit": 10},
    {"story": "food_inspections", "q": 3,
     "note": "zip codes with highest count of inspections score<80",
     "ds": "food",
     "select": "zip_code,count(*) AS cnt",
     "where": f"score < 80 AND inspection_date > '{SIX_MO}'",
     "group": "zip_code",
     "order": "cnt DESC", "limit": 10},
    {"story": "food_inspections", "q": 4,
     "note": "E 6th St restaurants, low scores",
     "ds": "food",
     "select": "restaurant_name,score,inspection_date,address",
     "where": f"upper(address) LIKE '%6TH%' AND score < 85 AND inspection_date > '{SIX_MO}'",
     "order": "score ASC", "limit": 10},
    {"story": "food_inspections", "q": 5,
     "note": "count of restaurants scored below 70 in last year",
     "ds": "food",
     "select": "count(*) AS cnt",
     "where": f"score < 70 AND inspection_date > '{ym(365)}'"},
    {"story": "food_inspections", "q": 6,
     "note": "restaurants with repeated failures (multiple rows, low score) in 78704",
     "ds": "food",
     "select": "restaurant_name,count(*) AS inspections,min(score) AS worst",
     "where": f"zip_code='78704' AND score < 80 AND inspection_date > '{ym(365)}'",
     "group": "restaurant_name",
     "order": "inspections DESC", "limit": 10},
    {"story": "food_inspections", "q": 7,
     "note": "average food inspection score in zip 78701 (downtown)",
     "ds": "food",
     "select": "avg(score) AS avg_score,count(*) AS cnt",
     "where": f"zip_code='78701' AND inspection_date > '{SIX_MO}'"},
    {"story": "food_inspections", "q": 8,
     "note": "average score by month over last 12 months (trend)",
     "ds": "food",
     "select": "date_trunc_ym(inspection_date) AS month,avg(score) AS avg_score,count(*) AS cnt",
     "where": f"inspection_date > '{ym(365)}'",
     "group": "date_trunc_ym(inspection_date)",
     "order": "month ASC", "limit": 13},
    {"story": "food_inspections", "q": 9,
     "note": "process_description (type) count for inspections score<80",
     "ds": "food",
     "select": "process_description,count(*) AS cnt",
     "where": f"score < 80 AND inspection_date > '{SIX_MO}'",
     "group": "process_description",
     "order": "cnt DESC", "limit": 10},
    {"story": "food_inspections", "q": 10,
     "note": "top 10 worst scoring restaurants, latest inspections",
     "ds": "food",
     "select": "restaurant_name,score,inspection_date,zip_code",
     "where": f"inspection_date > '{SIX_MO}'",
     "order": "score ASC", "limit": 10},

    # ── building_permits ──────────────────────────────────────────────────
    {"story": "building_permits", "q": 1,
     "note": "top zip codes by permit count YTD",
     "ds": "permits",
     "select": "original_zip,count(*) AS cnt",
     "where": f"issue_date > '{YEAR_START}'",
     "group": "original_zip",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 2,
     "note": "most common permit types in 78704",
     "ds": "permits",
     "select": "permittype,count(*) AS cnt",
     "where": f"original_zip='78704' AND issue_date > '{YEAR_START}'",
     "group": "permittype",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 3,
     "note": "top neighborhoods (zip) by residential permits YTD",
     "ds": "permits",
     "select": "original_zip,count(*) AS cnt",
     "where": f"permit_class_mapped='Residential' AND issue_date > '{YEAR_START}'",
     "group": "original_zip",
     "order": "cnt DESC", "limit": 5},
    {"story": "building_permits", "q": 4,
     "note": "commercial permit count in last 3 months",
     "ds": "permits",
     "select": "count(*) AS cnt",
     "where": f"permit_class_mapped='Commercial' AND issue_date > '{THREE_MO}'"},
    {"story": "building_permits", "q": 5,
     "note": "permit types growing fastest — compare last 3mo vs prior 3mo",
     "ds": "permits",
     "select": "permittype,count(*) AS cnt",
     "where": f"issue_date > '{THREE_MO}'",
     "group": "permittype",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 6,
     "note": "permit activity in 78702, last 6mo",
     "ds": "permits",
     "select": "permittype,count(*) AS cnt",
     "where": f"original_zip='78702' AND issue_date > '{SIX_MO}'",
     "group": "permittype",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 7,
     "note": "average monthly permit volume YTD",
     "ds": "permits",
     "select": "date_trunc_ym(issue_date) AS month,count(*) AS cnt",
     "where": f"issue_date > '{YEAR_START}'",
     "group": "date_trunc_ym(issue_date)",
     "order": "month ASC", "limit": 13},
    {"story": "building_permits", "q": 8,
     "note": "top zip by new construction starts (work_class=New) last quarter",
     "ds": "permits",
     "select": "original_zip,count(*) AS cnt",
     "where": f"work_class='New' AND issue_date > '{THREE_MO}'",
     "group": "original_zip",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 9,
     "note": "residential vs commercial permit counts YTD",
     "ds": "permits",
     "select": "permit_class_mapped,count(*) AS cnt",
     "where": f"issue_date > '{YEAR_START}'",
     "group": "permit_class_mapped",
     "order": "cnt DESC", "limit": 10},
    {"story": "building_permits", "q": 10,
     "note": "top zips for mixed-use (permit_class_mapped) YTD",
     "ds": "permits",
     "select": "original_zip,count(*) AS cnt",
     "where": f"permit_class_mapped='Mixed Use' AND issue_date > '{YEAR_START}'",
     "group": "original_zip",
     "order": "cnt DESC", "limit": 10},

    # ── 311 ──────────────────────────────────────────────────────────────
    {"story": "311", "q": 1,
     "note": "top 311 issue types YTD",
     "ds": "s311",
     "select": "sr_type_desc,count(*) AS cnt",
     "where": f"sr_created_date > '{YEAR_START}'",
     "group": "sr_type_desc",
     "order": "cnt DESC", "limit": 10},
    {"story": "311", "q": 2,
     "note": "zip code with most 311 complaints YTD",
     "ds": "s311",
     "select": "sr_location_zip_code,count(*) AS cnt",
     "where": f"sr_created_date > '{YEAR_START}'",
     "group": "sr_location_zip_code",
     "order": "cnt DESC", "limit": 10},
    {"story": "311", "q": 3,
     "note": "unresolved 311 requests in 78704",
     "ds": "s311",
     "select": "sr_type_desc,sr_created_date,sr_location",
     "where": "sr_location_zip_code='78704' AND sr_status_desc='Open'",
     "order": "sr_created_date ASC", "limit": 15},
    {"story": "311", "q": 4,
     "note": "pothole complaints last 90 days",
     "ds": "s311",
     "select": "count(*) AS cnt",
     "where": f"upper(sr_type_desc) LIKE '%POTHOLE%' AND sr_created_date > '{THREE_MO}'"},
    {"story": "311", "q": 5,
     "note": "most common 311 issue in 78702",
     "ds": "s311",
     "select": "sr_type_desc,count(*) AS cnt",
     "where": f"sr_location_zip_code='78702' AND sr_created_date > '{YEAR_START}'",
     "group": "sr_type_desc",
     "order": "cnt DESC", "limit": 5},
    {"story": "311", "q": 6,
     "note": "311 categories by department (proxy for resolution domain)",
     "ds": "s311",
     "select": "sr_department_desc,count(*) AS cnt",
     "where": f"sr_created_date > '{YEAR_START}'",
     "group": "sr_department_desc",
     "order": "cnt DESC", "limit": 10},
    {"story": "311", "q": 7,
     "note": "graffiti 311 trend by month",
     "ds": "s311",
     "select": "date_trunc_ym(sr_created_date) AS month,count(*) AS cnt",
     "where": f"upper(sr_type_desc) LIKE '%GRAFFITI%' AND sr_created_date > '{ym(365)}'",
     "group": "date_trunc_ym(sr_created_date)",
     "order": "month ASC", "limit": 13},
    {"story": "311", "q": 8,
     "note": "top 10 unresolved 311 issues (open status)",
     "ds": "s311",
     "select": "sr_type_desc,count(*) AS cnt",
     "where": "sr_status_desc='Open'",
     "group": "sr_type_desc",
     "order": "cnt DESC", "limit": 10},
    {"story": "311", "q": 9,
     "note": "streetlight outage reports last month",
     "ds": "s311",
     "select": "count(*) AS cnt",
     "where": f"upper(sr_type_desc) LIKE '%STREETLIGHT%' AND sr_created_date > '{ONE_MO}'"},
    {"story": "311", "q": 10,
     "note": "zip with most trash/debris 311 complaints YTD",
     "ds": "s311",
     "select": "sr_location_zip_code,count(*) AS cnt",
     "where": f"(upper(sr_type_desc) LIKE '%TRASH%' OR upper(sr_type_desc) LIKE '%DEBRIS%' OR upper(sr_type_desc) LIKE '%LITTER%') AND sr_created_date > '{YEAR_START}'",
     "group": "sr_location_zip_code",
     "order": "cnt DESC", "limit": 10},
]


def socrata_fetch(ds_key: str, select: str, where: str = "",
                  group: str = "", order: str = "", limit: int = 1000) -> dict:
    ds = DATASETS[ds_key]
    params: dict[str, str] = {"$select": select, "$limit": str(limit)}
    if where:
        params["$where"] = where
    if group:
        params["$group"] = group
    if order:
        params["$order"] = order
    url = f"https://{ds['portal']}/resource/{ds['id']}.json?" + urllib.parse.urlencode(params)
    headers = {"Accept": "application/json"}
    if SOCRATA_APP_TOKEN:
        headers["X-App-Token"] = SOCRATA_APP_TOKEN
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        if isinstance(data, list):
            return {"ok": True, "rows": data, "url": url}
        else:
            return {"ok": False, "error": str(data), "url": url}
    except Exception as e:
        return {"ok": False, "error": str(e), "url": url}


def main() -> None:
    results = []
    story_groups: dict[str, list] = {}

    print(f"\nRunning {len(QUERIES)} queries across 3 user stories...\n")

    for entry in QUERIES:
        label = f"{entry['story']} q{entry['q']:02d}"
        t0 = time.time()
        res = socrata_fetch(
            entry["ds"],
            select=entry["select"],
            where=entry.get("where", ""),
            group=entry.get("group", ""),
            order=entry.get("order", ""),
            limit=entry.get("limit", 100),
        )
        elapsed = round(time.time() - t0, 2)
        ok = res["ok"] and len(res.get("rows", [])) > 0
        status = "PASS" if ok else ("EMPTY" if res["ok"] else "FAIL")
        print(f"  [{status}] {label} ({elapsed}s) — {entry['note']}")
        if not res["ok"]:
            print(f"         └─ {res['error'][:120]}")
        elif not res.get("rows"):
            print(f"         └─ query ok but 0 rows returned")
        else:
            preview = json.dumps(res["rows"][:2], default=str)[:180]
            print(f"         └─ {len(res['rows'])} rows: {preview}")

        record = {
            "story": entry["story"],
            "question_n": entry["q"],
            "note": entry["note"],
            "status": status,
            "elapsed_s": elapsed,
            "row_count": len(res.get("rows", [])),
            "rows": res.get("rows", []),
            "error": res.get("error"),
            "url": res.get("url"),
        }
        results.append(record)
        story_groups.setdefault(entry["story"], []).append(record)

    # ── summary ──────────────────────────────────────────────────────────────
    print("\n=== Summary ===")
    total_pass = 0
    for story, recs in story_groups.items():
        passed = sum(1 for r in recs if r["status"] == "PASS")
        total_pass += passed
        print(f"  {story}: {passed}/{len(recs)} passed")
    print(f"  Total: {total_pass}/{len(results)}")

    # ── write fixture ─────────────────────────────────────────────────────────
    out_dir = os.path.join(os.path.dirname(__file__), "fixtures")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "claude-baseline.json")
    with open(out_path, "w") as f:
        json.dump({"generated": datetime.utcnow().isoformat(), "results": results}, f, indent=2, default=str)
    print(f"\nWrote: {out_path}")


if __name__ == "__main__":
    main()
