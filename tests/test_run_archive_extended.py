"""Extended tests for app/lib/run-archive.ts (file-based path only).

Companion to test_run_archive.py. Spawns run_archive_ts_extended.mjs which
covers the cases called out in the #59 admin review:

  - Hash collision: two queries that normalize to the same hash share a slot
    and the second save overwrites the first (no duplicate list entries).
  - markRun on a missing hash returns null (treated as falsy missing-record).
  - listRuns honors the `limit` parameter (and tolerates limit > size).

Skipped when neither node nor npx is on PATH (e.g. minimal CI containers).
"""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SMOKE = REPO_ROOT / "tests" / "run_archive_ts_extended.mjs"


@pytest.mark.skipif(
    shutil.which("npx") is None,
    reason="npx not on PATH — TS smoke test cannot run",
)
def test_run_archive_extended_smoke():
    """Run the extended TS smoke test as a subprocess.

    The .mjs file deletes KV_URL and runs everything in a tmp dir, so this
    test never touches the repo's data/ or any production KV. Three test
    cases cover hash-collision, markRun-missing, and listRuns-limit.
    """
    assert SMOKE.exists(), f"extended smoke test missing at {SMOKE}"
    proc = subprocess.run(
        ["npx", "--yes", "tsx", str(SMOKE)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
        env={"PATH": os.environ.get("PATH", "")},
    )
    if proc.returncode != 0:
        pytest.fail(
            f"run-archive extended smoke failed (exit {proc.returncode}):\n"
            f"--- stdout ---\n{proc.stdout}\n--- stderr ---\n{proc.stderr}"
        )
    assert "# pass" in proc.stdout, f"unexpected output:\n{proc.stdout}"
    # Make sure all three named tests actually executed.
    for marker in (
        "hash collision",
        "markRun on missing hash",
        "listRuns honors",
    ):
        assert marker in proc.stdout, f"missing test marker '{marker}' in output:\n{proc.stdout}"
