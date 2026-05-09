"""Tests for app/lib/run-archive.ts (file-based path only).

Spawns the companion Node smoke test via `npx tsx`. Skipped when neither
node nor npx is on PATH (e.g. minimal CI containers). Skips KV path —
those tests live elsewhere once we wire @vercel/kv.

Three covered scenarios:
  - save + findRun roundtrip (with normalized hashing)
  - listRuns ordering (newest first)
  - markRun mutation persists
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SMOKE = REPO_ROOT / "tests" / "run_archive_ts_smoke.mjs"


@pytest.mark.skipif(
    shutil.which("npx") is None,
    reason="npx not on PATH — TS smoke test cannot run",
)
def test_run_archive_file_backend_smoke():
    """Run the TS smoke test as a subprocess.

    The .mjs file deletes KV_URL and runs everything in a tmp dir, so this
    test never touches the repo's data/ or any production KV.
    """
    assert SMOKE.exists(), f"smoke test missing at {SMOKE}"
    proc = subprocess.run(
        ["npx", "--yes", "tsx", str(SMOKE)],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
        env={"PATH": __import__("os").environ.get("PATH", "")},
    )
    if proc.returncode != 0:
        pytest.fail(
            f"run-archive smoke failed (exit {proc.returncode}):\n"
            f"--- stdout ---\n{proc.stdout}\n--- stderr ---\n{proc.stderr}"
        )
    # node:test prints "# pass N" — sanity-check at least one pass line.
    assert "# pass" in proc.stdout, f"unexpected output:\n{proc.stdout}"
