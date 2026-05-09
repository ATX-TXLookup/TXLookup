"""End-to-end test: 10 questions per top-3 user story, asked through /api/agent.

Drives the SSE endpoint at http://localhost:3000/api/agent (started by `npm run dev`)
and verifies each question produces:
  - a `done` event
  - a non-empty answer (>= 30 chars, contains digits)
  - a citation block

Usage:
    # In one terminal:
    npm run dev

    # In another:
    python tests/test_user_story_questions.py

    # Optional: limit how many run (useful for smoke testing)
    python tests/test_user_story_questions.py --limit 3

Requires OPENAI_API_KEY in the dev server's environment so the planner can run.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request


BASE_URL = os.environ.get("TXLOOKUP_BASE", "http://localhost:3000")
TIMEOUT_S = 90


# Top-3 user stories from data-dump/USER_STORIES.md (issues #1, #2, #3).
QUESTIONS: dict[str, list[str]] = {
    "food_inspections": [
        "Show me restaurants in 78701 with inspection scores below 80 in the last 6 months.",
        "What are the most common food inspection violations in Austin?",
        "Which Austin zip code has the highest rate of failed restaurant inspections?",
        "List restaurants on East 6th Street with low inspection scores recently.",
        "How many Austin restaurants scored below 70 in the last year?",
        "Which restaurants have had repeated inspection failures in 78704?",
        "What is the average food inspection score in downtown Austin?",
        "Show me trend of inspection scores in Austin over the past 12 months.",
        "Which restaurant types fail inspections most often?",
        "Top 10 worst-scoring restaurants in Austin from the latest inspections.",
    ],
    "building_permits": [
        "Which Austin zip codes have the most building permits issued this year?",
        "What types of construction permits are most common in 78704?",
        "Show me the top 5 neighborhoods by new residential permits.",
        "How many commercial permits were issued in Austin in the last 3 months?",
        "Which permit types are growing fastest in Austin?",
        "Show me building permit activity in 78702 over the last 6 months.",
        "What is the average permit volume per month in Austin this year?",
        "Which zip code had the most new construction starts last quarter?",
        "Compare residential vs commercial permit counts in Austin.",
        "Where are the hotspots for mixed-use development in Austin right now?",
    ],
    "311_service_requests": [
        "What are the top 311 issue types reported in Austin this year?",
        "Which Austin neighborhood has the most 311 complaints?",
        "Show me unresolved 311 service requests in 78704.",
        "How many pothole complaints were filed in Austin in the last 90 days?",
        "What is the most common 311 issue in 78702?",
        "Which 311 categories have the longest resolution times?",
        "Show me trend of 311 graffiti reports in Austin.",
        "What are the top 10 unresolved 311 issues in Austin right now?",
        "How many streetlight outages were reported in the last month?",
        "Which zip code files the most 311 trash and debris complaints?",
    ],
}


def parse_sse(stream: bytes) -> list[dict]:
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


def ask(query: str) -> tuple[bool, str, dict]:
    """POST to /api/agent and consume the SSE stream. Returns (ok, reason, done_event)."""
    body = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}/api/agent",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        return False, f"http {e.code}: {e.read()[:200].decode(errors='replace')}", {}
    except Exception as e:
        return False, f"connection error: {e}", {}

    events = parse_sse(raw)
    if not events:
        return False, "no SSE events parsed", {}

    err = next((e for e in events if e.get("phase") == "error"), None)
    if err:
        return False, f"agent error: {err.get('error', '')[:200]}", err

    done = next((e for e in events if e.get("phase") == "done"), None)
    if not done:
        return False, f"no 'done' event (got {[e.get('phase') for e in events]})", {}

    answer = (done.get("answer") or "").strip()
    citation = done.get("citation")

    if len(answer) < 30:
        return False, f"answer too short ({len(answer)} chars): {answer!r}", done
    if not any(ch.isdigit() for ch in answer):
        return False, "answer contains no digits (no concrete data)", done
    if not citation:
        return False, "no citation in done event", done

    return True, f"ok ({len(answer)} chars, cited)", done


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0,
                    help="Only run first N questions per story (0 = all)")
    ap.add_argument("--story", choices=list(QUESTIONS.keys()), default=None,
                    help="Only run one story bucket")
    ap.add_argument("--save", default="tests/results-user-stories.json",
                    help="Where to write detailed results")
    args = ap.parse_args()

    # Quick reachability check.
    try:
        with urllib.request.urlopen(BASE_URL, timeout=5) as r:
            r.read(64)
    except Exception as e:
        print(f"ERROR: cannot reach {BASE_URL} — is `npm run dev` running? ({e})")
        return 2

    stories = {args.story: QUESTIONS[args.story]} if args.story else QUESTIONS
    results: list[dict] = []
    total = 0
    passed = 0
    t0 = time.time()

    for story, qs in stories.items():
        qs = qs[: args.limit] if args.limit else qs
        print(f"\n=== {story} ({len(qs)} questions) ===")
        for i, q in enumerate(qs, 1):
            total += 1
            t_start = time.time()
            ok, reason, done = ask(q)
            elapsed = time.time() - t_start
            mark = "PASS" if ok else "FAIL"
            if ok:
                passed += 1
            print(f"  [{mark}] {story} q{i:02d} ({elapsed:5.1f}s) — {q[:70]}")
            if not ok:
                print(f"         └─ {reason}")
            results.append({
                "story": story,
                "question_n": i,
                "question": q,
                "ok": ok,
                "reason": reason,
                "elapsed_s": round(elapsed, 2),
                "answer": (done.get("answer") if done else None),
                "citation": (done.get("citation") if done else None),
            })

    dt = time.time() - t0
    print(f"\n--- Summary ---")
    print(f"Passed: {passed}/{total}  ({100 * passed / max(total, 1):.0f}%)")
    print(f"Total time: {dt:.1f}s ({dt / max(total, 1):.1f}s/question)")

    os.makedirs(os.path.dirname(args.save), exist_ok=True)
    with open(args.save, "w") as f:
        json.dump({"passed": passed, "total": total, "results": results}, f, indent=2)
    print(f"Wrote: {args.save}")

    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
