"""End-to-end: assert the agent's replan SSE contract works.

This is the canonical "agent thinking" demo moment — when a step fails,
the agent re-plans and recovers. We hit /api/agent with `demo: true` and
a query that matches the marquee #2 fixture (which has `failAt` configured
in app/lib/demo-fixtures.ts), then verify the SSE stream contains:

  - one or more `replanning` events (a step failed, replan kicked in)
  - one or more `replanned` events (a new plan was emitted)
  - eventually a `done` event with a non-empty cited answer
  - the diagnosis text on at least one replanned event is non-trivial

Maps to: #44 Axis 4 — Innovation & Execution / "Replan triggered + recovered".
Validates: the SSE event contract that PR #47 (doom-loop wire-in) and
PR #54 (replanner sees prior results) shipped. The fixture replayer in
app/api/agent/route.ts emits the same event shapes the live loop produces,
so this assertion catches regressions in either path.

Why the fixture path, not the live agent?
The original version of this test (PR #57) hit the LIVE /api/agent and
relied on a real bug — the planner emitting `dimensions: []` for count-
style queries, which built invalid SoQL `$select=,count(*) AS count` and
HTTP 400'd. PR #61 incidentally fixed that bug by adding a planner-prompt
rule that defaults to grouping by a geographic key column. So the live
path no longer triggers a replan on this query — making "test the contract,
not the bug" the right framing. The fixture version is deterministic, fast
(~3s), no API keys needed, and stays valid as the live loop improves.

If you want a live-loop replan smoke test, write a separate one that's
explicitly tagged to skip when no failure mode is currently broken.

Requirements:
  - `npm run dev` running on http://localhost:3000 (override with TXLOOKUP_BASE)
  - No API keys needed — fixture mode bypasses Codex + Socrata.

Usage:
    # Terminal 1
    npm run dev

    # Terminal 2
    pytest tests/test_replan_recovery.py -v
    # or as a script:
    python tests/test_replan_recovery.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

import pytest


BASE_URL = os.environ.get("TXLOOKUP_BASE", "http://localhost:3000")
TIMEOUT_S = 120  # replans roughly double the time vs a clean run

TRIGGER_QUERY = "Restaurants near 78704 with failing inspections this year"  # matches marquee #2 fixture (has failAt)


def _server_reachable() -> bool:
    """Cheap probe — is the dev server up AND is /api/agent willing to take POST?

    We do a tiny POST with an empty body. If we get a structured 4xx/2xx the
    route is mounted (test will run for real). If we get a connection error
    or a 404/405 (route missing or stale build), we skip.
    """
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/agent",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=3):
            return True
    except urllib.error.HTTPError as e:
        # 4xx/5xx where route exists is fine — but 404/405 means the agent
        # route isn't actually serving, so the test would just fail noisily.
        if e.code in (404, 405):
            return False
        return True
    except (urllib.error.URLError, TimeoutError, ConnectionError):
        return False
    except Exception:
        return False


def _parse_sse(stream: bytes) -> list[dict]:
    """Parse an SSE byte stream into a list of event dicts."""
    events: list[dict] = []
    for chunk in stream.split(b"\n\n"):
        chunk = chunk.strip()
        if not chunk or not chunk.startswith(b"data:"):
            continue
        payload = chunk[len(b"data:") :].strip()
        try:
            events.append(json.loads(payload))
        except json.JSONDecodeError:
            continue
    return events


def _stream_query(query: str) -> list[dict]:
    """POST to /api/agent and consume the SSE stream into a list of events."""
    # demo:true → fixture replayer in route.ts. Deterministic SSE event
    # shapes mirroring the live loop, no LLM/Socrata calls required.
    body = json.dumps({"query": query, "demo": True}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/agent",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            raw = resp.read()
    except urllib.error.URLError as e:
        raise AssertionError(
            f"could not reach {BASE_URL}/api/agent — is `npm run dev` running? ({e})"
        ) from e
    return _parse_sse(raw)


@pytest.mark.skipif(
    not _server_reachable(),
    reason=f"dev server not running at {BASE_URL} — this is an end-to-end test",
)
def test_replan_triggered_and_recovered():
    """The full replan path: failure → replanning → replanned → done with answer."""
    events = _stream_query(TRIGGER_QUERY)
    assert events, "no SSE events parsed from /api/agent"

    phases = [e.get("phase") for e in events]

    # 1. The agent emitted at least one replanning event (a step failed).
    assert "replanning" in phases, (
        f"expected at least one 'replanning' event in stream — got {phases}. "
        f"Likely the empty-dimensions SoQL bug (see #42 comment thread) was "
        f"fixed. See this file's docstring for how to update the trigger "
        f"query — or convert to ?demo=1 fixture mode."
    )

    # 2. The agent emitted a new plan in response (the recovery itself).
    assert "replanned" in phases, (
        f"saw 'replanning' but no 'replanned' — replanner failed to produce "
        f"a new plan. Got: {phases}"
    )

    # 3. The agent reached a final done state — didn't bail out or run out of budget.
    assert "done" in phases, (
        f"expected a 'done' event after recovery — got {phases}. "
        f"Likely the agent exhausted its replan budget. Check the SSE stream."
    )

    # 4. Phase ordering: at least one replanning event happens BEFORE done.
    first_replanning = next(i for i, p in enumerate(phases) if p == "replanning")
    done_idx = phases.index("done")
    assert first_replanning < done_idx, (
        f"replanning at index {first_replanning} but done at {done_idx} — "
        f"phase ordering is broken"
    )

    # 5. Done event has a substantive answer (≥30 chars).
    done = next(e for e in events if e.get("phase") == "done")
    answer = (done.get("answer") or "").strip()
    assert len(answer) >= 30, (
        f"recovered answer too short ({len(answer)} chars): {answer!r}"
    )

    # 6. At least one replanned event carries a non-trivial diagnosis string.
    # This is the LLM's plain-English explanation of what went wrong, which
    # is what the observatory surfaces to demo viewers as "Agent adjusted course".
    replanned_events = [e for e in events if e.get("phase") == "replanned"]
    diagnoses = [(e.get("diagnosis") or "").strip() for e in replanned_events]
    assert any(len(d) >= 20 for d in diagnoses), (
        f"no replanned event had a meaningful diagnosis. Got: {diagnoses!r}"
    )


def main() -> int:
    print(f"Running replan-recovery e2e against {BASE_URL}")
    print(f"Trigger query: {TRIGGER_QUERY!r}")
    print()

    try:
        test_replan_triggered_and_recovered()
    except AssertionError as e:
        print(f"FAIL: {e}")
        return 1

    print("PASS — replan triggered + recovered + cited answer + diagnosis present")
    return 0


if __name__ == "__main__":
    sys.exit(main())
