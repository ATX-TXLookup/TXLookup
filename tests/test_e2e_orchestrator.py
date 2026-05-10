"""End-to-end: assert the orchestrator routes each question shape correctly.

Five live POSTs to /api/agent, one per routing path, asserting the SSE stream
contains the right `delegate_to(specialist=...)` step (or, for the negative
case, only orchestrator steps). Validates the full multi-agent system shipped
in PRs #68 (delegate_to plumbing), #69 (support), #70 (data_analyst),
#71 (reporter), and #72 (failure-fallback hook).

Closes the "tests/e2e_orchestrator_smoke.mjs" item from #67's parent tracker.
Implemented as Python pytest (following the test_replan_recovery.py pattern)
rather than the spec'd .mjs to keep all live-SSE tests in one place.

Tests run against the LIVE agent (not ?demo=1) — each query genuinely calls
Codex + Socrata. So the suite takes ~30-60 seconds wall-clock and requires:

  - `npm run dev` running on http://localhost:3000 (override TXLOOKUP_BASE)
  - OPENAI_API_KEY set in the dev-server's environment
  - SOCRATA_KEY_ID + SOCRATA_KEY_SECRET set (avoids rate-limit flakes)

Usage:

    # Terminal 1
    npm run dev

    # Terminal 2
    pytest tests/test_e2e_orchestrator.py -v
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

import pytest


BASE_URL = os.environ.get("TXLOOKUP_BASE", "http://localhost:3000")
TIMEOUT_S = 120


def _parse_sse(stream: bytes) -> list[dict]:
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


def _stream(query: str, *, dataset: str | None = None) -> list[dict]:
    body: dict = {"query": query}
    if dataset:
        body["dataset"] = dataset
    req = urllib.request.Request(
        f"{BASE_URL}/api/agent",
        data=json.dumps(body).encode("utf-8"),
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


def _planning_event(events: list[dict]) -> dict | None:
    return next((e for e in events if e.get("phase") == "planning"), None)


def _done_event(events: list[dict]) -> dict | None:
    return next((e for e in events if e.get("phase") == "done"), None)


def _step_done_events(events: list[dict]) -> list[dict]:
    return [e for e in events if e.get("phase") == "step_done"]


def _delegate_specialists(plan: dict) -> list[str]:
    """Specialist names emitted as delegate_to args in the plan, in order."""
    out: list[str] = []
    for s in plan.get("plan", {}).get("steps", []):
        if s.get("tool") == "delegate_to":
            spec = s.get("args", {}).get("specialist")
            if isinstance(spec, str):
                out.append(spec)
    return out


def _server_reachable() -> bool:
    """Cheap probe — POST an empty body and accept any structured 4xx/2xx
    as proof the route is mounted. Connection error / 404 / 405 → skip."""
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/agent",
            data=b"{}",
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status < 500
    except urllib.error.HTTPError as e:
        return e.code in (200, 400, 422)
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _server_reachable(),
    reason="dev server not reachable at TXLOOKUP_BASE — start it with `npm run dev`",
)


# --- Routing assertions -------------------------------------------------------


def test_meta_question_routes_to_support():
    """'what datasets do you have?' → delegate_to(support), catalog summary."""
    events = _stream("what datasets do you have?")
    plan = _planning_event(events)
    assert plan, f"no planning event — got {[e.get('phase') for e in events]}"

    specialists = _delegate_specialists(plan)
    assert "support" in specialists, (
        f"expected delegate_to(support) for a meta question, got {specialists}. "
        f"Plan steps: {[s.get('tool') for s in plan.get('plan', {}).get('steps', [])]}"
    )

    step_dones = _step_done_events(events)
    support_steps = [s for s in step_dones if s.get("agent") == "support"]
    assert support_steps, "expected at least one step_done with agent=support"

    done = _done_event(events)
    assert done, f"no done event — got {[e.get('phase') for e in events]}"
    answer = (done.get("answer") or "").lower()
    # Catalog summary should mention the catalog or dataset count.
    assert "dataset" in answer or "tx" in answer, f"answer didn't mention datasets: {answer[:120]!r}"


def test_vague_geography_routes_to_support_with_clarifier_chips():
    """'permits in south austin' → support returns needs_input + chips."""
    events = _stream("show me permits in south austin")
    plan = _planning_event(events)
    assert plan, "no planning event"

    assert "support" in _delegate_specialists(plan), (
        "expected vague-geography to delegate to support"
    )

    # The support step's preview should include next_actions with real zips.
    step_dones = _step_done_events(events)
    support_step = next((s for s in step_dones if s.get("agent") == "support"), None)
    assert support_step, "no step_done with agent=support"
    preview = support_step.get("preview") or ""
    assert "next_actions" in preview, f"support preview missing next_actions: {preview[:200]!r}"
    # At least one of the canonical south-austin zips should appear.
    assert any(z in preview for z in ("78704", "78745", "78748")), (
        f"no canonical south-austin zip in next_actions: {preview[:200]!r}"
    )


def test_statistical_question_routes_to_data_analyst():
    """'permit mix shifted residential to commercial since 2024' → data_analyst."""
    events = _stream(
        "how has Austin's permit mix shifted from residential to commercial since 2024?"
    )
    plan = _planning_event(events)
    assert plan, "no planning event"

    specialists = _delegate_specialists(plan)
    assert "data_analyst" in specialists, (
        f"expected data_analyst for a yoy/shift question, got {specialists}"
    )

    step_dones = _step_done_events(events)
    analyst_step = next((s for s in step_dones if s.get("agent") == "data_analyst"), None)
    assert analyst_step, "no step_done with agent=data_analyst"
    assert analyst_step.get("status") == "completed", (
        f"data_analyst step failed: {analyst_step.get('error')!r}"
    )
    preview = analyst_step.get("preview") or ""
    # Result envelope should advertise either delta-mode findings or single_window mode.
    assert "findings" in preview, f"data_analyst preview missing findings: {preview[:200]!r}"

    done = _done_event(events)
    assert done and done.get("citation"), (
        "expected statistical answer to include a citation block"
    )


def test_report_request_routes_to_reporter():
    """'give me a report on Austin construction permits' → reporter composition."""
    events = _stream("give me a report on Austin construction permits")
    plan = _planning_event(events)
    assert plan, "no planning event"

    specialists = _delegate_specialists(plan)
    assert "reporter" in specialists, (
        f"expected reporter for a 'give me a report' question, got {specialists}"
    )

    step_dones = _step_done_events(events)
    reporter_step = next((s for s in step_dones if s.get("agent") == "reporter"), None)
    assert reporter_step, "no step_done with agent=reporter"
    assert reporter_step.get("status") == "completed", (
        f"reporter step failed: {reporter_step.get('error')!r}"
    )
    preview = reporter_step.get("preview") or ""
    # The SSE step_done.preview is truncated to ~240 chars, so only assert
    # on fields that always land in the first slice. `hero_stats` /
    # `sections` / `sources` come later in the envelope and are covered
    # by the unit tests in tests/specialists_smoke.mjs.
    for field in ("slug", "category", "title"):
        assert field in preview, (
            f"reporter preview missing '{field}' field: {preview[:240]!r}"
        )


def test_specific_records_question_uses_raw_tools_not_delegation():
    """'permits in 78702' → raw tools (summarize/fetch + cite), no delegate_to."""
    events = _stream("show me permits in 78702 last six months")
    plan = _planning_event(events)
    assert plan, "no planning event"

    specialists = _delegate_specialists(plan)
    assert specialists == [], (
        f"specific-records question should NOT delegate to a specialist, "
        f"but got delegate_to: {specialists}"
    )

    # Every step_done should be attributed to the orchestrator (raw tools),
    # not to any specialist.
    step_dones = _step_done_events(events)
    agents = {s.get("agent") for s in step_dones}
    assert agents.issubset({"orchestrator", None}), (
        f"raw-tool path should only have orchestrator-attributed steps; got {agents}"
    )

    done = _done_event(events)
    assert done, "no done event for specific-records query"


def test_done_event_carries_usage_and_duration_on_every_path():
    """Smoke: cumulative usage + duration_ms ride on `done` regardless of path."""
    # Use a meta query — fastest path, ~1-2s.
    events = _stream("what datasets do you have?")
    done = _done_event(events)
    assert done, "no done event"

    duration = done.get("duration_ms")
    assert isinstance(duration, (int, float)) and duration > 0, (
        f"done.duration_ms should be a positive number, got {duration!r}"
    )

    usage = done.get("usage_total")
    assert isinstance(usage, dict), f"done.usage_total should be an object, got {usage!r}"
    for k in ("prompt", "completion", "total"):
        assert k in usage and isinstance(usage[k], int), (
            f"usage_total.{k} missing or not an int: {usage!r}"
        )


def main() -> int:
    print(f"Running e2e orchestrator routing tests against {BASE_URL}")
    if not _server_reachable():
        print("FAIL: dev server not reachable. Start it with `npm run dev`.")
        return 1
    tests = [
        ("meta question routes to support", test_meta_question_routes_to_support),
        ("vague geography → support + chips", test_vague_geography_routes_to_support_with_clarifier_chips),
        ("statistical question → data_analyst", test_statistical_question_routes_to_data_analyst),
        ("report request → reporter", test_report_request_routes_to_reporter),
        ("specific records → raw tools", test_specific_records_question_uses_raw_tools_not_delegation),
        ("done carries usage + duration", test_done_event_carries_usage_and_duration_on_every_path),
    ]
    failed = 0
    for label, fn in tests:
        try:
            fn()
            print(f"  ✓ {label}")
        except AssertionError as e:
            failed += 1
            print(f"  ✗ {label}\n     {e}")
    print()
    if failed == 0:
        print(f"PASS — {len(tests)}/{len(tests)} routing assertions hold.")
        return 0
    print(f"FAIL — {failed} of {len(tests)} failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
