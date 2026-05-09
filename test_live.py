"""Live Socrata smoke test for issues #6 + #7.

Run from repo root after copying the deliverables in:

    python .tmp-issue-6-7/test_live.py

Hits real Socrata endpoints; needs network. Prints PASS/FAIL per assertion.
"""

from __future__ import annotations

import asyncio
import sys

from agent.tools import data


async def main() -> int:
    failures: list[str] = []

    def check(label: str, cond: bool, detail: str = "") -> None:
        marker = "PASS" if cond else "FAIL"
        print(f"[{marker}] {label}{(' — ' + detail) if detail else ''}")
        if not cond:
            failures.append(label)

    # ---- summarize() ------------------------------------------------------
    print("\n--- summarize() ---")
    result = await data.summarize(
        "3syk-w9eu",
        where="original_zip='78701'",
        dimensions=["permittype"],
        portal="data.austintexas.gov",
    )
    check("summarize status==completed", result["status"] == "completed",
          str(result.get("error")))
    rows = (result.get("result") or {}).get("rows") or []
    check("summarize rows non-empty", len(rows) > 0, f"got {len(rows)} rows")
    url = (result.get("result") or {}).get("url", "")
    check("summarize url contains $group", "%24group" in url or "$group" in url, url)
    print(f"      sample rows[0:3]: {rows[:3]}")
    print(f"      url: {url}")

    # ---- empty summarize --------------------------------------------------
    print("\n--- summarize() empty result ---")
    empty = await data.summarize(
        "3syk-w9eu",
        where="original_zip='00000'",  # nonexistent zip → 0 rows
        dimensions=["permittype"],
        portal="data.austintexas.gov",
    )
    check("empty summarize status==completed", empty["status"] == "completed",
          str(empty.get("error")))
    check("empty summarize rows==[]",
          (empty.get("result") or {}).get("rows") == [],
          str((empty.get("result") or {}).get("rows")))

    # ---- cite() -----------------------------------------------------------
    print("\n--- cite() ---")
    c = data.cite("3syk-w9eu")
    check("cite portal label", c.portal == "City of Austin", c.portal)
    check("cite dataset_id", c.dataset_id == "3syk-w9eu", c.dataset_id)
    check("cite api_url host", "data.austintexas.gov" in c.api_url, c.api_url)
    check("cite landing url", c.url.startswith("https://"), c.url)
    print(f"      {c.model_dump()}")

    # ---- cite() unknown ---------------------------------------------------
    print("\n--- cite() unknown dataset ---")
    raised = False
    try:
        data.cite("does-not-exist")
    except KeyError as e:
        raised = True
        print(f"      raised KeyError as expected: {e}")
    check("cite unknown raises KeyError", raised)

    # ---- cite_with_freshness() -------------------------------------------
    print("\n--- cite_with_freshness() ---")
    c2 = await data.cite_with_freshness("3syk-w9eu")
    check("cite_with_freshness last_refreshed populated",
          c2.last_refreshed is not None, str(c2.last_refreshed))
    print(f"      {c2.model_dump()}")

    print()
    if failures:
        print(f"FAILED: {failures}")
        return 1
    print("ALL PASS")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
